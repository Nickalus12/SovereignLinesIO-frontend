import { z } from "zod";

// Core flag type definitions for the custom flag creation system
export enum FlagTier {
  Free = "free",
  Supporter = "supporter", 
  Premium = "premium",
  Elite = "elite",
  Sovereign = "sovereign"
}

export enum FlagElementType {
  Background = "background",
  Shape = "shape", 
  Icon = "icon",        // Heroicons from categories
  Emblem = "emblem",    // Crown, Shield, Sword
  Symbol = "symbol",    // Alliance, City, Target
  Text = "text",
  Border = "border",
  Effect = "effect"
}

export enum FlagShapeType {
  Rectangle = "rectangle",
  Square = "square", 
  Circle = "circle",
  Triangle = "triangle",
  Diamond = "diamond",
  Star = "star",
  Shield = "shield",
  Hexagon = "hexagon",
  Cross = "cross",
  CustomPath = "custom_path"
}

export enum FlagSymbolCategory {
  Animals = "animals",
  Nature = "nature", 
  Military = "military",
  Religious = "religious",
  Geometric = "geometric",
  Cultural = "cultural",
  Abstract = "abstract",
  Custom = "custom"
}

export enum FlagEffectType {
  None = "none",
  Glow = "glow",
  Shadow = "shadow", 
  Gradient = "gradient",
  Animation = "animation",
  Particle = "particle",
  Shimmer = "shimmer",
  Pulse = "pulse"
}

export enum FlagAnimationType {
  None = "none",
  Wave = "wave",
  Fade = "fade",
  Rotate = "rotate", 
  Scale = "scale",
  Color = "color",
  Custom = "custom"
}

// Color system with validation
export const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color");
export type Color = z.infer<typeof ColorSchema>;

// Position and sizing for flag elements
export const PositionSchema = z.object({
  x: z.number().min(0).max(100), // Percentage
  y: z.number().min(0).max(100), // Percentage
});

export const SizeSchema = z.object({
  width: z.number().min(1).max(100), // Percentage
  height: z.number().min(1).max(100), // Percentage
});

export const RotationSchema = z.number().min(0).max(360);

// Base element schema
export const FlagElementBaseSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(FlagElementType),
  position: PositionSchema,
  size: SizeSchema,
  rotation: RotationSchema.default(0),
  opacity: z.number().min(0).max(1).default(1),
  zIndex: z.number().int().min(0).max(100).default(0),
  locked: z.boolean().default(false),
});

// Background element
export const FlagBackgroundSchema = FlagElementBaseSchema.extend({
  type: z.literal(FlagElementType.Background),
  color: ColorSchema,
  gradient: z.object({
    enabled: z.boolean().default(false),
    startColor: ColorSchema.optional(),
    endColor: ColorSchema.optional(),
    direction: z.number().min(0).max(360).default(0),
  }).optional(),
});

// Shape element  
export const FlagShapeSchema = FlagElementBaseSchema.extend({
  type: z.literal(FlagElementType.Shape),
  shapeType: z.nativeEnum(FlagShapeType),
  fillColor: ColorSchema,
  strokeColor: ColorSchema.optional(),
  strokeWidth: z.number().min(0).max(10).default(0),
  customPath: z.string().optional(), // SVG path for custom shapes
});

// Icon element (Heroicons)
export const FlagIconSchema = FlagElementBaseSchema.extend({
  type: z.literal(FlagElementType.Icon),
  iconId: z.string(), // Reference to icon from manifest
  category: z.string(), // basic, military, nature, etc.
  color: ColorSchema,
  strokeColor: ColorSchema.optional(),
  strokeWidth: z.number().min(0).max(5).default(0),
  iconPath: z.string(), // File path to the icon
});

// Emblem element (Crown, Shield, Sword)
export const FlagEmblemSchema = FlagElementBaseSchema.extend({
  type: z.literal(FlagElementType.Emblem),
  emblemId: z.string(), // crown, shield, sword
  color: ColorSchema,
  strokeColor: ColorSchema.optional(),
  strokeWidth: z.number().min(0).max(5).default(0),
  emblemPath: z.string(), // File path to the emblem
});

// Symbol element (Game-specific: Alliance, City, Target)
export const FlagSymbolSchema = FlagElementBaseSchema.extend({
  type: z.literal(FlagElementType.Symbol),
  symbolId: z.string(), // alliance, city, target
  category: z.nativeEnum(FlagSymbolCategory),
  color: ColorSchema,
  strokeColor: ColorSchema.optional(),
  strokeWidth: z.number().min(0).max(5).default(0),
  symbolPath: z.string(), // File path to the symbol
});

