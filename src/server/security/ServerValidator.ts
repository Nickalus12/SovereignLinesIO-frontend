import { Game, Player, UnitType, PlayerID, Gold } from "../../core/game/Game";
import { TileRef } from "../../core/game/GameMap";
import { Intent } from "../../core/Schemas";
import { logger } from "../Logger";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  severity?: "warning" | "error" | "critical";
}

export class ServerValidator {
  private logger = logger.child({ component: "ServerValidator" });
  
  // Cache for expensive calculations
  private visibilityCache: Map<string, Set<number>> = new Map();
  private pathCache: Map<string, boolean> = new Map();
  private cacheTimeout = 5000; // 5 seconds
  
  constructor(private game: Game) {
    
    // Clear caches periodically
    setInterval(() => {
      this.visibilityCache.clear();
      this.pathCache.clear();
    }, this.cacheTimeout);
  }

  /**
   * Validate all game actions server-side
   */
  public validateIntent(
    player: Player,
    intent: Intent
  ): ValidationResult {
    try {
      switch (intent.type) {
        case "attack":
          return this.validateAttack(player, intent);
        
        case "build_unit":
          return this.validateBuild(player, intent);
        
        case "spawn":
          return this.validateSpawn(player, intent);
        
        case "boat":
          return this.validateSendBoat(player, intent);
        
        case "donate_gold":
          return this.validateDonateGold(player, intent);
        
        case "donate_troops":
          return this.validateDonateTroop(player, intent);
        
        case "troop_ratio":
          return this.validateTroopRatio(player, intent);
        
        default:
          return { valid: true };
      }
    } catch (error) {
      this.logger.error("Validation error", { error, intentType: intent.type, playerId: player.id() });
      return {
        valid: false,
        reason: "Internal validation error",
        severity: "error",
      };
    }
  }

  private validateAttack(player: Player, intent: any): ValidationResult {
    const { targetID, troops } = intent;
    
    // 1. Validate target exists
    if (!targetID) {
      return {
        valid: false,
        reason: "No target specified",
        severity: "error",
      };
    }
    
    // 2. Validate troops amount
    const amount = troops || 0;
    if (amount <= 0 || !Number.isInteger(amount)) {
      return {
        valid: false,
        reason: "Invalid troop amount",
        severity: "warning",
      };
    }
    
    // 3. Validate player owns at least one tile
    if (player.numTilesOwned() === 0) {
      return {
        valid: false,
        reason: "No territories owned",
        severity: "error",
      };
    }
    
    // 4. Validate troops available
    const availableTroops = Math.floor(player.troops() * player.targetTroopRatio());
    if (amount > availableTroops) {
      return {
        valid: false,
        reason: "Insufficient troops",
        severity: "warning",
      };
    }
    
    // 5. Get target player
    const targetPlayer = this.game.player(targetID);
    if (!targetPlayer) {
      return {
        valid: false,
        reason: "Invalid target player",
        severity: "error",
      };
    }
    
    // 6. Validate can attack target
    if (!player.canTarget(targetPlayer)) {
      return {
        valid: false,
        reason: "Cannot target this player",
        severity: "error",
      };
    }
    
    // 7. Validate not attacking ally
    if (player.isAlliedWith(targetPlayer)) {
      return {
        valid: false,
        reason: "Cannot attack ally",
        severity: "warning",
      };
    }
    
    // 8. Check for ongoing attacks (prevent spam)
    const existingAttacks = player.outgoingAttacks().filter(a => 
      a.isActive() && a.target() === targetPlayer
    );
    
    if (existingAttacks.length > 5) {
      return {
        valid: false,
        reason: "Too many ongoing attacks",
        severity: "warning",
      };
    }
    
    return { valid: true };
  }

