import { PseudoRandom } from '../../PseudoRandom';
import { SvgBuilder } from '../SvgBuilder';
import { FlagGenerationParams, GenerationLimits } from '../FlagGeneratorEngine';

export class ClassicGenerator {
  generate(params: FlagGenerationParams, limits: GenerationLimits, random: PseudoRandom, builder: SvgBuilder): any {
    builder.reset();
    
    const colors = this.generateClassicColors(limits.maxColors, random);
    const pattern = this.selectPattern(random);
    
    // Generate based on classic flag patterns
    switch (pattern) {
      case 'tricolor':
        this.generateTricolor(builder, colors, random);
        break;
      case 'cross':
        this.generateCross(builder, colors, random);
        break;
      case 'saltire':
        this.generateSaltire(builder, colors, random);
        break;
      case 'canton':
        this.generateCanton(builder, colors, random, limits);
        break;
      case 'bicolor':
        this.generateBicolor(builder, colors, random);
        break;
      default:
        this.generateTricolor(builder, colors, random);
    }
    
    return {
      svg: builder.build(),
      colors,
      elements: ['classic', pattern]
    };
  }

  private generateClassicColors(maxColors: number, random: PseudoRandom): string[] {
    // Classic flag colors
    const classicPalettes = [
      ['#FF0000', '#FFFFFF', '#0000FF'], // Red, White, Blue
      ['#000000', '#FFD700', '#FF0000'], // Black, Gold, Red
      ['#009900', '#FFFFFF', '#FF6600'], // Green, White, Orange
      ['#0000FF', '#FFFF00', '#0000FF'], // Blue, Yellow, Blue
      ['#FF0000', '#FFFF00', '#FF0000'], // Red, Yellow, Red
      ['#FFFFFF', '#FF0000', '#FFFFFF'], // White, Red, White
      ['#00FF00', '#FFFFFF', '#FF0000'], // Green, White, Red
    ];
    
    const palette = classicPalettes[random.nextInt(0, classicPalettes.length)];
    return palette.slice(0, maxColors);
  }

  private selectPattern(random: PseudoRandom): string {
    const patterns = ['tricolor', 'cross', 'saltire', 'canton', 'bicolor'];
    return patterns[random.nextInt(0, patterns.length)];
  }

  private generateTricolor(builder: SvgBuilder, colors: string[], random: PseudoRandom): void {
    const direction = random.nextInt(0, 2); // 0: horizontal, 1: vertical
    
    if (direction === 0) {
      // Horizontal stripes
      const stripeHeight = 200 / 3;
      builder.addRectangle(0, 0, 300, stripeHeight, colors[0]);
      builder.addRectangle(0, stripeHeight, 300, stripeHeight, colors[1]);
      builder.addRectangle(0, stripeHeight * 2, 300, stripeHeight, colors[2 % colors.length]);
    } else {
      // Vertical stripes
      const stripeWidth = 300 / 3;
      builder.addRectangle(0, 0, stripeWidth, 200, colors[0]);
      builder.addRectangle(stripeWidth, 0, stripeWidth, 200, colors[1]);
      builder.addRectangle(stripeWidth * 2, 0, stripeWidth, 200, colors[2 % colors.length]);
    }
  }

  private generateCross(builder: SvgBuilder, colors: string[], random: PseudoRandom): void {
    // Background
    builder.addRectangle(0, 0, 300, 200, colors[0]);
    
    // Cross
    const crossWidth = random.nextInt(20, 50); // 30-50
    const crossColor = colors[1];
    
    // Vertical bar
    builder.addRectangle(150 - crossWidth / 2, 0, crossWidth, 200, crossColor);
    // Horizontal bar
    builder.addRectangle(0, 100 - crossWidth / 2, 300, crossWidth, crossColor);
    
    // Optional border
    if (colors.length > 2 && random.nextFloat() > 0.5) {
      const borderWidth = 5;
      // Vertical border
      builder.addRectangle(150 - crossWidth / 2 - borderWidth, 0, borderWidth, 200, colors[2]);
      builder.addRectangle(150 + crossWidth / 2, 0, borderWidth, 200, colors[2]);
      // Horizontal border
      builder.addRectangle(0, 100 - crossWidth / 2 - borderWidth, 300, borderWidth, colors[2]);
      builder.addRectangle(0, 100 + crossWidth / 2, 300, borderWidth, colors[2]);
    }
  }

