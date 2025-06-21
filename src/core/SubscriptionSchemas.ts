import { z } from "zod";

// Subscription tiers
export enum SubscriptionTier {
  Free = "free",
  Supporter = "supporter",
  Premium = "premium",
  Elite = "elite", 
  Sovereign = "sovereign"
}

// Subscription benefits configuration
export const SubscriptionBenefits = {
  [SubscriptionTier.Free]: {
    nameColors: ["#FFFFFF"], // White only
    borderStyles: ["default"],
    emojisPerMinute: 5,
    customFlagSlots: 0,
    priorityQueue: false,
    spectatorSlots: 1,
    replayAccess: false,
    statsHistory: 7, // days
    friendSlots: 10,
    partySize: 4,
    customSounds: false,
    deathAnimations: ["default"],
    winAnimations: ["default"],
    chatBadge: null as string | null,
    xpBoost: 1.0,
    exclusiveMaps: [],
    customLoadingScreens: false,
    profileCustomization: false,
  },
  
  [SubscriptionTier.Supporter]: {
    // Base supporter benefits - actual benefits calculated dynamically based on amount
    nameColors: ["#FFFFFF", "#FF6B6B", "#4ECDC4", "#45B7D1"], // Basic colors
    borderStyles: ["default", "glow"],
    emojisPerMinute: 8,
    customFlagSlots: 1,
    priorityQueue: false,
    spectatorSlots: 2,
    replayAccess: true,
    statsHistory: 14, // days
    friendSlots: 15,
    partySize: 5,
    customSounds: false,
    deathAnimations: ["default", "fade"],
    winAnimations: ["default"],
    chatBadge: "🎉",
    xpBoost: 1.15,
    exclusiveMaps: [],
    customLoadingScreens: false,
    profileCustomization: true,
    // Supporter specific
    isTemporary: true,
    discordRole: "Supporter",
  },
  
  [SubscriptionTier.Premium]: {
    nameColors: [
      "#FFFFFF", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", // Base colors
      "#DDA0DD", "#98D8C8", "#F7DC6F", "#85C1E2"
    ],
    borderStyles: ["default", "glow", "pulse"],
    emojisPerMinute: 10,
    customFlagSlots: 3,
    priorityQueue: false, // Still no queue priority at this tier
    spectatorSlots: 3,
    replayAccess: true,
    statsHistory: 30, // days
    friendSlots: 25,
    partySize: 6,
    customSounds: true,
    deathAnimations: ["default", "fade", "shatter"],
    winAnimations: ["default", "fireworks"],
    chatBadge: "⭐",
    xpBoost: 1.25,
    exclusiveMaps: [],
    customLoadingScreens: false,
    profileCustomization: true,
  },
  
  [SubscriptionTier.Elite]: {
    nameColors: [
      // All Premium colors plus:
      "#FFFFFF", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
      "#DDA0DD", "#98D8C8", "#F7DC6F", "#85C1E2",
      // Elite exclusives:
      "#FFD700", "#FF1493", "#00CED1", "#FF4500", "#9370DB",
      "#00FA9A", "#FF69B4", "#1E90FF", "#FF6347", "#48D1CC"
    ],
    borderStyles: ["default", "glow", "pulse", "flame", "electric", "shadow"],
    emojisPerMinute: 20,
    customFlagSlots: 5,
    priorityQueue: true,
    spectatorSlots: 5,
    replayAccess: true,
    statsHistory: 90, // days
    friendSlots: 50,
    partySize: 8,
    customSounds: true,
    deathAnimations: ["default", "fade", "shatter", "explode", "dissolve"],
    winAnimations: ["default", "fireworks", "lightning", "confetti"],
    chatBadge: "💎",
    xpBoost: 1.5,
    exclusiveMaps: ["elite_islands", "elite_battleground"],
    customLoadingScreens: true,
    profileCustomization: true,
  },
  
  [SubscriptionTier.Sovereign]: {
    nameColors: [
      // All previous colors plus:
      "#FFFFFF", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
      "#DDA0DD", "#98D8C8", "#F7DC6F", "#85C1E2",
      "#FFD700", "#FF1493", "#00CED1", "#FF4500", "#9370DB",
      "#00FA9A", "#FF69B4", "#1E90FF", "#FF6347", "#48D1CC",
      // Sovereign exclusives (including animated gradients):
      "gradient:gold", "gradient:rainbow", "gradient:flame", "gradient:ocean",
      "gradient:aurora", "gradient:cosmic", "#FFD700", "#C0C0C0", "#CD7F32"
    ],
    borderStyles: [
      "default", "glow", "pulse", "flame", "electric", "shadow",
      "sovereign_crown", "animated_gold", "particle", "holographic"
    ],
    emojisPerMinute: -1, // Unlimited
    customFlagSlots: 10,
    priorityQueue: true,
    spectatorSlots: -1, // Unlimited
    replayAccess: true,
    statsHistory: -1, // Unlimited
    friendSlots: -1, // Unlimited
    partySize: 12,
    customSounds: true,
    deathAnimations: [
      "default", "fade", "shatter", "explode", "dissolve",
      "phoenix", "vaporize", "black_hole", "ascend"
    ],
    winAnimations: [
      "default", "fireworks", "lightning", "confetti",
      "crown_ceremony", "golden_shower", "epic_finale"
    ],
    chatBadge: "👑",
    xpBoost: 2.0,
    exclusiveMaps: [
      "elite_islands", "elite_battleground",
      "sovereign_citadel", "sovereign_arena", "sovereign_islands"
    ],
    customLoadingScreens: true,
    profileCustomization: true,
    // Sovereign exclusive features:
    customMapSkins: true,
    voiceLines: true,
    territoryEffects: true,
    customVictoryMusic: true,
    privateLobbies: -1, // Unlimited
    tournamentAccess: true,
    betaAccess: true,
    exclusiveDiscordRole: true,
    monthlyCosmetic: true,
  }
};

