import { Game, Player, TerraNullius } from "../../game/Game";
import { TileRef } from "../../game/GameMap";

export interface EncirclementOpportunity {
  target: Player;
  surroundingPlayers: Set<Player>;
  borderCoverage: number; // 0-1, percentage of target's border we control
  isComplete: boolean; // true if target is completely surrounded
  vulnerabilityScore: number; // 0-1, how vulnerable the target is
  isLandlocked: boolean; // true if target has no ocean access
}

export interface EncirclementThreat {
  aggressor: Player;
  borderCoverage: number; // How much of our border they control
  isAlly: boolean; // Whether this is a supposed ally
  threatLevel: number; // 0-1, how serious the threat is
  otherAggressors: Set<Player>; // Other players participating in encirclement
}

export class EncirclementAnalyzer {
  private threatCache = new Map<Player, { threats: EncirclementThreat[], tick: number }>();
  private opportunityCache = new Map<Player, { opportunities: EncirclementOpportunity[], tick: number }>();
  private cacheDuration = 50; // Cache results for 50 ticks
  
  constructor(private game: Game) {}

  /**
   * Analyzes all neighbors of a player to find encirclement opportunities
   */
  findEncirclementOpportunities(player: Player): EncirclementOpportunity[] {
    // Check cache first
    const cached = this.opportunityCache.get(player);
    if (cached && this.game.ticks() - cached.tick < this.cacheDuration) {
      return cached.opportunities;
    }
    
    const opportunities: EncirclementOpportunity[] = [];
    const neighbors = player.neighbors().filter((n): n is Player => n.isPlayer());

    for (const target of neighbors) {
      const opportunity = this.analyzeEncirclement(player, target);
      if (opportunity && opportunity.vulnerabilityScore > 0.3) {
        opportunities.push(opportunity);
      }
    }

    // Sort by vulnerability score descending
    const sorted = opportunities.sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore);
    
    // Cache the results
    this.opportunityCache.set(player, { opportunities: sorted, tick: this.game.ticks() });
    
