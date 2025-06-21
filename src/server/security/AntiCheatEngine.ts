import { Game, Player, PlayerType, UnitType } from "../../core/game/Game";
import { Intent } from "../../core/Schemas";
import { Client } from "../Client";
import { logger } from "../Logger";
import type { Logger } from "winston";
import crypto from "crypto";

export interface CheatDetection {
  playerId: string;
  type: CheatType;
  confidence: number; // 0-1
  details: string;
  timestamp: number;
  actions?: PlayerAction[];
}

export enum CheatType {
  SPEED_HACK = "SPEED_HACK",
  RESOURCE_MANIPULATION = "RESOURCE_MANIPULATION",
  IMPOSSIBLE_ACTION = "IMPOSSIBLE_ACTION",
  WALL_HACK = "WALL_HACK",
  AUTO_CLICKER = "AUTO_CLICKER",
  MODIFIED_CLIENT = "MODIFIED_CLIENT",
  REPLAY_ATTACK = "REPLAY_ATTACK",
  DESYNC_EXPLOIT = "DESYNC_EXPLOIT",
}

interface PlayerAction {
  type: string;
  timestamp: number;
  data: any;
  hash?: string;
}

interface PlayerMetrics {
  actionsPerMinute: number[];
  averageReactionTime: number;
  clickAccuracy: number;
  suspiciousPatterns: number;
  lastActionTime: number;
  actionHistory: PlayerAction[];
  warnings: number;
  violations: CheatDetection[];
}

export class AntiCheatEngine {
  private playerMetrics = new Map<string, PlayerMetrics>();
  private globalMetrics = {
    averageAPM: 0,
    averageReactionTime: 0,
    standardDeviationAPM: 0,
  };
  
  // Thresholds
  private readonly MAX_APM = 300; // Actions per minute
  private readonly MIN_REACTION_TIME = 50; // milliseconds
  private readonly MAX_CLICK_ACCURACY = 0.99; // 99% accuracy is suspicious
  private readonly ACTION_HISTORY_SIZE = 1000;
  private readonly PATTERN_THRESHOLD = 5; // Suspicious patterns before flagging
  
  constructor(
    private game: Game,
    private logger: Logger = logger.child({ component: "AntiCheatEngine" })
  ) {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // Calculate baseline metrics from bot behavior
    this.globalMetrics.averageAPM = 60;
    this.globalMetrics.averageReactionTime = 250;
    this.globalMetrics.standardDeviationAPM = 20;
  }

  public validateIntent(
    client: Client,
    intent: Intent
  ): { valid: boolean; reason?: string } {
    const player = this.game.playerByClientID(client.clientID);
    if (!player) {
      return { valid: false, reason: "No player associated with client" };
    }

    const metrics = this.getOrCreateMetrics(player.id());
    const now = Date.now();
    
    // Record action
    const action: PlayerAction = {
      type: intent.type,
      timestamp: now,
      data: intent,
      hash: this.hashAction(intent.type, intent, now),
    };
    
    metrics.actionHistory.push(action);
    if (metrics.actionHistory.length > this.ACTION_HISTORY_SIZE) {
      metrics.actionHistory.shift();
    }

    // Perform validations
    const validations = [
      this.validateActionRate(player, metrics, now),
      this.validateActionTiming(player, metrics, now),
      this.validateActionContent(player, intent),
      this.validateGameState(player, intent),
      this.detectPatterns(player, metrics),
    ];

    const failedValidation = validations.find(v => !v.valid);
    if (failedValidation) {
      this.recordViolation(player, failedValidation.detection!);
      return { valid: false, reason: failedValidation.reason };
    }

    // Update metrics
    metrics.lastActionTime = now;
    this.updateAPM(metrics, now);

    return { valid: true };
  }

