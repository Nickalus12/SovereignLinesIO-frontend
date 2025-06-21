-- Sovereign Lines Subscription System Database Schema
-- This schema manages user subscriptions, payment history, and cosmetic unlocks

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Subscription tiers enum
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'elite', 'sovereign');

-- Subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired', 'past_due', 'trialing');

-- Main subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    
    -- Dates
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE, -- NULL for active subscriptions
    trial_end_date TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- Billing
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT true,
    payment_method VARCHAR(50), -- 'card', 'paypal', etc.
    
    -- Customization selections
    selected_name_color VARCHAR(50),
    selected_border_style VARCHAR(50),
    selected_death_animation VARCHAR(50),
    selected_win_animation VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_subscriptions_user_id (user_id),
    INDEX idx_subscriptions_status (status),
    INDEX idx_subscriptions_tier (tier),
    INDEX idx_subscriptions_end_date (end_date)
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    
    -- Status
    status VARCHAR(50) NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'
    failure_reason TEXT,
    
    -- Metadata
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    INDEX idx_payment_history_user_id (user_id),
    INDEX idx_payment_history_created_at (created_at)
);

-- User cosmetics unlocks table
CREATE TABLE IF NOT EXISTS user_cosmetics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    unlocked_items JSONB NOT NULL DEFAULT '{}',
    -- Structure: {
    --   "nameColors": ["#color1", "#color2"],
    --   "borderStyles": ["style1", "style2"],
    --   "deathAnimations": ["anim1", "anim2"],
    --   "winAnimations": ["anim1", "anim2"]
    -- }
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Custom flags storage
CREATE TABLE IF NOT EXISTS user_custom_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL CHECK (slot_number >= 0 AND slot_number < 10),
    flag_name VARCHAR(100) NOT NULL,
    flag_data TEXT NOT NULL, -- Base64 encoded image
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, slot_number),
    INDEX idx_custom_flags_user_id (user_id)
);

-- Exclusive map access
CREATE TABLE IF NOT EXISTS user_map_access (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    map_ids TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Monthly cosmetic rewards (for Sovereign tier)
CREATE TABLE IF NOT EXISTS user_monthly_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    cosmetic_id VARCHAR(100) NOT NULL,
    cosmetic_type VARCHAR(50) NOT NULL, -- 'nameColor', 'border', 'animation', etc.
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, month),
    INDEX idx_monthly_rewards_user_id (user_id),
    INDEX idx_monthly_rewards_month (month)
);

-- Subscription usage tracking
CREATE TABLE IF NOT EXISTS emoji_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID,
    emoji_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    INDEX idx_emoji_usage_user_id (user_id),
    INDEX idx_emoji_usage_created_at (created_at)
);

-- Promotional codes
CREATE TABLE IF NOT EXISTS promo_codes (
    code VARCHAR(50) PRIMARY KEY,
    discount_percent INTEGER CHECK (discount_percent > 0 AND discount_percent <= 100),
    discount_amount DECIMAL(10, 2),
    applicable_tiers subscription_tier[] NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    INDEX idx_promo_codes_valid_dates (valid_from, valid_until)
);

-- User promo code usage
CREATE TABLE IF NOT EXISTS user_promo_usage (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    promo_code VARCHAR(50) NOT NULL REFERENCES promo_codes(code),
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (user_id, promo_code)
);

-- Add subscription columns to users table (if not exists)
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS friend_limit INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS party_size_limit INTEGER DEFAULT 4,
    ADD COLUMN IF NOT EXISTS custom_flag_slots INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS beta_access BOOLEAN DEFAULT false;

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_cosmetics_updated_at
    BEFORE UPDATE ON user_cosmetics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to check subscription expiry
CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS void AS $$
BEGIN
    -- Mark expired subscriptions
    UPDATE subscriptions
    SET status = 'expired'
    WHERE status = 'active'
      AND end_date IS NOT NULL
      AND end_date < NOW();
      
    -- Update user tiers for expired subscriptions
    UPDATE users u
    SET subscription_tier = 'free'
    FROM subscriptions s
    WHERE u.id = s.user_id
      AND s.status = 'expired'
      AND s.end_date = (
          SELECT MAX(end_date)
          FROM subscriptions s2
          WHERE s2.user_id = u.id
      );
END;
$$ LANGUAGE plpgsql;

-- Function to grant subscription benefits
CREATE OR REPLACE FUNCTION grant_subscription_benefits(
    p_user_id UUID,
    p_tier subscription_tier
)
RETURNS void AS $$
BEGIN
    -- This is a placeholder for the application to implement
    -- The actual benefit granting logic should be in the application layer
    -- This function exists for documentation purposes
    
    -- Update user subscription tier
    UPDATE users
    SET subscription_tier = p_tier
    WHERE id = p_user_id;
    
    -- Log the grant
    RAISE NOTICE 'Granted % benefits to user %', p_tier, p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_active
    ON subscriptions(user_id, tier)
    WHERE status = 'active' AND (end_date IS NULL OR end_date > NOW());

CREATE INDEX IF NOT EXISTS idx_payment_history_recent
    ON payment_history(user_id, created_at DESC)
    WHERE created_at > NOW() - INTERVAL '90 days';

-- Views
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT 
    s.*,
    u.username,
    u.email
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active' 
  AND (s.end_date IS NULL OR s.end_date > NOW());

CREATE OR REPLACE VIEW subscription_metrics AS
SELECT 
    tier,
    COUNT(*) as total_subscribers,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month,
    COUNT(*) FILTER (WHERE canceled_at > NOW() - INTERVAL '30 days') as canceled_this_month
FROM subscriptions
WHERE status IN ('active', 'canceled')
GROUP BY tier;

-- Grant permissions (adjust based on your user roles)
GRANT SELECT, INSERT, UPDATE ON subscriptions TO sovereign_backend;
GRANT SELECT, INSERT ON payment_history TO sovereign_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_cosmetics TO sovereign_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_custom_flags TO sovereign_backend;
GRANT SELECT, INSERT, UPDATE ON user_map_access TO sovereign_backend;
GRANT SELECT, INSERT ON user_monthly_rewards TO sovereign_backend;
GRANT SELECT, INSERT ON emoji_usage TO sovereign_backend;
GRANT SELECT ON promo_codes TO sovereign_backend;
GRANT SELECT, INSERT ON user_promo_usage TO sovereign_backend;
GRANT EXECUTE ON FUNCTION check_subscription_expiry() TO sovereign_backend;
GRANT EXECUTE ON FUNCTION grant_subscription_benefits(UUID, subscription_tier) TO sovereign_backend;