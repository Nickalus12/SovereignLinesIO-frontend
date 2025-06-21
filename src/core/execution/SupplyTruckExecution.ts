import {
  Execution,
  Game,
  isUnit,
  MessageType,
  OwnerComp,
  Player,
  Unit,
  UnitParams,
  UnitType,
  Tick,
} from "../game/Game";
import { TileRef } from "../game/GameMap";

// Supply Truck execution with simple movement logic
export class SupplyTruckExecution implements Execution {
  private mg: Game;
  private supplyTruck: Unit | null = null;
  private active = true;
  
  // Movement state
  private targetTile: TileRef | null = null;
  private lastMove: number = 0;
  private ticksPerMove = 3; // Move every 3 ticks (slower than boats)
  private lastTargetSearch = 0;
  
  // Constants
  private readonly NO_STACK_RADIUS = 50;
  private readonly BORDER_DISTANCE = 15; // Distance from border to position truck

  constructor(
    private input: (UnitParams<UnitType.SupplyTruck> & OwnerComp) | Unit,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    this.lastMove = ticks;
    
    if (isUnit(this.input)) {
      this.supplyTruck = this.input;
    } else {
      // Build the supply truck at the specified location
      const spawn = this.input.owner.canBuild(
        UnitType.SupplyTruck,
        this.input.destination ?? this.mg.ref(0, 0),
      );
      if (spawn === false) {
        console.warn(`Failed to spawn supply truck for ${this.input.owner.name()}`);
        this.active = false;
        return;
      }
      
      this.supplyTruck = this.input.owner.buildUnit(
        UnitType.SupplyTruck,
        spawn,
        this.input,
      );
    }

    // Initialize supply truck parameters
    if (this.supplyTruck) {
      this.supplyTruck.setDeployedAt(ticks);
      this.supplyTruck.setSuppliesRemaining(this.mg.config().supplyTruckSupplyDuration());
      
      this.mg.displayMessage(
        `Supply truck deployed, moving to border`,
        MessageType.UNIT_DESTROYED,
        this.supplyTruck.owner().id(),
      );
    }
  }

  tick(ticks: number): void {
    if (!this.supplyTruck || !this.supplyTruck.isActive()) {
      this.active = false;
      return;
    }

    // Check if truck is on enemy territory (captured) - destroy it
    const currentTile = this.supplyTruck.tile();
    const currentOwner = this.mg.owner(currentTile);
    if (currentOwner !== this.supplyTruck.owner() && currentOwner.isPlayer()) {
      this.mg.displayMessage(
        `Supply truck destroyed - territory captured!`,
        MessageType.UNIT_DESTROYED,
        this.supplyTruck.owner().id(),
      );
      this.supplyTruck.delete(false);
      this.active = false;
      return;
    }

    // Check for supplies depletion
    const suppliesRemaining = this.supplyTruck.suppliesRemaining();
    if (suppliesRemaining !== undefined && suppliesRemaining > 0) {
      this.supplyTruck.setSuppliesRemaining(suppliesRemaining - 1);
      if (suppliesRemaining - 1 <= 0) {
        this.mg.displayMessage(
          `Supply truck ran out of supplies`,
          MessageType.UNIT_DESTROYED,
          this.supplyTruck.owner().id(),
        );
        this.supplyTruck.delete(false);
        this.active = false;
        return;
      }
    }

    // Find new target every 5 seconds or if we don't have one
    if (ticks - this.lastTargetSearch >= 50 || !this.targetTile) {
      this.lastTargetSearch = ticks;
      this.findNearestBorderPosition();
    }

    // Move towards target
    if (ticks - this.lastMove >= this.ticksPerMove && this.targetTile) {
      this.lastMove = ticks;
      this.moveTowardsTarget();
    }
  }