    return sorted;
  }

  /**
   * Analyzes if a player can encircle a target
   */
  private analyzeEncirclement(
    attacker: Player,
    target: Player
  ): EncirclementOpportunity | null {
    const targetBorderTiles = Array.from(target.borderTiles());
    if (targetBorderTiles.length === 0) return null;

    // Find all players that border the target
    const borderingPlayers = new Map<Player, number>();
    let oceanBorderCount = 0;
    let attackerBorderCount = 0;

    for (const borderTile of targetBorderTiles) {
      const neighbors = this.game.map().neighbors(borderTile);
      
      for (const neighbor of neighbors) {
        if (!this.game.map().isLand(neighbor)) {
          if (this.game.map().isOcean(neighbor)) {
            oceanBorderCount++;
          }
          continue;
        }

        const ownerID = this.game.map().ownerID(neighbor);
        if (ownerID === target.smallID()) continue;

        const owner = this.game.playerBySmallID(ownerID);
        if (!owner.isPlayer()) continue;

        const count = borderingPlayers.get(owner) || 0;
        borderingPlayers.set(owner, count + 1);

        if (owner === attacker) {
          attackerBorderCount++;
        }
      }
    }

    // Calculate total border exposure
    const totalBorderExposure = Array.from(borderingPlayers.values()).reduce(
      (sum, count) => sum + count,
      0
    ) + oceanBorderCount;

    if (totalBorderExposure === 0) return null;

    // Get all surrounding players that are friendly to the attacker
    const surroundingPlayers = new Set<Player>();
    let friendlyBorderCount = 0;

    for (const [player, count] of borderingPlayers.entries()) {
      if (player === attacker || attacker.isFriendly(player)) {
        surroundingPlayers.add(player);
        friendlyBorderCount += count;
      }
    }

    const borderCoverage = friendlyBorderCount / totalBorderExposure;
    const isLandlocked = oceanBorderCount === 0;
    const isComplete = borderCoverage >= 0.95 && isLandlocked;

    // Calculate vulnerability score based on multiple factors
    let vulnerabilityScore = borderCoverage;

    // Bonus for landlocked targets
    if (isLandlocked) {
      vulnerabilityScore += 0.2;
    }

    // Bonus if target is small
    const targetSize = target.numTilesOwned();
    const attackerSize = attacker.numTilesOwned();
    if (targetSize < attackerSize * 0.5) {
      vulnerabilityScore += 0.1;
    }

    // Bonus if target has low troop density
    const targetDensity = target.troops() / targetSize;
    const attackerDensity = attacker.troops() / attackerSize;
    if (targetDensity < attackerDensity * 0.7) {
      vulnerabilityScore += 0.1;
    }

    // Normalize vulnerability score
    vulnerabilityScore = Math.min(1, vulnerabilityScore);

    return {
      target,
      surroundingPlayers,
      borderCoverage,
      isComplete,
      vulnerabilityScore,
      isLandlocked,
    };
  }

  /**
   * Checks if a player is at risk of being encircled
   */
  isAtRiskOfEncirclement(player: Player): boolean {
    const threats = this.detectEncirclementThreats(player);
    return threats.some(threat => threat.threatLevel > 0.5);
  }

  /**
   * Detects all potential encirclement threats, including from allies
   */
  detectEncirclementThreats(player: Player): EncirclementThreat[] {
    // Check cache first
    const cached = this.threatCache.get(player);
    if (cached && this.game.ticks() - cached.tick < this.cacheDuration) {
      return cached.threats;
    }
    
    const threats: EncirclementThreat[] = [];
    const borderTiles = Array.from(player.borderTiles());
    if (borderTiles.length === 0) return threats;

    // Count border control by each neighbor
    const borderControl = new Map<Player, number>();
    let totalBorderExposure = 0;

    for (const borderTile of borderTiles) {
      const neighbors = this.game.map().neighbors(borderTile);
      
      for (const neighbor of neighbors) {
        if (!this.game.map().isLand(neighbor)) continue;

        const ownerID = this.game.map().ownerID(neighbor);
        if (ownerID === player.smallID()) continue;

        const owner = this.game.playerBySmallID(ownerID);
        if (!owner.isPlayer()) continue;

        const count = borderControl.get(owner) || 0;
        borderControl.set(owner, count + 1);
        totalBorderExposure++;
      }
    }

    // Analyze each potential aggressor
    for (const [aggressor, controlCount] of borderControl.entries()) {
      const borderCoverage = controlCount / totalBorderExposure;
      
      // Skip if they control too little border
      // Increased threshold to reduce false positives
      if (borderCoverage < 0.35) continue;

      // Check if this is an ally trying to encircle us
      const isAlly = player.isAlliedWith(aggressor) || player.isFriendly(aggressor);
      
      // Find other players who might be cooperating
      const otherAggressors = new Set<Player>();
      for (const [other, count] of borderControl.entries()) {
        if (other !== aggressor && other.isFriendly(aggressor)) {
          otherAggressors.add(other);
        }
      }

      // Calculate threat level
      let threatLevel = borderCoverage;
      
      // Increase threat if aggressor has allies helping
      const coalitionCoverage = Array.from(otherAggressors).reduce(
        (sum, ally) => sum + (borderControl.get(ally) || 0) / totalBorderExposure,
        borderCoverage
      );
      
      if (coalitionCoverage > borderCoverage) {
        threatLevel = coalitionCoverage;
      }

      // Allies encircling us is especially threatening
      if (isAlly && borderCoverage > 0.4) {
        threatLevel = Math.min(1, threatLevel * 1.3);
      }

      // If aggressor is much larger, increase threat
      if (aggressor.numTilesOwned() > player.numTilesOwned() * 2) {
        threatLevel = Math.min(1, threatLevel * 1.2);
      }

      threats.push({
        aggressor,
        borderCoverage,
        isAlly,
        threatLevel,
        otherAggressors
      });
    }

    // Sort by threat level descending
    const sorted = threats.sort((a, b) => b.threatLevel - a.threatLevel);
    
    // Cache the results
    this.threatCache.set(player, { threats: sorted, tick: this.game.ticks() });
    
    // Clean old cache entries periodically
    if (this.game.ticks() % 500 === 0) {
      this.cleanCache();
    }
    
    return sorted;
  }

  /**
   * Finds the weakest point in a player's border to break encirclement
   */
  findBreakoutTarget(encircledPlayer: Player): TileRef | null {
    const borderTiles = Array.from(encircledPlayer.borderTiles());
    let bestTarget: TileRef | null = null;
    let bestScore = -Infinity;

    for (const borderTile of borderTiles) {
      const neighbors = this.game.map().neighbors(borderTile);
      
      for (const neighbor of neighbors) {
        // Look for ocean access
        if (this.game.map().isOcean(neighbor)) {
          return neighbor;
        }

        if (!this.game.map().isLand(neighbor)) continue;

        const ownerID = this.game.map().ownerID(neighbor);
        if (ownerID === encircledPlayer.smallID()) continue;

        const owner = this.game.playerBySmallID(ownerID);
        
        // Calculate breakout score
        let score = 0;

        // Prefer attacking weaker players
        if (owner.isPlayer()) {
          const density = owner.troops() / owner.numTilesOwned();
          const ourDensity = encircledPlayer.troops() / encircledPlayer.numTilesOwned();
          score += (ourDensity - density) * 10;

          // Prefer attacking non-allied players
          if (!owner.isFriendly(encircledPlayer)) {
            score += 20;
          }
        } else {
          // Terra nullius is always a good target
          score += 50;
        }

        // Prefer tiles that lead to more expansion
        const expansion = this.countExpansionPotential(neighbor, encircledPlayer);
        score += expansion * 5;

        if (score > bestScore) {
          bestScore = score;
          bestTarget = neighbor;
        }
      }
    }

    return bestTarget;
  }

  private countExpansionPotential(tile: TileRef, player: Player): number {
    let count = 0;
    const visited = new Set<TileRef>();
    const queue = [tile];
    const maxDepth = 3;

    while (queue.length > 0 && visited.size < maxDepth * 4) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const neighbor of this.game.map().neighbors(current)) {
        if (!this.game.map().isLand(neighbor)) continue;
        
        const ownerID = this.game.map().ownerID(neighbor);
        if (ownerID !== player.smallID()) {
          count++;
          queue.push(neighbor);
        }
      }
    }

    return count;
  }
  
  private cleanCache(): void {
    const currentTick = this.game.ticks();
    const expiredTick = currentTick - this.cacheDuration * 2;
    
    // Clean threat cache
    for (const [player, data] of this.threatCache.entries()) {
      if (data.tick < expiredTick || !player.isAlive()) {
        this.threatCache.delete(player);
      }
    }
    
    // Clean opportunity cache
    for (const [player, data] of this.opportunityCache.entries()) {
      if (data.tick < expiredTick || !player.isAlive()) {
        this.opportunityCache.delete(player);
      }
    }
  }
}