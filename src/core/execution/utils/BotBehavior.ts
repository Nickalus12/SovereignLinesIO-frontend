import {
  AllianceRequest,
  Game,
  MessageType,
  Player,
  PlayerType,
  Relation,
  TerraNullius,
  Tick,
  UnitType,
} from "../../game/Game";
import { PseudoRandom } from "../../PseudoRandom";
import { flattenedEmojiTable } from "../../Util";
import { AttackExecution } from "../AttackExecution";
import { EmojiExecution } from "../EmojiExecution";
import { EncirclementAnalyzer, EncirclementOpportunity, EncirclementThreat } from "./EncirclementAnalyzer";

export class BotBehavior {
  private enemy: Player | null = null;
  private enemyUpdated: Tick;

  private assistAcceptEmoji = flattenedEmojiTable.indexOf("👍");

  private firstAttackSent = false;
  
  private encirclementAnalyzer: EncirclementAnalyzer;
  private currentEncirclementTarget: EncirclementOpportunity | null = null;
  private lastEncirclementCheck: number = 0;
  private detectedThreat: EncirclementThreat | null = null;
  private lastBreakoutAttempt: number = 0;
  private encirclementCheckCooldown: number = 100; // Start with longer cooldown

  constructor(
    private random: PseudoRandom,
    private game: Game,
    private player: Player,
    private triggerRatio: number,
    private reserveRatio: number,
  ) {
    this.encirclementAnalyzer = new EncirclementAnalyzer(game);
  }

  handleAllianceRequests() {
    for (const req of this.player.incomingAllianceRequests()) {
      // Check if the requestor is trying to encircle us
      const threats = this.encirclementAnalyzer.detectEncirclementThreats(this.player);
      const threatFromRequestor = threats.find(t => t.aggressor === req.requestor());
      
      if (threatFromRequestor && threatFromRequestor.borderCoverage > 0.3) {
        // Reject alliance from someone who controls too much of our border
        console.log(`${this.player.displayName()} rejecting alliance from ${req.requestor().displayName()} due to encirclement risk`);
        req.reject();
        continue;
      }
      
      if (shouldAcceptAllianceRequest(this.player, req)) {
        req.accept();
      } else {
        req.reject();
      }
    }
  }

  evaluateExistingAlliances() {
    // Check all current alliances for encirclement threats
    const alliances = this.player.alliances();
    const threats = this.encirclementAnalyzer.detectEncirclementThreats(this.player);
    
    for (const alliance of alliances) {
      const ally = alliance.other(this.player);
      const threatFromAlly = threats.find(t => t.aggressor === ally);
      
      if (threatFromAlly && threatFromAlly.threatLevel > 0.5) {
        console.log(`${this.player.displayName()} detected dangerous ally:`,
          `${ally.displayName()},`,
          `Border control: ${(threatFromAlly.borderCoverage * 100).toFixed(1)}%,`,
          `Threat level: ${(threatFromAlly.threatLevel * 100).toFixed(1)}%`);
        
        // Break alliance if they're clearly trying to surround us
        if (threatFromAlly.threatLevel > 0.6) {
          // MutableAlliance has expire() method
          if ('expire' in alliance) {
            (alliance as any).expire();
            console.log(`${this.player.displayName()} preemptively broke alliance with ${ally.displayName()} to prevent encirclement!`);
          }
          
          // Set as enemy immediately
          this.setNewEnemy(ally);
          this.player.updateRelation(ally, -100);
          
          // Send angry emoji if human
          if (ally.type() === PlayerType.Human) {
            this.emoji(ally, flattenedEmojiTable.indexOf("😠"));
          }
        } else {
          // Warn the ally with emoji if human
          if (ally.type() === PlayerType.Human && this.random.chance(5)) {
            this.emoji(ally, flattenedEmojiTable.indexOf("🤨"));
          }
        }
      }
    }
  }

  private emoji(player: Player, emoji: number) {
    if (player.type() !== PlayerType.Human) return;
    this.game.addExecution(new EmojiExecution(this.player, player.id(), emoji));
  }

