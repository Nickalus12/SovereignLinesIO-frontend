import { GameStats } from "./ProfileService";
import { 
  Achievement, 
  ACHIEVEMENTS, 
  AchievementCategory, 
  AchievementRarity,
  getAchievementsByCategory,
  calculateTotalPossiblePoints 
} from "./AchievementDefinitions";

export interface PlayerAchievements {
  unlocked: Set<string>;
  progress: Map<string, number>;
  totalPoints: number;
  recentUnlocks: Achievement[]; // Last 5
}

export interface AchievementProgress {
  achievement: Achievement;
  currentValue: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0-100
}

export interface AchievementUnlock {
  achievement: Achievement;
  timestamp: string;
  points: number;
}

export interface AchievementCheckResult {
  newUnlocks: AchievementUnlock[];
  updatedProgress: Map<string, number>;
  totalPoints: number;
}

interface GameEventData {
  territories_captured?: number;
  territories_controlled?: number;
  games_won?: number;
  win_streak?: number;
  cities_built?: number;
  cities_built_single_game?: number;
  defense_posts_built?: number;
  ports_built?: number;
  silos_built?: number;
  warships_built_single_game?: number;
  warships_destroyed?: number;
  warships_active?: number;
  atom_bombs_launched?: number;
  hydrogen_bombs_launched?: number;
  mirvs_launched?: number;
  silos_active?: number;
  nukes_launched_single_game?: number;
  sams_built?: number;
  missiles_intercepted?: number;
  defense_posts_active?: number;
  alliances_formed?: number;
  alliances_active?: number;
  betrayal_eliminations?: number;
  trade_routes_completed?: number;
  trade_gold_earned?: number;
  supply_trucks_deployed?: number;
  gold_reserves?: number;
  game_duration?: number; // in seconds
  early_expansion?: { territories: number; time: number };
  early_buildings?: { count: number; time: number };
  special_conditions?: {
    comeback_win?: boolean;
    no_nuke_win?: boolean;
    posthumous_win?: boolean;
    perfect_win?: boolean;
    perfect_defense_win?: boolean;
    allied_win?: boolean;
    map_control_percentage?: number;
    coastline_control?: boolean;
  };
}

