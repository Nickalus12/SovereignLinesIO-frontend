export class SvgBuilder {
  private elements: string[] = [];
  private defs: string[] = [];
  private width = 300;
  private height = 200;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.elements = [];
    this.defs = [];
  }

  addGradient(id: string, colors: string[], direction: number = 0): void {
    const x1 = direction === 90 ? "0%" : "0%";
    const y1 = direction === 90 ? "0%" : "0%";
    const x2 = direction === 90 ? "100%" : "0%";
    const y2 = direction === 90 ? "0%" : "100%";
    
    const stops = colors.map((color, i) => 
      `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${color}"/>`
    ).join('');
    
    this.defs.push(
      `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`
    );
  }

  addRectangle(x: number, y: number, width: number, height: number, fill: string): void {
    this.elements.push(
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`
    );
  }

  addCircle(cx: number, cy: number, r: number, fill: string): void {
    this.elements.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
    );
  }

  addPolygon(points: number[][], fill: string): void {
    const pointsStr = points.map(p => `${p[0]},${p[1]}`).join(' ');
    this.elements.push(
      `<polygon points="${pointsStr}" fill="${fill}"/>`
    );
  }

  addPath(d: string, fill: string, stroke?: string, strokeWidth?: number): void {
    const strokeAttr = stroke ? `stroke="${stroke}" stroke-width="${strokeWidth || 2}"` : '';
    this.elements.push(
      `<path d="${d}" fill="${fill}" ${strokeAttr}/>`
    );
  }

  addStar(cx: number, cy: number, outerRadius: number, innerRadius: number, points: number, fill: string): void {
    const angle = (Math.PI * 2) / points;
    const starPoints: number[][] = [];
    
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = cx + Math.cos(i * angle / 2 - Math.PI / 2) * radius;
      const y = cy + Math.sin(i * angle / 2 - Math.PI / 2) * radius;
      starPoints.push([x, y]);
    }
    
    this.addPolygon(starPoints, fill);
  }

  addCross(cx: number, cy: number, size: number, thickness: number, fill: string): void {
    // Vertical bar
    this.addRectangle(cx - thickness / 2, cy - size / 2, thickness, size, fill);
    // Horizontal bar
    this.addRectangle(cx - size / 2, cy - thickness / 2, size, thickness, fill);
  }

  addChevron(x: number, y: number, width: number, height: number, fill: string): void {
    const points = [
      [x, y],
      [x + width / 2, y + height / 3],
      [x + width, y],
      [x + width, y + height / 3],
      [x + width / 2, y + height * 2 / 3],
      [x, y + height / 3]
    ];
    this.addPolygon(points, fill);
  }

  addStripe(direction: 'horizontal' | 'vertical' | 'diagonal', position: number, thickness: number, fill: string): void {
    if (direction === 'horizontal') {
      this.addRectangle(0, position, this.width, thickness, fill);
    } else if (direction === 'vertical') {
      this.addRectangle(position, 0, thickness, this.height, fill);
    } else {
      // Diagonal stripe
      const points = [
        [position, 0],
        [position + thickness, 0],
        [this.width, this.height - position - thickness],
        [this.width, this.height - position]
      ];
      this.addPolygon(points, fill);
    }
  }

  addText(x: number, y: number, text: string, fontSize: number, fill: string, fontFamily: string = 'Arial'): void {
    this.elements.push(
      `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}" text-anchor="middle" dominant-baseline="central">${text}</text>`
    );
  }

  addSymbol(type: string, x: number, y: number, size: number, fill: string): void {
    switch (type) {
      case 'star':
        this.addStar(x, y, size / 2, size / 4, 5, fill);
        break;
      case 'cross':
        this.addCross(x, y, size, size / 4, fill);
        break;
      case 'circle':
        this.addCircle(x, y, size / 2, fill);
        break;
      case 'diamond':
        const diamondPoints = [
          [x, y - size / 2],
          [x + size / 2, y],
          [x, y + size / 2],
          [x - size / 2, y]
        ];
        this.addPolygon(diamondPoints, fill);
        break;
      case 'crescent':
        // Simple crescent using two circles
        this.addCircle(x, y, size / 2, fill);
        this.elements.push(
          `<circle cx="${x + size / 4}" cy="${y}" r="${size / 2}" fill="white" opacity="1"/>`
        );
        break;
    }
  }

  addAnimation(elementIndex: number, type: 'rotate' | 'pulse' | 'wave', duration: number = 3): void {
    const element = this.elements[elementIndex];
    if (!element) return;
    
    let animation = '';
    switch (type) {
      case 'rotate':
        animation = `<animateTransform attributeName="transform" type="rotate" from="0 150 100" to="360 150 100" dur="${duration}s" repeatCount="indefinite"/>`;
        break;
      case 'pulse':
        animation = `<animate attributeName="opacity" values="1;0.7;1" dur="${duration}s" repeatCount="indefinite"/>`;
        break;
      case 'wave':
        animation = `<animateTransform attributeName="transform" type="translate" values="0,0; 10,0; 0,0" dur="${duration}s" repeatCount="indefinite"/>`;
        break;
    }
    
    // Insert animation into element
    this.elements[elementIndex] = element.replace('>', `>${animation}`);
  }

  addFilter(id: string, type: 'shadow' | 'glow' | 'blur'): void {
    let filter = '';
    switch (type) {
      case 'shadow':
        filter = `
          <filter id="${id}">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        `;
        break;
      case 'glow':
        filter = `
          <filter id="${id}">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        `;
        break;
      case 'blur':
        filter = `
          <filter id="${id}">
            <feGaussianBlur stdDeviation="2"/>
          </filter>
        `;
        break;
    }
    this.defs.push(filter);
  }

  build(): string {
    const defsSection = this.defs.length > 0 
      ? `<defs>${this.defs.join('')}</defs>` 
      : '';
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}">
      ${defsSection}
      ${this.elements.join('\n')}
    </svg>`;
  }

  // Utility method to generate a clip path for complex shapes
  addClipPath(id: string, path: string): void {
    this.defs.push(
      `<clipPath id="${id}"><path d="${path}"/></clipPath>`
    );
  }

  // Get current dimensions
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}