// Subscription state schema
export const SubscriptionSchema = z.object({
  userId: z.string(),
  tier: z.nativeEnum(SubscriptionTier),
  startDate: z.number(), // timestamp
  endDate: z.number().nullable(), // null for active
  autoRenew: z.boolean(),
  paymentMethod: z.string().optional(),
  // Customization choices
  selectedNameColor: z.string(),
  selectedBorderStyle: z.string(),
  selectedDeathAnimation: z.string(),
  selectedWinAnimation: z.string(),
  customFlags: z.array(z.string()),
  // Usage tracking
  emojisUsedThisMinute: z.number().default(0),
  lastEmojiReset: z.number().default(0),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

// Subscription purchase request
export const SubscriptionPurchaseSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
  paymentToken: z.string(), // From Stripe/PayPal
  autoRenew: z.boolean().default(true),
});

// Subscription customization update
export const SubscriptionCustomizationSchema = z.object({
  nameColor: z.string().optional(),
  borderStyle: z.string().optional(),
  deathAnimation: z.string().optional(),
  winAnimation: z.string().optional(),
  customFlag: z.object({
    slot: z.number(),
    flagData: z.string(), // Base64 encoded image
  }).optional(),
});

// Price configuration
export const SubscriptionPricing = {
  [SubscriptionTier.Supporter]: {
    // One-time supporter pricing - calculated dynamically
    oneTime: true,
    minAmount: 1.00,
    maxAmount: 200.00,
    currency: "USD",
    stripePriceId: "price_supporter_onetime",
  },
  [SubscriptionTier.Premium]: {
    monthly: 2.00,
    yearly: 20.00, // ~17% discount
    currency: "USD",
    stripePriceId: "price_premium_monthly",
    stripePriceIdYearly: "price_premium_yearly",
  },
  [SubscriptionTier.Elite]: {
    monthly: 5.00,
    yearly: 50.00, // ~17% discount
    currency: "USD",
    stripePriceId: "price_elite_monthly",
    stripePriceIdYearly: "price_elite_yearly",
  },
  [SubscriptionTier.Sovereign]: {
    monthly: 10.00,
    yearly: 100.00, // ~17% discount
    currency: "USD",
    stripePriceId: "price_sovereign_monthly",
    stripePriceIdYearly: "price_sovereign_yearly",
  },
};

