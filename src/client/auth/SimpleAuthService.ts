/**
 * Simplified authentication service that uses the username from the main menu
 * Designed to be lightweight and work well on low-end mobile devices
 */

interface PlayerProfile {
  id: string;
  username: string;
  displayName?: string;
  flag?: string;
  wins: number;
  playTimeSeconds: number;
  rank: number;
  badges: string[];
  createdAt: string;
  updatedAt: string;
}

interface PlayerStats {
  unitsBuilt: Record<string, number>;
  unitsDestroyed: Record<string, number>;
  totalGamesPlayed: number;
  totalWins: number;
  winStreak: number;
  bestWinStreak: number;
}

export class SimpleAuthService {
  private static instance: SimpleAuthService;
  private currentProfile: PlayerProfile | null = null;
  private readonly PROFILE_KEY = 'sovereign_player_profile';
  private readonly STATS_KEY = 'sovereign_player_stats';

  private constructor() {
    this.loadProfile();
  }

  static getInstance(): SimpleAuthService {
    if (!SimpleAuthService.instance) {
      SimpleAuthService.instance = new SimpleAuthService();
    }
    return SimpleAuthService.instance;
  }

  /**
   * Initialize or update profile with username from main menu
   */
  async initializeProfile(username: string, flag?: string): Promise<PlayerProfile> {
    // Load existing profile or create new one
    let profile = this.currentProfile;
    
    if (!profile) {
      // Create new profile
      profile = {
        id: this.generatePlayerId(),
        username: username,
        displayName: username,
        flag: flag,
        wins: 0,
        playTimeSeconds: 0,
        rank: 0,
        badges: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      // Update existing profile
      profile.username = username;
      profile.displayName = username;
      if (flag) profile.flag = flag;
      profile.updatedAt = new Date().toISOString();
    }

    this.currentProfile = profile;
    this.saveProfile();
    
    return profile;
  }

  /**
   * Get current player profile
   */
  getProfile(): PlayerProfile | null {
    return this.currentProfile;
  }

  /**
   * Get player stats
   */
  getStats(): PlayerStats {
    const statsJson = localStorage.getItem(this.STATS_KEY);
    if (statsJson) {
      return JSON.parse(statsJson);
    }
    
    return {
      unitsBuilt: {},
      unitsDestroyed: {},
      totalGamesPlayed: 0,
      totalWins: 0,
      winStreak: 0,
      bestWinStreak: 0
    };
  }

  /**
   * Update player stats after a game
   */
  updateStats(gameStats: Partial<PlayerStats>) {
    const currentStats = this.getStats();
    const updatedStats = { ...currentStats, ...gameStats };
    
    // Update profile with wins and play time if provided
    if (this.currentProfile && gameStats.totalWins !== undefined) {
      this.currentProfile.wins = gameStats.totalWins;
      this.updateRank();
      this.saveProfile();
    }
    
    localStorage.setItem(this.STATS_KEY, JSON.stringify(updatedStats));
  }

  /**
   * Add play time to profile
   */
  addPlayTime(seconds: number) {
    if (this.currentProfile) {
      this.currentProfile.playTimeSeconds += seconds;
      this.updateRank();
      this.saveProfile();
    }
  }

  /**
   * Award a badge to the player
   */
  awardBadge(badgeId: string) {
    if (this.currentProfile && !this.currentProfile.badges.includes(badgeId)) {
      this.currentProfile.badges.push(badgeId);
      this.saveProfile();
    }
  }

  /**
   * Calculate player rank based on wins and playtime
   */
  private updateRank() {
    if (!this.currentProfile) return;
    
    const { wins, playTimeSeconds } = this.currentProfile;
    const hoursPlayed = playTimeSeconds / 3600;
    
    // Simple rank calculation: wins * 10 + hours * 5
    const rankScore = wins * 10 + Math.floor(hoursPlayed * 5);
    
    // Rank tiers
    if (rankScore < 50) this.currentProfile.rank = 0; // New Player
    else if (rankScore < 200) this.currentProfile.rank = 1; // Member
    else if (rankScore < 500) this.currentProfile.rank = 2; // Veteran
    else if (rankScore < 1000) this.currentProfile.rank = 3; // Elite
    else this.currentProfile.rank = 4; // Legend
  }

  /**
   * Get rank name from rank number
   */
  getRankName(rank: number): string {
    const ranks = ['New Player', 'Member', 'Veteran', 'Elite', 'Legend'];
    return ranks[rank] || 'Unknown';
  }

  /**
   * Generate a unique player ID
   */
  private generatePlayerId(): string {
    // Use existing persistent ID if available
    const persistentId = this.getCookie('persistentID');
    if (persistentId) return persistentId;
    
    // Generate new ID
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    // Store as persistent ID
    this.setCookie('persistentID', id, 365);
    return id;
  }

  /**
   * Load profile from localStorage
   */
  private loadProfile() {
    const profileJson = localStorage.getItem(this.PROFILE_KEY);
    if (profileJson) {
      this.currentProfile = JSON.parse(profileJson);
    }
  }

  /**
   * Save profile to localStorage
   */
  private saveProfile() {
    if (this.currentProfile) {
      localStorage.setItem(this.PROFILE_KEY, JSON.stringify(this.currentProfile));
    }
  }

  /**
   * Cookie helpers
   */
  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  private setCookie(name: string, value: string, days: number) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }

  /**
   * Clear all player data (for logout)
   */
  clearData() {
    this.currentProfile = null;
    localStorage.removeItem(this.PROFILE_KEY);
    localStorage.removeItem(this.STATS_KEY);
  }
}