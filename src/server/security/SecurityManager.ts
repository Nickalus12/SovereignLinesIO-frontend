import { Game, Player } from "../../core/game/Game";
import { Intent } from "../../core/Schemas";
import { Client } from "../Client";
import { logger } from "../Logger";
import { AntiCheatEngine, CheatType } from "./AntiCheatEngine";
import { ServerValidator } from "./ServerValidator";
import { EventEmitter } from "events";

export interface SecurityEvent {
  type: "cheat_detected" | "validation_failed" | "player_banned" | "suspicious_activity";
  playerId: string;
  playerName: string;
  details: any;
  timestamp: number;
}

export interface SecurityConfig {
  enableAntiCheat: boolean;
  enableServerValidation: boolean;
  enableReplayProtection: boolean;
  autobanThreshold: number;
  shadowBanEnabled: boolean;
  logSecurityEvents: boolean;
}

export class SecurityManager extends EventEmitter {
  private antiCheat: AntiCheatEngine;
  private validator: ServerValidator;
  private logger = logger.child({ component: "SecurityManager" });
  
  // Track security violations
  private violations = new Map<string, SecurityViolation[]>();
  private shadowBannedPlayers = new Set<string>();
  private replayNonces = new Map<string, Set<string>>();
  
  // Security metrics
  private metrics = {
    totalValidations: 0,
    failedValidations: 0,
    cheatsDetected: 0,
    playersBanned: 0,
  };

  constructor(
    private game: Game,
    private config: SecurityConfig = {
      enableAntiCheat: true,
      enableServerValidation: true,
      enableReplayProtection: true,
      autobanThreshold: 5,
      shadowBanEnabled: true,
      logSecurityEvents: true,
    }
  ) {
    super();
    this.antiCheat = new AntiCheatEngine(game, this.logger);
    this.validator = new ServerValidator(game);
    
    this.setupEventHandlers();
    this.logger.info("Security manager initialized", { config });
  }

  /**
   * Main validation entry point for all client actions
   */
  public async validateClientIntent(
    client: Client,
    intent: Intent,
    nonce?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const player = this.game.playerByClientID(client.clientID);
    if (!player) {
      return { allowed: false, reason: "No player associated with client" };
    }

    this.metrics.totalValidations++;

    try {
      // 1. Check if shadow banned
      if (this.shadowBannedPlayers.has(player.id())) {
        // Silently accept but don't process
        this.logger.debug("Shadow banned player action ignored", { playerId: player.id() });
        return { allowed: true }; // Pretend it's OK
      }

      // 2. Replay protection
      if (this.config.enableReplayProtection && nonce) {
        if (!this.validateNonce(player.id(), nonce)) {
          this.recordViolation(player, "replay_attack", "Duplicate nonce");
          return { allowed: false, reason: "Invalid request" };
        }
      }

      // 3. Server-side validation
      if (this.config.enableServerValidation) {
        const validationResult = this.validator.validateIntent(player, intent);
        if (!validationResult.valid) {
          this.recordViolation(player, "validation_failed", validationResult.reason || "Unknown");
          this.metrics.failedValidations++;
          
          this.emitSecurityEvent({
            type: "validation_failed",
            playerId: player.id(),
            playerName: player.displayName(),
            details: {
              intentType: intent.type,
              reason: validationResult.reason,
              severity: validationResult.severity,
            },
            timestamp: Date.now(),
          });

          return { allowed: false, reason: validationResult.reason };
        }
      }

      // 4. Anti-cheat validation
      if (this.config.enableAntiCheat) {
        const antiCheatResult = this.antiCheat.validateIntent(client, intent);
        if (!antiCheatResult.valid) {
          this.metrics.cheatsDetected++;
          
          this.emitSecurityEvent({
            type: "cheat_detected",
            playerId: player.id(),
            playerName: player.displayName(),
            details: {
              intentType: intent.type,
              reason: antiCheatResult.reason,
              intent,
            },
            timestamp: Date.now(),
          });

          // Check if we should ban
          const violations = this.getViolations(player.id());
          if (violations.length >= this.config.autobanThreshold) {
            await this.banPlayer(player, "Multiple security violations");
          }

          return { allowed: false, reason: antiCheatResult.reason };
        }
      }

      // All checks passed
      return { allowed: true };

    } catch (error) {
      this.logger.error("Security validation error", { error, playerId: player.id() });
      // Fail closed - deny on error
      return { allowed: false, reason: "Security check failed" };
    }
  }

