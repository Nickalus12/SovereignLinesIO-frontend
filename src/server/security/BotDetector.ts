import { Player, PlayerType } from "../../core/game/Game";
import { logger } from "../Logger";

export interface BotPattern {
  type: "click_pattern" | "timing_pattern" | "strategy_pattern" | "movement_pattern";
  confidence: number;
  details: string;
}

export class BotDetector {
  private logger = logger.child({ component: "BotDetector" });
  private playerPatterns = new Map<string, PlayerBehaviorProfile>();
  
  // Pattern detection thresholds
  private readonly CLICK_INTERVAL_VARIANCE_THRESHOLD = 50; // ms
  private readonly REACTION_TIME_THRESHOLD = 100; // ms
  private readonly PERFECT_TIMING_THRESHOLD = 0.95; // 95% perfect timing
  private readonly REPETITIVE_PATH_THRESHOLD = 0.8; // 80% same paths
  
  constructor() {
  }

  /**
   * Analyze player behavior for bot-like patterns
   */
  public analyzePlayer(player: Player, actionHistory: any[]): BotPattern[] {
    if (player.type() !== PlayerType.Human) {
      return []; // Don't analyze known bots
    }

    const profile = this.getOrCreateProfile(player.id());
    const patterns: BotPattern[] = [];

    // Update profile with new actions
    this.updateProfile(profile, actionHistory);

    // Check various bot patterns
    patterns.push(...this.checkClickPatterns(profile));
    patterns.push(...this.checkTimingPatterns(profile));
    patterns.push(...this.checkStrategyPatterns(profile));
    patterns.push(...this.checkMovementPatterns(profile));

    // Filter out low confidence patterns
    return patterns.filter(p => p.confidence > 0.6);
  }

  /**
   * Check for automated clicking patterns
   */
  private checkClickPatterns(profile: PlayerBehaviorProfile): BotPattern[] {
    const patterns: BotPattern[] = [];

    // 1. Check click interval consistency
    if (profile.clickIntervals.length > 20) {
      const intervals = profile.clickIntervals.slice(-20);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < this.CLICK_INTERVAL_VARIANCE_THRESHOLD) {
        patterns.push({
          type: "click_pattern",
          confidence: 1 - (stdDev / this.CLICK_INTERVAL_VARIANCE_THRESHOLD),
          details: `Consistent click intervals: ${avgInterval.toFixed(0)}ms ±${stdDev.toFixed(0)}ms`,
        });
      }
    }

    // 2. Check for grid-based clicking (perfect coordinates)
    const recentClicks = profile.clickLocations.slice(-50);
    if (recentClicks.length >= 50) {
      const gridAligned = recentClicks.filter(loc => 
        loc.x % 10 === 0 || loc.y % 10 === 0
      ).length;
      
      const gridRatio = gridAligned / recentClicks.length;
      if (gridRatio > 0.7) {
        patterns.push({
          type: "click_pattern",
          confidence: gridRatio,
          details: `Grid-aligned clicks: ${(gridRatio * 100).toFixed(1)}%`,
        });
      }
    }

    // 3. Check for click patterns (sequences)
    const sequences = this.findClickSequences(profile.clickLocations);
    if (sequences.length > 3) {
      patterns.push({
        type: "click_pattern",
        confidence: Math.min(sequences.length / 5, 1),
        details: `Repetitive click sequences detected: ${sequences.length}`,
      });
    }

