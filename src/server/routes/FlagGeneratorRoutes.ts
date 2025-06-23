import { Router, Request, Response } from 'express';
import { FlagGeneratorEngine, FlagTier, GenerationLimitsByTier } from '../../core/flag-generator/FlagGeneratorEngine';
import { verifyClientToken } from '../jwt';
import { flagStorage } from '../FlagStorage';

const router = Router();
const engine = new FlagGeneratorEngine();

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: Date }>();

interface AuthRequest extends Request {
  user?: {
    id: string;
    subscriptionTier?: FlagTier;
  };
}


// Middleware to check generation limits
const checkGenerationLimit = async (req: AuthRequest, res: Response, next: Function) => {
  const userId = req.user?.id || req.ip;
  const tier = req.user?.subscriptionTier || 'free';
  const limits = GenerationLimitsByTier[tier];
  
  const todayCount = await flagStorage.getTodayGenerationCount(userId);
  
  if (limits.dailyGenerations !== -1 && todayCount >= limits.dailyGenerations) {
    return res.status(429).json({
      error: 'Daily generation limit reached',
      limit: limits.dailyGenerations,
      resetAt: new Date(new Date().setHours(24, 0, 0, 0))
    });
  }
  
  req.generationsToday = todayCount;
  next();
};

// Simple auth middleware
const authenticateToken = async (req: AuthRequest, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const payload = await verifyClientToken(token);
      req.user = {
        id: payload.id,
        subscriptionTier: payload.subscriptionTier || 'free'
      };
    } catch (error) {
      // Invalid token, continue as guest
    }
  }
  
  // Continue as guest if no valid token
  if (!req.user) {
    req.user = {
      id: req.ip || 'anonymous',
      subscriptionTier: 'free'
    };
  }
  
  next();
};

// Generate a new flag
router.post('/generate', authenticateToken, checkGenerationLimit, async (req: AuthRequest, res: Response) => {
  try {
    const { params } = req.body;
    const userId = req.user?.id || req.ip;
    const tier = req.user?.subscriptionTier || 'free';
    
    // Validate params
    if (!params || !params.style) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    
    // Generate flag
    const flag = await engine.generateFlag(params, tier);
    
    res.json({
      success: true,
      flag,
      generationsToday: (req.generationsToday || 0) + 1,
      remainingToday: engine.getRemainingGenerations((req.generationsToday || 0) + 1, tier)
    });
    
  } catch (error) {
    console.error('Flag generation error:', error);
    res.status(500).json({ error: 'Generation failed' });
  }
});

// Save a generated flag
router.post('/save', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { flag, name } = req.body;
    const userId = req.user?.id;
    const tier = req.user?.subscriptionTier || 'free';
    const limits = GenerationLimitsByTier[tier];
    
    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required to save flags' });
    }
    
    // Get user's saved flags
    const userFlags = await flagStorage.getUserFlags(userId);
    
    // Check slot limit
    if (userFlags.length >= limits.maxSaveSlots) {
      return res.status(400).json({
        error: 'Save slot limit reached',
        limit: limits.maxSaveSlots
      });
    }
    
    // Save the flag
    const savedFlag = await flagStorage.saveFlag(userId, {
      id: `ai_${Date.now().toString()}`,
      svg: flag.svg || flag,
      name: name || 'Untitled Flag',
      metadata: flag.metadata || {},
      public: false
    });
    
    res.json({ success: true, savedFlag });
    
  } catch (error) {
    console.error('Save flag error:', error);
    res.status(500).json({ error: 'Failed to save flag' });
  }
});

// Get user's saved flags
router.get('/saved', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userFlags = await flagStorage.getUserFlags(userId);
    
    res.json({ flags: userFlags });
    
  } catch (error) {
    console.error('Get saved flags error:', error);
    res.status(500).json({ error: 'Failed to get saved flags' });
  }
});

// Delete a saved flag
router.delete('/saved/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const flagId = req.params.id;
    
    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const success = await flagStorage.deleteFlag(userId, flagId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Flag not found' });
    }
    
  } catch (error) {
    console.error('Delete flag error:', error);
    res.status(500).json({ error: 'Failed to delete flag' });
  }
});

// Get a specific flag by ID (public endpoint for in-game display)
router.get('/:flagId', async (req: Request, res: Response) => {
  try {
    const flagId = req.params.flagId;
    
    const flag = await flagStorage.getFlag(flagId);
    if (flag) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(flag.svg);
    }
    
    res.status(404).send('Flag not found');
  } catch (error) {
    console.error('Get flag error:', error);
    res.status(500).send('Failed to get flag');
  }
});

// Get generation stats
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.ip;
    const tier = req.user?.subscriptionTier || 'free';
    
    const todayCount = await flagStorage.getTodayGenerationCount(userId);
    const limits = GenerationLimitsByTier[tier];
    
    res.json({
      generationsToday: todayCount,
      dailyLimit: limits.dailyGenerations,
      remainingToday: engine.getRemainingGenerations(todayCount, tier),
      tier,
      limits
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      generationsToday?: number;
    }
  }
}

export default router;