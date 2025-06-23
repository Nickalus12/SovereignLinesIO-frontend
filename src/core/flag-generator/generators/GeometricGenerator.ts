import { PseudoRandom } from '../../PseudoRandom';
import { SvgBuilder } from '../SvgBuilder';
import { FlagGenerationParams, GenerationLimits, ColorScheme } from '../FlagGeneratorEngine';

export class GeometricGenerator {
  generate(params: FlagGenerationParams, limits: GenerationLimits, random: PseudoRandom, builder: SvgBuilder): any {
    builder.reset();
    
    // Generate based on complexity
    const numShapes = Math.min(params.complexity || 3, limits.maxComplexity);
    const colors = this.generateColors(params.colorScheme || 'vibrant', limits.maxColors, random, params.primaryColor);
    
    // Add background
    builder.addRectangle(0, 0, 300, 200, colors[0]);
    
    // Add geometric shapes based on complexity
    const patterns = ['stripes', 'triangles', 'diamonds', 'grid'];
    const selectedPattern = patterns[random.nextInt(0, patterns.length)];
    
    switch (selectedPattern) {
      case 'stripes':
        this.addStripes(builder, colors, numShapes, random);
        break;
      case 'triangles':
        this.addTriangles(builder, colors, numShapes, random);
        break;
      case 'diamonds':
        this.addDiamonds(builder, colors, numShapes, random);
        break;
      case 'grid':
        this.addGrid(builder, colors, numShapes, random);
        break;
    }
    
    // Add accent shapes if complexity allows
    if (numShapes > 5 && limits.allowSymbols) {
      this.addAccentShapes(builder, colors, random);
    }
    
    return {
      svg: builder.build(),
      colors,
      elements: ['geometric', selectedPattern]
    };
  }

  private generateColors(scheme: ColorScheme, maxColors: number, random: PseudoRandom, primaryColor?: string): string[] {
    const colors: string[] = [];
    
    // If primary color is provided, use it as base
    const baseHue = primaryColor ? this.extractHue(primaryColor) : random.nextInt(0, 360);
    
    switch (scheme) {
      case 'complementary':
        colors.push(`hsl(${baseHue}, 70%, 50%)`);
        colors.push(`hsl(${(baseHue + 180) % 360}, 70%, 50%)`);
        if (maxColors > 2) {
          colors.push(`hsl(${baseHue}, 50%, 30%)`);
        }
        break;
        
      case 'analogous':
        for (let i = 0; i < Math.min(3, maxColors); i++) {
          colors.push(`hsl(${(baseHue + i * 30) % 360}, 70%, 50%)`);
        }
        break;
        
      case 'monochrome':
        for (let i = 0; i < Math.min(3, maxColors); i++) {
          colors.push(`hsl(${baseHue}, 70%, ${30 + i * 20}%)`);
        }
        break;
        
      case 'muted':
        for (let i = 0; i < Math.min(3, maxColors); i++) {
          colors.push(`hsl(${random.nextInt(0, 360)}, 40%, 60%)`);
        }
        break;
        
      default: // vibrant
        for (let i = 0; i < Math.min(3, maxColors); i++) {
          colors.push(`hsl(${random.nextInt(0, 360)}, 80%, 50%)`);
        }
    }
    
    return colors;
  }

  private addStripes(builder: SvgBuilder, colors: string[], numStripes: number, random: PseudoRandom): void {
    const direction = random.nextInt(0, 3); // 0: horizontal, 1: vertical, 2: diagonal
    const stripeWidth = direction === 1 ? 300 / numStripes : 200 / numStripes;
    
    for (let i = 1; i < numStripes; i++) {
      const color = colors[i % colors.length];
      
      if (direction === 0) {
        // Horizontal stripes
        builder.addRectangle(0, i * stripeWidth, 300, stripeWidth, color);
      } else if (direction === 1) {
        // Vertical stripes
        builder.addRectangle(i * stripeWidth, 0, stripeWidth, 200, color);
      } else {
        // Diagonal stripes
        const points = [
          [i * 50, 0],
          [(i + 1) * 50, 0],
          [(i + 1) * 50 - 200, 200],
          [i * 50 - 200, 200]
        ];
        builder.addPolygon(points, color);
      }
    }
  }