  private validateBuild(player: Player, intent: any): ValidationResult {
    const { x, y, unit: unitType } = intent;
    
    // 1. Validate coordinates and get tile
    if (typeof x !== "number" || typeof y !== "number") {
      return {
        valid: false,
        reason: "Invalid coordinates",
        severity: "error",
      };
    }
    
    const tile = this.game.map().ref(x, y);
    if (!this.game.map().isValidCoord(x, y)) {
      return {
        valid: false,
        reason: "Invalid coordinates",
        severity: "error",
      };
    }
    
    // 2. Validate ownership
    const owner = this.game.owner(tile);
    if (owner !== player) {
      return {
        valid: false,
        reason: "Not your territory",
        severity: "error",
      };
    }
    
    // 2. Validate unit type
    const validUnitTypes = Object.values(UnitType);
    if (!validUnitTypes.includes(unitType)) {
      return {
        valid: false,
        reason: "Invalid unit type",
        severity: "error",
      };
    }
    
    // 4. Get unit info and validate cost
    const unitInfo = this.game.unitInfo(unitType);
    if (!unitInfo) {
      return {
        valid: false,
        reason: "Invalid unit type",
        severity: "error",
      };
    }
    
    const cost = unitInfo.cost(player);
    if (player.gold() < cost) {
      return {
        valid: false,
        reason: "Insufficient gold",
        severity: "warning",
      };
    }
    
    // 5. Validate build conditions
    switch (unitType) {
      case UnitType.Port:
        // Must be coastal
        if (!this.game.map().isShore(tile)) {
          return {
            valid: false,
            reason: "Ports must be built on coast",
            severity: "warning",
          };
        }
        break;
      
      case UnitType.MissileSilo:
        // Check if player already has max silos
        const siloCount = player.units().filter(u => u.type() === UnitType.MissileSilo).length;
        if (siloCount >= 5) { // Example limit
          return {
            valid: false,
            reason: "Maximum missile silos reached",
            severity: "warning",
          };
        }
        break;
    }
    
    // 6. Check if player can build this unit type at this location
    const canBuildTile = player.canBuild(unitType, tile);
    if (!canBuildTile) {
      return {
        valid: false,
        reason: "Cannot build here",
        severity: "warning",
      };
    }
    
    return { valid: true };
  }

  private validateSpawn(player: Player, intent: any): ValidationResult {
    const { x, y } = intent;
    
    // 1. Check if already alive
    if (player.isAlive()) {
      return {
        valid: false,
        reason: "Already spawned",
        severity: "warning",
      };
    }
    
    // 2. Validate coordinates
    if (typeof x !== "number" || typeof y !== "number") {
      return {
        valid: false,
        reason: "Invalid coordinates",
        severity: "error",
      };
    }
    
    // 3. Get tile reference
    const tile = this.game.map().ref(x, y);
    if (!this.game.map().isValidCoord(x, y) || !this.game.map().isLand(tile)) {
      return {
        valid: false,
        reason: "Invalid spawn location",
        severity: "error",
      };
    }
    
    // 4. Check if unowned
    const owner = this.game.owner(tile);
    if (owner !== this.game.terraNullius()) {
      return {
        valid: false,
        reason: "Territory already owned",
        severity: "warning",
      };
    }
    
    // 5. Check if still in spawn phase
    if (!this.game.inSpawnPhase()) {
      return {
        valid: false,
        reason: "Spawn phase has ended",
        severity: "warning",
      };
    }
    
    // 6. Check if spawn location is too close to other players
    const minDistance = 5; // tiles
    for (const otherPlayer of this.game.players()) {
      if (otherPlayer === player || !otherPlayer.isAlive()) continue;
      
      // Check distance to other player's tiles
      for (const otherTile of otherPlayer.tiles()) {
        const distance = this.game.map().manhattanDist(tile, otherTile);
        if (distance < minDistance) {
          return {
            valid: false,
            reason: "Too close to other players",
            severity: "warning",
          };
        }
      }
    }
    
    return { valid: true };
  }