  private generateSaltire(builder: SvgBuilder, colors: string[], random: PseudoRandom): void {
    // Background
    builder.addRectangle(0, 0, 300, 200, colors[0]);
    
    const width = random.nextInt(20, 40); // 20-40
    const color = colors[1];
    
    // Diagonal from top-left to bottom-right
    const points1 = [
      [0, 0],
      [width, 0],
      [300, 200 - width],
      [300, 200],
      [300 - width, 200],
      [0, width]
    ];
    builder.addPolygon(points1, color);
    
    // Diagonal from top-right to bottom-left
    const points2 = [
      [300, 0],
      [300, width],
      [width, 200],
      [0, 200],
      [0, 200 - width],
      [300 - width, 0]
    ];
    builder.addPolygon(points2, color);
  }

  private generateCanton(builder: SvgBuilder, colors: string[], random: PseudoRandom, limits: GenerationLimits): void {
    // Background stripes
    const stripeCount = random.nextInt(2, 5); // 2-4 stripes
    const stripeHeight = 200 / stripeCount;
    
    for (let i = 0; i < stripeCount; i++) {
      const color = i % 2 === 0 ? colors[0] : colors[1];
      builder.addRectangle(0, i * stripeHeight, 300, stripeHeight, color);
    }
    
    // Canton (upper left corner)
    const cantonWidth = 120;
    const cantonHeight = 100;
    builder.addRectangle(0, 0, cantonWidth, cantonHeight, colors[2 % colors.length]);
    
    // Add symbol in canton if allowed
    if (limits.allowSymbols && random.nextFloat() > 0.3) {
      const symbol = random.nextInt(0, 2) === 0 ? 'star' : 'circle';
      const symbolColor = colors[0] === '#FFFFFF' ? colors[1] : '#FFFFFF';
      
      if (random.nextFloat() > 0.5) {
        // Single large symbol
        builder.addSymbol(symbol, cantonWidth / 2, cantonHeight / 2, 30, symbolColor);
      } else {
        // Multiple small symbols
        const count = random.nextInt(3, 6); // 3-5 symbols
        for (let i = 0; i < count; i++) {
          const x = 20 + (i % 3) * 30;
          const y = 20 + Math.floor(i / 3) * 30;
          builder.addSymbol(symbol, x, y, 15, symbolColor);
        }
      }
    }
  }

  private generateBicolor(builder: SvgBuilder, colors: string[], random: PseudoRandom): void {
    const pattern = random.nextInt(0, 4);
    
    switch (pattern) {
      case 0:
        // Horizontal split
        builder.addRectangle(0, 0, 300, 100, colors[0]);
        builder.addRectangle(0, 100, 300, 100, colors[1]);
        break;
      case 1:
        // Vertical split
        builder.addRectangle(0, 0, 150, 200, colors[0]);
        builder.addRectangle(150, 0, 150, 200, colors[1]);
        break;
      case 2:
        // Diagonal split (top-left to bottom-right)
        builder.addPolygon([[0, 0], [300, 0], [300, 200], [0, 0]], colors[0]);
        builder.addPolygon([[0, 0], [0, 200], [300, 200], [0, 0]], colors[1]);
        break;
      case 3:
        // Diagonal split (top-right to bottom-left)
        builder.addPolygon([[0, 0], [300, 0], [0, 200], [0, 0]], colors[0]);
        builder.addPolygon([[300, 0], [300, 200], [0, 200], [300, 0]], colors[1]);
        break;
    }
  }
}