  private setNewEnemy(newEnemy: Player | null) {
    this.enemy = newEnemy;
    this.enemyUpdated = this.game.ticks();
  }

  private clearEnemy() {
    this.enemy = null;
    this.currentEncirclementTarget = null;
    this.detectedThreat = null;
  }

  forgetOldEnemies() {
    // Forget old enemies
    if (this.game.ticks() - this.enemyUpdated > 100) {
      this.clearEnemy();
    }
    
    // Re-evaluate encirclement if target is no longer viable
    if (this.currentEncirclementTarget) {
      if (!this.currentEncirclementTarget.target.isAlive() ||
          !this.player.sharesBorderWith(this.currentEncirclementTarget.target)) {
        this.currentEncirclementTarget = null;
      }
    }
  }

  private isLateGame(): boolean {
    // Check if we're in late game based on various factors
    const players = this.game.players().filter(p => p.isAlive());
    const totalLandTiles = this.game.numLandTiles();
    
    // Check if any player owns a significant portion of the map
    for (const player of players) {
      const ownershipRatio = player.numTilesOwned() / totalLandTiles;
      if (ownershipRatio > 0.5) return true; // Someone owns >50% of the map
    }
    
    // Check if the game has been going on for a long time
    if (this.game.ticks() > 10000) return true; // 1000 seconds
    
    // Check if there are few players left
    if (players.length <= 3) return true;
    
    return false;
  }

  private getPlayerCloseToWinning(): Player | null {
    const winThreshold = this.game.config().percentageTilesOwnedToWin() / 100;
    const totalLandTiles = this.game.numLandTiles();
    const players = this.game.players().filter(p => p.isAlive());
    
    for (const player of players) {
      const ownershipRatio = player.numTilesOwned() / totalLandTiles;
      // If someone owns >60% of required win percentage, they're close to winning
      if (ownershipRatio > winThreshold * 0.6) {
        return player;
      }
    }
    
    return null;
  }

  private getDynamicTriggerRatio(): number {
    if (this.isLateGame()) {
      // In late game, attack with less population
      return Math.max(0.3, this.triggerRatio - 0.3);
    }
    return this.triggerRatio;
  }

  private getDynamicReserveRatio(): number {
    if (this.isLateGame()) {
      // In late game, keep fewer troops in reserve
      return Math.max(0.1, this.reserveRatio - 0.2);
    }
    return this.reserveRatio;
  }

  private hasSufficientTroops(): boolean {
    // Lower threshold if we're defending against encirclement
    if (this.detectedThreat && this.detectedThreat.threatLevel > 0.5) {
      const maxPop = this.game.config().maxPopulation(this.player);
      const ratio = this.player.population() / maxPop;
      return ratio >= 0.2; // Attack immediately when threatened
    }
    
    // Lower threshold if we're executing an encirclement
    if (this.currentEncirclementTarget && this.currentEncirclementTarget.vulnerabilityScore > 0.7) {
      const maxPop = this.game.config().maxPopulation(this.player);
      const ratio = this.player.population() / maxPop;
      return ratio >= 0.3; // Attack earlier for encirclement
    }
    
    const maxPop = this.game.config().maxPopulation(this.player);
    const ratio = this.player.population() / maxPop;
    return ratio >= this.getDynamicTriggerRatio();
  }

  private checkIncomingAttacks() {
    // Switch enemies if we're under attack
    const incomingAttacks = this.player.incomingAttacks();
    let largestAttack = 0;
    let largestAttacker: Player | undefined;
    for (const attack of incomingAttacks) {
      if (attack.troops() <= largestAttack) continue;
      largestAttack = attack.troops();
      largestAttacker = attack.attacker();
    }
    if (largestAttacker !== undefined) {
      this.setNewEnemy(largestAttacker);
    }
  }

  getNeighborTraitorToAttack(): Player | null {
    const traitors = this.player
      .neighbors()
      .filter((n): n is Player => n.isPlayer() && n.isTraitor());
    return traitors.length > 0 ? this.random.randElement(traitors) : null;
  }

