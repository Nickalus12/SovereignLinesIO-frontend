import { colord } from "colord";
import { EventBus } from "../../../core/EventBus";
import { Cell, UnitType } from "../../../core/game/Game";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { GameView, UnitView } from "../../../core/game/GameView";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

// Visual constants
const TARGET_COLOR = colord({ r: 255, g: 50, b: 50 }); // Red danger color
const FADE_DURATION = 3000; // 3 seconds before fading out
const FADE_OUT_TIME = 1000; // 1 second fade out

// Target zone sizes (in tiles) - matching actual explosion radii
const ATOM_BOMB_RADIUS = 35;     // Half of 70 for visual clarity
const HYDROGEN_BOMB_RADIUS = 50; // Reduced from 80 (half of 160)
const MIRV_WARHEAD_RADIUS = 20;  // Smaller warheads

interface NukeTarget {
  unitId: number;
  targetTile: Cell;
  nukeType: UnitType;
  addedTime: number;
}

export class NukeTargetLayer implements Layer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private nukeTargets: Map<number, NukeTarget> = new Map();
  private animationTime: number = 0;

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
  ) {
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d", { alpha: true });
    if (context === null) throw new Error("2d context not supported");
    this.context = context;
  }

  shouldTransform(): boolean {
    return true;
  }

  init() {
    this.redraw();
  }

  tick() {
    // Update animation time
    this.animationTime = Date.now();
    
    const updates = this.game.updatesSinceLastTick();
    const unitUpdates = updates !== null ? updates[GameUpdateType.Unit] : [];
    
    let changed = false;
    
    for (const u of unitUpdates) {
      const unit = this.game.unit(u.id);
      
      if (unit && this.isNukeType(unit.type())) {
        // Check if this is a new nuke or if its target changed
        const existingTarget = this.nukeTargets.get(unit.id());
        const currentTarget = unit.targetTile();
        
        if (currentTarget && (!existingTarget || 
            existingTarget.targetTile.x !== this.game.x(currentTarget) || 
            existingTarget.targetTile.y !== this.game.y(currentTarget))) {
          // Add or update target
          this.nukeTargets.set(unit.id(), {
            unitId: unit.id(),
            targetTile: new Cell(this.game.x(currentTarget), this.game.y(currentTarget)),
            nukeType: unit.type(),
            addedTime: Date.now()
          });
          changed = true;
        }
      } else if (!unit && this.nukeTargets.has(u.id)) {
        // Nuke exploded or was destroyed
        this.nukeTargets.delete(u.id);
        changed = true;
      }
    }
    
    // Remove targets that have faded out
    const fadeOutComplete = FADE_DURATION + FADE_OUT_TIME;
    for (const [unitId, target] of this.nukeTargets) {
      if (this.animationTime - target.addedTime > fadeOutComplete) {
        this.nukeTargets.delete(unitId);
        changed = true;
      }
    }
    
    // Always redraw if we have active targets (for fade animation)
    if (changed || this.nukeTargets.size > 0) {
      this.redraw();
    }
  }

  redraw() {
    this.canvas.width = this.game.width() * 2;
    this.canvas.height = this.game.height() * 2;
    
    // Find all active nukes and their targets
    this.nukeTargets.clear();
    this.game.units().forEach((unit) => {
      if (this.isNukeType(unit.type())) {
        const target = unit.targetTile();
        if (target) {
          this.nukeTargets.set(unit.id(), {
            unitId: unit.id(),
            targetTile: new Cell(this.game.x(target), this.game.y(target)),
            nukeType: unit.type(),
            addedTime: Date.now()
          });
        }
      }
    });
  }

  renderLayer(context: CanvasRenderingContext2D) {
    if (this.nukeTargets.size === 0) return;
    
    // Draw target zones
    context.drawImage(
      this.canvas,
      -this.game.width() / 2,
      -this.game.height() / 2,
      this.game.width(),
      this.game.height(),
    );
    
    // Clear and redraw with animations
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.nukeTargets.forEach((target) => {
      this.drawTargetZone(target);
    });
  }

  private drawTargetZone(target: NukeTarget) {
    const centerX = target.targetTile.x * 2;
    const centerY = target.targetTile.y * 2;
    
    // Get radius based on nuke type
    let radius = ATOM_BOMB_RADIUS;
    if (target.nukeType === UnitType.HydrogenBomb) {
      radius = HYDROGEN_BOMB_RADIUS;
    } else if (target.nukeType === UnitType.MIRVWarhead) {
      radius = MIRV_WARHEAD_RADIUS;
    }
    radius *= 2; // Scale for canvas
    
    // Calculate fade out based on time
    const timeSinceAdded = this.animationTime - target.addedTime;
    let opacity = 1;
    
    if (timeSinceAdded > FADE_DURATION) {
      // Start fading out after FADE_DURATION
      const fadeProgress = Math.min((timeSinceAdded - FADE_DURATION) / FADE_OUT_TIME, 1);
      opacity = 1 - fadeProgress;
    }
    
    // Don't draw if fully faded
    if (opacity <= 0) return;
    
    this.context.save();
    this.context.translate(centerX, centerY);
    
    // Draw minimal target circle
    this.context.strokeStyle = TARGET_COLOR.alpha(0.6 * opacity).toRgbString();
    this.context.lineWidth = 1.5;
    this.context.setLineDash([5, 5]);
    this.context.beginPath();
    this.context.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
    this.context.stroke();
    
    // Draw minimal crosshair
    const crosshairSize = radius * 0.3;
    this.context.strokeStyle = TARGET_COLOR.alpha(0.7 * opacity).toRgbString();
    this.context.lineWidth = 1;
    this.context.setLineDash([]);
    
    // Horizontal line
    this.context.beginPath();
    this.context.moveTo(-crosshairSize, 0);
    this.context.lineTo(-crosshairSize * 0.4, 0);
    this.context.moveTo(crosshairSize * 0.4, 0);
    this.context.lineTo(crosshairSize, 0);
    this.context.stroke();
    
    // Vertical line
    this.context.beginPath();
    this.context.moveTo(0, -crosshairSize);
    this.context.lineTo(0, -crosshairSize * 0.4);
    this.context.moveTo(0, crosshairSize * 0.4);
    this.context.lineTo(0, crosshairSize);
    this.context.stroke();
    
    // Draw small center dot
    this.context.fillStyle = TARGET_COLOR.alpha(0.8 * opacity).toRgbString();
    this.context.beginPath();
    this.context.arc(0, 0, 2, 0, Math.PI * 2);
    this.context.fill();
    
    this.context.restore();
  }

  private isNukeType(type: UnitType): boolean {
    return type === UnitType.AtomBomb || 
           type === UnitType.HydrogenBomb || 
           type === UnitType.MIRV ||
           type === UnitType.MIRVWarhead;
  }
}