import { PseudoRandom } from '../PseudoRandom';
import { SvgBuilder } from './SvgBuilder';
import { GeometricGenerator } from './generators/GeometricGenerator';
import { ClassicGenerator } from './generators/ClassicGenerator';
import { AbstractGenerator } from './generators/AbstractGenerator';
import { HeraldryGenerator } from './generators/HeraldryGenerator';

export type FlagStyle = 'modern' | 'classic' | 'abstract' | 'heraldic' | 'mixed';
export type ColorScheme = 'vibrant' | 'muted' | 'complementary' | 'analogous' | 'monochrome' | 'custom';
export type FlagTier = 'free' | 'supporter' | 'premium' | 'elite' | 'sovereign';

export interface FlagGenerationParams {
  style: FlagStyle;
  complexity?: number; // 1-10
  colorScheme?: ColorScheme;
  primaryColor?: string;
  symbols?: string[];
  text?: string;
  animations?: boolean;
}

export interface GenerationLimits {
  maxColors: number;
  maxComplexity: number;
  allowGradients: boolean;
  allowSymbols: boolean;
  allowText: boolean;
  allowAnimations: boolean;
  maxSaveSlots: number;
  dailyGenerations: number;
  allowStyleMixing: boolean;
}

export const GenerationLimitsByTier: Record<FlagTier, GenerationLimits> = {
  free: {
    maxColors: 3,
    maxComplexity: 5,
    allowGradients: false,
    allowSymbols: false,
    allowText: false,
    allowAnimations: false,
    maxSaveSlots: 3,
    dailyGenerations: 5,
    allowStyleMixing: false
  },
  supporter: {
    maxColors: 5,
    maxComplexity: 7,
    allowGradients: true,
    allowSymbols: true,
    allowText: false,
    allowAnimations: false,
    maxSaveSlots: 10,
    dailyGenerations: 20,
    allowStyleMixing: false
  },
  premium: {
    maxColors: 8,
    maxComplexity: 8,
    allowGradients: true,
    allowSymbols: true,
    allowText: true,
    allowAnimations: true,
    maxSaveSlots: 25,
    dailyGenerations: 100,
    allowStyleMixing: false
  },
  elite: {
    maxColors: 10,
    maxComplexity: 9,
    allowGradients: true,
    allowSymbols: true,
    allowText: true,
    allowAnimations: true,
    maxSaveSlots: 50,
    dailyGenerations: 500,
    allowStyleMixing: true
  },
  sovereign: {
    maxColors: 12,
    maxComplexity: 10,
    allowGradients: true,
    allowSymbols: true,
    allowText: true,
    allowAnimations: true,
    maxSaveSlots: 100,
    dailyGenerations: -1, // Unlimited
    allowStyleMixing: true
  }
};

export interface GeneratedFlag {
  id: string;
  svg: string;
  params: FlagGenerationParams;
  metadata: {
    colors: string[];
    style: FlagStyle;
    complexity: number;
    elements: string[];
    createdAt: Date;
  };
}

export class FlagGeneratorEngine {
  private generators: Map<FlagStyle, any>;
  private builder: SvgBuilder;

  constructor() {
    this.builder = new SvgBuilder();
    this.generators = new Map([
      ['modern', new GeometricGenerator()],
      ['classic', new ClassicGenerator()],
      ['abstract', new AbstractGenerator()],
      ['heraldic', new HeraldryGenerator()]
    ]);
  }

  async generateFlag(params: FlagGenerationParams, tier: FlagTier): Promise<GeneratedFlag> {
    const limits = GenerationLimitsByTier[tier];
    
    // Validate parameters against tier limits
    this.validateParams(params, limits);
    
    // Generate random seed for consistency
    const seed = Date.now() + Math.random();
    const random = new PseudoRandom(seed);
    
    // Select generator based on style
    const generator = this.getGenerator(params.style);
    
    // Generate the flag
    const result = await generator.generate(params, limits, random, this.builder);
    
    // Create flag object
    const flag: GeneratedFlag = {
      id: this.generateId(),
      svg: result.svg,
      params,
      metadata: {
        colors: result.colors,
        style: params.style,
        complexity: params.complexity || 5,
        elements: result.elements,
        createdAt: new Date()
      }
    };
    
    return flag;
  }

  async generateMixedFlag(styles: FlagStyle[], params: FlagGenerationParams, tier: FlagTier): Promise<GeneratedFlag> {
    const limits = GenerationLimitsByTier[tier];
    
    if (!limits.allowStyleMixing) {
      throw new Error('Style mixing not available for this tier');
    }
    
    // Generate base with first style
    const baseParams = { ...params, style: styles[0] };
    const baseFlag = await this.generateFlag(baseParams, tier);
    
    // TODO: Implement style mixing logic
    // For now, just return the base flag
    return baseFlag;
  }

  private validateParams(params: FlagGenerationParams, limits: GenerationLimits): void {
    if (params.complexity && params.complexity > limits.maxComplexity) {
      params.complexity = limits.maxComplexity;
    }
    
    if (params.animations && !limits.allowAnimations) {
      params.animations = false;
    }
    
    if (params.text && !limits.allowText) {
      params.text = undefined;
    }
    
    if (params.symbols && !limits.allowSymbols) {
      params.symbols = undefined;
    }
  }

  private getGenerator(style: FlagStyle): any {
    const generator = this.generators.get(style);
    if (!generator) {
      // Default to modern if style not found
      return this.generators.get('modern');
    }
    return generator;
  }

  private generateId(): string {
    return `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get available styles for a tier
  getAvailableStyles(tier: FlagTier): FlagStyle[] {
    const baseStyles: FlagStyle[] = ['modern', 'classic', 'abstract', 'heraldic'];
    const limits = GenerationLimitsByTier[tier];
    
    if (limits.allowStyleMixing) {
      baseStyles.push('mixed');
    }
    
    return baseStyles;
  }

  // Get available color schemes
  getAvailableColorSchemes(): ColorScheme[] {
    return ['vibrant', 'muted', 'complementary', 'analogous', 'monochrome', 'custom'];
  }

  // Check if user can generate more flags today
  canGenerateToday(generationsToday: number, tier: FlagTier): boolean {
    const limits = GenerationLimitsByTier[tier];
    return limits.dailyGenerations === -1 || generationsToday < limits.dailyGenerations;
  }

  // Get remaining generations for today
  getRemainingGenerations(generationsToday: number, tier: FlagTier): number {
    const limits = GenerationLimitsByTier[tier];
    if (limits.dailyGenerations === -1) return -1;
    return Math.max(0, limits.dailyGenerations - generationsToday);
  }

  // Get generation limits for a tier
  getGenerationLimits(tier: FlagTier): GenerationLimits {
    return GenerationLimitsByTier[tier];
  }
}