  private checkEncirclementOpportunities(): void {
    // Skip if we recently attempted a breakout
    if (this.game.ticks() - this.lastBreakoutAttempt < 200) {
      return;
    }
    
    // First, check for threats against us
    const threats = this.encirclementAnalyzer.detectEncirclementThreats(this.player);
    
    if (threats.length > 0) {
      const highestThreat = threats[0];
      
      // Check if an ally is trying to encircle us
      if (highestThreat.isAlly && highestThreat.threatLevel > 0.4) {
        console.log(`${this.player.displayName()} detected ally ${highestThreat.aggressor.displayName()} attempting encirclement!`,
          `Border control: ${(highestThreat.borderCoverage * 100).toFixed(1)}%,`,
          `Threat level: ${(highestThreat.threatLevel * 100).toFixed(1)}%`);
        
        // Break alliance if threat is severe enough
        if (highestThreat.threatLevel > 0.6 && this.player.isAlliedWith(highestThreat.aggressor)) {
          // Find and break the alliance
          const alliance = this.player.allianceWith(highestThreat.aggressor);
          if (alliance) {
            // MutableAlliance has expire() method
            if ('expire' in alliance) {
              (alliance as any).expire();
              console.log(`${this.player.displayName()} broke alliance with ${highestThreat.aggressor.displayName()} due to encirclement threat!`);
            }
          }
        }
        
        // Set the threatening ally as enemy
        this.setNewEnemy(highestThreat.aggressor);
        this.currentEncirclementTarget = null;
        this.detectedThreat = highestThreat;
        this.lastBreakoutAttempt = this.game.ticks();
        
        // Update relations to hostile
        this.player.updateRelation(highestThreat.aggressor, -100);
        
        return;
      }
      
      // Handle non-ally threats
      if (highestThreat.threatLevel > 0.5) {
        // Find breakout target
        const breakoutTarget = this.encirclementAnalyzer.findBreakoutTarget(this.player);
        if (breakoutTarget && this.game.hasOwner(breakoutTarget)) {
          const owner = this.game.owner(breakoutTarget);
          if (owner.isPlayer() && !this.player.isFriendly(owner)) {
            this.setNewEnemy(owner);
            this.currentEncirclementTarget = null;
            this.detectedThreat = highestThreat;
            this.lastBreakoutAttempt = this.game.ticks();
            // Only log occasionally to reduce spam
            if (this.game.ticks() % 100 === 0) {
              console.log(`${this.player.displayName()} breaking out of encirclement by attacking ${owner.displayName()}`);
            }
            return;
          }
        }
      }
    }
    
    // Clear threat if it's no longer valid
    if (this.detectedThreat && threats.every(t => t.threatLevel < 0.3)) {
      this.detectedThreat = null;
    }

    // Now look for encirclement opportunities against others
    const opportunities = this.encirclementAnalyzer.findEncirclementOpportunities(this.player);
    
    // Find best encirclement opportunity
    if (opportunities.length > 0) {
      const bestOpportunity = opportunities[0];
      
      // Only pursue if it's a good opportunity
      if (bestOpportunity.vulnerabilityScore > 0.5 || bestOpportunity.isComplete) {
        this.currentEncirclementTarget = bestOpportunity;
        
        // Only log significant opportunities
        if (bestOpportunity.vulnerabilityScore > 0.7) {
          console.log(`${this.player.displayName()} identified encirclement opportunity:`,
            `Target: ${bestOpportunity.target.displayName()},`,
            `Coverage: ${(bestOpportunity.borderCoverage * 100).toFixed(1)}%,`,
            `Vulnerability: ${(bestOpportunity.vulnerabilityScore * 100).toFixed(1)}%`);
        }
        
        // Coordinate with allies if needed
        if (bestOpportunity.surroundingPlayers.size > 1) {
          for (const ally of bestOpportunity.surroundingPlayers) {
            if (ally !== this.player && ally.type() === PlayerType.Bot) {
              // Signal allied bots to also target this player
              // In the future, this could be done through shared state or messaging
              console.log(`${this.player.displayName()} coordinating encirclement with ${ally.displayName()}`);
            }
          }
        }
      }
    }
  }

