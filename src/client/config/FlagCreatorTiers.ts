import { FlagTier, FlagTierLimits, FlagTierLimitsMap } from "../../core/game/FlagTypes";

export interface TierFeatureMatrix {
  tier: FlagTier;
  displayName: string;
  description: string;
  badgeColor: string;
  badgeIcon: string;
  limits: FlagTierLimits;
  features: TierFeature[];
  upgradePrompts: UpgradePrompt[];
  cost?: {
    monthly?: number;
    yearly?: number;
    lifetime?: number;
  };
}

export interface TierFeature {
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  highlight?: boolean; // For showcasing premium features
}

export interface UpgradePrompt {
  trigger: string; // When to show this prompt
  title: string;
  description: string;
  ctaText: string;
  featureHighlight: string;
}

// Comprehensive tier feature matrix
export const FlagCreatorTiers: Record<FlagTier, TierFeatureMatrix> = {
  [FlagTier.Free]: {
    tier: FlagTier.Free,
    displayName: "Free Explorer",
    description: "Start your flag journey with basic tools",
    badgeColor: "#6B7280", // Gray
    badgeIcon: "🚀",
    limits: FlagTierLimitsMap[FlagTier.Free],
    features: [
      { name: "Basic Flag Editor", description: "Create simple flags with 3 elements", icon: "✏️", enabled: true },
      { name: "Country Flag Library", description: "Access to 2,300+ country flags", icon: "🌍", enabled: true },
      { name: "Basic Shapes", description: "Rectangle, circle, triangle shapes", icon: "🔷", enabled: true },
      { name: "Simple Symbols", description: "50+ basic symbols", icon: "⭐", enabled: true },
      { name: "Single Text Element", description: "Add one text element", icon: "📝", enabled: true },
      { name: "Save & Use", description: "Save and use your flag in-game", icon: "💾", enabled: true },
      { name: "Gradients", description: "Multi-color backgrounds", icon: "🌈", enabled: false },
      { name: "Effects & Animations", description: "Glow, shadows, animations", icon: "✨", enabled: false },
      { name: "Custom Symbols", description: "Upload your own symbols", icon: "🎨", enabled: false },
      { name: "Public Sharing", description: "Share in community library", icon: "📢", enabled: false },
      { name: "Multiple Fonts", description: "Access to premium fonts", icon: "🔤", enabled: false },
      { name: "Priority Support", description: "Fast customer support", icon: "⚡", enabled: false },
    ],
    upgradePrompts: [
      {
        trigger: "max_elements_reached",
        title: "Need More Elements?",
        description: "Upgrade to Supporter to use up to 5 elements and unlock gradients!",
        ctaText: "Upgrade to Supporter",
        featureHighlight: "5 Elements + Gradients"
      },
      {
        trigger: "try_effects",
        title: "Add Some Sparkle! ✨",
        description: "Effects and shadows make your flag stand out from the crowd.",
        ctaText: "Unlock Effects",
        featureHighlight: "Glow & Shadow Effects"
      },
      {
        trigger: "share_blocked",
        title: "Share Your Creation",
        description: "Show off your flag design to the community!",
        ctaText: "Enable Sharing",
        featureHighlight: "Community Library Access"
      }
    ]
  },

  [FlagTier.Supporter]: {
    tier: FlagTier.Supporter,
    displayName: "Flag Supporter",
    description: "Enhanced tools for dedicated flag creators",
    badgeColor: "#10B981", // Green
    badgeIcon: "🎖️",
    limits: FlagTierLimitsMap[FlagTier.Supporter],
    cost: { monthly: 2.99, yearly: 29.99 },
    features: [
      { name: "5 Flag Elements", description: "Use up to 5 elements per flag", icon: "🏗️", enabled: true, highlight: true },
      { name: "Gradient Backgrounds", description: "Beautiful multi-color gradients", icon: "🌈", enabled: true, highlight: true },
      { name: "Effect System", description: "Add glow and shadow effects", icon: "✨", enabled: true, highlight: true },
      { name: "Premium Fonts", description: "Access to 20+ custom fonts", icon: "🔤", enabled: true },
      { name: "Community Sharing", description: "Share up to 3 public flags", icon: "📢", enabled: true },
      { name: "Extended Symbol Library", description: "200+ premium symbols", icon: "🎭", enabled: true },
      { name: "2 Text Elements", description: "Add multiple text layers", icon: "📝", enabled: true },
      { name: "Priority Queue", description: "Faster rendering and saves", icon: "⚡", enabled: true },
      { name: "Animations", description: "Animated flag effects", icon: "🎬", enabled: false },
      { name: "Custom Symbols", description: "Upload your own symbols", icon: "🎨", enabled: false },
      { name: "Advanced Shapes", description: "Custom paths and complex shapes", icon: "🔺", enabled: false },
      { name: "VIP Support", description: "Priority customer support", icon: "👑", enabled: false },
    ],
    upgradePrompts: [
      {
        trigger: "max_elements_reached",
        title: "Create Complex Designs",
        description: "Upgrade to Premium for 8 elements, animations, and custom symbols!",
        ctaText: "Go Premium",
        featureHighlight: "8 Elements + Animations"
      },
      {
        trigger: "want_animations",
        title: "Bring Your Flag to Life! 🎬",
        description: "Add mesmerizing animations that make your flag unforgettable.",
        ctaText: "Unlock Animations",
        featureHighlight: "Wave, Fade & Rotate Animations"
      },
      {
        trigger: "custom_symbol_blocked",
        title: "Use Your Own Symbols",
        description: "Upload custom SVG symbols and truly make your flag unique.",
        ctaText: "Enable Custom Uploads",
        featureHighlight: "Custom Symbol Uploads"
      }
    ]
  },

  [FlagTier.Premium]: {
    tier: FlagTier.Premium,
    displayName: "Premium Creator",
    description: "Professional flag creation with advanced features",
    badgeColor: "#8B5CF6", // Purple
    badgeIcon: "💎",
    limits: FlagTierLimitsMap[FlagTier.Premium],
    cost: { monthly: 7.99, yearly: 79.99 },
    features: [
      { name: "8 Flag Elements", description: "Create complex, detailed flags", icon: "🏗️", enabled: true, highlight: true },
      { name: "Animation System", description: "Wave, fade, and rotate animations", icon: "🎬", enabled: true, highlight: true },
      { name: "Custom Symbol Upload", description: "Upload SVG symbols (100KB)", icon: "🎨", enabled: true, highlight: true },
      { name: "Advanced Effects", description: "Multiple glow, shadow, shimmer effects", icon: "✨", enabled: true },
      { name: "Custom Shapes", description: "Draw custom paths and shapes", icon: "🔺", enabled: true },
      { name: "Premium Font Library", description: "50+ professional fonts", icon: "🔤", enabled: true },
      { name: "10 Public Flags", description: "Share more flag designs", icon: "📢", enabled: true },
      { name: "Priority Support", description: "VIP customer support channel", icon: "👑", enabled: true },
      { name: "Advanced Color Tools", description: "Color picker, palettes, gradients", icon: "🎨", enabled: true },
      { name: "Flag Templates", description: "Start from premium templates", icon: "📋", enabled: true },
      { name: "Export Options", description: "Download as PNG, SVG", icon: "💾", enabled: true },
      { name: "Version History", description: "Restore previous flag versions", icon: "⏰", enabled: true },
    ],
    upgradePrompts: [
      {
        trigger: "max_elements_reached",
        title: "Master-Level Creation",
        description: "Elite tier offers 12 elements, particle effects, and unlimited sharing!",
        ctaText: "Upgrade to Elite",
        featureHighlight: "12 Elements + Particle Effects"
      },
      {
        trigger: "need_more_storage",
        title: "Store More Symbols",
        description: "Elite tier includes 200KB storage for even larger custom symbols.",
        ctaText: "Get More Storage",
        featureHighlight: "200KB Symbol Storage"
      }
    ]
  },

  [FlagTier.Elite]: {
    tier: FlagTier.Elite,
    displayName: "Elite Designer",
    description: "Master-level tools for professional designers",
    badgeColor: "#F59E0B", // Amber
    badgeIcon: "👑",
    limits: FlagTierLimitsMap[FlagTier.Elite],
    cost: { monthly: 14.99, yearly: 149.99 },
    features: [
      { name: "12 Flag Elements", description: "Create highly detailed masterpieces", icon: "🏗️", enabled: true, highlight: true },
      { name: "Particle Effects", description: "Stars, sparkles, and custom particles", icon: "✨", enabled: true, highlight: true },
      { name: "Advanced Animations", description: "Multiple complex animation layers", icon: "🎬", enabled: true, highlight: true },
      { name: "200KB Symbol Storage", description: "Upload larger, detailed symbols", icon: "🎨", enabled: true },
      { name: "25 Public Flags", description: "Build a large portfolio", icon: "📢", enabled: true },
      { name: "Master Shape Tools", description: "Bezier curves, complex paths", icon: "🔺", enabled: true },
      { name: "Color Science Tools", description: "HSV, LAB color spaces", icon: "🌈", enabled: true },
      { name: "Collaboration Tools", description: "Share drafts with team", icon: "👥", enabled: true },
      { name: "API Access", description: "Programmatic flag creation", icon: "⚙️", enabled: true },
      { name: "White-label Export", description: "Remove Sovereign Lines watermark", icon: "🏷️", enabled: true },
      { name: "Analytics Dashboard", description: "Track flag performance", icon: "📊", enabled: true },
      { name: "VIP Support Channel", description: "Direct access to developers", icon: "💬", enabled: true },
    ],
    upgradePrompts: [
      {
        trigger: "max_elements_reached",
        title: "Ultimate Creation Power",
        description: "Sovereign tier removes all limits - unlimited elements and storage!",
        ctaText: "Go Sovereign",
        featureHighlight: "Unlimited Everything"
      },
      {
        trigger: "want_unlimited",
        title: "Remove All Limits",
        description: "Sovereign tier gives you unlimited creative freedom.",
        ctaText: "Unlock Everything",
        featureHighlight: "No Limits, No Restrictions"
      }
    ]
  },

  [FlagTier.Sovereign]: {
    tier: FlagTier.Sovereign,
    displayName: "Sovereign Master",
    description: "Unlimited creative freedom for true flag masters",
    badgeColor: "#DC2626", // Red
    badgeIcon: "⚡",
    limits: FlagTierLimitsMap[FlagTier.Sovereign],
    cost: { monthly: 24.99, yearly: 249.99, lifetime: 999.99 },
    features: [
      { name: "Unlimited Elements", description: "No limits on flag complexity", icon: "♾️", enabled: true, highlight: true },
      { name: "Advanced Particle Engine", description: "Custom particle systems", icon: "🌟", enabled: true, highlight: true },
      { name: "500KB Symbol Storage", description: "Upload high-resolution symbols", icon: "🎨", enabled: true, highlight: true },
      { name: "Unlimited Public Flags", description: "Share as many flags as you want", icon: "📢", enabled: true },
      { name: "Beta Feature Access", description: "Try new features first", icon: "🧪", enabled: true },
      { name: "Custom Animation Engine", description: "Script your own animations", icon: "🎬", enabled: true },
      { name: "3D Flag Preview", description: "See your flag in 3D", icon: "🎯", enabled: true },
      { name: "Marketplace Seller", description: "Sell your flag designs", icon: "💰", enabled: true },
      { name: "Flag Analytics Pro", description: "Advanced usage analytics", icon: "📈", enabled: true },
      { name: "White-label Branding", description: "Your logo on exported flags", icon: "🏷️", enabled: true },
      { name: "Direct Developer Access", description: "Influence future features", icon: "🚀", enabled: true },
      { name: "Lifetime Updates", description: "All future features included", icon: "🔄", enabled: true },
    ],
    upgradePrompts: [] // No upgrades from highest tier
  }
};

