import { PseudoRandom } from '../../PseudoRandom';
import { SvgBuilder } from '../SvgBuilder';
import { FlagGenerationParams, GenerationLimits } from '../FlagGeneratorEngine';

export class HeraldryGenerator {
  generate(params: FlagGenerationParams, limits: GenerationLimits, random: PseudoRandom, builder: SvgBuilder): any {
    builder.reset();
    
    const colors = this.generateHeraldryColors(limits.maxColors, random);
    const field = this.selectField(random);
    const charge = limits.allowSymbols ? this.selectCharge(random) : null;
    
    // Generate base field
    this.generateField(builder, field, colors);
    
    // Add charge (main symbol) if allowed
    if (charge && limits.allowSymbols) {
      this.addCharge(builder, charge, colors, random);
    }
    
    // Add ordinaries (geometric divisions)
    if (params.complexity && params.complexity > 5) {
      this.addOrdinary(builder, colors, random);
    }
    
    // Add border/frame
    if (random.nextFloat() > 0.5) {
      this.addBorder(builder, colors[colors.length - 1]);
    }
    
    const elements = ['heraldic', field];
    if (charge) elements.push(charge);
    
    return {
      svg: builder.build(),
      colors,
      elements
    };
  }

  private generateHeraldryColors(maxColors: number, random: PseudoRandom): string[] {
    // Traditional heraldic tinctures
    const metals = ['#FFD700', '#C0C0C0']; // Or (gold), Argent (silver)
    const colors = ['#FF0000', '#0000FF', '#000000', '#008000', '#800080']; // Gules, Azure, Sable, Vert, Purpure
    
    const selectedColors: string[] = [];
    
    // Always include at least one metal and one color
    selectedColors.push(metals[random.nextInt(0, metals.length)]);
    selectedColors.push(colors[random.nextInt(0, colors.length)]);
    
    // Add additional colors if allowed
    while (selectedColors.length < maxColors && selectedColors.length < 4) {
      const allColors = [...metals, ...colors];
      const newColor = allColors[random.nextInt(0, allColors.length)];
      if (!selectedColors.includes(newColor)) {
        selectedColors.push(newColor);
      }
    }
    
    return selectedColors;
  }

  private selectField(random: PseudoRandom): string {
    const fields = ['plain', 'party', 'quarterly', 'paly', 'barry', 'bendy', 'chevronny'];
    return fields[random.nextInt(0, fields.length)];
  }

  private selectCharge(random: PseudoRandom): string {
    const charges = ['lion', 'eagle', 'cross', 'star', 'crown', 'sword', 'shield', 'fleur-de-lis'];
    return charges[random.nextInt(0, charges.length)];
  }

  private generateField(builder: SvgBuilder, field: string, colors: string[]): void {
    switch (field) {
      case 'plain':
        builder.addRectangle(0, 0, 300, 200, colors[0]);
        break;
        
      case 'party':
        // Divided vertically
        builder.addRectangle(0, 0, 150, 200, colors[0]);
        builder.addRectangle(150, 0, 150, 200, colors[1]);
        break;
        
      case 'quarterly':
        // Divided into quarters
        builder.addRectangle(0, 0, 150, 100, colors[0]);
        builder.addRectangle(150, 0, 150, 100, colors[1]);
        builder.addRectangle(0, 100, 150, 100, colors[1]);
        builder.addRectangle(150, 100, 150, 100, colors[0]);
        break;
        
      case 'paly':
        // Vertical stripes
        const stripeWidth = 300 / 6;
        for (let i = 0; i < 6; i++) {
          const color = i % 2 === 0 ? colors[0] : colors[1];
          builder.addRectangle(i * stripeWidth, 0, stripeWidth, 200, color);
        }
        break;
        
      case 'barry':
        // Horizontal stripes
        const stripeHeight = 200 / 6;
        for (let i = 0; i < 6; i++) {
          const color = i % 2 === 0 ? colors[0] : colors[1];
          builder.addRectangle(0, i * stripeHeight, 300, stripeHeight, color);
        }
        break;
        
      case 'bendy':
        // Diagonal stripes
        for (let i = -3; i < 6; i++) {
          const color = i % 2 === 0 ? colors[0] : colors[1];
          const points = [
            [i * 50, 0],
            [(i + 1) * 50, 0],
            [(i + 1) * 50 + 200, 200],
            [i * 50 + 200, 200]
          ];
          builder.addPolygon(points, color);
        }
        break;
        
      case 'chevronny':
        // Chevron pattern
        const chevronHeight = 200 / 4;
        for (let i = 0; i < 4; i++) {
          const color = i % 2 === 0 ? colors[0] : colors[1];
          builder.addChevron(0, i * chevronHeight, 300, chevronHeight, color);
        }
        break;
    }
  }

  private addCharge(builder: SvgBuilder, charge: string, colors: string[], random: PseudoRandom): void {
    const chargeColor = colors[colors.length - 1];
    const centerX = 150;
    const centerY = 100;
    
    switch (charge) {
      case 'lion':
        this.drawLion(builder, centerX, centerY, chargeColor);
        break;
        
      case 'eagle':
        this.drawEagle(builder, centerX, centerY, chargeColor);
        break;
        
      case 'cross':
        builder.addCross(centerX, centerY, 80, 20, chargeColor);
        break;
        
      case 'star':
        builder.addStar(centerX, centerY, 40, 20, 5, chargeColor);
        break;
        
      case 'crown':
        this.drawCrown(builder, centerX, centerY, chargeColor);
        break;
        
      case 'sword':
        this.drawSword(builder, centerX, centerY, chargeColor);
        break;
        
      case 'shield':
        this.drawShield(builder, centerX, centerY, chargeColor);
        break;
        
      case 'fleur-de-lis':
        this.drawFleurDeLis(builder, centerX, centerY, chargeColor);
        break;
    }
  }