// Gradient definitions for animated name colors
export const GradientDefinitions = {
  "gradient:gold": {
    colors: ["#FFD700", "#FFA500", "#FFD700"],
    animation: "shimmer",
    speed: 3,
  },
  "gradient:rainbow": {
    colors: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"],
    animation: "wave",
    speed: 5,
  },
  "gradient:flame": {
    colors: ["#FF4500", "#FF6347", "#FFD700", "#FF4500"],
    animation: "flicker",
    speed: 2,
  },
  "gradient:ocean": {
    colors: ["#006994", "#00CED1", "#40E0D0", "#006994"],
    animation: "wave",
    speed: 4,
  },
  "gradient:aurora": {
    colors: ["#00FF00", "#00CED1", "#9370DB", "#00FF00"],
    animation: "aurora",
    speed: 6,
  },
  "gradient:cosmic": {
    colors: ["#4B0082", "#8A2BE2", "#FF1493", "#4B0082"],
    animation: "pulse",
    speed: 3,
  },
};

// Special effects for borders
export const BorderEffects = {
  "sovereign_crown": {
    image: "crown_border.svg",
    animation: "rotate",
    particles: true,
  },
  "animated_gold": {
    color: "#FFD700",
    animation: "shimmer",
    glow: true,
  },
  "particle": {
    particles: ["star", "sparkle"],
    density: 0.1,
    speed: 0.5,
  },
  "holographic": {
    effect: "holographic",
    colors: ["#FF1493", "#00CED1", "#FFD700"],
    animation: "shift",
  },
};

// Achievement rewards that can unlock cosmetics
export const SubscriptionRewards = {
  firstWin: {
    type: "nameColor",
    value: "#FFD700", // Gold
    tier: SubscriptionTier.Free,
  },
  wins10: {
    type: "borderStyle", 
    value: "veteran",
    tier: SubscriptionTier.Free,
  },
  wins100: {
    type: "deathAnimation",
    value: "legendary_fade",
    tier: SubscriptionTier.Premium,
  },
  // etc...
};

// Supporter system - one-time purchases with scaling benefits and duration
export interface SupporterPackage {
  amount: number;
  durationDays: number;
  benefits: typeof SubscriptionBenefits[SubscriptionTier.Free];
  discordRoleDuration: number; // days
  tier: SubscriptionTier;
  description: string;
}

