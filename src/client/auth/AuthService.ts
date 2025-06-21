import { decodeJwt } from "jose";

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  tier: 'free' | 'premium' | 'elite' | 'sovereign';
  stats?: {
    gamesPlayed: number;
    wins: number;
    winRate: number;
  };
  createdAt: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export interface AuthToken {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'auth_user';
  private readonly API_BASE: string;

  constructor() {
    // Use existing API base or fallback to custom auth server
    const { hostname } = window.location;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
    this.API_BASE = isDev 
      ? 'http://localhost:8787/api/auth'
      : `https://api.${hostname}/auth`;
  }

  // Development mode check
  private isDevelopmentMode(): boolean {
    // Enable development mode when backend is not available
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  /**
   * Login as guest with just a username
   */
  async loginAsGuest(username: string): Promise<boolean> {
    // Create guest user
    const guestUser: User = {
      id: 'guest-' + Date.now(),
      username: username,
      email: `${username}@guest.local`,
      tier: 'free',
      stats: {
        gamesPlayed: 0,
        wins: 0,
        winRate: 0
      },
      createdAt: new Date().toISOString()
    };
    
    // Generate a simple guest token
    const guestJwtPayload = {
      sub: guestUser.id,
      username: guestUser.username,
      email: guestUser.email,
      tier: guestUser.tier,
      isGuest: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
    };
    
    // Create a simple JWT-like token for guest
    const guestJwtHeader = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
    const guestJwtPayloadEncoded = btoa(JSON.stringify(guestJwtPayload));
    const guestJwtSignature = btoa('guest-signature');
    const guestJwt = `${guestJwtHeader}.${guestJwtPayloadEncoded}.${guestJwtSignature}`;
    
    // Store guest data
    this.storeAuthData(guestJwt, 'guest-refresh', guestUser);
    
    // Dispatch auth state changed event
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthenticated: true, user: guestUser }
    }));

    return true;
  }

  /**
   * Login with email/username and password
   */
  async login(emailOrUsername: string, password: string, rememberMe: boolean = false): Promise<boolean> {
    // Development mode - simulate login
    if (this.isDevelopmentMode()) {
      console.log('🔧 Development mode: Simulating login for', emailOrUsername);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create mock user - use a proper callsign for development
      const mockUser: User = {
        id: 'dev-user-' + Date.now(),
        username: 'Nickalus', // Fixed callsign for development mode
        email: emailOrUsername,
        tier: 'free',
        stats: {
          gamesPlayed: 0,
          wins: 0,
          winRate: 0
        },
        createdAt: new Date().toISOString()
      };
      
      // Generate a proper JWT-like token for development
      const mockJwtPayload = {
        sub: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        tier: mockUser.tier,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      };
      
      // Create a simple JWT-like token for development (header.payload.signature)
      const mockJwtHeader = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
      const mockJwtPayloadEncoded = btoa(JSON.stringify(mockJwtPayload));
      const mockJwtSignature = btoa('dev-signature');
      const mockJwt = `${mockJwtHeader}.${mockJwtPayloadEncoded}.${mockJwtSignature}`;
      
      // Store mock data with proper JWT
      this.storeAuthData(mockJwt, 'mock-refresh', mockUser);
      
      // Dispatch auth state changed event
      window.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: { isAuthenticated: true, user: mockUser }
      }));

      return true;
    }

    try {
      const response = await fetch(`${this.API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrUsername,
          password,
          rememberMe
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Login failed:', error);
        return false;
      }

      const data = await response.json();
      
      // Store tokens and user data
      this.storeAuthData(data.token, data.refreshToken, data.user);
      
      // Dispatch auth state changed event
      window.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: { isAuthenticated: true, user: data.user }
      }));

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  /**
   * Check if email exists in the system
   */
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.warn('Backend not available, using development mode for email check:', error);
      
      // Fallback to development mode when backend is unavailable
      console.log('🔧 Fallback mode: Checking email exists for', email);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // In fallback mode, new emails require callsign (return false)
      // Existing test emails can skip callsign (return true)
      const testEmails = ['test@example.com', 'user@test.com', 'demo@demo.com'];
      return testEmails.includes(email.toLowerCase());
    }
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, username: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Registration failed:', error);
        return false;
      }

      // Registration successful - user needs to verify email
      return true;
    } catch (error) {
      console.warn('Backend not available, using development mode for registration:', error);
      
      // Fallback to development mode when backend is unavailable
      console.log('🔧 Fallback mode: Simulating registration for', email);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Always succeed in fallback mode
      return true;
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    
    // Development mode - just clear local data
    if (this.isDevelopmentMode()) {
      console.log('🔧 Development mode: Logging out user');
      this.clearAuthData();
      
      // Dispatch auth state changed event
      window.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: { isAuthenticated: false, user: null }
      }));
      return;
    }
    
    if (token) {
      try {
        // Notify server of logout
        await fetch(`${this.API_BASE}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear local storage
    this.clearAuthData();
    
    // Dispatch auth state changed event
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthenticated: false, user: null }
    }));
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    // Development mode - simple token check
    if (this.isDevelopmentMode()) {
      // Just check if we have a token (mock or real)
      return token === 'mock-token' || !!token;
    }

    try {
      // Decode and verify token
      const payload = decodeJwt(token);
      const now = Math.floor(Date.now() / 1000);
      
      // Check if token is expired
      if (payload.exp && now >= payload.exp) {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          this.clearAuthData();
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      this.clearAuthData();
      return false;
    }
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<User | null> {
    // First check local storage
    const cachedUser = this.getCachedUser();
    if (cachedUser) return cachedUser;

    // Development mode - return null if no cached user
    if (this.isDevelopmentMode()) {
      console.log('🔧 Development mode: No cached user found');
      return null;
    }

    // If not cached, fetch from server
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${this.API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const user = await response.json();
      
      // Cache user data
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    // Development mode - simulate profile update
    if (this.isDevelopmentMode()) {
      console.log('🔧 Development mode: Simulating profile update', updates);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get current cached user
      const currentUser = this.getCachedUser();
      if (!currentUser) return false;
      
      // Merge updates with current user
      const updatedUser = { ...currentUser, ...updates };
      
      // Update cached user
      localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
      
      // Dispatch update event
      window.dispatchEvent(new CustomEvent('user-updated', {
        detail: { user: updatedUser }
      }));

      return true;
    }

    try {
      const response = await fetch(`${this.API_BASE}/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      
      // Update cached user
      localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
      
      // Dispatch update event
      window.dispatchEvent(new CustomEvent('user-updated', {
        detail: { user: updatedUser }
      }));

      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      return false;
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${this.API_BASE}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const data = await response.json();
      return data.avatarUrl;
    } catch (error) {
      console.error('Upload avatar error:', error);
      return null;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return response.ok;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      return response.ok;
    } catch (error) {
      console.error('Password reset confirm error:', error);
      return false;
    }
  }

  /**
   * Get JWT token for game server connection
   */
  getGameToken(): string | null {
    return this.getToken();
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.API_BASE}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      // Update tokens
      localStorage.setItem(this.TOKEN_KEY, data.token);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  private getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getCachedUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) return null;
    
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  private storeAuthData(token: string, refreshToken: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Force clear all cached data and reset to brand new account
   */
  clearAllCachedData(): void {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧹 All cached data cleared - fresh start');
  }
}

// Export singleton instance
export const authService = new AuthService();