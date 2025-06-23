import { Request, Response, Router } from 'express';
import { 
  FlagValidationService, 
  CreateFlagRequestSchema, 
  UpdateFlagRequestSchema,
  FlagLibraryQuerySchema 
} from '../FlagValidationService';
import { 
  CustomFlag, 
  FlagTier, 
  FlagLibraryEntry 
} from '../../core/game/FlagTypes';
import { z } from 'zod';

// Mock database - replace with actual database implementation
class FlagDatabase {
  private flags: Map<string, CustomFlag> = new Map();
  private userFlags: Map<string, string[]> = new Map(); // userId -> flagIds[]
  private libraryEntries: Map<string, FlagLibraryEntry> = new Map();

  async saveFlag(flag: CustomFlag): Promise<void> {
    this.flags.set(flag.id, flag);
    
    // Track user's flags
    const userFlagsIds = this.userFlags.get(flag.creatorId) || [];
    if (!userFlagsIds.includes(flag.id)) {
      userFlagsIds.push(flag.id);
      this.userFlags.set(flag.creatorId, userFlagsIds);
    }
  }

  async getFlag(flagId: string): Promise<CustomFlag | null> {
    return this.flags.get(flagId) || null;
  }

  async getUserFlags(userId: string): Promise<CustomFlag[]> {
    const flagIds = this.userFlags.get(userId) || [];
    return flagIds
      .map(id => this.flags.get(id))
      .filter((flag): flag is CustomFlag => flag !== undefined);
  }

  async deleteFlag(flagId: string, userId: string): Promise<boolean> {
    const flag = this.flags.get(flagId);
    if (!flag || flag.creatorId !== userId) {
      return false;
    }

    this.flags.delete(flagId);
    this.libraryEntries.delete(flagId);
    
    // Remove from user's flag list
    const userFlagsIds = this.userFlags.get(userId) || [];
    const updatedFlagIds = userFlagsIds.filter(id => id !== flagId);
    this.userFlags.set(userId, updatedFlagIds);

    return true;
  }

  async getPublicFlags(query: any): Promise<{ flags: FlagLibraryEntry[]; total: number }> {
    const publicFlags = Array.from(this.flags.values())
      .filter(flag => flag.isPublic && flag.isApproved);

    // Apply filters
    let filtered = publicFlags;
    
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(flag => 
        flag.name.toLowerCase().includes(searchLower) ||
        flag.description?.toLowerCase().includes(searchLower) ||
        flag.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (query.category) {
      filtered = filtered.filter(flag => 
        flag.tags.includes(query.category)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (query.sortBy) {
        case 'downloads':
          return query.sortOrder === 'desc' ? b.usageCount - a.usageCount : a.usageCount - b.usageCount;
        case 'rating':
          // Would implement rating system
          return 0;
        case 'created':
        default:
          return query.sortOrder === 'desc' ? b.created - a.created : a.created - b.created;
      }
    });

    // Paginate
    const offset = (query.page - 1) * query.limit;
    const paginatedFlags = filtered.slice(offset, offset + query.limit);

    // Convert to library entries
    const libraryEntries = paginatedFlags.map(flag => ({
      flagId: flag.id,
      flag,
      creatorName: `User${flag.creatorId.slice(0, 8)}`, // Would get actual username
      downloads: flag.usageCount,
      rating: 0, // Would implement rating system
      ratingCount: 0,
      featured: false,
      category: flag.tags[0] || 'General',
      moderationStatus: 'approved' as const
    }));

    return {
      flags: libraryEntries,
      total: filtered.length
    };
  }

  async incrementUsage(flagId: string): Promise<void> {
    const flag = this.flags.get(flagId);
    if (flag) {
      flag.usageCount++;
      this.flags.set(flagId, flag);
    }
  }
}

// Mock user service - replace with actual user service
class UserService {
  static async getUserTier(userId: string): Promise<FlagTier> {
    // Would integrate with actual user/subscription service
    return FlagTier.Free; // Default for mock
  }

  static async getUserId(req: Request): Promise<string | null> {
    // Would extract from JWT token or session
    return req.headers.authorization ? 'mock-user-id' : null;
  }
}

// Initialize mock database
const flagDb = new FlagDatabase();

export const flagApiRouter = Router();

/**
 * Create a new custom flag
 * POST /api/flags
 */
flagApiRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = await UserService.getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const { flag, userTier } = CreateFlagRequestSchema.parse(req.body);
    
    // Get user's actual tier
    const actualUserTier = await UserService.getUserTier(userId);
    
    // Verify user isn't trying to use higher tier features
    if (userTier !== actualUserTier) {
      return res.status(403).json({ error: 'Invalid tier for user' });
    }

    // Check if user can create more flags
    const userFlags = await flagDb.getUserFlags(userId);
    if (!FlagValidationService.canCreateFlag(actualUserTier, userFlags.length)) {
      return res.status(429).json({ 
        error: 'Flag creation limit reached for your tier',
        limit: FlagValidationService.getTierLimitations(actualUserTier).maxPublicFlags
      });
    }

    // Validate the flag
    const validation = FlagValidationService.validateCustomFlag(flag, actualUserTier);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Flag validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Ensure the flag belongs to the requesting user
    validation.sanitizedFlag.creatorId = userId;
    validation.sanitizedFlag.creatorTier = actualUserTier;
    validation.sanitizedFlag.created = Date.now();
    validation.sanitizedFlag.modified = Date.now();

    // Save the flag
    await flagDb.saveFlag(validation.sanitizedFlag);

