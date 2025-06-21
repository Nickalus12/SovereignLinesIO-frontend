import { GameMode, Team } from "../../../core/game/Game";
import { GameView } from "../../../core/game/GameView";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

export class SpawnTimer implements Layer {
  private ratios = [0];
  private colors = ["rgba(74, 95, 58, 0.9)", "rgba(20, 25, 20, 0.8)"];

  constructor(
    private game: GameView,
    private transformHandler: TransformHandler,
  ) {}

  init() {}

  tick() {
    if (this.game.inSpawnPhase()) {
      this.ratios[0] =
        this.game.ticks() / this.game.config().numSpawnPhaseTurns();
      return;
    }

    this.ratios = [];
    this.colors = [];

    if (this.game.config().gameConfig().gameMode !== GameMode.Team) {
      return;
    }

    const teamTiles: Map<Team, number> = new Map();
    for (const player of this.game.players()) {
      const team = player.team();
      if (team === null) throw new Error("Team is null");
      const tiles = teamTiles.get(team) ?? 0;
      const sum = tiles + player.numTilesOwned();
      teamTiles.set(team, sum);
    }

    const theme = this.game.config().theme();
    const total = sumIterator(teamTiles.values());
    if (total === 0) return;
    for (const [team, count] of teamTiles) {
      const ratio = count / total;
      const color = theme.teamColor(team).toRgbString();
      this.ratios.push(ratio);
      this.colors.push(color);
    }
  }

  shouldTransform(): boolean {
    return false;
  }

  renderLayer(context: CanvasRenderingContext2D) {
    if (this.ratios === null) return;
    if (this.ratios.length === 0) return;
    if (this.colors.length === 0) return;

    const barHeight = 16; // Increased height
    const barWidth = this.transformHandler.width();
    
    // Add shadow for depth
    context.shadowColor = "rgba(0, 0, 0, 0.5)";
    context.shadowBlur = 4;
    context.shadowOffsetY = 2;

    // Background
    context.fillStyle = "rgba(15, 20, 15, 0.95)";
    context.fillRect(0, 0, barWidth, barHeight);
    
    // Border
    context.strokeStyle = "rgba(74, 95, 58, 0.5)";
    context.lineWidth = 1;
    context.strokeRect(0, 0, barWidth, barHeight);
    
    // Reset shadow for progress bar
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;

    let x = 2; // Small padding
    let filledRatio = 0;
    for (let i = 0; i < this.ratios.length && i < this.colors.length; i++) {
      const ratio = this.ratios[i] ?? 1 - filledRatio;
      const segmentWidth = (barWidth - 4) * ratio; // Account for padding

      // Gradient fill for progress
      if (i === 0 && this.game.inSpawnPhase()) {
        const gradient = context.createLinearGradient(x, 0, x + segmentWidth, 0);
        gradient.addColorStop(0, "rgba(74, 95, 58, 0.6)");
        gradient.addColorStop(0.5, "rgba(74, 95, 58, 0.9)");
        gradient.addColorStop(1, "rgba(90, 115, 70, 0.9)");
        context.fillStyle = gradient;
      } else {
        context.fillStyle = this.colors[i];
      }
      
      context.fillRect(x, 2, segmentWidth, barHeight - 4);

      x += segmentWidth;
      filledRatio += ratio;
    }
    
    // Subtle highlight on top
    context.fillStyle = "rgba(255, 255, 255, 0.1)";
    context.fillRect(0, 0, barWidth, 2);
    
    // Add percentage text if in spawn phase
    if (this.game.inSpawnPhase() && this.ratios[0] > 0) {
      const percentage = Math.floor(this.ratios[0] * 100);
      context.font = "bold 12px monospace";
      context.fillStyle = "rgba(255, 255, 255, 0.9)";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowColor = "rgba(0, 0, 0, 0.8)";
      context.shadowBlur = 3;
      context.fillText(`${percentage}%`, barWidth / 2, barHeight / 2);
      
      // Reset shadow
      context.shadowBlur = 0;
    }
  }
}

function sumIterator(values: MapIterator<number>) {
  // To use reduce, we'd need to allocate an array:
  // return Array.from(values).reduce((sum, v) => sum + v, 0);
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
}