  private addTriangles(builder: SvgBuilder, colors: string[], numTriangles: number, random: PseudoRandom): void {
    const pattern = random.nextInt(0, 3);
    
    if (pattern === 0) {
      // Corner triangles
      builder.addPolygon([[0, 0], [150, 0], [0, 100]], colors[1]);
      builder.addPolygon([[300, 0], [300, 100], [150, 0]], colors[2 % colors.length]);
      builder.addPolygon([[0, 200], [0, 100], [150, 200]], colors[2 % colors.length]);
      builder.addPolygon([[300, 200], [150, 200], [300, 100]], colors[1]);
    } else if (pattern === 1) {
      // Chevron pattern
      for (let i = 0; i < numTriangles - 1; i++) {
        const y = i * (200 / (numTriangles - 1));
        builder.addChevron(0, y, 300, 200 / (numTriangles - 1), colors[(i + 1) % colors.length]);
      }
    } else {
      // Random triangles
      for (let i = 0; i < numTriangles; i++) {
        const points = [
          [random.nextInt(0, 300), random.nextInt(0, 200)],
          [random.nextInt(0, 300), random.nextInt(0, 200)],
          [random.nextInt(0, 300), random.nextInt(0, 200)]
        ];
        builder.addPolygon(points, colors[i % colors.length]);
      }
    }
  }

  private addDiamonds(builder: SvgBuilder, colors: string[], numDiamonds: number, random: PseudoRandom): void {
    const rows = Math.ceil(Math.sqrt(numDiamonds));
    const cols = Math.ceil(numDiamonds / rows);
    const diamondWidth = 300 / cols;
    const diamondHeight = 200 / rows;
    
    let colorIndex = 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * diamondWidth + diamondWidth / 2;
        const cy = row * diamondHeight + diamondHeight / 2;
        
        const points = [
          [cx, cy - diamondHeight / 3],
          [cx + diamondWidth / 3, cy],
          [cx, cy + diamondHeight / 3],
          [cx - diamondWidth / 3, cy]
        ];
        
        builder.addPolygon(points, colors[colorIndex % colors.length]);
        colorIndex++;
      }
    }
  }

  private addGrid(builder: SvgBuilder, colors: string[], gridSize: number, random: PseudoRandom): void {
    const cellWidth = 300 / gridSize;
    const cellHeight = 200 / gridSize;
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if ((row + col) % 2 === 1) {
          const x = col * cellWidth;
          const y = row * cellHeight;
          builder.addRectangle(x, y, cellWidth, cellHeight, colors[1]);
        }
      }
    }
    
    // Add accent squares
    if (colors.length > 2) {
      const accentCount = Math.floor(gridSize / 3);
      for (let i = 0; i < accentCount; i++) {
        const row = random.nextInt(0, gridSize);
        const col = random.nextInt(0, gridSize);
        const x = col * cellWidth;
        const y = row * cellHeight;
        builder.addRectangle(x, y, cellWidth, cellHeight, colors[2]);
      }
    }
  }

  private addAccentShapes(builder: SvgBuilder, colors: string[], random: PseudoRandom): void {
    const shapes = ['star', 'circle', 'diamond'];
    const shape = shapes[random.nextInt(0, shapes.length)];
    const accentColor = colors[colors.length - 1];
    
    // Add central accent
    builder.addSymbol(shape, 150, 100, 40, accentColor);
    
    // Add corner accents
    if (random.nextFloat() > 0.5) {
      builder.addSymbol(shape, 30, 30, 20, accentColor);
      builder.addSymbol(shape, 270, 30, 20, accentColor);
      builder.addSymbol(shape, 30, 170, 20, accentColor);
      builder.addSymbol(shape, 270, 170, 20, accentColor);
    }
  }

  private extractHue(color: string): number {
    // Simple extraction for HSL colors
    if (color.startsWith('hsl')) {
      const match = color.match(/hsl\((\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    
    // Convert hex to HSL and extract hue
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      
      let hue = 0;
      if (delta !== 0) {
        if (max === r) {
          hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        } else if (max === g) {
          hue = ((b - r) / delta + 2) * 60;
        } else {
          hue = ((r - g) / delta + 4) * 60;
        }
      }
      
      return Math.round(hue);
    }
    
    // Default fallback
    return 180;
  }
}