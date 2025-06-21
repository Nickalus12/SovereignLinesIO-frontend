import { profileService, GameStats } from "./ProfileService";
import { achievementService } from "./AchievementService";
import { authService } from "./AuthService";

export interface GameResult {
  gameId: string;
  won: boolean;
  duration: number; // in seconds
  kills?: number;
  deaths?: number;
  playersCount: number;
  gameMode: string;
  mapName?: string;
  endReason: 'victory' | 'defeat' | 'disconnect' | 'timeout';
  experienceGained: number;
}

export interface StatsUpdate {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPlayTime: number;
  lastPlayedAt: string;
  currentWinStreak: number;
  longestWinStreak: number;
  kdRatio?: number;
  experiencePoints: number;
}

class StatsTracker {
  private currentGameStart: number | null = null;
  private currentGameId: string | null = null;
  private statsUpdateQueue: GameResult[] = [];
  private isOnline = navigator.onLine;
  private retryAttempts = 0;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor() {
    this.setupOnlineStatusListener();
    this.setupGameEventListeners();
    this.processQueuePeriodically();
  }

  /**
   * Start tracking a new game
   */
  startGame(gameId: string): void {
    this.currentGameId = gameId;
    this.currentGameStart = Date.now();
    
    console.log(`📊 Started tracking game: ${gameId}`);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('game-tracking-started', {
      detail: { gameId }
    }));
  }

  /**
   * End game tracking and update stats
   */
  async endGame(result: Omit<GameResult, 'gameId' | 'duration'>): Promise<boolean> {
    if (!this.currentGameId || !this.currentGameStart) {
      console.warn('No active game to end tracking for');
      return false;
    }

    const duration = Math.floor((Date.now() - this.currentGameStart) / 1000);
    const gameResult: GameResult = {
      ...result,
      gameId: this.currentGameId,
      duration,
      experienceGained: this.calculateExperienceGained(result, duration)
    };

    console.log(`📊 Ending game tracking: ${this.currentGameId}`, gameResult);

    // Reset tracking state
    this.currentGameId = null;
    this.currentGameStart = null;

    // Try to update stats immediately
    const success = await this.updateStats(gameResult);
    
    if (!success) {
      // Queue for retry if failed
      this.statsUpdateQueue.push(gameResult);
      console.warn('Stats update failed, queued for retry');
    }

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('game-tracking-ended', {
      detail: { gameResult, success }
    }));

    return success;
  }

  /**
   * Update player statistics after a game
   */
  async updateStats(gameResult: GameResult): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        console.warn('No authenticated user for stats update');
        return false;
      }

      // Update stats via ProfileService
      const success = await profileService.updateStatsAfterGame(gameResult);
      
      if (success) {
        console.log(`✅ Stats updated successfully for game: ${gameResult.gameId}`);
        
        // Check for new achievements
        await this.checkAndNotifyAchievements(user.id);
        
        // Dispatch stats updated event
        window.dispatchEvent(new CustomEvent('stats-updated', {
          detail: { gameResult }
        }));
        
        this.retryAttempts = 0; // Reset retry counter on success
        return true;
      } else {
        throw new Error('Stats update returned false');
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
      this.retryAttempts++;
      return false;
    }
  }

  /**
   * Get current game duration if a game is active
   */
  getCurrentGameDuration(): number {
    if (!this.currentGameStart) return 0;
    return Math.floor((Date.now() - this.currentGameStart) / 1000);
  }

  /**
   * Check if currently tracking a game
   */
  isTrackingGame(): boolean {
    return this.currentGameId !== null;
  }

  /**
   * Get current game ID
   */
  getCurrentGameId(): string | null {
    return this.currentGameId;
  }

  /**
   * Force sync all queued stats updates
   */
  async syncQueuedUpdates(): Promise<number> {
    if (this.statsUpdateQueue.length === 0) return 0;

    console.log(`📊 Syncing ${this.statsUpdateQueue.length} queued stats updates`);
    
    let successCount = 0;
    const failures: GameResult[] = [];

    for (const gameResult of this.statsUpdateQueue) {
      const success = await this.updateStats(gameResult);
      if (success) {
        successCount++;
      } else {
        failures.push(gameResult);
      }
    }

    // Keep only the failed updates in the queue
    this.statsUpdateQueue = failures;
    
    console.log(`📊 Synced ${successCount} updates, ${failures.length} failed`);
    return successCount;
  }

  /**
   * Get current stats update queue size
   */
  getQueueSize(): number {
    return this.statsUpdateQueue.length;
  }

  /**
   * Clear the stats update queue (use with caution)
   */
  clearQueue(): void {
    this.statsUpdateQueue = [];
    console.log('📊 Stats update queue cleared');
  }

  /**
   * Calculate experience points gained from a game
   */
  private calculateExperienceGained(result: Omit<GameResult, 'gameId' | 'duration' | 'experienceGained'>, duration: number): number {
    let baseExp = 50; // Base experience for playing
    
    // Win bonus
    if (result.won) {
      baseExp += 100;
    }
    
    // Duration bonus (1 exp per minute, capped at 60 minutes)
    const minutes = Math.min(duration / 60, 60);
    baseExp += Math.floor(minutes);
    
    // Kill bonus if available
    if (result.kills) {
      baseExp += result.kills * 5;
    }
    
    // Multiplayer bonus
    if (result.playersCount > 1) {
      baseExp += (result.playersCount - 1) * 10;
    }
    
    return Math.floor(baseExp);
  }

  /**
   * Check for new achievements after stats update
   */
  private async checkAndNotifyAchievements(userId: string): Promise<void> {
    try {
      const currentStats = await profileService.getCurrentUserStats();
      if (!currentStats) return;

      // Update achievements with current stats
      const achievementResult = achievementService.updateFromStats(currentStats);
      
      // Show notifications for new achievements
      for (const unlock of achievementResult.newUnlocks) {
        achievementService.showAchievementToast(unlock.achievement);
        
        // Dispatch achievement unlock event
        window.dispatchEvent(new CustomEvent('achievement-unlocked', {
          detail: { achievement: unlock.achievement }
        }));
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  }

  /**
   * Set up listeners for online/offline status
   */
  private setupOnlineStatusListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📊 Back online, syncing queued stats...');
      this.syncQueuedUpdates();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📊 Offline mode, queuing stats updates');
    });
  }

  /**
   * Set up game event listeners
   */
  private setupGameEventListeners(): void {
    // Listen for game start events
    window.addEventListener('game-started', (event: any) => {
      const gameId = event.detail?.gameID || event.detail?.gameId;
      if (gameId) {
        this.startGame(gameId);
      }
    });

    // Listen for game end events
    window.addEventListener('game-ended', (event: any) => {
      const result = event.detail;
      if (result) {
        this.endGame({
          won: result.won || false,
          kills: result.kills || 0,
          deaths: result.deaths || 0,
          playersCount: result.playersCount || 1,
          gameMode: result.gameMode || 'unknown',
          mapName: result.mapName,
          endReason: result.endReason || 'victory',
          experienceGained: 0 // Will be calculated in endGame method
        });
      }
    });

    // Listen for disconnect events
    window.addEventListener('beforeunload', () => {
      if (this.isTrackingGame()) {
        // End current game with disconnect reason
        this.endGame({
          won: false,
          kills: 0,
          deaths: 0,
          playersCount: 1,
          gameMode: 'unknown',
          endReason: 'disconnect',
          experienceGained: 0
        });
      }
    });
  }

  /**
   * Periodically process the stats update queue
   */
  private processQueuePeriodically(): void {
    setInterval(async () => {
      if (this.isOnline && this.statsUpdateQueue.length > 0) {
        await this.syncQueuedUpdates();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get detailed stats for display
   */
  async getDetailedStats(): Promise<{
    currentGame?: {
      gameId: string;
      duration: number;
      isActive: boolean;
    };
    queueStatus: {
      pendingUpdates: number;
      isOnline: boolean;
      retryAttempts: number;
    };
    recentActivity: string;
  } | null> {
    try {
      const stats = await profileService.getCurrentUserStats();
      if (!stats) return null;

      return {
        currentGame: this.currentGameId ? {
          gameId: this.currentGameId,
          duration: this.getCurrentGameDuration(),
          isActive: true
        } : undefined,
        queueStatus: {
          pendingUpdates: this.statsUpdateQueue.length,
          isOnline: this.isOnline,
          retryAttempts: this.retryAttempts
        },
        recentActivity: stats.lastPlayedAt
      };
    } catch (error) {
      console.error('Failed to get detailed stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const statsTracker = new StatsTracker();