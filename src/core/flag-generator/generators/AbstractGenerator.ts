import { PseudoRandom } from '../../PseudoRandom';
import { SvgBuilder } from '../SvgBuilder';
import { FlagGenerationParams, GenerationLimits } from '../FlagGeneratorEngine';

export class AbstractGenerator {
  generate(params: FlagGenerationParams, limits: GenerationLimits, random: PseudoRandom, builder: SvgBuilder): any {
    builder.reset();
    
    const colors = this.generateAbstractColors(params.colorScheme || 'vibrant', limits.maxColors, random);
    const complexity = params.complexity || 5;
    
    // Add gradient background if allowed
    if (limits.allowGradients && random.nextFloat() > 0.3) {
      builder.addGradient('bg-gradient', [colors[0], colors[1]], random.nextInt(0, 4) * 90);
      builder.addRectangle(0, 0, 300, 200, 'url(#bg-gradient)');
    } else {
      builder.addRectangle(0, 0, 300, 200, colors[0]);
    }
    
    // Generate abstract patterns
    const patternTypes = ['waves', 'circles', 'polygons', 'curves', 'fractals'];
    const selectedPatterns = this.selectPatterns(patternTypes, complexity, random);
    
    selectedPatterns.forEach((pattern, index) => {
      switch (pattern) {
        case 'waves':
          this.addWaves(builder, colors, complexity, random);
          break;
        case 'circles':
          this.addCircles(builder, colors, complexity, random);
          break;
        case 'polygons':
          this.addPolygons(builder, colors, complexity, random);
          break;
        case 'curves':
          this.addCurves(builder, colors, complexity, random);
          break;
        case 'fractals':
          this.addFractals(builder, colors, complexity, random);
          break;
      }
    });
    
    // Add filters for extra effect
    if (limits.allowAnimations && random.nextFloat() > 0.7) {
      builder.addFilter('abstract-glow', 'glow');
      // Apply filter to last few elements
      // Note: This would need to be implemented in the builder
    }
    
    return {
      svg: builder.build(),
      colors,
      elements: ['abstract', ...selectedPatterns]
    };
  }

  private generateAbstractColors(scheme: string, maxColors: number, random: PseudoRandom): string[] {
    const colors: string[] = [];
    
    if (scheme === 'monochrome') {
      const baseHue = random.nextInt(0, 360);
      for (let i = 0; i < maxColors; i++) {
        const lightness = 20 + (i * 60 / maxColors);
        colors.push(`hsl(${baseHue}, 60%, ${lightness}%)`);
      }
    } else if (scheme === 'complementary') {
      const baseHue = random.nextInt(0, 360);
      colors.push(`hsl(${baseHue}, 70%, 50%)`);
      colors.push(`hsl(${(baseHue + 180) % 360}, 70%, 50%)`);
      if (maxColors > 2) {
        colors.push(`hsl(${baseHue}, 40%, 70%)`);
      }
    } else {
      // Vibrant abstract colors
      for (let i = 0; i < maxColors; i++) {
        const hue = random.nextInt(0, 360);
        const saturation = random.nextInt(60, 100);
        const lightness = random.nextInt(40, 70);
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
      }
    }
    
    return colors;
  }

  private selectPatterns(patterns: string[], complexity: number, random: PseudoRandom): string[] {
    const numPatterns = Math.min(Math.floor(complexity / 3) + 1, patterns.length);
    const selected: string[] = [];
    
    for (let i = 0; i < numPatterns; i++) {
      const pattern = patterns[random.nextInt(patterns.length)];
      if (!selected.includes(pattern)) {
        selected.push(pattern);
      }
    }
    
    return selected;
  }