class AchievementService {
  private playerAchievements: PlayerAchievements = {
    unlocked: new Set(),
    progress: new Map(),
    totalPoints: 0,
    recentUnlocks: []
  };

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Get all achievements with current progress
   */
  getAllAchievements(): AchievementProgress[] {
    return ACHIEVEMENTS.map(achievement => ({
      achievement,
      currentValue: this.playerAchievements.progress.get(achievement.id) || 0,
      isUnlocked: this.playerAchievements.unlocked.has(achievement.id),
      unlockedAt: undefined, // Could store this separately if needed
      progress: this.calculateProgress(achievement)
    }));
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(category: AchievementCategory): AchievementProgress[] {
    return getAchievementsByCategory(category).map(achievement => ({
      achievement,
      currentValue: this.playerAchievements.progress.get(achievement.id) || 0,
      isUnlocked: this.playerAchievements.unlocked.has(achievement.id),
      progress: this.calculateProgress(achievement)
    }));
  }

  /**
   * Get achievement summary stats
   */
  getAchievementSummary() {
    const totalAchievements = ACHIEVEMENTS.length;
    const unlockedCount = this.playerAchievements.unlocked.size;
    const totalPossiblePoints = calculateTotalPossiblePoints();
    
    return {
      unlocked: unlockedCount,
      total: totalAchievements,
      percentage: (unlockedCount / totalAchievements) * 100,
      points: this.playerAchievements.totalPoints,
      totalPossiblePoints,
      recentUnlocks: this.playerAchievements.recentUnlocks
    };
  }

  /**
   * Update progress from game events
   */
  updateProgress(eventData: GameEventData): AchievementCheckResult {
    const newUnlocks: AchievementUnlock[] = [];
    const updatedProgress = new Map<string, number>();

    // Update all relevant achievement progress
    for (const achievement of ACHIEVEMENTS) {
      const oldValue = this.playerAchievements.progress.get(achievement.id) || 0;
      const newValue = this.calculateNewValue(achievement, eventData, oldValue);
      
      if (newValue !== oldValue) {
        this.playerAchievements.progress.set(achievement.id, newValue);
        updatedProgress.set(achievement.id, newValue);
        
        // Check if achievement was just unlocked
        if (!this.playerAchievements.unlocked.has(achievement.id) && 
            newValue >= achievement.requirement.value) {
          this.playerAchievements.unlocked.add(achievement.id);
          this.playerAchievements.totalPoints += achievement.points;
          
          const unlock: AchievementUnlock = {
            achievement,
            timestamp: new Date().toISOString(),
            points: achievement.points
          };
          
          newUnlocks.push(unlock);
          this.addToRecentUnlocks(achievement);
        }
      }
    }

    // Save to local storage
    this.saveToLocalStorage();

    return {
      newUnlocks,
      updatedProgress,
      totalPoints: this.playerAchievements.totalPoints
    };
  }

  /**
   * Update from game stats (for profile integration)
   */
  updateFromStats(stats: GameStats): AchievementCheckResult {
    const eventData: GameEventData = {
      games_won: stats.wins,
      win_streak: stats.currentWinStreak,
      // Map other stats as needed
    };
    
    return this.updateProgress(eventData);
  }

  /**
   * Show achievement unlock toast notification
   */
  showAchievementToast(achievement: Achievement): void {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="achievement-toast-content">
        <div class="achievement-toast-icon">${achievement.icon}</div>
        <div class="achievement-toast-info">
          <div class="achievement-toast-title">ACHIEVEMENT UNLOCKED!</div>
          <div class="achievement-toast-name">${achievement.name}</div>
          <div class="achievement-toast-desc">${achievement.shortDesc}</div>
          <div class="achievement-toast-points">+${achievement.points} pts</div>
        </div>
      </div>
    `;

    // Add styles if not already present
    if (!document.getElementById('achievement-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'achievement-toast-styles';
      style.textContent = `
        .achievement-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, rgba(10, 25, 10, 0.98) 0%, rgba(5, 15, 5, 0.98) 100%);
          border: 2px solid #4ade80;
          border-radius: 12px;
          padding: 16px;
          z-index: 10001;
          color: white;
          font-family: 'Courier New', monospace;
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.8),
            0 0 30px rgba(74, 222, 128, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          animation: toastSlideIn 0.4s ease-out, toastFadeOut 0.4s ease-in 4.6s;
          max-width: 320px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .achievement-toast:hover {
          transform: scale(1.02);
        }

        @keyframes toastSlideIn {
          from { 
            transform: translateX(400px) scale(0.8);
            opacity: 0;
          }
          to { 
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes toastFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        .achievement-toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .achievement-toast-icon {
          font-size: 36px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
          animation: iconPulse 2s ease-in-out infinite;
        }

        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .achievement-toast-info {
          flex: 1;
        }

        .achievement-toast-title {
          font-size: 10px;
          color: #4ade80;
          letter-spacing: 1px;
          margin-bottom: 4px;
          font-weight: 700;
        }

        .achievement-toast-name {
          font-size: 16px;
          color: #ffd700;
          font-weight: 900;
          margin-bottom: 2px;
          text-transform: uppercase;
        }

        .achievement-toast-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 4px;
        }

        .achievement-toast-points {
          font-size: 12px;
          color: #4ade80;
          font-weight: 700;
        }

        /* Rarity glow effects */
        .achievement-toast.rare {
          border-color: #3b82f6;
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.8),
            0 0 40px rgba(59, 130, 246, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .achievement-toast.epic {
          border-color: #8b5cf6;
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.8),
            0 0 40px rgba(139, 92, 246, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .achievement-toast.legendary {
          border-color: #f59e0b;
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.8),
            0 0 40px rgba(245, 158, 11, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          animation: toastSlideIn 0.4s ease-out, legendaryGlow 3s ease-in-out, toastFadeOut 0.4s ease-in 4.6s;
        }

        @keyframes legendaryGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }

        /* Mobile optimization */
        @media (max-width: 480px) {
          .achievement-toast {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
            padding: 12px;
          }

          .achievement-toast-icon {
            font-size: 28px;
          }

          .achievement-toast-name {
            font-size: 14px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Add rarity class
    toast.classList.add(achievement.rarity);

    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.style.animation = 'toastFadeOut 0.2s ease-out';
      setTimeout(() => toast.remove(), 200);
    });

    document.body.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);

    // Play sound if available
    try {
      const audio = new Audio('/sounds/achievement-unlock.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (error) {
      // Ignore sound errors
    }
  }

  /**
   * Calculate progress percentage for an achievement
   */
  private calculateProgress(achievement: Achievement): number {
    const current = this.playerAchievements.progress.get(achievement.id) || 0;
    const target = achievement.requirement.value;
    return Math.min((current / target) * 100, 100);
  }

  /**
   * Calculate new value based on event data
   */
  private calculateNewValue(achievement: Achievement, eventData: GameEventData, oldValue: number): number {
    const type = achievement.requirement.type;
    
    // For cumulative achievements, add to old value
    if (type.includes('_total') || ['games_won', 'territories_captured'].includes(type)) {
      return oldValue + (eventData[type] || 0);
    }
    
    // For single-game or current state achievements, use new value
    return eventData[type] || oldValue;
  }

  /**
   * Add achievement to recent unlocks
   */
  private addToRecentUnlocks(achievement: Achievement): void {
    this.playerAchievements.recentUnlocks.unshift(achievement);
    if (this.playerAchievements.recentUnlocks.length > 5) {
      this.playerAchievements.recentUnlocks.pop();
    }
  }

  /**
   * Save achievements to local storage
   */
  private saveToLocalStorage(): void {
    const data = {
      unlocked: Array.from(this.playerAchievements.unlocked),
      progress: Array.from(this.playerAchievements.progress.entries()),
      totalPoints: this.playerAchievements.totalPoints,
      recentUnlocks: this.playerAchievements.recentUnlocks.map(a => a.id)
    };
    localStorage.setItem('player_achievements', JSON.stringify(data));
  }

  /**
   * Load achievements from local storage
   */
  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem('player_achievements');
    if (!stored) return;
    
    try {
      const data = JSON.parse(stored);
      this.playerAchievements.unlocked = new Set(data.unlocked || []);
      this.playerAchievements.progress = new Map(data.progress || []);
      this.playerAchievements.totalPoints = data.totalPoints || 0;
      this.playerAchievements.recentUnlocks = (data.recentUnlocks || [])
        .map((id: string) => ACHIEVEMENTS.find(a => a.id === id))
        .filter(Boolean)
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  }

  /**
   * Clear all achievement data (for logout/reset)
   */
  clearAllData(): void {
    this.playerAchievements = {
      unlocked: new Set(),
      progress: new Map(),
      totalPoints: 0,
      recentUnlocks: []
    };
    localStorage.removeItem('player_achievements');
  }
}

// Export singleton instance
export const achievementService = new AchievementService();