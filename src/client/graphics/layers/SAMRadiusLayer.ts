import { colord } from "colord";
import { EventBus } from "../../../core/EventBus";
import { Cell, UnitType } from "../../../core/game/Game";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { GameView, UnitView } from "../../../core/game/GameView";
import { UserSettings } from "../../../core/game/UserSettings";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

// SAM detection ranges from SAMLauncherExecution.ts
const BASE_SAM_SEARCH_RADIUS = 30; // Significantly reduced from 80
const SAM_RADIUS_PER_LEVEL = 10; // Additional radius per upgrade level
const SAM_TARGET_RADIUS = 120;
const MIRV_WARHEAD_SEARCH_RADIUS = 400;
const MIRV_WARHEAD_PROTECTION_RADIUS = 50;

// Visual styling constants
const BORDER_WIDTH = 1.5; // Width of the border in pixels
const DASH_LENGTH = 12; // Length of each dash in pixels
const GAP_LENGTH = 10; // Length of gap between dashes
const BORDER_COLOR = colord({ r: 100, g: 149, b: 237 }); // Cornflower blue
const BORDER_OPACITY = 0.7;

export class SAMRadiusLayer implements Layer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private samUnits: Map<number, UnitView> = new Map();
  private samLevels: Map<number, number> = new Map(); // Track levels for change detection
  private needsRedraw: boolean = true;
  private userSettings: UserSettings = new UserSettings();

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
    // Check if SAM radius visibility is disabled
    if (!this.userSettings.showSAMRadius()) {
      if (this.samUnits.size > 0) {
        this.samUnits.clear();
        this.clearCanvas();
      }
      return;
    }

    const updates = this.game.updatesSinceLastTick();
    const unitUpdates = updates !== null ? updates[GameUpdateType.Unit] : [];
    
    let changed = false;
    const myPlayer = this.game.myPlayer();
    
    for (const u of unitUpdates) {
      const unit = this.game.unit(u.id);
      
      if (unit && unit.type() === UnitType.SAMLauncher) {
        const isOwnedByMe = myPlayer && unit.owner().id() === myPlayer.id();
        
        if (unit.isActive() && isOwnedByMe) {
          const unitId = unit.id();
          const currentLevel = unit.level();
          const previousLevel = this.samLevels.get(unitId);
          
          if (!this.samUnits.has(unitId)) {
            // New SAM
            this.samUnits.set(unitId, unit);
            this.samLevels.set(unitId, currentLevel);
            changed = true;
          } else if (previousLevel !== undefined && previousLevel !== currentLevel) {
            // Level changed (upgraded)
            this.samLevels.set(unitId, currentLevel);
            changed = true;
          }
        } else {
          // Remove if not active or ownership changed
          if (this.samUnits.delete(unit.id())) {
            this.samLevels.delete(unit.id());
            changed = true;
          }
        }
      } else if (!unit && this.samUnits.has(u.id)) {
        this.samUnits.delete(u.id);
        this.samLevels.delete(u.id);
        changed = true;
      }
    }
    
    if (changed) {
      this.needsRedraw = true;
    }
    
    if (this.needsRedraw) {
      this.drawAllRadii();
      this.needsRedraw = false;
    }
  }

  redraw() {
    // Check if SAM radius visibility is disabled
    if (!this.userSettings.showSAMRadius()) {
      this.clearCanvas();
      return;
    }

    this.canvas.width = this.game.width() * 2;
    this.canvas.height = this.game.height() * 2;
    
    // Find all SAM launchers owned by the player
    this.samUnits.clear();
    this.samLevels.clear();
    const myPlayer = this.game.myPlayer();
    if (myPlayer) {
      this.game.units().forEach((unit) => {
        if (unit.type() === UnitType.SAMLauncher && 
            unit.isActive() && 
            unit.owner().id() === myPlayer.id()) {
          this.samUnits.set(unit.id(), unit);
          this.samLevels.set(unit.id(), unit.level());
        }
      });
    }
    
    this.drawAllRadii();
  }

  renderLayer(context: CanvasRenderingContext2D) {
    if (!this.userSettings.showSAMRadius()) {
      return;
    }
    
    context.drawImage(
      this.canvas,
      -this.game.width() / 2,
      -this.game.height() / 2,
      this.game.width(),
      this.game.height(),
    );
  }

  private clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawAllRadii() {
    this.clearCanvas();
    
    if (this.samUnits.size === 0) return;
    
    // Create a path that combines all circles
    const combinedPath = new Path2D();
    
    // Collect all SAM positions with radius based on level
    const samPositions: {x: number, y: number, radius: number}[] = [];
    this.samUnits.forEach((unit) => {
      const center = unit.tile();
      const centerX = this.game.x(center) * 2;
      const centerY = this.game.y(center) * 2;
      
      // Calculate radius based on unit level
      const unitLevel = unit.level();
      const effectiveRadius = BASE_SAM_SEARCH_RADIUS + (unitLevel * SAM_RADIUS_PER_LEVEL);
      const radius = effectiveRadius * 2; // Scale for canvas
      
      console.log(`SAM at (${centerX/2}, ${centerY/2}) - Level: ${unitLevel}, Radius: ${effectiveRadius} tiles`);
      
      samPositions.push({x: centerX, y: centerY, radius});
    });
    
    // Collect continuous arc segments for smooth dashed lines
    const arcSegments: {sam: number, startAngle: number, endAngle: number}[] = [];
    
    // For each SAM, find continuous arcs that are on the perimeter
    samPositions.forEach((sam, index) => {
      let segmentStart = -1;
      let lastWasPerimeter = false;
      
      // Check every degree around the circle
      for (let angle = 0; angle <= 360; angle++) {
        const rad = (angle * Math.PI) / 180;
        const pointX = sam.x + sam.radius * Math.cos(rad);
        const pointY = sam.y + sam.radius * Math.sin(rad);
        
        // Check if this point is inside any other circle
        let insideOther = false;
        for (let j = 0; j < samPositions.length; j++) {
          if (j !== index) {
            const other = samPositions[j];
            const dist = Math.sqrt(Math.pow(pointX - other.x, 2) + Math.pow(pointY - other.y, 2));
            if (dist < other.radius - 2) { // Small buffer to avoid edge issues
              insideOther = true;
              break;
            }
          }
        }
        
        const isPerimeter = !insideOther;
        
        // Track continuous segments
        if (isPerimeter && !lastWasPerimeter) {
          segmentStart = angle;
        } else if (!isPerimeter && lastWasPerimeter && segmentStart !== -1) {
          arcSegments.push({sam: index, startAngle: segmentStart, endAngle: angle - 1});
          segmentStart = -1;
        }
        
        lastWasPerimeter = isPerimeter;
      }
      
      // Close any remaining segment
      if (segmentStart !== -1) {
        arcSegments.push({sam: index, startAngle: segmentStart, endAngle: 360});
      }
    });
    
    // Draw continuous arcs for proper dashing
    arcSegments.forEach(segment => {
      const sam = samPositions[segment.sam];
      const startRad = (segment.startAngle * Math.PI) / 180;
      const endRad = (segment.endAngle * Math.PI) / 180;
      
      // Move to the start of the arc to prevent connecting lines
      const startX = sam.x + sam.radius * Math.cos(startRad);
      const startY = sam.y + sam.radius * Math.sin(startRad);
      combinedPath.moveTo(startX, startY);
      
      // Draw the arc
      combinedPath.arc(sam.x, sam.y, sam.radius, startRad, endRad, false);
    });
    
    // Draw the combined path with dashed stroke
    this.context.save();
    this.context.strokeStyle = BORDER_COLOR.alpha(BORDER_OPACITY).toRgbString();
    this.context.lineWidth = BORDER_WIDTH * 2;
    this.context.setLineDash([DASH_LENGTH * 2, GAP_LENGTH * 2]);
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    
    this.context.stroke(combinedPath);
    
    this.context.restore();
  }

  private paintCell(cell: Cell, color: colord.Colord, opacity: number) {
    this.context.fillStyle = color.alpha(opacity).toRgbString();
    this.context.fillRect(cell.x * 2, cell.y * 2, 2, 2);
  }
}