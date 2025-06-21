import { NextFunction, Request, Response } from "express";
import http from "http";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { Gatekeeper, LimiterType } from "../Gatekeeper";
import { logger } from "../Logger";

interface RateLimiterConfig {
  points: number;
  duration: number;
  blockDuration?: number;
}

export class RealGatekeeper implements Gatekeeper {
  private limiters: Map<LimiterType, RateLimiterMemory>;
  private wsLimiters: Map<string, RateLimiterMemory>;
  private logger: typeof logger;
  
  // Track suspicious IPs
  private suspiciousIPs: Map<string, number> = new Map();
  private bannedIPs: Set<string> = new Set();

  constructor() {
    this.logger = logger.child({ component: "RealGatekeeper" });
    this.limiters = new Map();
    this.wsLimiters = new Map();
    this.initializeLimiters();
  }

  private initializeLimiters() {
    // Check if we're in development mode
    const isDev = process.env.GAME_ENV === "dev";
    
    // Configure rate limits for different endpoints
    const configs: Record<LimiterType, RateLimiterConfig> = {
      [LimiterType.Get]: {
        points: isDev ? 1000 : 100,      // 1000 requests in dev, 100 in prod
        duration: 60,     // per 60 seconds
        blockDuration: isDev ? 30 : 300, // 30 sec in dev, 5 min in prod
      },
      [LimiterType.Post]: {
        points: isDev ? 500 : 50,
        duration: 60,
        blockDuration: isDev ? 60 : 600, // 1 min in dev, 10 min in prod
      },
      [LimiterType.Put]: {
        points: isDev ? 300 : 30,
        duration: 60,
        blockDuration: isDev ? 60 : 600,
      },
      [LimiterType.WebSocket]: {
        points: isDev ? 2000 : 200,      // 2000 messages in dev, 200 in prod
        duration: 60,     // per minute
        blockDuration: isDev ? 60 : 1800, // 1 min in dev, 30 min in prod
      },
    };

    // Create rate limiters
    for (const [type, config] of Object.entries(configs)) {
      this.limiters.set(type as LimiterType, new RateLimiterMemory(config));
    }
  }

  httpHandler(
    limiterType: LimiterType,
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = this.getIP(req);
        
        // Check if banned
        if (this.bannedIPs.has(ip)) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const limiter = this.limiters.get(limiterType);
        if (!limiter) {
          // No limiter configured, proceed
          await fn(req, res, next);
          return;
        }

        try {
          await limiter.consume(ip);
          
          // Reset suspicious counter on successful request
          if (this.suspiciousIPs.has(ip)) {
            const count = this.suspiciousIPs.get(ip)! - 1;
            if (count <= 0) {
              this.suspiciousIPs.delete(ip);
            } else {
              this.suspiciousIPs.set(ip, count);
            }
          }
          
          await fn(req, res, next);
        } catch (rejRes) {
          if (rejRes instanceof RateLimiterRes) {
            // Track suspicious behavior
            this.trackSuspiciousActivity(ip, limiterType);
            
            const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
            res.set({
              "Retry-After": String(secs),
              "X-RateLimit-Limit": String(limiter.points),
              "X-RateLimit-Remaining": String(rejRes.remainingPoints || 0),
              "X-RateLimit-Reset": new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
            });
            
            res.status(429).json({
              error: "Too many requests",
              retryAfter: secs,
            });
            
            this.logger.warn("Rate limit exceeded", {
              ip,
              limiterType,
              consumedPoints: rejRes.consumedPoints,
            });
          } else {
            next(rejRes);
          }
        }
      } catch (error) {
        next(error);
      }
    };
  }

  wsHandler(
    req: http.IncomingMessage | string,
    fn: (message: string) => Promise<void>
  ) {
    return async (message: string) => {
      try {
        const ip = typeof req === "string" ? req : this.getIPFromRequest(req);
        
        // Check if banned
        if (this.bannedIPs.has(ip)) {
          this.logger.warn("Banned IP attempted WebSocket message", { ip });
          return;
        }

        // Get or create WebSocket limiter for this IP
        if (!this.wsLimiters.has(ip)) {
          this.wsLimiters.set(ip, new RateLimiterMemory({
            points: 200,
            duration: 60,
            blockDuration: 1800,
          }));
        }

        const limiter = this.wsLimiters.get(ip)!;

        try {
          await limiter.consume(ip);
          
          // Additional validation for WebSocket messages
          if (this.isValidWebSocketMessage(message)) {
            await fn(message);
          } else {
            this.logger.warn("Invalid WebSocket message", { ip, message: message.substring(0, 100) });
            this.trackSuspiciousActivity(ip, LimiterType.WebSocket);
          }
        } catch (rejRes) {
          if (rejRes instanceof RateLimiterRes) {
            this.trackSuspiciousActivity(ip, LimiterType.WebSocket);
            
            this.logger.warn("WebSocket rate limit exceeded", {
              ip,
              consumedPoints: rejRes.consumedPoints,
            });
            
            // In severe cases, close the connection
            if (rejRes.consumedPoints > 400) {
              // Emit event to close WebSocket connection
              // You'll need to implement this in your WebSocket handler
              this.logger.error("Closing WebSocket due to excessive messages", { ip });
            }
          }
        }
      } catch (error) {
        this.logger.error("WebSocket handler error", error);
      }
    };
  }

  private getIP(req: Request): string {
    // Get real IP, considering proxies
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "unknown"
    );
  }

  private getIPFromRequest(req: http.IncomingMessage): string {
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "unknown"
    );
  }

  private isValidWebSocketMessage(message: string): boolean {
    // Basic validation
    if (!message || message.length > 10000) {
      return false;
    }

    try {
      // Check if it's valid JSON
      JSON.parse(message);
      return true;
    } catch {
      return false;
    }
  }

  private trackSuspiciousActivity(ip: string, limiterType: LimiterType) {
    // Skip tracking in development mode
    if (process.env.GAME_ENV === "dev") {
      return;
    }
    
    const current = this.suspiciousIPs.get(ip) || 0;
    const updated = current + 1;
    this.suspiciousIPs.set(ip, updated);

    // Different thresholds for different types
    const thresholds: Record<LimiterType, number> = {
      [LimiterType.Get]: 10,
      [LimiterType.Post]: 5,
      [LimiterType.Put]: 5,
      [LimiterType.WebSocket]: 3,
    };

    const threshold = thresholds[limiterType];
    
    if (updated >= threshold) {
      this.banIP(ip, limiterType, updated);
    }
  }

  private banIP(ip: string, reason: LimiterType, violations: number) {
    this.bannedIPs.add(ip);
    this.suspiciousIPs.delete(ip);
    
    this.logger.error("IP banned for suspicious activity", {
      ip,
      reason,
      violations,
    });

    // Schedule unban after 24 hours
    setTimeout(() => {
      this.bannedIPs.delete(ip);
      this.logger.info("IP unbanned", { ip });
    }, 24 * 60 * 60 * 1000);
  }

  // Admin methods
  public getBannedIPs(): string[] {
    return Array.from(this.bannedIPs);
  }

  public unbanIP(ip: string): boolean {
    return this.bannedIPs.delete(ip);
  }

  public getSuspiciousIPs(): Array<{ ip: string; count: number }> {
    return Array.from(this.suspiciousIPs.entries()).map(([ip, count]) => ({ ip, count }));
  }
}