  assistAllies() {
    outer: for (const ally of this.player.allies()) {
      if (ally.targets().length === 0) continue;
      if (this.player.relation(ally) < Relation.Friendly) {
        // this.emoji(ally, "🤦");
        continue;
      }
      for (const target of ally.targets()) {
        if (target === this.player) {
          // this.emoji(ally, "💀");
          continue;
        }
        if (this.player.isAlliedWith(target)) {
          // this.emoji(ally, "👎");
          continue;
        }
        // All checks passed, assist them
        this.player.updateRelation(ally, -20);
        this.setNewEnemy(target);
        this.emoji(ally, this.assistAcceptEmoji);
        break outer;
      }
    }
  }

  selectEnemy(): Player | null {
    // Don't check for encirclement in very early game
    if (this.game.ticks() > 500) {
      // Check for encirclement opportunities with dynamic cooldown
      if (this.game.ticks() - this.lastEncirclementCheck > this.encirclementCheckCooldown) {
        this.lastEncirclementCheck = this.game.ticks();
        this.checkEncirclementOpportunities();
        
        // Increase cooldown over time to reduce late-game lag
        if (this.game.ticks() > 5000) {
          this.encirclementCheckCooldown = Math.min(300, this.encirclementCheckCooldown + 20);
        }
      }
    }

    // If we have an active encirclement target, prioritize it
    if (this.currentEncirclementTarget && this.currentEncirclementTarget.vulnerabilityScore > 0.6) {
      this.setNewEnemy(this.currentEncirclementTarget.target);
      console.log(`${this.player.displayName()} executing encirclement strategy against ${this.currentEncirclementTarget.target.displayName()}`);
      return this.enemySanityCheck();
    }

    // Check if someone is close to winning - prioritize them
    const playerCloseToWinning = this.getPlayerCloseToWinning();
    if (playerCloseToWinning && playerCloseToWinning !== this.player) {
      // If they're not friendly, target them immediately
      if (!this.player.isFriendly(playerCloseToWinning)) {
        this.setNewEnemy(playerCloseToWinning);
        return this.enemySanityCheck();
      }
    }

    if (this.enemy === null) {
      // Save up troops until we reach the trigger ratio
      if (!this.hasSufficientTroops()) return null;

      // Prefer neighboring bots
      const bots = this.player
        .neighbors()
        .filter(
          (n): n is Player => n.isPlayer() && n.type() === PlayerType.Bot,
        );
      if (bots.length > 0) {
        const density = (p: Player) => p.troops() / p.numTilesOwned();
        let lowestDensityBot: Player | undefined;
        let lowestDensity = Infinity;

        for (const bot of bots) {
          const currentDensity = density(bot);
          if (currentDensity < lowestDensity) {
            lowestDensity = currentDensity;
            lowestDensityBot = bot;
          }
        }

        if (lowestDensityBot !== undefined) {
          this.setNewEnemy(lowestDensityBot);
        }
      }

      // Retaliate against incoming attacks
      if (this.enemy === null) {
        this.checkIncomingAttacks();
      }

      // Select the most hated player
      if (this.enemy === null) {
        const mostHated = this.player.allRelationsSorted()[0];
        if (
          mostHated !== undefined &&
          mostHated.relation === Relation.Hostile
        ) {
          this.setNewEnemy(mostHated.player);
        }
      }
    }

    // Sanity check, don't attack our allies or teammates
    return this.enemySanityCheck();
  }