    res.status(201).json({
      flag: validation.sanitizedFlag,
      warnings: validation.warnings
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: error.errors
      });
    }

    console.error('Flag creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update an existing custom flag
 * PUT /api/flags/:flagId
 */
flagApiRouter.put('/:flagId', async (req: Request, res: Response) => {
  try {
    const userId = await UserService.getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const flagId = req.params.flagId;
    
    // Validate request body
    const { flag: updates, userTier } = UpdateFlagRequestSchema.parse({
      flagId,
      ...req.body
    });

    // Get existing flag
    const existingFlag = await flagDb.getFlag(flagId);
    if (!existingFlag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    // Verify ownership
    if (existingFlag.creatorId !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this flag' });
    }

    // Merge updates with existing flag
    const updatedFlag: CustomFlag = {
      ...existingFlag,
      ...updates,
      id: existingFlag.id, // Prevent ID changes
      creatorId: existingFlag.creatorId, // Prevent ownership changes
      creatorTier: existingFlag.creatorTier, // Tier changes should be handled separately
      created: existingFlag.created, // Prevent creation date changes
      modified: Date.now(),
      version: existingFlag.version + 1
    };

    // Validate the updated flag
    const actualUserTier = await UserService.getUserTier(userId);
    const validation = FlagValidationService.validateCustomFlag(updatedFlag, actualUserTier);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Flag validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Save the updated flag
    await flagDb.saveFlag(validation.sanitizedFlag);

    res.json({
      flag: validation.sanitizedFlag,
      warnings: validation.warnings
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: error.errors
      });
    }

    console.error('Flag update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user's custom flags
 * GET /api/flags/mine
 */
flagApiRouter.get('/mine', async (req: Request, res: Response) => {
  try {
    const userId = await UserService.getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const flags = await flagDb.getUserFlags(userId);
    res.json({ flags });

  } catch (error) {
    console.error('Get user flags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a specific flag by ID
 * GET /api/flags/:flagId
 */
flagApiRouter.get('/:flagId', async (req: Request, res: Response) => {
  try {
    const flagId = req.params.flagId;
    const flag = await flagDb.getFlag(flagId);
    
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    // Check if user can access this flag
    const userId = await UserService.getUserId(req);
    const isOwner = userId === flag.creatorId;
    const isPublic = flag.isPublic && flag.isApproved;

    if (!isOwner && !isPublic) {
      return res.status(403).json({ error: 'Flag not accessible' });
    }

    // Increment usage count if accessing a public flag
    if (isPublic && !isOwner) {
      await flagDb.incrementUsage(flagId);
    }

    res.json({ flag });

  } catch (error) {
    console.error('Get flag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a custom flag
 * DELETE /api/flags/:flagId
 */
flagApiRouter.delete('/:flagId', async (req: Request, res: Response) => {
  try {
    const userId = await UserService.getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const flagId = req.params.flagId;
    const deleted = await flagDb.deleteFlag(flagId, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Flag not found or not authorized' });
    }

    res.json({ message: 'Flag deleted successfully' });

  } catch (error) {
    console.error('Delete flag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get public flag library
 * GET /api/flags/library
 */
flagApiRouter.get('/library', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const query = FlagLibraryQuerySchema.parse(req.query);
    
    const result = await flagDb.getPublicFlags(query);
    
    res.json({
      flags: result.flags,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        pages: Math.ceil(result.total / query.limit)
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid query parameters',
        details: error.errors
      });
    }

    console.error('Get flag library error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Copy/use a public flag
 * POST /api/flags/:flagId/copy
 */
flagApiRouter.post('/:flagId/copy', async (req: Request, res: Response) => {
  try {
    const userId = await UserService.getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const flagId = req.params.flagId;
    const originalFlag = await flagDb.getFlag(flagId);
    
    if (!originalFlag || !originalFlag.isPublic || !originalFlag.isApproved) {
      return res.status(404).json({ error: 'Flag not found or not public' });
    }

    // Check if user can create more flags
    const userTier = await UserService.getUserTier(userId);
    const userFlags = await flagDb.getUserFlags(userId);
    if (!FlagValidationService.canCreateFlag(userTier, userFlags.length)) {
      return res.status(429).json({ 
        error: 'Flag creation limit reached for your tier',
        limit: FlagValidationService.getTierLimitations(userTier).maxPublicFlags
      });
    }

    // Create a copy of the flag
    const copiedFlag: CustomFlag = {
      ...originalFlag,
      id: crypto.randomUUID(),
      name: `${originalFlag.name} (Copy)`,
      creatorId: userId,
      creatorTier: userTier,
      created: Date.now(),
      modified: Date.now(),
      version: 1,
      isPublic: false,
      isApproved: false,
      usageCount: 0,
      reportCount: 0
    };

    // Validate the copied flag against user's tier
    const validation = FlagValidationService.validateCustomFlag(copiedFlag, userTier);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Cannot copy flag - validation failed',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Save the copied flag
    await flagDb.saveFlag(validation.sanitizedFlag);

    // Increment usage of original flag
    await flagDb.incrementUsage(flagId);

    res.status(201).json({
      flag: validation.sanitizedFlag,
      warnings: validation.warnings
    });

  } catch (error) {
    console.error('Copy flag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get tier limitations for current user
 * GET /api/flags/tier-info
 */
flagApiRouter.get('/tier-info', async (req: Request, res: Response) => {
  try {
    const userId = await UserService.getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userTier = await UserService.getUserTier(userId);
    const limitations = FlagValidationService.getTierLimitations(userTier);
    const userFlags = await flagDb.getUserFlags(userId);

    res.json({
      tier: userTier,
      limitations,
      currentUsage: {
        flagCount: userFlags.length,
        canCreateMore: FlagValidationService.canCreateFlag(userTier, userFlags.length)
      }
    });

  } catch (error) {
    console.error('Get tier info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default flagApiRouter;