// Helper functions for tier management
export function getTierFeatures(tier: FlagTier): TierFeature[] {
  return FlagCreatorTiers[tier].features;
}

export function getTierLimits(tier: FlagTier): FlagTierLimits {
  return FlagCreatorTiers[tier].limits;
}

export function canUsePremiumFeature(userTier: FlagTier, requiredTier: FlagTier): boolean {
  const tierOrder = [FlagTier.Free, FlagTier.Supporter, FlagTier.Premium, FlagTier.Elite, FlagTier.Sovereign];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}

export function getUpgradePrompt(currentTier: FlagTier, trigger: string): UpgradePrompt | null {
  const tierData = FlagCreatorTiers[currentTier];
  return tierData.upgradePrompts.find(prompt => prompt.trigger === trigger) || null;
}

export function getNextTier(currentTier: FlagTier): FlagTier | null {
  const tierOrder = [FlagTier.Free, FlagTier.Supporter, FlagTier.Premium, FlagTier.Elite, FlagTier.Sovereign];
  const currentIndex = tierOrder.indexOf(currentTier);
  return currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
}

// Cost calculation utilities
export function calculateCost(tier: FlagTier, billingCycle: 'monthly' | 'yearly' | 'lifetime'): number | null {
  const tierData = FlagCreatorTiers[tier];
  return tierData.cost?.[billingCycle] || null;
}

