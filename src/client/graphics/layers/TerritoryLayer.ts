import { PriorityQueue } from "@datastructures-js/priority-queue";
import { Colord, colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";

// Extend colord with mix plugin
extend([mixPlugin]);
import { Theme } from "../../../core/configuration/Config";
import { EventBus } from "../../../core/EventBus";
import { Cell, PlayerType, UnitType } from "../../../core/game/Game";
import { euclDistFN, TileRef } from "../../../core/game/GameMap";
import { GameUpdateType, BrokeAllianceUpdate } from "../../../core/game/GameUpdates";
import { GameView, PlayerView } from "../../../core/game/GameView";
import { PseudoRandom } from "../../../core/PseudoRandom";
import { AlternateViewEvent, DragEvent } from "../../InputHandler";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

export class TerritoryLayer implements Layer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private imageData: ImageData;

  private tileToRenderQueue: PriorityQueue<{
    tile: TileRef;
    lastUpdate: number;
  }> = new PriorityQueue((a, b) => {
    return a.lastUpdate - b.lastUpdate;
  });
  private random = new PseudoRandom(123);
  private theme: Theme;

  // Used for spawn highlighting
  private highlightCanvas: HTMLCanvasElement;
  private highlightContext: CanvasRenderingContext2D;

  private alternativeView = false;
  private lastDragTime = 0;
  private nodrawDragDuration = 200;

  private refreshRate = 10; //refresh every 10ms
  private lastRefresh = 0;

  private lastFocusedPlayer: PlayerView | null = null;
  private pulseAnimationFrame: number = 0;

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
  ) {
    this.theme = game.config().theme();
  }

  shouldTransform(): boolean {
    return true;
  }

  async paintPlayerBorder(player: PlayerView) {
    const tiles = await player.borderTiles();
    tiles.borderTiles.forEach((tile: TileRef) => {
      this.paintTerritory(tile, true); // Immediately paint the tile instead of enqueueing
    });
  }

  tick() {
    // Increment animation frame for pulsing effect
    this.pulseAnimationFrame = (this.pulseAnimationFrame + 1) % 60; // 60 frame cycle (6 seconds at 10fps)
    
    this.game.recentlyUpdatedTiles().forEach((t) => this.enqueueTile(t));
    const updates = this.game.updatesSinceLastTick();
    const unitUpdates = updates !== null ? updates[GameUpdateType.Unit] : [];
    unitUpdates.forEach((update) => {
      if (update.unitType === UnitType.DefensePost) {
        const tile = update.pos;
        this.game
          .bfs(tile, euclDistFN(tile, this.game.config().defensePostRange()))
          .forEach((t) => {
            if (
              this.game.isBorder(t) &&
              (this.game.ownerID(t) === update.ownerID ||
                this.game.ownerID(t) === update.lastOwnerID)
            ) {
              this.enqueueTile(t);
            }
          });
      } else if (update.unitType === UnitType.SupplyTruck) {
        // Update borders when supply trucks are placed or move
        const tile = update.pos;
        this.game
          .bfs(tile, euclDistFN(tile, this.game.config().supplyTruckRange()))
          .forEach((t) => {
            if (
              this.game.isBorder(t) &&
              (this.game.ownerID(t) === update.ownerID ||
                this.game.ownerID(t) === update.lastOwnerID)
            ) {
              this.enqueueTile(t);
            }
          });
      }
    });
    
    // Check for alliance breaking to update traitor territories
    const allianceUpdates = updates !== null ? updates[GameUpdateType.BrokeAlliance] : [];
    allianceUpdates.forEach((update) => {
      const brokeUpdate = update as BrokeAllianceUpdate;
      const traitor = this.game.playerBySmallID(brokeUpdate.traitorID);
      if (traitor) {
        // Queue all traitor's tiles for refresh to show red tint
        // Since PlayerView doesn't have tiles() method, we need to iterate through all tiles
        // and check ownership
        this.game.forEachTile((tile) => {
          if (this.game.hasOwner(tile) && this.game.ownerID(tile) === traitor.smallID()) {
            this.enqueueTile(tile);
          }
        });
      }
    });

    const focusedPlayer = this.game.focusedPlayer();
    if (focusedPlayer !== this.lastFocusedPlayer) {
      if (this.lastFocusedPlayer) {
        this.paintPlayerBorder(this.lastFocusedPlayer);
      }
      if (focusedPlayer) {
        this.paintPlayerBorder(focusedPlayer);
      }
      this.lastFocusedPlayer = focusedPlayer;
    }

    // Refresh supply truck borders periodically for animation
    if (this.game.ticks() % 3 === 0) { // Every ~300ms for more visible animation
      // Find all supply truck affected borders and refresh them
      const allSupplyTrucks = this.game.units(UnitType.SupplyTruck);
      if (allSupplyTrucks.length > 0) {
        for (const truck of allSupplyTrucks) {
          if (truck.isActive()) {
            const truckTile = truck.tile();
            const owner = truck.owner();
            this.game
              .bfs(truckTile, euclDistFN(truckTile, this.game.config().supplyTruckRange()))
              .forEach((t) => {
                if (this.game.isBorder(t) && this.game.ownerID(t) === owner.smallID()) {
                  this.enqueueTile(t);
                }
              });
          }
        }
      }
    }
    
    if (!this.game.inSpawnPhase()) {
      return;
    }
    if (this.game.ticks() % 5 === 0) {
      return;
    }

    this.highlightContext.clearRect(
      0,
      0,
      this.game.width(),
      this.game.height(),
    );
    const humans = this.game
      .playerViews()
      .filter((p) => p.type() === PlayerType.Human);

    for (const human of humans) {
      const center = human.nameLocation();
      if (!center) {
        continue;
      }
      const centerTile = this.game.ref(center.x, center.y);
      if (!centerTile) {
        continue;
      }
      let color = this.theme.spawnHighlightColor();
      const myPlayer = this.game.myPlayer();
      if (
        myPlayer !== null &&
        myPlayer !== human &&
        myPlayer.isFriendly(human)
      ) {
        color = this.theme.selfColor();
      }
      const bfsResult = this.game.bfs(
        centerTile,
        euclDistFN(centerTile, 9, true),
      );
      for (const tile of Array.from(bfsResult)) {
        if (!this.game.hasOwner(tile)) {
          this.paintHighlightTile(tile, color, 255);
        }
      }
    }
  }

  init() {
    this.eventBus.on(AlternateViewEvent, (e) => {
      this.alternativeView = e.alternateView;
    });
    this.eventBus.on(DragEvent, (e) => {
      // TODO: consider re-enabling this on mobile or low end devices for smoother dragging.
      // this.lastDragTime = Date.now();
    });
    this.redraw();
  }

  redraw() {
    console.log("redrew territory layer");
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d");
    if (context === null) throw new Error("2d context not supported");
    this.context = context;
    this.canvas.width = this.game.width();
    this.canvas.height = this.game.height();

    this.imageData = this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.initImageData();
    this.context.putImageData(this.imageData, 0, 0);

    // Add a second canvas for highlights
    this.highlightCanvas = document.createElement("canvas");
    const highlightContext = this.highlightCanvas.getContext("2d", {
      alpha: true,
    });
    if (highlightContext === null) throw new Error("2d context not supported");
    this.highlightContext = highlightContext;
    this.highlightCanvas.width = this.game.width();
    this.highlightCanvas.height = this.game.height();

    this.game.forEachTile((t) => {
      this.paintTerritory(t);
    });
  }

  initImageData() {
    this.game.forEachTile((tile) => {
      const cell = new Cell(this.game.x(tile), this.game.y(tile));
      const index = cell.y * this.game.width() + cell.x;
      const offset = index * 4;
      this.imageData.data[offset + 3] = 0;
    });
  }

  renderLayer(context: CanvasRenderingContext2D) {
    const now = Date.now();
    if (
      now > this.lastDragTime + this.nodrawDragDuration &&
      now > this.lastRefresh + this.refreshRate
    ) {
      this.lastRefresh = now;
      this.renderTerritory();

      const [topLeft, bottomRight] = this.transformHandler.screenBoundingRect();
      const vx0 = Math.max(0, topLeft.x);
      const vy0 = Math.max(0, topLeft.y);
      const vx1 = Math.min(this.game.width() - 1, bottomRight.x);
      const vy1 = Math.min(this.game.height() - 1, bottomRight.y);

      const w = vx1 - vx0 + 1;
      const h = vy1 - vy0 + 1;

      if (w > 0 && h > 0) {
        this.context.putImageData(this.imageData, 0, 0, vx0, vy0, w, h);
      }
    }
    if (this.alternativeView) {
      return;
    }

    context.drawImage(
      this.canvas,
      -this.game.width() / 2,
      -this.game.height() / 2,
      this.game.width(),
      this.game.height(),
    );
    if (this.game.inSpawnPhase()) {
      context.drawImage(
        this.highlightCanvas,
        -this.game.width() / 2,
        -this.game.height() / 2,
        this.game.width(),
        this.game.height(),
      );
    }
  }

  renderTerritory() {
    let numToRender = Math.floor(this.tileToRenderQueue.size() / 10);
    if (numToRender === 0 || this.game.inSpawnPhase()) {
      numToRender = this.tileToRenderQueue.size();
    }

    while (numToRender > 0) {
      numToRender--;

      const entry = this.tileToRenderQueue.pop();
      if (!entry) {
        break;
      }

      const tile = entry.tile;
      this.paintTerritory(tile);
      for (const neighbor of this.game.neighbors(tile)) {
        this.paintTerritory(neighbor, true);
      }
    }
  }

  paintTerritory(tile: TileRef, isBorder: boolean = false) {
    if (isBorder && !this.game.hasOwner(tile)) {
      return;
    }
    if (!this.game.hasOwner(tile)) {
      if (this.game.hasFallout(tile)) {
        this.paintTile(tile, this.theme.falloutColor(), 150);
        return;
      }
      this.clearTile(tile);
      return;
    }
    const owner = this.game.owner(tile);
    if (!owner.isPlayer()) {
      return; // Skip if not a player (e.g., TerraNullius)
    }
    const playerOwner = owner as PlayerView;
    const isTraitor = playerOwner.isTraitor();
    
    if (this.game.isBorder(tile)) {
      const playerIsFocused = playerOwner && this.game.focusedPlayer() === playerOwner;
      
      // Check for defense post protection
      const hasDefensePost = this.game.hasUnitNearby(
        tile,
        this.game.config().defensePostRange(),
        UnitType.DefensePost,
        playerOwner.id(),
      );
      
      // Check for supply truck bonus
      const hasSupplyTruck = this.game.hasUnitNearby(
        tile,
        this.game.config().supplyTruckRange(),
        UnitType.SupplyTruck,
        playerOwner.id(),
      );
      
      if (hasDefensePost) {
        const borderColors = this.theme.defendedBorderColors(playerOwner);
        const x = this.game.x(tile);
        const y = this.game.y(tile);
        const lightTile =
          (x % 2 === 0 && y % 2 === 0) || (y % 2 === 1 && x % 2 === 1);
        let borderColor = lightTile ? borderColors.light : borderColors.dark;
        
        // Add supply truck bonus effect with animated pulse
        if (hasSupplyTruck) {
          // Create a pulsing effect using sine wave
          const pulseIntensity = (Math.sin(this.pulseAnimationFrame * Math.PI / 30) + 1) / 2; // 0 to 1
          const mixAmount = 0.15 + (pulseIntensity * 0.15); // 0.15 to 0.30
          borderColor = borderColor.mix(colord('#00ff88'), mixAmount);
        }
        
        // Add red tint for traitors
        if (isTraitor) {
          borderColor = borderColor.mix(colord('#ff0000'), 0.4);
        }
        
        this.paintTile(tile, borderColor, 255);
      } else if (hasSupplyTruck) {
        // Supply truck borders have their own unique appearance - bright energy effect
        let baseColor = playerIsFocused
          ? this.theme.focusedBorderColor()
          : this.theme.borderColor(playerOwner);
        
        // Create animated "energy field" effect for supply trucks
        const x = this.game.x(tile);
        const y = this.game.y(tile);
        const pulsePhase = (this.pulseAnimationFrame + x * 2 + y * 3) % 60; // Different phase per coordinate
        const pulseIntensity = (Math.sin(pulsePhase * Math.PI / 15) + 1) / 2; // Faster pulse
        
        // Use bright orange/yellow for supply effect (different from defense post teal)
        const supplyColor = colord('#ffaa00'); // Bright orange
        const mixAmount = 0.4 + (pulseIntensity * 0.5); // 0.4 to 0.9 - much more visible
        let borderColor = baseColor.mix(supplyColor, mixAmount);
        
        // Add brightness pulse
        const brightness = 1 + (pulseIntensity * 0.4);
        borderColor = borderColor.lighten(brightness * 0.15);
        
        // Add red tint for traitors
        if (isTraitor) {
          borderColor = borderColor.mix(colord('#ff0000'), 0.4);
        }
        
        this.paintTile(tile, borderColor, 255);
      } else {
        let useBorderColor = playerIsFocused
          ? this.theme.focusedBorderColor()
          : this.theme.borderColor(playerOwner);
          
        // Add red tint for traitors
        if (isTraitor) {
          useBorderColor = useBorderColor.mix(colord('#ff0000'), 0.4);
        }
        
        this.paintTile(tile, useBorderColor, 255);
      }
    } else {
      let territoryColor = this.theme.territoryColor(playerOwner);
      
      // Add red tint for traitor territories
      if (isTraitor) {
        territoryColor = territoryColor.mix(colord('#ff0000'), 0.3);
      }
      
      this.paintTile(tile, territoryColor, 150);
    }
  }

  paintTile(tile: TileRef, color: Colord, alpha: number) {
    const offset = tile * 4;
    this.imageData.data[offset] = color.rgba.r;
    this.imageData.data[offset + 1] = color.rgba.g;
    this.imageData.data[offset + 2] = color.rgba.b;
    this.imageData.data[offset + 3] = alpha;
  }

  clearTile(tile: TileRef) {
    const offset = tile * 4;
    this.imageData.data[offset + 3] = 0; // Set alpha to 0 (fully transparent)
  }

  enqueueTile(tile: TileRef) {
    this.tileToRenderQueue.push({
      tile: tile,
      lastUpdate: this.game.ticks() + this.random.nextFloat(0, 0.5),
    });
  }

  async enqueuePlayerBorder(player: PlayerView) {
    const playerBorderTiles = await player.borderTiles();
    playerBorderTiles.borderTiles.forEach((tile: TileRef) => {
      this.enqueueTile(tile);
    });
  }

  paintHighlightTile(tile: TileRef, color: Colord, alpha: number) {
    this.clearTile(tile);
    const x = this.game.x(tile);
    const y = this.game.y(tile);
    this.highlightContext.fillStyle = color.alpha(alpha / 255).toRgbString();
    this.highlightContext.fillRect(x, y, 1, 1);
  }

  clearHighlightTile(tile: TileRef) {
    const x = this.game.x(tile);
    const y = this.game.y(tile);
    this.highlightContext.clearRect(x, y, 1, 1);
  }
}
