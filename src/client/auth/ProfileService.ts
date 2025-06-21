import { User } from "./AuthService";

export interface GameStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  kdRatio?: number;
  averageGameDuration: number; // in seconds
  lastPlayedAt: string;
  accountCreatedAt: string;
  daysActive: number;
  longestWinStreak: number;
  currentWinStreak: number;
  totalPlayTime: number; // in seconds
}


export interface ProfileData {
  user: User;
  stats: GameStats;
  tier: 'free' | 'premium' | 'elite' | 'sovereign';
  level: number;
  experiencePoints: number;
  experienceToNextLevel: number;
}

class ProfileService {
  private readonly API_BASE: string;
  private profileCache: Map<string, { data: ProfileData; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    const { hostname } = window.location;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
    this.API_BASE = isDev 
      ? 'http://localhost:8787/api'
      : `https://api.${hostname}`;
  }

  /**
   * Get complete profile data for a user
   */
  async getProfile(userId: string, forceRefresh = false): Promise<ProfileData | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCachedProfile(userId);
      if (cached) return cached;
    }

    try {
      const response = await this.makeAuthenticatedRequest(`/user/profile/${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const profileData: ProfileData = await response.json();
      
      // Cache the profile data
      this.cacheProfile(userId, profileData);
      
      return profileData;
    } catch (error) {
      console.warn('Backend not available, creating development profile:', error);
      
      // Try to return cached data as fallback
      const cached = this.getCachedProfile(userId);
      if (cached) {
        console.warn('Returning cached profile data due to fetch error');
        return cached;
      }
      
      // Create mock profile for development when backend is unavailable
      const mockProfile: ProfileData = {
        user: {
          id: userId,
          username: 'Recruit',
          email: 'demo@sovereign.com',
          tier: 'free',
          createdAt: new Date().toISOString()
        },
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          kdRatio: 0,
          averageGameDuration: 0,
          lastPlayedAt: new Date().toISOString(),
          accountCreatedAt: new Date().toISOString(),
          daysActive: 0,
          longestWinStreak: 0,
          currentWinStreak: 0,
          totalPlayTime: 0
        },
        tier: 'free',
        level: 0,
        experiencePoints: 0,
        experienceToNextLevel: 100
      };
      
      // Cache the mock profile
      this.cacheProfile(userId, mockProfile);
      
      return mockProfile;
    }
  }

  /**
   * Get current user's stats
   */
  async getCurrentUserStats(): Promise<GameStats | null> {
    try {
      const response = await this.makeAuthenticatedRequest('/user/stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Stats fetch error, returning empty stats:', error);
      
      // Return empty stats for new users when backend is unavailable
      return {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        kdRatio: 0,
        averageGameDuration: 0,
        lastPlayedAt: new Date().toISOString(),
        accountCreatedAt: new Date().toISOString(),
        daysActive: 0,
        longestWinStreak: 0,
        currentWinStreak: 0,
        totalPlayTime: 0
      };
    }
  }


  /**
   * Update stats after a game completes
   */
  async updateStatsAfterGame(gameResult: {
    gameId: string;
    won: boolean;
    duration: number;
    kills?: number;
    deaths?: number;
    experienceGained: number;
  }): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest('/game/complete', {
        method: 'POST',
        body: JSON.stringify(gameResult)
      });

      if (!response.ok) {
        throw new Error(`Failed to update stats: ${response.status}`);
      }

      // Clear cache to force refresh on next profile load
      this.clearProfileCache();
      
      return true;
    } catch (error) {
      console.error('Stats update error:', error);
      return false;
    }
  }

  /**
   * Manually trigger achievement check
   */
  async checkAchievements(): Promise<Achievement[]> {
    try {
      const response = await this.makeAuthenticatedRequest('/achievement/check', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to check achievements: ${response.status}`);
      }

      const result = await response.json();
      return result.newUnlocks || [];
    } catch (error) {
      console.error('Achievement check error:', error);
      return [];
    }
  }

  /**
   * Calculate user level from experience points
   */
  calculateLevel(experiencePoints: number): { level: number; experienceToNext: number } {
    // Experience required formula: level^2 * 100
    let level = 1;
    let totalExpForLevel = 0;
    
    while (totalExpForLevel <= experiencePoints) {
      level++;
      totalExpForLevel = level * level * 100;
    }
    
    level--; // Adjust back to correct level
    const expForCurrentLevel = level * level * 100;
    const expForNextLevel = (level + 1) * (level + 1) * 100;
    const experienceToNext = expForNextLevel - experiencePoints;
    
    return { level, experienceToNext };
  }

  /**
   * Get achievement progress for display
   */
  getAchievementProgress(achievement: Achievement, currentValue: number): {
    progress: number;
    isComplete: boolean;
    progressText: string;
  } {
    const progress = Math.min(currentValue / achievement.threshold, 1);
    const isComplete = progress >= 1;
    const progressText = `${currentValue.toLocaleString()} / ${achievement.threshold.toLocaleString()}`;
    
    return { progress, isComplete, progressText };
  }

  /**
   * Check if user can access premium features
   */
  canAccessPremiumFeatures(tier: string): boolean {
    return ['premium', 'elite', 'sovereign'].includes(tier);
  }

  /**
   * Check if user can access elite features
   */
  canAccessEliteFeatures(tier: string): boolean {
    return ['elite', 'sovereign'].includes(tier);
  }

  /**
   * Check if user is sovereign tier
   */
  isSovereignTier(tier: string): boolean {
    return tier === 'sovereign';
  }

  /**
   * Format large numbers for display
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Clear profile cache
   */
  clearProfileCache(): void {
    this.profileCache.clear();
  }

  /**
   * Get cached profile if available and not expired
   */
  private getCachedProfile(userId: string): ProfileData | null {
    const cached = this.profileCache.get(userId);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.profileCache.delete(userId);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Cache profile data
   */
  private cacheProfile(userId: string, data: ProfileData): void {
    this.profileCache.set(userId, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Make authenticated request with proper headers
   */
  private async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    return fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  }

  /**
   * Set up real-time profile updates via WebSocket
   */
  setupRealtimeUpdates(userId: string, onUpdate: (data: Partial<ProfileData>) => void): () => void {
    // This would connect to WebSocket for real-time updates
    // For now, we'll use polling as a fallback
    const intervalId = setInterval(async () => {
      try {
        const freshData = await this.getProfile(userId, true);
        if (freshData) {
          onUpdate(freshData);
        }
      } catch (error) {
        console.warn('Failed to poll for profile updates:', error);
      }
    }, 30000); // Poll every 30 seconds

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

// Export singleton instance
export const profileService = new ProfileService();