  /**
   * Validate nonce for replay protection
   */
  private validateNonce(playerId: string, nonce: string): boolean {
    if (!this.replayNonces.has(playerId)) {
      this.replayNonces.set(playerId, new Set());
    }

    const playerNonces = this.replayNonces.get(playerId)!;
    
    // Check if nonce was already used
    if (playerNonces.has(nonce)) {
      return false;
    }

    // Add nonce
    playerNonces.add(nonce);

    // Clean old nonces (keep last 1000)
    if (playerNonces.size > 1000) {
      const noncesArray = Array.from(playerNonces);
      const toRemove = noncesArray.slice(0, noncesArray.length - 1000);
      toRemove.forEach(n => playerNonces.delete(n));
    }

    return true;
  }

  /**
   * Record a security violation
   */
  private recordViolation(player: Player, type: string, details: string) {
    const violation: SecurityViolation = {
      type,
      details,
      timestamp: Date.now(),
      playerId: player.id(),
      playerName: player.displayName(),
    };

    if (!this.violations.has(player.id())) {
      this.violations.set(player.id(), []);
    }

    this.violations.get(player.id())!.push(violation);

    this.logger.warn("Security violation recorded", violation);

    this.emitSecurityEvent({
      type: "suspicious_activity",
      playerId: player.id(),
      playerName: player.displayName(),
      details: violation,
      timestamp: Date.now(),
    });
  }

  /**
   * Ban a player
   */
  private async banPlayer(player: Player, reason: string) {
    this.metrics.playersBanned++;

    if (this.config.shadowBanEnabled) {
      // Shadow ban - they can play but don't affect others
      this.shadowBannedPlayers.add(player.id());
      this.logger.info("Player shadow banned", {
        playerId: player.id(),
        playerName: player.displayName(),
        reason,
      });
    } else {
      // Hard ban - mark them as disconnected
      player.markDisconnected(true);
      this.logger.info("Player banned and disconnected", {
        playerId: player.id(),
        playerName: player.displayName(),
        reason,
      });
    }

    this.emitSecurityEvent({
      type: "player_banned",
      playerId: player.id(),
      playerName: player.displayName(),
      details: { reason, shadowBan: this.config.shadowBanEnabled },
      timestamp: Date.now(),
    });
  }

  /**
   * Get violations for a player
   */
  public getViolations(playerId: string): SecurityViolation[] {
    return this.violations.get(playerId) || [];
  }

  /**
   * Check if player is banned
   */
  public isBanned(playerId: string): boolean {
    return this.shadowBannedPlayers.has(playerId);
  }

  /**
   * Get security report
   */
  public getSecurityReport(): SecurityReport {
    return {
      metrics: { ...this.metrics },
      shadowBannedCount: this.shadowBannedPlayers.size,
      violationsCount: this.violations.size,
      topViolators: this.getTopViolators(),
      recentEvents: this.getRecentEvents(),
    };
  }

  /**
   * Admin commands
   */
  public unbanPlayer(playerId: string): boolean {
    const removed = this.shadowBannedPlayers.delete(playerId);
    if (removed) {
      this.logger.info("Player unbanned", { playerId });
    }
    return removed;
  }

  public clearViolations(playerId: string) {
    this.violations.delete(playerId);
    this.antiCheat.clearPlayerMetrics(playerId);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    // Clean up data periodically
    setInterval(() => {
      // Remove nonces for disconnected players
      for (const player of this.game.players()) {
        if (player.isDisconnected()) {
          this.replayNonces.delete(player.id());
        }
      }
    }, 300000); // 5 minutes
  }

  /**
   * Emit security event
   */
  private emitSecurityEvent(event: SecurityEvent) {
    if (this.config.logSecurityEvents) {
      this.logger.info("Security event", event);
    }
    this.emit("security:event", event);
  }

  /**
   * Get top violators
   */
  private getTopViolators(): Array<{ playerId: string; violations: number }> {
    return Array.from(this.violations.entries())
      .map(([playerId, violations]) => ({ playerId, violations: violations.length }))
      .sort((a, b) => b.violations - a.violations)
      .slice(0, 10);
  }

  /**
   * Get recent security events (placeholder)
   */
  private getRecentEvents(): SecurityEvent[] {
    // In production, you'd store these in a circular buffer
    return [];
  }
}

interface SecurityViolation {
  type: string;
  details: string;
  timestamp: number;
  playerId: string;
  playerName: string;
}

interface SecurityReport {
  metrics: {
    totalValidations: number;
    failedValidations: number;
    cheatsDetected: number;
    playersBanned: number;
  };
  shadowBannedCount: number;
  violationsCount: number;
  topViolators: Array<{ playerId: string; violations: number }>;
  recentEvents: SecurityEvent[];
}