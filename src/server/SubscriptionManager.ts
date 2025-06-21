import { Pool } from "pg";
import Stripe from "stripe";
import { logger } from "./Logger";
import { 
  SubscriptionTier, 
  SubscriptionPricing,
  Subscription,
  SubscriptionBenefits 
} from "../core/SubscriptionSchemas";

export class SubscriptionManager {
  private stripe: Stripe;
  private logger: typeof logger;
  
  constructor(
    private db: Pool,
    private stripeSecretKey: string,
    private webhookSecret: string
  ) {
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });
    this.logger = logger.child({ component: "SubscriptionManager" });
  }

  /**
   * Get user's current subscription
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM subscriptions 
         WHERE user_id = $1 AND (end_date IS NULL OR end_date > NOW())
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbToSubscription(result.rows[0]);
    } catch (error) {
      this.logger.error("Failed to get subscription", { userId, error });
      throw error;
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    tier: SubscriptionTier,
    billing: "monthly" | "yearly"
  ): Promise<string> {
    try {
      const pricing = SubscriptionPricing[tier];
      const priceId = billing === "monthly" 
        ? pricing.stripePriceId 
        : pricing.stripePriceIdYearly;

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          tier,
        },
        success_url: `${this.getClientUrl()}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.getClientUrl()}/subscription/cancel`,
        allow_promotion_codes: true,
        billing_address_collection: "required",
        subscription_data: {
          metadata: {
            userId,
            tier,
          },
        },
      });

      return session.url || "";
    } catch (error) {
      this.logger.error("Failed to create checkout session", { userId, tier, error });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
          
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
          
        case "customer.subscription.deleted":
          await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
          break;
          
        case "invoice.payment_failed":
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
      }
    } catch (error) {
      this.logger.error("Webhook handling failed", { eventType: event.type, error });
      throw error;
    }
  }

  /**
   * Handle successful checkout
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as SubscriptionTier;
    
    if (!userId || !tier) {
      this.logger.error("Missing metadata in checkout session", { sessionId: session.id });
      return;
    }

    const subscription = session.subscription as string;
    
    await this.createSubscription({
      userId,
      tier,
      stripeSubscriptionId: subscription,
      stripeCustomerId: session.customer as string,
      status: "active",
    });

    // Grant immediate benefits
    await this.grantSubscriptionBenefits(userId, tier);
    
    // Send confirmation email
    await this.sendSubscriptionEmail(userId, tier, "welcome");
    
    this.logger.info("Subscription created", { userId, tier });
  }

  /**
   * Create subscription in database
   */
  private async createSubscription(data: {
    userId: string;
    tier: SubscriptionTier;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    status: string;
  }) {
    try {
      // End any existing subscriptions
      await this.db.query(
        `UPDATE subscriptions 
         SET end_date = NOW(), status = 'canceled' 
         WHERE user_id = $1 AND end_date IS NULL`,
        [data.userId]
      );

      // Create new subscription
      await this.db.query(
        `INSERT INTO subscriptions 
         (user_id, tier, stripe_subscription_id, stripe_customer_id, status, start_date)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [data.userId, data.tier, data.stripeSubscriptionId, data.stripeCustomerId, data.status]
      );

      // Update user record
      await this.db.query(
        `UPDATE users SET subscription_tier = $1 WHERE id = $2`,
        [data.tier, data.userId]
      );
    } catch (error) {
      this.logger.error("Failed to create subscription", { data, error });
      throw error;
    }
  }

  /**
   * Grant subscription benefits
   */
  private async grantSubscriptionBenefits(userId: string, tier: SubscriptionTier) {
    const benefits = SubscriptionBenefits[tier];
    
    try {
      // Grant cosmetic unlocks
      const cosmeticUnlocks = {
        nameColors: benefits.nameColors,
        borderStyles: benefits.borderStyles,
        deathAnimations: benefits.deathAnimations,
        winAnimations: benefits.winAnimations,
      };

      await this.db.query(
        `INSERT INTO user_cosmetics (user_id, unlocked_items)
         VALUES ($1, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET unlocked_items = user_cosmetics.unlocked_items || $2`,
        [userId, JSON.stringify(cosmeticUnlocks)]
      );

      // Update user limits
      await this.db.query(
        `UPDATE users SET
         friend_limit = $1,
         party_size_limit = $2,
         custom_flag_slots = $3
         WHERE id = $4`,
        [
          benefits.friendSlots === -1 ? 999999 : benefits.friendSlots,
          benefits.partySize,
          benefits.customFlagSlots,
          userId
        ]
      );

      // Grant exclusive map access
      if (benefits.exclusiveMaps && benefits.exclusiveMaps.length > 0) {
        await this.db.query(
          `INSERT INTO user_map_access (user_id, map_ids)
           VALUES ($1, $2)
           ON CONFLICT (user_id)
           DO UPDATE SET map_ids = array_cat(user_map_access.map_ids, $2)`,
          [userId, benefits.exclusiveMaps]
        );
      }

      // Special Sovereign benefits
      if (tier === SubscriptionTier.Sovereign) {
        await this.grantSovereignSpecialBenefits(userId);
      }
    } catch (error) {
      this.logger.error("Failed to grant benefits", { userId, tier, error });
      throw error;
    }
  }

  /**
   * Grant special Sovereign tier benefits
   */
  private async grantSovereignSpecialBenefits(userId: string) {
    // Grant Discord role (if connected)
    await this.grantDiscordRole(userId, "Sovereign");
    
    // Grant current month's exclusive cosmetic
    const monthlyCosmetic = this.getCurrentMonthlyCosmetic();
    await this.db.query(
      `INSERT INTO user_monthly_rewards (user_id, month, cosmetic_id, claimed_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, new Date().toISOString().slice(0, 7), monthlyCosmetic.id]
    );
    
    // Enable beta features
    await this.db.query(
      `UPDATE users SET beta_access = true WHERE id = $1`,
      [userId]
    );
  }

  /**
   * Update subscription customization
   */
  async updateCustomization(
    userId: string,
    customization: {
      nameColor?: string;
      borderStyle?: string;
      deathAnimation?: string;
      winAnimation?: string;
    }
  ) {
    const subscription = await this.getSubscription(userId);
    if (!subscription) {
      throw new Error("No active subscription");
    }

    const benefits = SubscriptionBenefits[subscription.tier];
    
    // Validate selections
    if (customization.nameColor && !benefits.nameColors.includes(customization.nameColor)) {
      throw new Error("Invalid name color for tier");
    }
    
    if (customization.borderStyle && !benefits.borderStyles.includes(customization.borderStyle)) {
      throw new Error("Invalid border style for tier");
    }

    // Update database
    await this.db.query(
      `UPDATE subscriptions SET
       selected_name_color = COALESCE($1, selected_name_color),
       selected_border_style = COALESCE($2, selected_border_style),
       selected_death_animation = COALESCE($3, selected_death_animation),
       selected_win_animation = COALESCE($4, selected_win_animation)
       WHERE user_id = $5 AND end_date IS NULL`,
      [
        customization.nameColor,
        customization.borderStyle,
        customization.deathAnimation,
        customization.winAnimation,
        userId
      ]
    );
  }

  /**
   * Check subscription limits
   */
  async checkLimit(userId: string, limitType: keyof typeof SubscriptionBenefits[SubscriptionTier.Free]): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    const tier = subscription?.tier || SubscriptionTier.Free;
    const benefits = SubscriptionBenefits[tier];
    
    const limit = benefits[limitType];
    
    // -1 means unlimited
    if (limit === -1) return true;
    
    // Check specific limits
    switch (limitType) {
      case "emojisPerMinute":
        const recentEmojis = await this.getRecentEmojiCount(userId);
        return recentEmojis < (limit as number);
        
      case "spectatorSlots":
        const activeSpectators = await this.getActiveSpectatorCount(userId);
        return activeSpectators < (limit as number);
        
      // Add more limit checks as needed
      
      default:
        return true;
    }
  }

  /**
   * Get subscription stats for analytics
   */
  async getSubscriptionStats(): Promise<{
    total: number;
    byTier: Record<SubscriptionTier, number>;
    mrr: number;
    churnRate: number;
  }> {
    const stats = await this.db.query(`
      SELECT 
        COUNT(*) as total,
        tier,
        COUNT(*) FILTER (WHERE tier = 'premium') as premium_count,
        COUNT(*) FILTER (WHERE tier = 'elite') as elite_count,
        COUNT(*) FILTER (WHERE tier = 'sovereign') as sovereign_count
      FROM subscriptions
      WHERE end_date IS NULL AND status = 'active'
      GROUP BY tier
    `);

    const mrrQuery = await this.db.query(`
      SELECT SUM(
        CASE 
          WHEN tier = 'premium' THEN ${SubscriptionPricing.premium.monthly}
          WHEN tier = 'elite' THEN ${SubscriptionPricing.elite.monthly}
          WHEN tier = 'sovereign' THEN ${SubscriptionPricing.sovereign.monthly}
          ELSE 0
        END
      ) as mrr
      FROM subscriptions
      WHERE end_date IS NULL AND status = 'active'
    `);

    // Calculate churn (simplified)
    const churnQuery = await this.db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE end_date > NOW() - INTERVAL '30 days') as churned,
        COUNT(*) as total
      FROM subscriptions
      WHERE created_at < NOW() - INTERVAL '30 days'
    `);

    const churnData = churnQuery.rows[0];
    const churnRate = churnData.total > 0 ? (churnData.churned / churnData.total) * 100 : 0;

    return {
      total: stats.rowCount || 0,
      byTier: {
        [SubscriptionTier.Free]: 0,
        [SubscriptionTier.Premium]: stats.rows[0]?.premium_count || 0,
        [SubscriptionTier.Elite]: stats.rows[0]?.elite_count || 0,
        [SubscriptionTier.Sovereign]: stats.rows[0]?.sovereign_count || 0,
      },
      mrr: mrrQuery.rows[0]?.mrr || 0,
      churnRate,
    };
  }

  /**
   * Helper methods
   */
  private getClientUrl(): string {
    const clientUrl = process.env.CLIENT_URL;
    if (!clientUrl) {
      throw new Error("CLIENT_URL environment variable is required");
    }
    return clientUrl;
  }

  private mapDbToSubscription(row: any): Subscription {
    return {
      userId: row.user_id,
      tier: row.tier,
      startDate: row.start_date.getTime(),
      endDate: row.end_date?.getTime() || null,
      autoRenew: row.auto_renew,
      paymentMethod: row.payment_method,
      selectedNameColor: row.selected_name_color || SubscriptionBenefits[row.tier].nameColors[0],
      selectedBorderStyle: row.selected_border_style || SubscriptionBenefits[row.tier].borderStyles[0],
      selectedDeathAnimation: row.selected_death_animation || SubscriptionBenefits[row.tier].deathAnimations[0],
      selectedWinAnimation: row.selected_win_animation || SubscriptionBenefits[row.tier].winAnimations[0],
      customFlags: row.custom_flags || [],
      emojisUsedThisMinute: 0,
      lastEmojiReset: Date.now(),
    };
  }

  private async getRecentEmojiCount(userId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT COUNT(*) FROM emoji_usage 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 minute'`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  private async getActiveSpectatorCount(userId: string): Promise<number> {
    // Implementation depends on your spectator system
    return 0;
  }

  private async sendSubscriptionEmail(userId: string, tier: SubscriptionTier, type: string) {
    // Implement email sending
    this.logger.info("Sending subscription email", { userId, tier, type });
  }

  private async grantDiscordRole(userId: string, role: string) {
    // Implement Discord integration
    this.logger.info("Granting Discord role", { userId, role });
  }

  private getCurrentMonthlyCosmetic() {
    // Return current month's exclusive cosmetic
    const month = new Date().getMonth();
    const cosmetics = [
      { id: "crown_effect_golden", name: "Golden Crown Effect" },
      { id: "trail_rainbow", name: "Rainbow Trail" },
      { id: "border_legendary", name: "Legendary Border" },
      // ... 12 monthly cosmetics
    ];
    return cosmetics[month % cosmetics.length];
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.getSubscription(userId);
    if (!subscription) {
      throw new Error("No active subscription");
    }

    const dbResult = await this.db.query(
      `SELECT stripe_subscription_id FROM subscriptions 
       WHERE user_id = $1 AND end_date IS NULL`,
      [userId]
    );

    if (dbResult.rows.length > 0) {
      const stripeSubId = dbResult.rows[0].stripe_subscription_id;
      
      // Cancel in Stripe
      await this.stripe.subscriptions.update(stripeSubId, {
        cancel_at_period_end: true,
      });

      // Update database
      await this.db.query(
        `UPDATE subscriptions 
         SET auto_renew = false 
         WHERE user_id = $1 AND stripe_subscription_id = $2`,
        [userId, stripeSubId]
      );
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // Handle subscription updates (tier changes, etc.)
    const userId = subscription.metadata.userId;
    if (!userId) return;

    await this.db.query(
      `UPDATE subscriptions 
       SET status = $1, updated_at = NOW() 
       WHERE stripe_subscription_id = $2`,
      [subscription.status, subscription.id]
    );
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;
    if (!userId) return;

    await this.db.query(
      `UPDATE subscriptions 
       SET end_date = NOW(), status = 'canceled' 
       WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );

    await this.db.query(
      `UPDATE users SET subscription_tier = 'free' WHERE id = $1`,
      [userId]
    );
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    // Handle failed payments
    this.logger.warn("Payment failed", { 
      customerId: invoice.customer,
      amount: invoice.amount_due 
    });
  }
}