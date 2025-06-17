import { GameView } from "../../../core/game/GameView";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

export class BorderLayer implements Layer {
  private edgeGradient: CanvasGradient | null = null;
  private gridPhase: number = 0;
  private lastUpdate: number = 0;
  
  constructor(
    private game: GameView,
    private transformHandler: TransformHandler,
  ) {}

  renderLayer(context: CanvasRenderingContext2D): void {
    const canvas = context.canvas;
    context.save();
    
    // Create subtle edge shadows
    this.drawEdgeShadows(context, canvas);
    
    // Draw animated grid effect
    this.drawAnimatedGrid(context, canvas);
    
    // Draw subtle frame
    this.drawFrame(context, canvas);
    
    // Update animation
    const now = Date.now();
    if (now - this.lastUpdate > 100) {
      this.gridPhase = (this.gridPhase + 1) % 100;
      this.lastUpdate = now;
    }
    
    context.restore();
  }
  
  private drawEdgeShadows(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const edgeSize = 100;
    
    // Top edge
    const topGradient = context.createLinearGradient(0, 0, 0, edgeSize);
    topGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    topGradient.addColorStop(0.7, 'rgba(26, 31, 21, 0.2)');
    topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = topGradient;
    context.fillRect(0, 0, canvas.width, edgeSize);
    
    // Bottom edge
    const bottomGradient = context.createLinearGradient(0, canvas.height, 0, canvas.height - edgeSize);
    bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    bottomGradient.addColorStop(0.7, 'rgba(26, 31, 21, 0.2)');
    bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = bottomGradient;
    context.fillRect(0, canvas.height - edgeSize, canvas.width, edgeSize);
    
    // Left edge
    const leftGradient = context.createLinearGradient(0, 0, edgeSize, 0);
    leftGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    leftGradient.addColorStop(0.7, 'rgba(26, 31, 21, 0.2)');
    leftGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = leftGradient;
    context.fillRect(0, 0, edgeSize, canvas.height);
    
    // Right edge
    const rightGradient = context.createLinearGradient(canvas.width, 0, canvas.width - edgeSize, 0);
    rightGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    rightGradient.addColorStop(0.7, 'rgba(26, 31, 21, 0.2)');
    rightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = rightGradient;
    context.fillRect(canvas.width - edgeSize, 0, edgeSize, canvas.height);
  }
  
  private drawAnimatedGrid(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const gridSize = 100;
    const lineWidth = 0.5;
    
    context.strokeStyle = 'rgba(74, 95, 58, 0.15)';
    context.lineWidth = lineWidth;
    
    // Draw vertical lines with animation
    for (let x = -gridSize + this.gridPhase; x < canvas.width + gridSize; x += gridSize) {
      // Calculate fade based on distance from edges
      const distFromLeft = x;
      const distFromRight = canvas.width - x;
      const minDist = Math.min(distFromLeft, distFromRight);
      const fadeDistance = 200;
      
      if (minDist < fadeDistance) {
        const alpha = (1 - minDist / fadeDistance) * 0.15;
        context.strokeStyle = `rgba(74, 95, 58, ${alpha})`;
        
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
      }
    }
    
    // Draw horizontal lines with animation
    for (let y = -gridSize + this.gridPhase; y < canvas.height + gridSize; y += gridSize) {
      // Calculate fade based on distance from edges
      const distFromTop = y;
      const distFromBottom = canvas.height - y;
      const minDist = Math.min(distFromTop, distFromBottom);
      const fadeDistance = 200;
      
      if (minDist < fadeDistance) {
        const alpha = (1 - minDist / fadeDistance) * 0.15;
        context.strokeStyle = `rgba(74, 95, 58, ${alpha})`;
        
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
      }
    }
    
    // Draw subtle scan line effect
    const scanY = (Date.now() / 40) % canvas.height;
    const scanGradient = context.createLinearGradient(0, scanY - 30, 0, scanY + 30);
    scanGradient.addColorStop(0, 'rgba(120, 255, 71, 0)');
    scanGradient.addColorStop(0.5, 'rgba(120, 255, 71, 0.015)');
    scanGradient.addColorStop(1, 'rgba(120, 255, 71, 0)');
    
    context.fillStyle = scanGradient;
    context.fillRect(0, scanY - 30, canvas.width, 60);
  }
  
  private drawFrame(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // Draw very subtle inner frame
    const frameOffset = 2;
    
    context.strokeStyle = 'rgba(74, 95, 58, 0.3)';
    context.lineWidth = 1;
    context.setLineDash([20, 10]);
    
    // Draw frame
    context.strokeRect(
      frameOffset, 
      frameOffset, 
      canvas.width - frameOffset * 2, 
      canvas.height - frameOffset * 2
    );
    
    context.setLineDash([]); // Reset line dash
    
    // Add corner accents
    const cornerLength = 30;
    const cornerOffset = 10;
    
    context.strokeStyle = 'rgba(74, 95, 58, 0.5)';
    context.lineWidth = 2;
    
    // Top-left
    context.beginPath();
    context.moveTo(cornerOffset, cornerOffset + cornerLength);
    context.lineTo(cornerOffset, cornerOffset);
    context.lineTo(cornerOffset + cornerLength, cornerOffset);
    context.stroke();
    
    // Top-right
    context.beginPath();
    context.moveTo(canvas.width - cornerOffset - cornerLength, cornerOffset);
    context.lineTo(canvas.width - cornerOffset, cornerOffset);
    context.lineTo(canvas.width - cornerOffset, cornerOffset + cornerLength);
    context.stroke();
    
    // Bottom-left
    context.beginPath();
    context.moveTo(cornerOffset, canvas.height - cornerOffset - cornerLength);
    context.lineTo(cornerOffset, canvas.height - cornerOffset);
    context.lineTo(cornerOffset + cornerLength, canvas.height - cornerOffset);
    context.stroke();
    
    // Bottom-right
    context.beginPath();
    context.moveTo(canvas.width - cornerOffset - cornerLength, canvas.height - cornerOffset);
    context.lineTo(canvas.width - cornerOffset, canvas.height - cornerOffset);
    context.lineTo(canvas.width - cornerOffset, canvas.height - cornerOffset - cornerLength);
    context.stroke();
  }

  shouldTransform(): boolean {
    return false; // Border should not be transformed
  }
}