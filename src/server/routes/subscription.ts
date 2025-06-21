import { Router, Request, Response } from "express";
import { SubscriptionManager } from "../SubscriptionManager";
import { SubscriptionTier } from "../../core/SubscriptionSchemas";
import { logger } from "../Logger";
import Stripe from "stripe";
import { Pool } from "pg";

export function createSubscriptionRouter(
  db: Pool,
  stripeSecretKey: string,
  stripeWebhookSecret: string
): Router {
  const router = Router();
  const subscriptionManager = new SubscriptionManager(db, stripeSecretKey, stripeWebhookSecret);
  const subscriptionLogger = logger.child({ component: "SubscriptionRouter" });

  // Middleware to verify JWT token
  async function authenticateUser(req: Request, res: Response, next: () => void) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    try {
      // Verify JWT token and extract user ID
      // This should use your existing JWT verification logic
      const decoded = await verifyJWT(token);
      (req as any).userId = decoded.userId;
      (req as any).userEmail = decoded.email;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // Get current subscription status
  router.get("/current", authenticateUser, async (req: Request, res: Response) => {
    try {
      const subscription = await subscriptionManager.getSubscription((req as any).userId);
      
      res.json({
        tier: subscription?.tier || SubscriptionTier.Free,
        subscription: subscription,
      });
    } catch (error) {
      subscriptionLogger.error("Failed to get subscription", { userId: (req as any).userId, error });
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  // Create checkout session
  router.post("/create-checkout", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { tier, billing } = req.body;
      
      // Validate tier
      if (!Object.values(SubscriptionTier).includes(tier) || tier === SubscriptionTier.Free) {
        return res.status(400).json({ error: "Invalid tier" });
      }

      // Validate billing period
      if (!["monthly", "yearly"].includes(billing)) {
        return res.status(400).json({ error: "Invalid billing period" });
      }

      const checkoutUrl = await subscriptionManager.createCheckoutSession(
        (req as any).userId,
        (req as any).userEmail,
        tier,
        billing
      );

      res.json({ checkoutUrl });
    } catch (error) {
      subscriptionLogger.error("Failed to create checkout session", { userId: (req as any).userId, error });
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Update subscription customization
  router.post("/customize", authenticateUser, async (req: Request, res: Response) => {
    try {
      const customization = req.body;
      
      await subscriptionManager.updateCustomization((req as any).userId, customization);
      
      res.json({ success: true });
    } catch (error) {
      subscriptionLogger.error("Failed to update customization", { userId: (req as any).userId, error });
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel subscription
  router.post("/cancel", authenticateUser, async (req: Request, res: Response) => {
    try {
      await subscriptionManager.cancelSubscription((req as any).userId);
      
      res.json({ success: true, message: "Subscription will be canceled at the end of the billing period" });
    } catch (error) {
      subscriptionLogger.error("Failed to cancel subscription", { userId: (req as any).userId, error });
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Stripe webhook endpoint
  router.post("/webhook", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    
    if (!sig) {
      return res.status(400).json({ error: "No signature" });
    }

    try {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        stripeWebhookSecret
      );

      await subscriptionManager.handleWebhook(event);
      
      res.json({ received: true });
    } catch (error) {
      subscriptionLogger.error("Webhook error", { error });
      res.status(400).json({ error: "Webhook error" });
    }
  });

  // Check subscription limit
  router.get("/check-limit/:limitType", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { limitType } = req.params;
      const allowed = await subscriptionManager.checkLimit((req as any).userId, limitType as any);
      
      res.json({ allowed });
    } catch (error) {
      subscriptionLogger.error("Failed to check limit", { userId: (req as any).userId, limitType: req.params.limitType, error });
      res.status(500).json({ error: "Failed to check limit" });
    }
  });

  // Get subscription stats (admin only)
  router.get("/stats", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      const isAdmin = await checkIfUserIsAdmin((req as any).userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const stats = await subscriptionManager.getSubscriptionStats();
      
      res.json(stats);
    } catch (error) {
      subscriptionLogger.error("Failed to get subscription stats", { error });
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Success page handler
  router.get("/success", async (req: Request, res: Response) => {
    const { session_id } = req.query;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Subscription Successful</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 20px;
          }
          h1 { font-size: 48px; margin-bottom: 20px; }
          p { font-size: 20px; margin-bottom: 30px; }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            transition: transform 0.3s;
          }
          .button:hover { transform: translateY(-2px); }
          .crown { font-size: 80px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="crown">👑</div>
          <h1>Welcome to the Kingdom!</h1>
          <p>Your subscription has been activated successfully.</p>
          <a href="/" class="button">Return to Game</a>
        </div>
        <script>
          // Notify the game window about the successful subscription
          if (window.opener) {
            window.opener.postMessage({ type: 'subscription:success' }, '*');
            setTimeout(() => window.close(), 3000);
          }
        </script>
      </body>
      </html>
    `);
  });

  // Cancel page handler
  router.get("/cancel", async (req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Subscription Cancelled</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f0f0f0;
            color: #333;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }
          h1 { font-size: 36px; margin-bottom: 20px; color: #666; }
          p { font-size: 18px; margin-bottom: 30px; }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            transition: transform 0.3s;
          }
          .button:hover { transform: translateY(-2px); }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Subscription Cancelled</h1>
          <p>No worries! You can always subscribe later.</p>
          <a href="/" class="button">Return to Game</a>
        </div>
        <script>
          // Notify the game window about the cancellation
          if (window.opener) {
            window.opener.postMessage({ type: 'subscription:cancelled' }, '*');
            setTimeout(() => window.close(), 3000);
          }
        </script>
      </body>
      </html>
    `);
  });

  return router;
}

// Placeholder functions - implement these based on your authentication system
async function verifyJWT(token: string): Promise<{ userId: string; email: string }> {
  // Implement JWT verification
  // This should match your existing authentication logic
  throw new Error("JWT verification not implemented");
}

async function checkIfUserIsAdmin(userId: string): Promise<boolean> {
  // Implement admin check
  return false;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}