export function calculateSupporterPackage(amount: number): SupporterPackage {
  // Clamp amount to valid range
  amount = Math.max(1, Math.min(200, amount));
  
  // One-time supporters get less value than subscribers to incentivize recurring payments
  // Yearly rates: Premium $20/year, Elite $50/year, Sovereign $100/year
  // One-time rates should be ~40-50% less efficient than yearly subscriptions
  let durationDays: number;
  let tier: SubscriptionTier;
  let basebenefits = SubscriptionBenefits[SubscriptionTier.Free];
  
  if (amount < 5) {
    // $1-4: Basic supporter perks (2-8 days)
    durationDays = amount * 2;
    tier = SubscriptionTier.Supporter;
    basebenefits = {
      ...SubscriptionBenefits[SubscriptionTier.Free],
      nameColors: ["#FFFFFF", "#FF6B6B", "#4ECDC4"],
      xpBoost: 1.15,
      chatBadge: "🎉",
      priorityQueue: false,
    };
  } else if (amount < 30) {
    // $5-29: Premium tier - less efficient than $20/year
    // $20/year = ~$0.055/day, one-time = ~$0.08/day (45% less efficient)
    durationDays = Math.floor(amount * 12.5); // $5 = 62 days, $20 = 250 days
    tier = SubscriptionTier.Premium;
    basebenefits = SubscriptionBenefits[SubscriptionTier.Premium];
  } else if (amount < 75) {
    // $30-74: Elite tier - less efficient than $50/year  
    // $50/year = ~$0.137/day, one-time = ~$0.20/day (45% less efficient)
    durationDays = Math.floor(amount * 5); // $50 = 250 days, $75 = 375 days
    tier = SubscriptionTier.Elite;
    basebenefits = SubscriptionBenefits[SubscriptionTier.Elite];
  } else if (amount < 150) {
    // $75-149: Sovereign tier - less efficient than $100/year
    // $100/year = ~$0.274/day, one-time = ~$0.40/day (45% less efficient)  
    durationDays = Math.floor(amount * 2.5); // $100 = 250 days, $150 = 375 days
    tier = SubscriptionTier.Sovereign;
    basebenefits = SubscriptionBenefits[SubscriptionTier.Sovereign];
  } else {
    // $150-200: Special "Patron" tier - premium sovereign + exclusive benefits
    durationDays = Math.floor(amount * 2.75); // $150 = 412 days, $200 = 550 days
    tier = SubscriptionTier.Sovereign;
    basebenefits = {
      ...SubscriptionBenefits[SubscriptionTier.Sovereign],
      // Special patron benefits
      chatBadge: "👑💎",
      customMapSkins: true,
      specialPatronRole: true,
      exclusiveCosmetics: true,
      patronPriority: true,
      customAnimations: true,
      betaAccess: true,
      developerContact: true,
    };
  }
  
  // Discord role duration matches benefit duration
  const discordRoleDuration = durationDays;
  
  // Generate description based on package
  let description = ``;
  if (durationDays >= 365) {
    const years = Math.floor(durationDays / 365);
    const extraDays = durationDays % 365;
    if (extraDays > 0) {
      description = `${years} year${years !== 1 ? 's' : ''} + ${extraDays} days`;
    } else {
      description = `${years} year${years !== 1 ? 's' : ''}`;
    }
  } else if (durationDays >= 30) {
    const months = Math.floor(durationDays / 30);
    const extraDays = durationDays % 30;
    if (extraDays > 0) {
      description = `${months} month${months !== 1 ? 's' : ''} + ${extraDays} days`;
    } else {
      description = `${months} month${months !== 1 ? 's' : ''}`;
    }
  } else {
    description = `${durationDays} day${durationDays !== 1 ? 's' : ''}`;
  }
  
  // Add tier description
  if (tier === SubscriptionTier.Supporter) {
    description += " of Supporter perks";
  } else if (tier === SubscriptionTier.Premium) {
    description += " of Premium features";
  } else if (tier === SubscriptionTier.Elite) {
    description += " of Elite features";
  } else if (tier === SubscriptionTier.Sovereign) {
    if (amount >= 200) {
      description += " of exclusive Patron benefits";
    } else {
      description += " of Sovereign features";
    }
  }
  
  return {
    amount,
    durationDays,
    benefits: basebenefits,
    discordRoleDuration,
    tier,
    description
  };
}

export function getSupporterPackageBreakpoints(): Array<{amount: number, label: string, highlight?: boolean}> {
  return [
    { amount: 1, label: "2 day trial" },
    { amount: 5, label: "Premium start", highlight: true },
    { amount: 20, label: "8+ months Premium", highlight: true },
    { amount: 50, label: "8+ months Elite", highlight: true },
    { amount: 100, label: "8+ months Sovereign", highlight: true },
    { amount: 150, label: "Patron access", highlight: true },
    { amount: 200, label: "Max Patron", highlight: true }
  ];
}