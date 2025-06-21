import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { translateText } from "../../../client/Utils";
import { GameView } from "../../../core/game/GameView";
import { renderNumber, renderTroops } from "../../Utils";
import { Layer } from "./Layer";

@customElement("top-bar")
export class TopBar extends LitElement implements Layer {
  public game: GameView;
  private isVisible = false;
  private _population = 0;
  private _lastPopulationIncreaseRate = 0;
  private _popRateIsIncreasing = false;
  
  connectedCallback() {
    super.connectedCallback();
    // Hide by default
    this.style.display = 'none';
  }

  createRenderRoot() {
    return this;
  }

  init() {
    this.isVisible = true;
    this.style.display = '';
    this.requestUpdate();
  }

  tick() {
    // Always hide TopBar since resources are now integrated into unified control panel
    this.isVisible = false;
    this.style.display = 'none';
    
    if (this.isVisible) {
      this.updatePopulationIncrease();
      this.requestUpdate();
    }
  }

  private updatePopulationIncrease() {
    const player = this.game?.myPlayer();
    if (player === null) return;
    const popIncreaseRate = player.population() - this._population;
    if (this.game.ticks() % 5 === 0) {
      this._popRateIsIncreasing =
        popIncreaseRate >= this._lastPopulationIncreaseRate;
      this._lastPopulationIncreaseRate = popIncreaseRate;
    }
  }

  render() {
    if (!this.isVisible) {
      return html``;
    }

    const myPlayer = this.game?.myPlayer();
    if (!myPlayer?.isAlive() || this.game?.inSpawnPhase()) {
      return html``;
    }

    const popRate = this.game.config().populationIncreaseRate(myPlayer) * 10;
    const maxPop = this.game.config().maxPopulation(myPlayer);
    const goldPerSecond = this.game.config().goldAdditionRate(myPlayer) * 10n;

    return html`
      <div
        class="fixed top-0 left-0 z-40 sg-panel p-3 rounded-none rounded-br-lg grid grid-cols-1 sm:grid-cols-2 gap-3 w-auto min-w-[300px] lg:hidden"
        style="background: linear-gradient(135deg, rgba(20, 25, 20, 0.95) 0%, rgba(15, 20, 15, 0.98) 100%); 
               border: 1px solid rgba(74, 95, 58, 0.3); 
               border-left: none; 
               border-top: none;"
      >
        <!-- Population Card -->
        <div class="sg-card p-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">👥</span>
              <div>
                <div class="sg-text-muted text-xs">${translateText("control_panel.pop")}</div>
                <div class="sg-text-primary font-bold text-sm" translate="no">
                  ${renderTroops(myPlayer.population())} / ${renderTroops(maxPop)}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs ${this._popRateIsIncreasing ? "text-green-400" : "text-yellow-400"}" translate="no">
                +${renderTroops(popRate)}/s
              </div>
            </div>
          </div>
        </div>
        
        <!-- Gold Card -->
        <div class="sg-card p-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-lg">💰</span>
              <div>
                <div class="sg-text-muted text-xs">${translateText("control_panel.gold")}</div>
                <div class="sg-text-primary font-bold text-sm" translate="no">
                  ${renderNumber(myPlayer.gold())}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-green-400" translate="no">
                +${renderNumber(goldPerSecond)}/s
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