  private addWaves(builder: SvgBuilder, colors: string[], complexity: number, random: PseudoRandom): void {
    const waveCount = Math.floor(complexity / 2) + 1;
    
    for (let i = 0; i < waveCount; i++) {
      const amplitude = 20 + random.nextInt(0, 30);
      const frequency = 2 + random.nextInt(0, 3);
      const yOffset = random.nextInt(0, 200);
      const color = colors[(i + 1) % colors.length];
      
      let path = `M 0 ${yOffset}`;
      for (let x = 0; x <= 300; x += 10) {
        const y = yOffset + Math.sin((x / 300) * Math.PI * frequency) * amplitude;
        path += ` L ${x} ${y}`;
      }
      path += ` L 300 200 L 0 200 Z`;
      
      builder.addPath(path, color);
    }
  }

  private addCircles(builder: SvgBuilder, colors: string[], complexity: number, random: PseudoRandom): void {
    const circleCount = complexity;
    
    for (let i = 0; i < circleCount; i++) {
      const cx = random.nextInt(0, 300);
      const cy = random.nextInt(0, 200);
      const r = 10 + random.nextInt(0, 40);
      const color = colors[random.nextInt(0, colors.length)];
      const opacity = 0.3 + random.nextFloat() * 0.7;
      
      // Add semi-transparent circle
      builder.addCircle(cx, cy, r, `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
    }
  }

  private addPolygons(builder: SvgBuilder, colors: string[], complexity: number, random: PseudoRandom): void {
    const polygonCount = Math.floor(complexity / 2);
    
    for (let i = 0; i < polygonCount; i++) {
      const sides = 3 + random.nextInt(0, 5); // 3-7 sides
      const centerX = random.nextInt(0, 300);
      const centerY = random.nextInt(0, 200);
      const radius = 20 + random.nextInt(0, 40);
      const rotation = random.nextFloat() * Math.PI * 2;
      
      const points: number[][] = [];
      for (let j = 0; j < sides; j++) {
        const angle = (j / sides) * Math.PI * 2 + rotation;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points.push([x, y]);
      }
      
      const color = colors[(i + 1) % colors.length];
      builder.addPolygon(points, color);
    }
  }

  private addCurves(builder: SvgBuilder, colors: string[], complexity: number, random: PseudoRandom): void {
    const curveCount = Math.floor(complexity / 3) + 1;
    
    for (let i = 0; i < curveCount; i++) {
      const startX = random.nextInt(0, 300);
      const startY = random.nextInt(0, 200);
      const endX = random.nextInt(0, 300);
      const endY = random.nextInt(0, 200);
      
      const cp1x = random.nextInt(0, 300);
      const cp1y = random.nextInt(0, 200);
      const cp2x = random.nextInt(0, 300);
      const cp2y = random.nextInt(0, 200);
      
      const path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
      const strokeWidth = 3 + random.nextInt(0, 10);
      const color = colors[(i + 1) % colors.length];
      
      builder.addPath(path, 'none', color, strokeWidth);
    }
  }

  private addFractals(builder: SvgBuilder, colors: string[], complexity: number, random: PseudoRandom): void {
    // Simplified fractal-like pattern
    const iterations = Math.min(complexity, 4);
    const baseSize = 80;
    
    this.drawFractalTree(builder, 150, 150, baseSize, -Math.PI / 2, iterations, colors[1], random);
  }

  private drawFractalTree(
    builder: SvgBuilder,
    x: number,
    y: number,
    length: number,
    angle: number,
    depth: number,
    color: string,
    random: PseudoRandom
  ): void {
    if (depth === 0) return;
    
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    
    const path = `M ${x} ${y} L ${endX} ${endY}`;
    builder.addPath(path, 'none', color);
    
    const angleVariation = Math.PI / 6 + random.nextFloat() * Math.PI / 6;
    const lengthReduction = 0.6 + random.nextFloat() * 0.2;
    
    // Left branch
    this.drawFractalTree(
      builder,
      endX,
      endY,
      length * lengthReduction,
      angle - angleVariation,
      depth - 1,
      color,
      random
    );
    
    // Right branch
    this.drawFractalTree(
      builder,
      endX,
      endY,
      length * lengthReduction,
      angle + angleVariation,
      depth - 1,
      color,
      random
    );
  }
}