  private validateSendBoat(player: Player, intent: any): ValidationResult {
    const { dstX, dstY, troops } = intent;
    
    // 1. Validate player has transport ships
    const transportShips = player.units(UnitType.TransportShip);
    if (transportShips.length === 0) {
      return {
        valid: false,
        reason: "No transport ships available",
        severity: "warning",
      };
    }
    
    // 2. Validate troops
    if (troops <= 0 || troops > player.troops()) {
      return {
        valid: false,
        reason: "Invalid troop count",
        severity: "warning",
      };
    }
    
    // 3. Validate destination
    if (typeof dstX !== "number" || typeof dstY !== "number") {
      return {
        valid: false,
        reason: "Invalid destination coordinates",
        severity: "error",
      };
    }
    
    const targetTile = this.game.map().ref(dstX, dstY);
    if (!this.game.map().isValidCoord(dstX, dstY)) {
      return {
        valid: false,
        reason: "Invalid destination",
        severity: "error",
      };
    }
    
    // 4. Check if coastal
    if (!this.game.map().isShore(targetTile)) {
      return {
        valid: false,
        reason: "Boats can only land on coast",
        severity: "warning",
      };
    }
    
    // 5. Check if player has coastal territory
    let hasCoastal = false;
    for (const tile of player.tiles()) {
      if (this.game.map().isShore(tile)) {
        hasCoastal = true;
        break;
      }
    }
    
    if (!hasCoastal) {
      return {
        valid: false,
        reason: "No coastal territory to launch from",
        severity: "warning",
      };
    }
    
    return { valid: true };
  }


  private validateDonateGold(player: Player, intent: any): ValidationResult {
    const { recipient, gold } = intent;
    
    // 1. Validate amount
    const amount = BigInt(gold || 0);
    if (amount <= 0n || amount > player.gold()) {
      return {
        valid: false,
        reason: "Invalid gold amount",
        severity: "warning",
      };
    }
    
    // 2. Get target player
    const targetPlayer = this.game.player(recipient);
    if (!targetPlayer || targetPlayer === player) {
      return {
        valid: false,
        reason: "Invalid target player",
        severity: "error",
      };
    }
    
    // 3. Check if can donate
    if (!player.canDonate(targetPlayer)) {
      return {
        valid: false,
        reason: "Cannot donate to this player",
        severity: "warning",
      };
    }
    
    // 4. Check donation limit (prevent gold laundering)
    const maxDonation = player.gold() / 2n; // 50% max
    if (amount > maxDonation) {
      return {
        valid: false,
        reason: "Donation limit exceeded",
        severity: "warning",
      };
    }
    
    return { valid: true };
  }

  private validateDonateTroop(player: Player, intent: any): ValidationResult {
    const { recipient, troops } = intent;
    
    // 1. Validate amount
    const amount = troops || 0;
    if (amount <= 0 || amount > player.troops()) {
      return {
        valid: false,
        reason: "Invalid troop amount",
        severity: "warning",
      };
    }
    
    // 2. Get target player
    const targetPlayer = this.game.player(recipient);
    if (!targetPlayer || targetPlayer === player) {
      return {
        valid: false,
        reason: "Invalid target player",
        severity: "error",
      };
    }
    
    // 3. Check if can donate
    if (!player.canDonate(targetPlayer)) {
      return {
        valid: false,
        reason: "Cannot donate to this player",
        severity: "warning",
      };
    }
    
    return { valid: true };
  }

  private validateTroopRatio(player: Player, intent: any): ValidationResult {
    const { ratio } = intent;
    
    if (typeof ratio !== "number" || ratio < 0 || ratio > 1) {
      return {
        valid: false,
        reason: "Invalid ratio",
        severity: "error",
      };
    }
    
    // Ratio changes are generally allowed without cooldown
    
    return { valid: true };
  }

  // Helper methods
  /**
   * Check if a player has enough active units of a given type
   */
  private hasActiveUnit(player: Player, unitType: UnitType): boolean {
    return player.units(unitType).some(u => u.isActive());
  }
  
  /**
   * Get cache key for visibility checks
   */
  private getVisibilityCacheKey(playerId: string, targetId: string): string {
    return `${playerId}-${targetId}`;
  }
}