export function calculateSavings(tier: FlagTier): number {
  const monthly = calculateCost(tier, 'monthly');
  const yearly = calculateCost(tier, 'yearly');
  
  if (!monthly || !yearly) return 0;
  
  const monthlyCostPerYear = monthly * 12;
  return Math.round(((monthlyCostPerYear - yearly) / monthlyCostPerYear) * 100);
}

// Feature availability matrix for quick lookups
export const FeatureAvailability = {
  gradients: [FlagTier.Supporter, FlagTier.Premium, FlagTier.Elite, FlagTier.Sovereign],
  effects: [FlagTier.Supporter, FlagTier.Premium, FlagTier.Elite, FlagTier.Sovereign],
  animations: [FlagTier.Premium, FlagTier.Elite, FlagTier.Sovereign],
  customSymbols: [FlagTier.Premium, FlagTier.Elite, FlagTier.Sovereign],
  customShapes: [FlagTier.Premium, FlagTier.Elite, FlagTier.Sovereign],
  particles: [FlagTier.Elite, FlagTier.Sovereign],
  unlimitedElements: [FlagTier.Sovereign],
  prioritySupport: [FlagTier.Premium, FlagTier.Elite, FlagTier.Sovereign],
  publicSharing: [FlagTier.Supporter, FlagTier.Premium, FlagTier.Elite, FlagTier.Sovereign],
};

export function hasFeature(userTier: FlagTier, feature: keyof typeof FeatureAvailability): boolean {
  return FeatureAvailability[feature].includes(userTier);
}