// Text element
export const FlagTextSchema = FlagElementBaseSchema.extend({
  type: z.literal(FlagElementType.Text),
  text: z.string().max(20), // Character limit
  fontFamily: z.string().default("Arial"),
  fontSize: z.number().min(8).max(72).default(16),
  fontWeight: z.enum(["normal", "bold", "lighter", "bolder"]).default("normal"),
  fontStyle: z.enum(["normal", "italic"]).default("normal"),
  color: ColorSchema,
  strokeColor: ColorSchema.optional(),
  strokeWidth: z.number().min(0).max(3).default(0),
});

// Border element
export const FlagBorderSchema = FlagElementBaseSchema.extend({
  type: z.literal(FlagElementType.Border),
  color: ColorSchema,
  width: z.number().min(1).max(20).default(2),
  style: z.enum(["solid", "dashed", "dotted", "double"]).default("solid"),
  radius: z.number().min(0).max(50).default(0), // Border radius percentage
});

// Effect element
export const FlagEffectSchema = FlagElementBaseSchema.extend({
  type: z.literal(FlagElementType.Effect),
  effectType: z.nativeEnum(FlagEffectType),
  color: ColorSchema.optional(),
  intensity: z.number().min(0).max(100).default(50),
  blur: z.number().min(0).max(20).default(0),
  spread: z.number().min(0).max(20).default(0),
  animationType: z.nativeEnum(FlagAnimationType).default(FlagAnimationType.None),
  animationDuration: z.number().min(0.1).max(10).default(1), // seconds
  animationDelay: z.number().min(0).max(5).default(0),
});

// Union type for all flag elements
export const FlagElementSchema = z.discriminatedUnion("type", [
  FlagBackgroundSchema,
  FlagShapeSchema, 
  FlagIconSchema,
  FlagEmblemSchema,
  FlagSymbolSchema,
  FlagTextSchema,
  FlagBorderSchema,
  FlagEffectSchema
]);

export type FlagElement = z.infer<typeof FlagElementSchema>;

// Custom flag definition
export const CustomFlagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  creatorId: z.string().uuid(),
  creatorTier: z.nativeEnum(FlagTier),
  
  // Flag dimensions and properties
  width: z.number().min(50).max(200).default(100),
  height: z.number().min(30).max(150).default(67), // 3:2 aspect ratio default
  
  // Flag elements in rendering order
  elements: z.array(FlagElementSchema).max(20), // Element limit based on tier
  
  // Metadata
  created: z.number().int().positive(), // Unix timestamp
  modified: z.number().int().positive(),
  version: z.number().int().min(1).default(1),
  
  // Sharing and visibility
  isPublic: z.boolean().default(false),
  isApproved: z.boolean().default(false), // Moderation flag
  tags: z.array(z.string().max(20)).max(10).default([]),
  
  // Usage tracking
  usageCount: z.number().int().min(0).default(0),
  reportCount: z.number().int().min(0).default(0),
  
  // Premium features
  hasAnimation: z.boolean().default(false),
  hasEffects: z.boolean().default(false),
  hasPremiumSymbols: z.boolean().default(false),
});

export type CustomFlag = z.infer<typeof CustomFlagSchema>;

// Flag validation rules based on tier
export interface FlagTierLimits {
  maxElements: number;
  maxSymbols: number;
  maxText: number;
  maxEffects: number;
  maxAnimations: number;
  allowCustomSymbols: boolean;
  allowCustomFonts: boolean;
  allowEffects: boolean;
  allowAnimations: boolean;
  allowGradients: boolean;
  allowCustomShapes: boolean;
  maxFileSize: number; // KB for custom symbols
  maxPublicFlags: number;
  canSharePublicly: boolean;
  prioritySupport: boolean;
}