  private validateActionRate(
    player: Player,
    metrics: PlayerMetrics,
    now: number
  ): { valid: boolean; reason?: string; detection?: CheatDetection } {
    const timeSinceLastAction = now - metrics.lastActionTime;
    
    // Check for superhuman speed
    if (timeSinceLastAction < this.MIN_REACTION_TIME && metrics.lastActionTime > 0) {
      return {
        valid: false,
        reason: "Action too fast",
        detection: {
          playerId: player.id(),
          type: CheatType.SPEED_HACK,
          confidence: 0.9,
          details: `Action performed in ${timeSinceLastAction}ms`,
          timestamp: now,
        },
      };
    }

    // Check APM
    const currentAPM = this.calculateCurrentAPM(metrics, now);
    if (currentAPM > this.MAX_APM) {
      return {
        valid: false,
        reason: "APM too high",
        detection: {
          playerId: player.id(),
          type: CheatType.AUTO_CLICKER,
          confidence: 0.8,
          details: `APM: ${currentAPM}`,
          timestamp: now,
        },
      };
    }

    return { valid: true };
  }

  private validateActionTiming(
    player: Player,
    metrics: PlayerMetrics,
    now: number
  ): { valid: boolean; reason?: string; detection?: CheatDetection } {
    // Check for consistent timing patterns (bot-like behavior)
    const recentActions = metrics.actionHistory.slice(-20);
    if (recentActions.length >= 20) {
      const intervals: number[] = [];
      for (let i = 1; i < recentActions.length; i++) {
        intervals.push(recentActions[i].timestamp - recentActions[i - 1].timestamp);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      
      // Too consistent timing is suspicious
      if (stdDev < 10 && avgInterval < 1000) {
        return {
          valid: false,
          reason: "Suspicious timing pattern",
          detection: {
            playerId: player.id(),
            type: CheatType.AUTO_CLICKER,
            confidence: 0.7,
            details: `Consistent ${avgInterval}ms intervals`,
            timestamp: now,
          },
        };
      }
    }

    return { valid: true };
  }

  private validateActionContent(
    player: Player,
    intent: Intent
  ): { valid: boolean; reason?: string; detection?: CheatDetection } {
    switch (intent.type) {
      case "attack":
        return this.validateAttack(player, intent);
      case "build_unit":
        return this.validateBuild(player, intent);
      case "spawn":
        return this.validateSpawn(player, intent);
      case "boat":
        return this.validateBoat(player, intent);
      default:
        return { valid: true };
    }
  }

  private validateAttack(
    player: Player,
    intent: any
  ): { valid: boolean; reason?: string; detection?: CheatDetection } {
    const { targetID, troops } = intent;
    
    // Basic validation - more detailed validation is in ServerValidator
    if (!targetID || !troops || troops <= 0) {
      return {
        valid: false,
        reason: "Invalid attack parameters",
        detection: {
          playerId: player.id(),
          type: CheatType.IMPOSSIBLE_ACTION,
          confidence: 1.0,
          details: `Invalid attack intent`,
          timestamp: Date.now(),
        },
      };
    }

    // Validate troops available
    const availableTroops = Math.floor(player.troops() * player.targetTroopRatio());
    if (troops > availableTroops) {
      return {
        valid: false,
        reason: "Invalid troop amount",
        detection: {
          playerId: player.id(),
          type: CheatType.RESOURCE_MANIPULATION,
          confidence: 1.0,
          details: `Attacking with ${troops} troops but only has ${availableTroops} available`,
          timestamp: Date.now(),
        },
      };
    }

    return { valid: true };
  }

  private validateBuild(
    player: Player,
    intent: any
  ): { valid: boolean; reason?: string; detection?: CheatDetection } {
    const { x, y, unit: unitType } = intent;
    
    if (typeof x !== "number" || typeof y !== "number") {
      return {
        valid: false,
        reason: "Invalid coordinates",
        detection: {
          playerId: player.id(),
          type: CheatType.IMPOSSIBLE_ACTION,
          confidence: 1.0,
          details: `Invalid build coordinates`,
          timestamp: Date.now(),
        },
      };
    }

    // Validate resources
    const unitInfo = this.game.unitInfo(unitType);
    if (unitInfo) {
      const cost = unitInfo.cost(player);
      if (player.gold() < cost) {
        return {
        valid: false,
        reason: "Insufficient resources",
        detection: {
          playerId: player.id(),
          type: CheatType.RESOURCE_MANIPULATION,
          confidence: 1.0,
          details: `Building ${unitType} with ${player.gold()} gold (needs ${cost})`,
          timestamp: Date.now(),
        },
        };
      }
    }

    return { valid: true };
  }

  private validateSpawn(
    player: Player,
    intent: any
  ): { valid: boolean; reason?: string; detection?: CheatDetection } {
    // Check if player is already spawned
    if (player.isAlive()) {
      return {
        valid: false,
        reason: "Already spawned",
        detection: {
          playerId: player.id(),
          type: CheatType.IMPOSSIBLE_ACTION,
          confidence: 1.0,
          details: "Attempting to spawn while alive",
          timestamp: Date.now(),
        },
      };
    }

    // Validate spawn location
    const { x, y } = intent;
    
    if (!this.game.map().isValidCoord(x, y)) {
      return {
        valid: false,
        reason: "Invalid spawn location",
        detection: {
          playerId: player.id(),
          type: CheatType.IMPOSSIBLE_ACTION,
          confidence: 0.9,
          details: `Invalid spawn coordinates ${x},${y}`,
          timestamp: Date.now(),
        },
      };
    }
    
    const tile = this.game.map().ref(x, y);
    const owner = this.game.owner(tile);
    
    if (owner !== this.game.terraNullius()) {
      return {
        valid: false,
        reason: "Invalid spawn location",
        detection: {
          playerId: player.id(),
          type: CheatType.IMPOSSIBLE_ACTION,
          confidence: 0.9,
          details: `Spawning on owned territory at ${x},${y}`,
          timestamp: Date.now(),
        },
      };
    }

    return { valid: true };
  }

  private validateBoat(
    player: Player,
    intent: any
  ): { valid: boolean; reason?: string; detection?: CheatDetection } {
    const { dstX, dstY, troops } = intent;
    
    // Validate player has transport ships
    const transportShips = player.units(UnitType.TransportShip);
    if (transportShips.length === 0) {
      return {
        valid: false,
        reason: "No transport ships available",
        detection: {
          playerId: player.id(),
          type: CheatType.IMPOSSIBLE_ACTION,
          confidence: 1.0,
          details: "Sending boat without any transport ships",
          timestamp: Date.now(),
        },
      };
    }

    // Validate troop count
    if (troops > player.troops()) {
      return {
        valid: false,
        reason: "Insufficient troops",
        detection: {
          playerId: player.id(),
          type: CheatType.RESOURCE_MANIPULATION,
          confidence: 1.0,
          details: `Sending ${troops} troops but only has ${player.troops()}`,
          timestamp: Date.now(),
        },
      };
    }

    return { valid: true };
  }

  private validateGameState(
    player: Player,
    intent: Intent
  ): { valid: boolean; reason?: string; detection?: CheatDetection } {
    // Check game state validations
    // For now, we'll do basic checks - fog of war would go here
    
    // Check if player is trying to act while dead
    if (!player.isAlive() && intent.type !== "spawn") {
      return {
        valid: false,
        reason: "Player is dead",
        detection: {
          playerId: player.id(),
          type: CheatType.IMPOSSIBLE_ACTION,
          confidence: 1.0,
          details: "Acting while dead",
          timestamp: Date.now(),
        },
      };
    }

    return { valid: true };
  }

  private detectPatterns(
    player: Player,
    metrics: PlayerMetrics
  ): { valid: boolean; reason?: string; detection?: CheatDetection } {
    // Detect replay attacks
    const recentHashes = metrics.actionHistory.slice(-50).map(a => a.hash);
    const uniqueHashes = new Set(recentHashes);
    
    if (recentHashes.length > 20 && uniqueHashes.size < recentHashes.length * 0.5) {
      return {
        valid: false,
        reason: "Suspicious pattern detected",
        detection: {
          playerId: player.id(),
          type: CheatType.REPLAY_ATTACK,
          confidence: 0.7,
          details: "Repeated action patterns",
          timestamp: Date.now(),
        },
      };
    }

    // Detect perfect accuracy
    const attacks = metrics.actionHistory.filter(a => a.type === "attack");
    if (attacks.length > 50) {
      // Calculate success rate (this is simplified - implement based on your game logic)
      const successRate = 0.95; // Placeholder
      
      if (successRate > this.MAX_CLICK_ACCURACY) {
        metrics.suspiciousPatterns++;
        
        if (metrics.suspiciousPatterns > this.PATTERN_THRESHOLD) {
          return {
            valid: false,
            reason: "Suspicious accuracy",
            detection: {
              playerId: player.id(),
              type: CheatType.AUTO_CLICKER,
              confidence: 0.6,
              details: `${(successRate * 100).toFixed(1)}% accuracy`,
              timestamp: Date.now(),
            },
          };
        }
      }
    }

    return { valid: true };
  }

  private recordViolation(player: Player, detection: CheatDetection) {
    const metrics = this.getOrCreateMetrics(player.id());
    metrics.violations.push(detection);
    metrics.warnings++;

    this.logger.warn("Cheat detected", {
      playerId: player.id(),
      playerName: player.displayName(),
      detection,
      warnings: metrics.warnings,
    });

    // Take action based on confidence and warnings
    if (detection.confidence > 0.9 || metrics.warnings > 3) {
      this.handleCheater(player, detection);
    }
  }

  private handleCheater(player: Player, detection: CheatDetection) {
    // Log for review
    this.logger.error("Player flagged for cheating", {
      playerId: player.id(),
      playerName: player.displayName(),
      detection,
      allViolations: this.playerMetrics.get(player.id())?.violations,
    });

    // Possible actions:
    // 1. Disconnect player
    // 2. Shadow ban (let them play but don't affect others)
    // 3. Report to admin panel
    // 4. Temporary suspension
    
    // For now, just mark them
    if (player.type() === PlayerType.Human) {
      // You could emit an event here for the server to handle
      // this.game.emit('cheat-detected', { player, detection });
    }
  }

  private getOrCreateMetrics(playerId: string): PlayerMetrics {
    if (!this.playerMetrics.has(playerId)) {
      this.playerMetrics.set(playerId, {
        actionsPerMinute: [],
        averageReactionTime: 250,
        clickAccuracy: 0,
        suspiciousPatterns: 0,
        lastActionTime: 0,
        actionHistory: [],
        warnings: 0,
        violations: [],
      });
    }
    return this.playerMetrics.get(playerId)!;
  }

  private calculateCurrentAPM(metrics: PlayerMetrics, now: number): number {
    const oneMinuteAgo = now - 60000;
    const recentActions = metrics.actionHistory.filter(a => a.timestamp > oneMinuteAgo);
    return recentActions.length;
  }

  private updateAPM(metrics: PlayerMetrics, now: number) {
    const apm = this.calculateCurrentAPM(metrics, now);
    metrics.actionsPerMinute.push(apm);
    
    // Keep only last 10 minutes of APM data
    if (metrics.actionsPerMinute.length > 10) {
      metrics.actionsPerMinute.shift();
    }
  }

  private hashAction(type: string, data: any, timestamp: number): string {
    const content = JSON.stringify({ type, data, timestamp });
    return crypto.createHash('md5').update(content).digest('hex');
  }

  public getPlayerReport(playerId: string): PlayerMetrics | undefined {
    return this.playerMetrics.get(playerId);
  }

  public clearPlayerMetrics(playerId: string) {
    this.playerMetrics.delete(playerId);
  }
}