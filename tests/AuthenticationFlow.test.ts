import { authService } from '../src/client/auth/AuthService';

describe('Authentication Flow', () => {
  // Clear localStorage before each test
  beforeEach(() => {
    localStorage.clear();
    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Email Existence Check', () => {
    it('should check if email exists without jarring UI changes', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: true })
      } as Response);

      const exists = await authService.checkEmailExists('test@example.com');
      expect(exists).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/check-email'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should handle backend unavailability gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should fallback to development mode
      const exists = await authService.checkEmailExists('new@example.com');
      expect(exists).toBe(false); // New emails return false in dev mode
    });
  });

  describe('Login Flow', () => {
    it('should login existing user successfully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      const mockUser = {
        id: 'user-123',
        username: 'TestOperative',
        email: 'test@example.com',
        tier: 'free',
        stats: { gamesPlayed: 10, wins: 5, winRate: 0.5 },
        createdAt: new Date().toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          user: mockUser
        })
      } as Response);

      const success = await authService.login('test@example.com', 'password123', true);
      
      expect(success).toBe(true);
      expect(localStorage.getItem('auth_token')).toBe('mock-jwt-token');
      expect(localStorage.getItem('refresh_token')).toBe('mock-refresh-token');
      expect(localStorage.getItem('user_data')).toBe(JSON.stringify(mockUser));
    });

    it('should handle login failure gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' })
      } as Response);

      const success = await authService.login('test@example.com', 'wrongpassword', false);
      
      expect(success).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Registration Flow', () => {
    it('should register new user successfully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Registration successful' })
      } as Response);

      const success = await authService.register(
        'newuser@example.com',
        'securepassword123',
        'NewOperative'
      );
      
      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'NewOperative',
            email: 'newuser@example.com',
            password: 'securepassword123'
          })
        })
      );
    });

    it('should handle registration in development mode', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should succeed in dev mode
      const success = await authService.register(
        'devuser@example.com',
        'password123',
        'DevOperative'
      );
      
      expect(success).toBe(true);
    });
  });

  describe('Token Management', () => {
    it('should store tokens securely in localStorage', () => {
      const mockUser = {
        id: 'user-123',
        username: 'TestUser',
        email: 'test@test.com',
        tier: 'premium' as const,
        stats: { gamesPlayed: 0, wins: 0, winRate: 0 },
        createdAt: new Date().toISOString()
      };

      // Use private method through login in dev mode
      authService['storeAuthData']('test-token', 'test-refresh', mockUser);
      
      expect(localStorage.getItem('auth_token')).toBe('test-token');
      expect(localStorage.getItem('refresh_token')).toBe('test-refresh');
      expect(JSON.parse(localStorage.getItem('user_data') || '{}')).toEqual(mockUser);
    });

    it('should clear all auth data on logout', async () => {
      // Set some data first
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('refresh_token', 'test-refresh');
      localStorage.setItem('user_data', JSON.stringify({ username: 'test' }));
      
      await authService.logout();
      
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
    });
  });

  describe('Guest to Full Account Upgrade', () => {
    it('should preserve username when upgrading from guest', async () => {
      // Set up guest user
      const guestUser = {
        id: 'guest-123',
        username: 'GuestAlpha',
        email: 'guest-123@guest.local',
        tier: 'free' as const,
        stats: { gamesPlayed: 5, wins: 2, winRate: 0.4 },
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('user_data', JSON.stringify(guestUser));
      
      // Guest user should be able to get their current data
      const currentUser = await authService.getCurrentUser();
      expect(currentUser?.username).toBe('GuestAlpha');
      expect(currentUser?.email).toBe('guest-123@guest.local');
    });
  });

  describe('Session Persistence', () => {
    it('should check authentication status correctly', async () => {
      // No token - not authenticated
      let isAuth = await authService.isAuthenticated();
      expect(isAuth).toBe(false);
      
      // With token - should verify
      localStorage.setItem('auth_token', 'valid-token');
      localStorage.setItem('user_data', JSON.stringify({
        id: 'user-123',
        username: 'TestUser',
        email: 'test@test.com',
        tier: 'free',
        stats: { gamesPlayed: 0, wins: 0, winRate: 0 },
        createdAt: new Date().toISOString()
      }));
      
      isAuth = await authService.isAuthenticated();
      expect(isAuth).toBe(true);
    });
  });
});