// Tier-based validation
export const FlagTierLimitsMap: Record<FlagTier, FlagTierLimits> = {
  [FlagTier.Free]: {
    maxElements: 3,
    maxSymbols: 1,
    maxText: 1,
    maxEffects: 0,
    maxAnimations: 0,
    allowCustomSymbols: false,
    allowCustomFonts: false,
    allowEffects: false,
    allowAnimations: false,
    allowGradients: false,
    allowCustomShapes: false,
    maxFileSize: 0,
    maxPublicFlags: 1,
    canSharePublicly: false,
    prioritySupport: false,
  },
  [FlagTier.Supporter]: {
    maxElements: 5,
    maxSymbols: 2,
    maxText: 2,
    maxEffects: 1,
    maxAnimations: 0,
    allowCustomSymbols: false,
    allowCustomFonts: true,
    allowEffects: true,
    allowAnimations: false,
    allowGradients: true,
    allowCustomShapes: false,
    maxFileSize: 0,
    maxPublicFlags: 3,
    canSharePublicly: true,
    prioritySupport: false,
  },
  [FlagTier.Premium]: {
    maxElements: 8,
    maxSymbols: 4,
    maxText: 3,
    maxEffects: 2,
    maxAnimations: 1,
    allowCustomSymbols: true,
    allowCustomFonts: true,
    allowEffects: true,
    allowAnimations: true,
    allowGradients: true,
    allowCustomShapes: true,
    maxFileSize: 100,
    maxPublicFlags: 10,
    canSharePublicly: true,
    prioritySupport: true,
  },
  [FlagTier.Elite]: {
    maxElements: 12,
    maxSymbols: 6,
    maxText: 4,
    maxEffects: 4,
    maxAnimations: 2,
    allowCustomSymbols: true,
    allowCustomFonts: true,
    allowEffects: true,
    allowAnimations: true,
    allowGradients: true,
    allowCustomShapes: true,
    maxFileSize: 200,
    maxPublicFlags: 25,
    canSharePublicly: true,
    prioritySupport: true,
  },
  [FlagTier.Sovereign]: {
    maxElements: 20,
    maxSymbols: 10,
    maxText: 6,
    maxEffects: 6,
    maxAnimations: 4,
    allowCustomSymbols: true,
    allowCustomFonts: true,
    allowEffects: true,
    allowAnimations: true,
    allowGradients: true,
    allowCustomShapes: true,
    maxFileSize: 500,
    maxPublicFlags: -1, // Unlimited
    canSharePublicly: true,
    prioritySupport: true,
  },
};

// Flag validation function
export function validateFlagForTier(flag: CustomFlag, tier: FlagTier): { isValid: boolean; errors: string[] } {
  const limits = FlagTierLimitsMap[tier];
  const errors: string[] = [];

  // Check element count
  if (flag.elements.length > limits.maxElements) {
    errors.push(`Too many elements: ${flag.elements.length}/${limits.maxElements}`);
  }

  // Count specific element types
  const symbolCount = flag.elements.filter(e => e.type === FlagElementType.Symbol).length;
  const textCount = flag.elements.filter(e => e.type === FlagElementType.Text).length;
  const effectCount = flag.elements.filter(e => e.type === FlagElementType.Effect).length;

  if (symbolCount > limits.maxSymbols) {
    errors.push(`Too many symbols: ${symbolCount}/${limits.maxSymbols}`);
  }

  if (textCount > limits.maxText) {
    errors.push(`Too many text elements: ${textCount}/${limits.maxText}`);
  }

  if (effectCount > limits.maxEffects) {
    errors.push(`Too many effects: ${effectCount}/${limits.maxEffects}`);
  }

  // Check for premium features
  if (flag.hasAnimation && !limits.allowAnimations) {
    errors.push("Animations not allowed for this tier");
  }

  if (flag.hasEffects && !limits.allowEffects) {
    errors.push("Effects not allowed for this tier");
  }

  // Check for custom symbols
  const hasCustomSymbols = flag.elements.some(e => 
    e.type === FlagElementType.Symbol && 
    (e as any).category === FlagSymbolCategory.Custom
  );

  if (hasCustomSymbols && !limits.allowCustomSymbols) {
    errors.push("Custom symbols not allowed for this tier");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Flag library entry for community sharing
export const FlagLibraryEntrySchema = z.object({
  flagId: z.string().uuid(),
  flag: CustomFlagSchema,
  creatorName: z.string().max(50),
  downloads: z.number().int().min(0).default(0),
  rating: z.number().min(0).max(5).default(0),
  ratingCount: z.number().int().min(0).default(0),
  featured: z.boolean().default(false),
  category: z.string().max(30).default("General"),
  moderationStatus: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

export type FlagLibraryEntry = z.infer<typeof FlagLibraryEntrySchema>;