  private addOrdinary(builder: SvgBuilder, colors: string[], random: PseudoRandom): void {
    const ordinaries = ['chief', 'fess', 'pale', 'bend', 'chevron'];
    const ordinary = ordinaries[random.nextInt(0, ordinaries.length)];
    const color = colors[2 % colors.length];
    
    switch (ordinary) {
      case 'chief':
        // Horizontal band at top
        builder.addRectangle(0, 0, 300, 50, color);
        break;
        
      case 'fess':
        // Horizontal band in middle
        builder.addRectangle(0, 75, 300, 50, color);
        break;
        
      case 'pale':
        // Vertical band in middle
        builder.addRectangle(125, 0, 50, 200, color);
        break;
        
      case 'bend':
        // Diagonal band
        const bendPoints = [
          [0, 0],
          [50, 0],
          [300, 150],
          [300, 200],
          [250, 200],
          [0, 50]
        ];
        builder.addPolygon(bendPoints, color);
        break;
        
      case 'chevron':
        // Inverted V shape
        builder.addChevron(50, 50, 200, 100, color);
        break;
    }
  }

  private addBorder(builder: SvgBuilder, color: string): void {
    const borderWidth = 10;
    // Top
    builder.addRectangle(0, 0, 300, borderWidth, color);
    // Bottom
    builder.addRectangle(0, 200 - borderWidth, 300, borderWidth, color);
    // Left
    builder.addRectangle(0, 0, borderWidth, 200, color);
    // Right
    builder.addRectangle(300 - borderWidth, 0, borderWidth, 200, color);
  }

  // Simplified heraldic charge drawing methods
  private drawLion(builder: SvgBuilder, x: number, y: number, color: string): void {
    // Simplified lion silhouette
    const path = `M ${x-30} ${y+20} 
                  C ${x-30} ${y}, ${x-20} ${y-20}, ${x} ${y-20}
                  C ${x+20} ${y-20}, ${x+30} ${y}, ${x+30} ${y+20}
                  L ${x+20} ${y+30}
                  L ${x+10} ${y+30}
                  L ${x+10} ${y+40}
                  L ${x-10} ${y+40}
                  L ${x-10} ${y+30}
                  L ${x-20} ${y+30}
                  Z`;
    builder.addPath(path, color);
  }

  private drawEagle(builder: SvgBuilder, x: number, y: number, color: string): void {
    // Simplified eagle with spread wings
    const path = `M ${x} ${y-30}
                  L ${x-40} ${y}
                  L ${x-30} ${y+10}
                  L ${x-10} ${y}
                  L ${x} ${y+20}
                  L ${x+10} ${y}
                  L ${x+30} ${y+10}
                  L ${x+40} ${y}
                  Z`;
    builder.addPath(path, color);
  }

  private drawCrown(builder: SvgBuilder, x: number, y: number, color: string): void {
    // Crown base
    builder.addRectangle(x - 30, y - 10, 60, 20, color);
    // Crown points
    const points = [
      [x - 30, y - 10],
      [x - 20, y - 25],
      [x - 10, y - 10],
      [x, y - 30],
      [x + 10, y - 10],
      [x + 20, y - 25],
      [x + 30, y - 10]
    ];
    builder.addPolygon(points, color);
  }

  private drawSword(builder: SvgBuilder, x: number, y: number, color: string): void {
    // Blade
    builder.addRectangle(x - 3, y - 40, 6, 60, color);
    // Guard
    builder.addRectangle(x - 15, y - 20, 30, 4, color);
    // Pommel
    builder.addCircle(x, y + 25, 5, color);
  }

  private drawShield(builder: SvgBuilder, x: number, y: number, color: string): void {
    const path = `M ${x-25} ${y-30}
                  L ${x+25} ${y-30}
                  L ${x+25} ${y+10}
                  C ${x+25} ${y+30}, ${x} ${y+40}, ${x} ${y+40}
                  C ${x} ${y+40}, ${x-25} ${y+30}, ${x-25} ${y+10}
                  Z`;
    builder.addPath(path, color);
  }

  private drawFleurDeLis(builder: SvgBuilder, x: number, y: number, color: string): void {
    // Central petal
    const centralPath = `M ${x} ${y-30} 
                        C ${x-10} ${y-20}, ${x-10} ${y}, ${x} ${y+10}
                        C ${x+10} ${y}, ${x+10} ${y-20}, ${x} ${y-30}`;
    builder.addPath(centralPath, color);
    
    // Side petals
    const leftPath = `M ${x-15} ${y-10}
                      C ${x-25} ${y-15}, ${x-25} ${y+5}, ${x-15} ${y+10}
                      C ${x-10} ${y}, ${x-10} ${y-10}, ${x-15} ${y-10}`;
    builder.addPath(leftPath, color);
    
    const rightPath = `M ${x+15} ${y-10}
                       C ${x+25} ${y-15}, ${x+25} ${y+5}, ${x+15} ${y+10}
                       C ${x+10} ${y}, ${x+10} ${y-10}, ${x+15} ${y-10}`;
    builder.addPath(rightPath, color);
  }
}