  private findNearestBorderPosition(): void {
    if (!this.supplyTruck) return;
    
    const owner = this.supplyTruck.owner();
    const currentTile = this.supplyTruck.tile();
    const borderTiles = owner.borderTiles();
    
    if (borderTiles.length === 0) {
      this.targetTile = null;
      return;
    }

    // Smart border selection: score based on conflict level, border size, and proximity
    let bestBorder: TileRef | null = null;
    let bestScore = -Infinity;
    
    for (const border of borderTiles) {
      let score = 0;
      let conflictLevel = 0;
      let enemyTypes = new Set<string>();
      
      // Analyze conflict level and enemy diversity
      for (const neighbor of this.mg.neighbors(border)) {
        const neighborOwner = this.mg.owner(neighbor);
        if (neighborOwner.isPlayer() && neighborOwner !== owner && 
            !owner.isAlliedWith(neighborOwner as Player)) {
          conflictLevel++;
          enemyTypes.add(neighborOwner.id());
        }
      }
      
      if (conflictLevel > 0) {
        // Conflict score: more contested borders are more important
        score += conflictLevel * 50;
        
        // Enemy diversity bonus: borders facing multiple enemies are strategic
        score += enemyTypes.size * 25;
        
        // Border size bonus: find larger border sections
        let borderSectionSize = 1;
        const visited = new Set<TileRef>();
        const toCheck = [border];
        visited.add(border);
        
        while (toCheck.length > 0 && borderSectionSize < 20) { // Limit search depth
          const current = toCheck.pop()!;
          
          for (const neighbor of this.mg.neighbors(current)) {
            if (visited.has(neighbor)) continue;
            if (this.mg.owner(neighbor) === owner && this.mg.isBorder(neighbor)) {
              // Check if this border tile also has enemies nearby
              let hasEnemyNeighbor = false;
              for (const enemyCheck of this.mg.neighbors(neighbor)) {
                const enemyOwner = this.mg.owner(enemyCheck);
                if (enemyOwner.isPlayer() && enemyOwner !== owner && 
                    !owner.isAlliedWith(enemyOwner as Player)) {
                  hasEnemyNeighbor = true;
                  break;
                }
              }
              if (hasEnemyNeighbor) {
                visited.add(neighbor);
                toCheck.push(neighbor);
                borderSectionSize++;
              }
            }
          }
        }
        
        // Larger border sections get bonus points
        score += Math.min(borderSectionSize, 10) * 10;
        
        // Distance penalty (closer is better, but not the primary factor)
        const distance = this.mg.manhattanDist(currentTile, border);
        score -= distance * 0.5;
        
        // Update best border if this one scores higher
        if (score > bestScore) {
          bestScore = score;
          bestBorder = border;
        }
      }
    }
    
    // If no contested border found, fall back to nearest border
    if (!bestBorder && borderTiles.length > 0) {
      let minDistance = Infinity;
      for (const border of borderTiles) {
        const dist = this.mg.manhattanDist(currentTile, border);
        if (dist < minDistance) {
          minDistance = dist;
          bestBorder = border;
        }
      }
    }
    
    const nearestBorder = bestBorder;

    if (!nearestBorder) {
      this.targetTile = null;
      return;
    }

    // Find a position near the border (not on it)
    const borderX = this.mg.x(nearestBorder);
    const borderY = this.mg.y(nearestBorder);
    
    // Look for a valid position within range of the border
    let bestPosition: TileRef | null = null;
    let bestPositionScore = Infinity;
    
    for (let dx = -this.BORDER_DISTANCE; dx <= this.BORDER_DISTANCE; dx++) {
      for (let dy = -this.BORDER_DISTANCE; dy <= this.BORDER_DISTANCE; dy++) {
        const x = borderX + dx;
        const y = borderY + dy;
        
        if (x >= 0 && x < this.mg.width() && y >= 0 && y < this.mg.height()) {
          const tile = this.mg.ref(x, y);
          
          if (this.isValidPosition(tile)) {
            const distToBorder = Math.abs(dx) + Math.abs(dy);
            const distToCurrent = this.mg.manhattanDist(currentTile, tile);
            
            // Prefer positions that are close to ideal distance from border but not too far from current pos
            const positionScore = Math.abs(distToBorder - 10) + distToCurrent * 0.1;
            
            if (positionScore < bestPositionScore) {
              bestPositionScore = positionScore;
              bestPosition = tile;
            }
          }
        }
      }
    }
    
    this.targetTile = bestPosition;
    
    if (this.targetTile) {
      console.log(`Supply truck found new target at ${this.mg.x(this.targetTile)},${this.mg.y(this.targetTile)}`);
    } else {
      console.log(`Supply truck could not find valid position near border`);
    }
  }

  private moveTowardsTarget(): void {
    if (!this.supplyTruck || !this.targetTile) return;
    
    const currentTile = this.supplyTruck.tile();
    const currentX = this.mg.x(currentTile);
    const currentY = this.mg.y(currentTile);
    const targetX = this.mg.x(this.targetTile);
    const targetY = this.mg.y(this.targetTile);
    
    // Check if we've reached the target
    if (this.mg.manhattanDist(currentTile, this.targetTile) <= 2) {
      this.targetTile = null; // Clear target so we'll find a new one
      return;
    }
    
    // Simple directional movement - move one step towards target
    let nextX = currentX;
    let nextY = currentY;
    
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    
    // Move in the direction with larger distance difference
    if (Math.abs(dx) > Math.abs(dy)) {
      nextX += dx > 0 ? 1 : -1;
    } else if (dy !== 0) {
      nextY += dy > 0 ? 1 : -1;
    }
    
    // Validate the move
    if (nextX >= 0 && nextX < this.mg.width() && 
        nextY >= 0 && nextY < this.mg.height()) {
      const nextTile = this.mg.ref(nextX, nextY);
      
      if (this.mg.isLand(nextTile) && 
          this.mg.owner(nextTile) === this.supplyTruck.owner()) {
        console.log(`Supply truck moving from ${currentX},${currentY} to ${nextX},${nextY}`);
        this.supplyTruck.move(nextTile);
      } else {
        // Can't move there, try to find alternative direction
        this.findAlternativeMove(currentTile);
      }
    }
  }

  private findAlternativeMove(currentTile: TileRef): void {
    if (!this.supplyTruck) return;
    
    // Try moving in any valid direction
    const neighbors = this.mg.neighbors(currentTile);
    for (const neighbor of neighbors) {
      if (this.mg.isLand(neighbor) && 
          this.mg.owner(neighbor) === this.supplyTruck.owner()) {
        console.log(`Supply truck alternative move to ${this.mg.x(neighbor)},${this.mg.y(neighbor)}`);
        this.supplyTruck.move(neighbor);
        return;
      }
    }
    
    console.log(`Supply truck stuck - no valid moves available`);
  }

  private isValidPosition(tile: TileRef): boolean {
    if (!this.supplyTruck) return false;
    
    // Must be land
    if (!this.mg.isLand(tile)) return false;
    
    // Must be owned by the truck owner
    if (this.mg.owner(tile) !== this.supplyTruck.owner()) return false;
    
    // Check no other supply trucks nearby
    const owner = this.supplyTruck.owner();
    for (const truck of owner.units(UnitType.SupplyTruck)) {
      if (truck !== this.supplyTruck && 
          this.mg.manhattanDist(tile, truck.tile()) < this.NO_STACK_RADIUS) {
        return false;
      }
    }
    
    return true;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}