  selectRandomEnemy(): Player | TerraNullius | null {
    // Check for encirclement opportunities
    if (this.game.ticks() - this.lastEncirclementCheck > 30) {
      this.lastEncirclementCheck = this.game.ticks();
      this.checkEncirclementOpportunities();
    }

    // If we have an active encirclement target, prioritize it
    if (this.currentEncirclementTarget && this.currentEncirclementTarget.vulnerabilityScore > 0.6) {
      this.setNewEnemy(this.currentEncirclementTarget.target);
      return this.enemySanityCheck();
    }

    // Check if someone is close to winning - prioritize them
    const playerCloseToWinning = this.getPlayerCloseToWinning();
    if (playerCloseToWinning && playerCloseToWinning !== this.player) {
      // If they're not friendly and we border them, target them immediately
      if (!this.player.isFriendly(playerCloseToWinning) && 
          this.player.sharesBorderWith(playerCloseToWinning)) {
        this.setNewEnemy(playerCloseToWinning);
        return this.enemySanityCheck();
      }
    }

    if (this.enemy === null) {
      // Save up troops until we reach the trigger ratio
      if (!this.hasSufficientTroops()) return null;

      // Choose a new enemy randomly
      const neighbors = this.player.neighbors();
      for (const neighbor of this.random.shuffleArray(neighbors)) {
        if (!neighbor.isPlayer()) continue;
        if (this.player.isFriendly(neighbor)) continue;
        if (neighbor.type() === PlayerType.FakeHuman) {
          if (this.random.chance(2)) {
            continue;
          }
        }
        this.setNewEnemy(neighbor);
      }

      // Retaliate against incoming attacks
      if (this.enemy === null) {
        this.checkIncomingAttacks();
      }

      // Select a traitor as an enemy
      if (this.enemy === null) {
        const toAttack = this.getNeighborTraitorToAttack();
        if (toAttack !== null) {
          if (!this.player.isFriendly(toAttack) && this.random.chance(3)) {
            this.setNewEnemy(toAttack);
          }
        }
      }
    }

    // Sanity check, don't attack our allies or teammates
    return this.enemySanityCheck();
  }

  private enemySanityCheck(): Player | null {
    if (this.enemy && this.player.isFriendly(this.enemy)) {
      this.clearEnemy();
    }
    return this.enemy;
  }

  sendAttack(target: Player | TerraNullius) {
    if (target.isPlayer() && this.player.isOnSameTeam(target)) return;
    const maxPop = this.game.config().maxPopulation(this.player);
    const maxTroops = maxPop * this.player.targetTroopRatio();
    
    // Be more aggressive during encirclement
    let reserveRatio = this.getDynamicReserveRatio();
    let attackMultiplier = 1.0;
    
    if (this.currentEncirclementTarget && target === this.currentEncirclementTarget.target) {
      // During encirclement, keep minimal reserves and attack with more troops
      reserveRatio = Math.max(0.05, reserveRatio * 0.3);
      
      // Attack with more troops based on vulnerability
      attackMultiplier = 1.0 + this.currentEncirclementTarget.vulnerabilityScore;
      
      // If target is completely surrounded, go all out
      if (this.currentEncirclementTarget.isComplete) {
        reserveRatio = 0.02; // Keep only 2% in reserve
        attackMultiplier = 2.0; // Double attack strength
      }
    }
    
    const targetTroops = maxTroops * reserveRatio;
    // Don't wait until it has sufficient reserves to send the first attack
    // to prevent the bot from waiting too long at the start of the game.
    const baseTroops = this.firstAttackSent
      ? this.player.troops() - targetTroops
      : this.player.troops() / 5;
    
    const troops = Math.floor(baseTroops * attackMultiplier);
    if (troops < 1) return;
    
    this.firstAttackSent = true;
    this.game.addExecution(
      new AttackExecution(
        troops,
        this.player,
        target.isPlayer() ? target.id() : null,
      ),
    );
  }
}

function shouldAcceptAllianceRequest(player: Player, request: AllianceRequest) {
  if (player.relation(request.requestor()) < Relation.Neutral) {
    return false; // Reject if hasMalice
  }
  if (request.requestor().isTraitor()) {
    return false; // Reject if isTraitor
  }
  if (request.requestor().numTilesOwned() > player.numTilesOwned() * 3) {
    return true; // Accept if requestorIsMuchLarger
  }
  if (request.requestor().alliances().length >= 3) {
    return false; // Reject if tooManyAlliances
  }
  return true; // Accept otherwise
}