    return patterns;
  }

  /**
   * Check for inhuman timing patterns
   */
  private checkTimingPatterns(profile: PlayerBehaviorProfile): BotPattern[] {
    const patterns: BotPattern[] = [];

    // 1. Check reaction times
    if (profile.reactionTimes.length > 10) {
      const fastReactions = profile.reactionTimes.filter(t => 
        t < this.REACTION_TIME_THRESHOLD
      ).length;
      
      const fastRatio = fastReactions / profile.reactionTimes.length;
      if (fastRatio > 0.5) {
        patterns.push({
          type: "timing_pattern",
          confidence: fastRatio,
          details: `Superhuman reactions: ${(fastRatio * 100).toFixed(1)}% under ${this.REACTION_TIME_THRESHOLD}ms`,
        });
      }
    }

    // 2. Check for perfect timing
    const perfectTimingRatio = this.calculatePerfectTimingRatio(profile);
    if (perfectTimingRatio > this.PERFECT_TIMING_THRESHOLD) {
      patterns.push({
        type: "timing_pattern",
        confidence: perfectTimingRatio,
        details: `Perfect timing execution: ${(perfectTimingRatio * 100).toFixed(1)}%`,
      });
    }

    // 3. Check for 24/7 activity
    const activityPattern = this.analyzeActivityPattern(profile);
    if (activityPattern.confidence > 0.7) {
      patterns.push(activityPattern);
    }

    return patterns;
  }

  /**
   * Check for bot-like strategy patterns
   */
  private checkStrategyPatterns(profile: PlayerBehaviorProfile): BotPattern[] {
    const patterns: BotPattern[] = [];

    // 1. Check for predictable expansion patterns
    const expansionPattern = this.analyzeExpansionPattern(profile);
    if (expansionPattern.confidence > 0.7) {
      patterns.push(expansionPattern);
    }

    // 2. Check for perfect resource management
    if (profile.resourceEfficiency.length > 20) {
      const avgEfficiency = profile.resourceEfficiency.reduce((a, b) => a + b, 0) 
        / profile.resourceEfficiency.length;
      
      if (avgEfficiency > 0.95) {
        patterns.push({
          type: "strategy_pattern",
          confidence: avgEfficiency,
          details: `Perfect resource efficiency: ${(avgEfficiency * 100).toFixed(1)}%`,
        });
      }
    }

    // 3. Check for algorithmic decision making
    const decisionPattern = this.analyzeDecisionPattern(profile);
    if (decisionPattern.confidence > 0.7) {
      patterns.push(decisionPattern);
    }

    return patterns;
  }

  /**
   * Check for automated movement patterns
   */
  private checkMovementPatterns(profile: PlayerBehaviorProfile): BotPattern[] {
    const patterns: BotPattern[] = [];

    // 1. Check for repetitive paths
    const pathRepetition = this.analyzePathRepetition(profile);
    if (pathRepetition > this.REPETITIVE_PATH_THRESHOLD) {
      patterns.push({
        type: "movement_pattern",
        confidence: pathRepetition,
        details: `Repetitive movement paths: ${(pathRepetition * 100).toFixed(1)}%`,
      });
    }

    // 2. Check for perfect pathfinding
    const pathfindingAccuracy = this.analyzePathfindingAccuracy(profile);
    if (pathfindingAccuracy > 0.9) {
      patterns.push({
        type: "movement_pattern",
        confidence: pathfindingAccuracy,
        details: `Perfect pathfinding: ${(pathfindingAccuracy * 100).toFixed(1)}% optimal paths`,
      });
    }

    return patterns;
  }

  /**
   * Helper methods
   */
  private getOrCreateProfile(playerId: string): PlayerBehaviorProfile {
    if (!this.playerPatterns.has(playerId)) {
      this.playerPatterns.set(playerId, {
        playerId,
        clickIntervals: [],
        clickLocations: [],
        reactionTimes: [],
        actionSequences: [],
        resourceEfficiency: [],
        activityHours: new Array(24).fill(0),
        pathHistory: [],
        decisionTimes: [],
        lastUpdateTime: Date.now(),
      });
    }
    return this.playerPatterns.get(playerId)!;
  }

  private updateProfile(profile: PlayerBehaviorProfile, actions: any[]) {
    const now = Date.now();
    
    // Update click intervals
    for (let i = 1; i < actions.length; i++) {
      const interval = actions[i].timestamp - actions[i - 1].timestamp;
      profile.clickIntervals.push(interval);
    }

    // Update click locations
    actions.forEach(action => {
      if (action.data?.x !== undefined && action.data?.y !== undefined) {
        profile.clickLocations.push({ x: action.data.x, y: action.data.y });
      }
    });

    // Update activity hours
    const hour = new Date().getHours();
    profile.activityHours[hour]++;

    // Keep arrays manageable
    if (profile.clickIntervals.length > 1000) {
      profile.clickIntervals = profile.clickIntervals.slice(-1000);
    }
    if (profile.clickLocations.length > 1000) {
      profile.clickLocations = profile.clickLocations.slice(-1000);
    }

    profile.lastUpdateTime = now;
  }

  private findClickSequences(locations: Array<{x: number, y: number}>): any[] {
    // Simplified sequence detection
    const sequences: Array<{ start1: number; start2: number; length: number }> = [];
    const windowSize = 5;
    
    for (let i = 0; i < locations.length - windowSize * 2; i++) {
      const pattern1 = locations.slice(i, i + windowSize);
      
      for (let j = i + windowSize; j < locations.length - windowSize; j++) {
        const pattern2 = locations.slice(j, j + windowSize);
        
        if (this.patternsMatch(pattern1, pattern2)) {
          sequences.push({ start1: i, start2: j, length: windowSize });
        }
      }
    }
    
    return sequences;
  }

  private patternsMatch(
    pattern1: Array<{x: number, y: number}>, 
    pattern2: Array<{x: number, y: number}>
  ): boolean {
    if (pattern1.length !== pattern2.length) return false;
    
    const tolerance = 5; // pixels
    for (let i = 0; i < pattern1.length; i++) {
      const dx = Math.abs(pattern1[i].x - pattern2[i].x);
      const dy = Math.abs(pattern1[i].y - pattern2[i].y);
      if (dx > tolerance || dy > tolerance) return false;
    }
    
    return true;
  }

  private calculatePerfectTimingRatio(profile: PlayerBehaviorProfile): number {
    // Placeholder - implement based on your game's timing requirements
    return 0.5;
  }

  private analyzeActivityPattern(profile: PlayerBehaviorProfile): BotPattern {
    // Check if player is active 24/7
    const activeHours = profile.activityHours.filter(h => h > 0).length;
    const totalActivity = profile.activityHours.reduce((a, b) => a + b, 0);
    const distribution = profile.activityHours.map(h => h / totalActivity);
    
    // Calculate entropy of activity distribution
    const entropy = -distribution.reduce((sum, p) => 
      p > 0 ? sum + p * Math.log2(p) : sum, 0);
    
    const maxEntropy = Math.log2(24);
    const uniformity = entropy / maxEntropy;
    
    return {
      type: "timing_pattern",
      confidence: activeHours >= 20 ? uniformity : 0,
      details: `Active ${activeHours}/24 hours, uniformity: ${(uniformity * 100).toFixed(1)}%`,
    };
  }

  private analyzeExpansionPattern(profile: PlayerBehaviorProfile): BotPattern {
    // Placeholder - implement based on your game's expansion mechanics
    return {
      type: "strategy_pattern",
      confidence: 0.5,
      details: "Predictable expansion pattern",
    };
  }

  private analyzeDecisionPattern(profile: PlayerBehaviorProfile): BotPattern {
    // Analyze decision making speed and consistency
    if (profile.decisionTimes.length < 20) {
      return { type: "strategy_pattern", confidence: 0, details: "" };
    }
    
    const avgDecisionTime = profile.decisionTimes.reduce((a, b) => a + b, 0) 
      / profile.decisionTimes.length;
    
    const variance = profile.decisionTimes.reduce((sum, time) => 
      sum + Math.pow(time - avgDecisionTime, 2), 0) / profile.decisionTimes.length;
    
    const consistency = 1 / (1 + Math.sqrt(variance) / avgDecisionTime);
    
    return {
      type: "strategy_pattern",
      confidence: consistency > 0.8 ? consistency : 0,
      details: `Algorithmic decisions: ${(consistency * 100).toFixed(1)}% consistent`,
    };
  }

  private analyzePathRepetition(profile: PlayerBehaviorProfile): number {
    // Placeholder - implement based on your game's movement system
    return 0.5;
  }

  private analyzePathfindingAccuracy(profile: PlayerBehaviorProfile): number {
    // Placeholder - implement based on your game's pathfinding
    return 0.5;
  }

  /**
   * Generate a bot likelihood score
   */
  public getBotLikelihoodScore(playerId: string): number {
    const profile = this.playerPatterns.get(playerId);
    if (!profile) return 0;

    const patterns = this.analyzePlayer({ id: () => playerId } as any, []);
    if (patterns.length === 0) return 0;

    // Weight different pattern types
    const weights = {
      click_pattern: 0.3,
      timing_pattern: 0.3,
      strategy_pattern: 0.2,
      movement_pattern: 0.2,
    };

    let totalScore = 0;
    let totalWeight = 0;

    patterns.forEach(pattern => {
      const weight = weights[pattern.type] || 0.1;
      totalScore += pattern.confidence * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
}

interface PlayerBehaviorProfile {
  playerId: string;
  clickIntervals: number[];
  clickLocations: Array<{x: number, y: number}>;
  reactionTimes: number[];
  actionSequences: any[];
  resourceEfficiency: number[];
  activityHours: number[];
  pathHistory: any[];
  decisionTimes: number[];
  lastUpdateTime: number;
}