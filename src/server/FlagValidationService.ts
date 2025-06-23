import { 
  CustomFlag, 
  FlagTier, 
  validateFlagForTier, 
  FlagTierLimitsMap,
  CustomFlagSchema 
} from "../core/game/FlagTypes";
import { z } from "zod";

export class FlagValidationService {
  /**
   * Validates a custom flag against tier restrictions and content policies
   */
  static validateCustomFlag(flag: CustomFlag, userTier: FlagTier): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Schema validation
      CustomFlagSchema.parse(flag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `Schema error: ${e.path.join('.')}: ${e.message}`));
      } else {
        errors.push("Invalid flag schema");
      }
    }

    // 2. Tier-based validation
    const tierValidation = validateFlagForTier(flag, userTier);
    if (!tierValidation.isValid) {
      errors.push(...tierValidation.errors);
    }

    // 3. Content validation
    const contentValidation = this.validateFlagContent(flag);
    errors.push(...contentValidation.errors);
    warnings.push(...contentValidation.warnings);

    // 4. Performance validation
    const performanceValidation = this.validateFlagPerformance(flag);
    errors.push(...performanceValidation.errors);
    warnings.push(...performanceValidation.warnings);

    // 5. Security validation
    const securityValidation = this.validateFlagSecurity(flag);
    errors.push(...securityValidation.errors);
    warnings.push(...securityValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedFlag: this.sanitizeFlag(flag)
    };
  }

  /**
   * Validates flag content for inappropriate material
   */
  private static validateFlagContent(flag: CustomFlag): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check flag name and description
    if (this.containsInappropriateContent(flag.name)) {
      errors.push("Flag name contains inappropriate content");
    }

    if (flag.description && this.containsInappropriateContent(flag.description)) {
      errors.push("Flag description contains inappropriate content");
    }

    // Check text elements
    flag.elements.forEach((element, index) => {
      if (element.type === 'text') {
        const textElement = element as any;
        if (textElement.text && this.containsInappropriateContent(textElement.text)) {
          errors.push(`Text element ${index + 1} contains inappropriate content`);
        }
      }
    });

    // Check for hate symbols or offensive imagery
    const hasOffensiveSymbols = flag.elements.some(element => {
      if (element.type === 'symbol') {
        const symbolElement = element as any;
        return this.isOffensiveSymbol(symbolElement.symbolId);
      }
      return false;
    });

    if (hasOffensiveSymbols) {
      errors.push("Flag contains potentially offensive symbols");
    }

    // Check for copyright violations
    if (this.containsCopyrightedContent(flag)) {
      warnings.push("Flag may contain copyrighted content");
    }

    return { errors, warnings };
  }

  /**
   * Validates flag performance characteristics
   */
  private static validateFlagPerformance(flag: CustomFlag): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check element count vs performance
    if (flag.elements.length > 15) {
      warnings.push("High element count may impact rendering performance");
    }

    // Check for complex animations
    const complexAnimations = flag.elements.filter(element => 
      element.type === 'effect' && (element as any).animationType && (element as any).animationType !== 'none'
    );

    if (complexAnimations.length > 3) {
      warnings.push("Multiple animations may impact performance on slower devices");
    }

    // Check for overlapping elements that might cause z-fighting
    const overlappingElements = this.findOverlappingElements(flag.elements);
    if (overlappingElements.length > 0) {
      warnings.push("Some elements may overlap and cause visual issues");
    }

    // Validate custom SVG complexity
    flag.elements.forEach((element, index) => {
      if (element.type === 'symbol') {
        const symbolElement = element as any;
        if (symbolElement.customSvg && this.isComplexSvg(symbolElement.customSvg)) {
          warnings.push(`Custom symbol ${index + 1} is very complex and may affect performance`);
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Validates flag security (prevents XSS, malicious content)
   */
  private static validateFlagSecurity(flag: CustomFlag): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for script injection attempts
    const flagJson = JSON.stringify(flag);
    if (this.containsScriptTags(flagJson)) {
      errors.push("Flag contains potentially malicious script content");
    }

    // Validate custom SVG for security issues
    flag.elements.forEach((element, index) => {
      if (element.type === 'symbol') {
        const symbolElement = element as any;
        if (symbolElement.customSvg) {
          const svgValidation = this.validateSvgSecurity(symbolElement.customSvg);
          if (!svgValidation.isValid) {
            errors.push(`Custom symbol ${index + 1}: ${svgValidation.error}`);
          }
        }
      }
    });

    // Check for data URLs or external references
    flag.elements.forEach((element, index) => {
      if (element.type === 'text') {
        const textElement = element as any;
        if (textElement.text && this.containsDataUrls(textElement.text)) {
          errors.push(`Text element ${index + 1} contains data URLs which are not allowed`);
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Sanitizes flag data to remove/escape potentially harmful content
   */
  private static sanitizeFlag(flag: CustomFlag): CustomFlag {
    const sanitized = JSON.parse(JSON.stringify(flag)); // Deep clone

    // Sanitize name and description
    sanitized.name = this.sanitizeText(sanitized.name);
    if (sanitized.description) {
      sanitized.description = this.sanitizeText(sanitized.description);
    }

    // Sanitize text elements
    sanitized.elements = sanitized.elements.map(element => {
      if (element.type === 'text') {
        const textElement = element as any;
        if (textElement.text) {
          textElement.text = this.sanitizeText(textElement.text);
        }
      }
      return element;
    });

    // Ensure timestamps are current
    sanitized.modified = Date.now();

    return sanitized;
  }

  /**
   * Check if content contains inappropriate material
   */
  private static containsInappropriateContent(text: string): boolean {
    const inappropriatePatterns = [
      // Add patterns for inappropriate content
      /\b(hate|offensive|inappropriate)\b/i,
      // Add more comprehensive filters as needed
    ];

    return inappropriatePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if symbol ID represents an offensive symbol
   */
  private static isOffensiveSymbol(symbolId: string): boolean {
    const offensiveSymbols = [
      // Add IDs of symbols that should be blocked
      'swastika', 'confederate', 'hate-symbol'
      // Expand this list based on your symbol library
    ];

    return offensiveSymbols.includes(symbolId.toLowerCase());
  }

  /**
   * Check for potential copyright violations
   */
  private static containsCopyrightedContent(flag: CustomFlag): boolean {
    // Simple heuristics for copyright detection
    const copyrightKeywords = ['disney', 'marvel', 'nintendo', 'pokemon', 'star wars'];
    
    const flagText = [
      flag.name,
      flag.description || '',
      ...flag.elements
        .filter(e => e.type === 'text')
        .map(e => (e as any).text || '')
    ].join(' ').toLowerCase();

    return copyrightKeywords.some(keyword => flagText.includes(keyword));
  }

  /**
   * Find overlapping elements
   */
  private static findOverlappingElements(elements: any[]): any[] {
    // Simple overlap detection based on position and size
    const overlapping = [];
    
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        if (this.elementsOverlap(elements[i], elements[j])) {
          overlapping.push({ elementA: i, elementB: j });
        }
      }
    }

    return overlapping;
  }

  /**
   * Check if two elements overlap
   */
  private static elementsOverlap(elementA: any, elementB: any): boolean {
    const a = {
      left: elementA.position.x,
      right: elementA.position.x + elementA.size.width,
      top: elementA.position.y,
      bottom: elementA.position.y + elementA.size.height
    };

    const b = {
      left: elementB.position.x,
      right: elementB.position.x + elementB.size.width,
      top: elementB.position.y,
      bottom: elementB.position.y + elementB.size.height
    };

    return !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
  }

  /**
   * Check if SVG is overly complex
   */
  private static isComplexSvg(svg: string): boolean {
    // Simple complexity heuristics
    const pathCount = (svg.match(/<path/g) || []).length;
    const elementCount = (svg.match(/<[^/]/g) || []).length;
    
    return pathCount > 50 || elementCount > 100 || svg.length > 10000;
  }

  /**
   * Check for script tags in content
   */
  private static containsScriptTags(content: string): boolean {
    return /<script|javascript:/i.test(content);
  }

  /**
   * Validate SVG content for security
   */
  private static validateSvgSecurity(svg: string): { isValid: boolean; error?: string } {
    // Check for script tags
    if (/<script/i.test(svg)) {
      return { isValid: false, error: "SVG contains script tags" };
    }

    // Check for event handlers
    if (/on\w+\s*=/i.test(svg)) {
      return { isValid: false, error: "SVG contains event handlers" };
    }

    // Check for external references
    if (/href\s*=\s*["']?(?:https?:|\/\/)/i.test(svg)) {
      return { isValid: false, error: "SVG contains external references" };
    }

    // Check for data URLs with scripts
    if (/data:.*script/i.test(svg)) {
      return { isValid: false, error: "SVG contains script data URLs" };
    }

    return { isValid: true };
  }

  /**
   * Check for data URLs in text
   */
  private static containsDataUrls(text: string): boolean {
    return /data:/i.test(text);
  }

  /**
   * Sanitize text content
   */
  private static sanitizeText(text: string): string {
    return text
      .replace(/<script.*?<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .slice(0, 200); // Limit length
  }

  /**
   * Get tier limitations for a user
   */
  static getTierLimitations(tier: FlagTier) {
    return FlagTierLimitsMap[tier];
  }

  /**
   * Check if user can create more flags
   */
  static canCreateFlag(userTier: FlagTier, currentFlagCount: number): boolean {
    const limits = FlagTierLimitsMap[userTier];
    return limits.maxPublicFlags === -1 || currentFlagCount < limits.maxPublicFlags;
  }

  /**
   * Check if user can share flags publicly
   */
  static canSharePublicly(userTier: FlagTier): boolean {
    return FlagTierLimitsMap[userTier].canSharePublicly;
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedFlag: CustomFlag;
}

// Export validation schemas for API endpoints
export const CreateFlagRequestSchema = z.object({
  flag: CustomFlagSchema,
  userTier: z.nativeEnum(FlagTier)
});

export const UpdateFlagRequestSchema = z.object({
  flagId: z.string().uuid(),
  flag: CustomFlagSchema.partial(),
  userTier: z.nativeEnum(FlagTier)
});

export const FlagLibraryQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['created', 'downloads', 'rating']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  featured: z.boolean().optional(),
  userTier: z.nativeEnum(FlagTier).optional()
});

export type CreateFlagRequest = z.infer<typeof CreateFlagRequestSchema>;
export type UpdateFlagRequest = z.infer<typeof UpdateFlagRequestSchema>;
export type FlagLibraryQuery = z.infer<typeof FlagLibraryQuerySchema>;