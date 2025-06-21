import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { Gold } from "../../../core/game/Game";
import { GameView } from "../../../core/game/GameView";
import { AttackRatioEvent } from "../../InputHandler";
import { SendSetTargetTroopRatioEvent } from "../../Transport";
import { renderNumber, renderTroops } from "../../Utils";
import { UIState } from "../UIState";
import { Layer } from "./Layer";

@customElement("control-panel")
export class ControlPanel extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;
  public uiState: UIState;

  @state()
  private attackRatio: number = 0.2;

  @state()
  private targetTroopRatio = 0.95;

  @state()
  private currentTroopRatio = 0.95;

  @state()
  private _population: number;

  @state()
  private _maxPopulation: number;

  @state()
  private popRate: number;

  @state()
  private _troops: number;

  @state()
  private _workers: number;

  @state()
  private _isVisible = false;
  
  connectedCallback() {
    super.connectedCallback();
    // Hide by default
    this.style.display = 'none';
  }

  @state()
  private _manpower: number = 0;

  @state()
  private _gold: Gold;

  @state()
  private _goldPerSecond: Gold;

  private _lastPopulationIncreaseRate: number;

  private _popRateIsIncreasing: boolean = true;

  private init_: boolean = false;

  init() {
    this.attackRatio = Number(
      localStorage.getItem("settings.attackRatio") ?? "0.2",
    );
    this.targetTroopRatio = Number(
      localStorage.getItem("settings.troopRatio") ?? "0.95",
    );
    this.init_ = true;
    this.uiState.attackRatio = this.attackRatio;
    this.currentTroopRatio = this.targetTroopRatio;
    this.eventBus.on(AttackRatioEvent, (event) => {
      let newAttackRatio =
        (parseInt(
          (document.getElementById("attack-ratio") as HTMLInputElement).value,
        ) +
          event.attackRatio) /
        100;

      if (newAttackRatio < 0.01) {
        newAttackRatio = 0.01;
      }

      if (newAttackRatio > 1) {
        newAttackRatio = 1;
      }

      if (newAttackRatio === 0.11 && this.attackRatio === 0.01) {
        // If we're changing the ratio from 1%, then set it to 10% instead of 11% to keep a consistency
        newAttackRatio = 0.1;
      }

      this.attackRatio = newAttackRatio;
      this.onAttackRatioChange(this.attackRatio);
    });
  }

  tick() {
    if (this.init_) {
      this.eventBus.emit(
        new SendSetTargetTroopRatioEvent(this.targetTroopRatio),
      );
      this.init_ = false;
    }

    if (!this._isVisible && !this.game.inSpawnPhase()) {
      this.setVisibile(true);
    }

    const player = this.game.myPlayer();
    if (player === null || !player.isAlive()) {
      this.setVisibile(false);
      return;
    }

    const popIncreaseRate = player.population() - this._population;
    if (this.game.ticks() % 5 === 0) {
      this._popRateIsIncreasing =
        popIncreaseRate >= this._lastPopulationIncreaseRate;
      this._lastPopulationIncreaseRate = popIncreaseRate;
    }

    this._population = player.population();
    this._maxPopulation = this.game.config().maxPopulation(player);
    this._gold = player.gold();
    this._troops = player.troops();
    this._workers = player.workers();
    this.popRate = this.game.config().populationIncreaseRate(player) * 10;
    this._goldPerSecond = this.game.config().goldAdditionRate(player) * 10n;

    this.currentTroopRatio = player.troops() / player.population();
    this.requestUpdate();
  }

  onAttackRatioChange(newRatio: number) {
    this.uiState.attackRatio = newRatio;
  }

  renderLayer(context: CanvasRenderingContext2D) {
    // Render any necessary canvas elements
  }

  shouldTransform(): boolean {
    return false;
  }

  setVisibile(visible: boolean) {
    this._isVisible = visible;
    // Update the actual display style
    if (visible) {
      this.style.display = '';
      // Don't recenter the map - let the player keep their view
    } else {
      this.style.display = 'none';
    }
    this.requestUpdate();
  }

  targetTroops(): number {
    return this._manpower * this.targetTroopRatio;
  }

  onTroopChange(newRatio: number) {
    this.eventBus.emit(new SendSetTargetTroopRatioEvent(newRatio));
  }

  delta(): number {
    const d = this._population - this.targetTroops();
    return d;
  }

  render() {
    return html`
      <style>
        input[type="range"] {
          -webkit-appearance: none;
          background: transparent;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: white;
          border-width: 2px;
          border-style: solid;
          border-radius: 50%;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: white;
          border-width: 2px;
          border-style: solid;
          border-radius: 50%;
          cursor: pointer;
        }
        .targetTroopRatio::-webkit-slider-thumb {
          border-color: rgb(59 130 246);
        }
        .targetTroopRatio::-moz-range-thumb {
          border-color: rgb(59 130 246);
        }
        .attackRatio::-webkit-slider-thumb {
          border-color: rgb(239 68 68);
        }
        .attackRatio::-moz-range-thumb {
          border-color: rgb(239 68 68);
        }
      </style>
      <div
        class="${this._isVisible
          ? "w-full lg:w-72 sg-panel p-2 lg:p-3 text-xs"
          : "hidden"}"
        style="position: fixed; bottom: 10px; left: 10px; z-index: 30;"
        @contextmenu=${(e) => e.preventDefault()}
      >
        <!-- Resource Summary (Desktop only) - More compact -->
        <div class="hidden lg:block sg-card p-2 mb-3">
          <div class="grid grid-cols-2 gap-2">
            <div class="text-center">
              <div class="flex items-center justify-center gap-1">
                <span class="text-sm">👥</span>
                <div class="sg-text-primary font-bold text-sm">
                  ${renderTroops(this._population)}
                </div>
              </div>
              <div class="text-xs ${this._popRateIsIncreasing ? "text-green-400" : "text-yellow-400"}">
                +${renderTroops(this.popRate)}/s
              </div>
            </div>
            <div class="text-center">
              <div class="flex items-center justify-center gap-1">
                <span class="text-sm">💰</span>
                <div class="sg-text-primary font-bold text-sm">
                  ${renderNumber(this._gold)}
                </div>
              </div>
              <div class="text-xs text-green-400">
                +${renderNumber(this._goldPerSecond)}/s
              </div>
            </div>
          </div>
        </div>

        <!-- Troop/Worker Ratio Control - Compact but informative -->
        <div class="sg-card p-2 mb-2">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <span class="text-sm">⚔️</span>
              <span class="sg-text-primary font-medium text-sm">${translateText("control_panel.troops")}</span>
            </div>
            <div class="text-right">
              <div class="flex items-center gap-2 text-xs">
                <span class="sg-text-muted">⚔️ ${renderTroops(this._troops)}</span>
                <span class="sg-text-muted">🔨 ${renderTroops(this._workers)}</span>
              </div>
            </div>
          </div>
          
          <div class="relative h-5 mb-1">
            <!-- Background track -->
            <div class="absolute left-0 right-0 top-1.5 h-1.5 bg-black/30 rounded-full"></div>
            <!-- Target track (darker) -->
            <div
              class="absolute left-0 top-1.5 h-1.5 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full transition-all duration-300 opacity-60"
              style="width: ${this.targetTroopRatio * 100}%"
            ></div>
            <!-- Current track (brighter) -->
            <div
              class="absolute left-0 top-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-blue-300 rounded-full transition-all duration-500"
              style="width: ${this.currentTroopRatio * 100}%"
            ></div>
            <!-- Range input -->
            <input
              type="range"
              min="1"
              max="100"
              .value=${(this.targetTroopRatio * 100).toString()}
              @input=${(e: Event) => {
                this.targetTroopRatio = parseInt((e.target as HTMLInputElement).value) / 100;
                this.onTroopChange(this.targetTroopRatio);
              }}
              class="absolute left-0 right-0 top-0 m-0 h-5 cursor-pointer targetTroopRatio opacity-0"
            />
          </div>
          <div class="text-center text-xs sg-text-muted">
            ${(this.targetTroopRatio * 100).toFixed(0)}% troops / ${(100 - this.targetTroopRatio * 100).toFixed(0)}% workers
          </div>
        </div>

        <!-- Attack Ratio Control - Compact but clear -->
        <div class="sg-card p-2">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <span class="text-sm">🗡️</span>
              <span class="sg-text-primary font-medium text-sm">${translateText("control_panel.attack_ratio")}</span>
            </div>
            <div class="text-right">
              <div class="sg-text-primary font-bold text-xs">${renderTroops((this.game?.myPlayer()?.troops() ?? 0) * this.attackRatio)}</div>
            </div>
          </div>
          
          <div class="relative h-5 mb-1">
            <!-- Background track -->
            <div class="absolute left-0 right-0 top-1.5 h-1.5 bg-black/30 rounded-full"></div>
            <!-- Fill track -->
            <div
              class="absolute left-0 top-1.5 h-1.5 bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all duration-300"
              style="width: ${this.attackRatio * 100}%"
            ></div>
            <!-- Range input -->
            <input
              id="attack-ratio"
              type="range"
              min="1"
              max="100"
              .value=${(this.attackRatio * 100).toString()}
              @input=${(e: Event) => {
                this.attackRatio = parseInt((e.target as HTMLInputElement).value) / 100;
                this.onAttackRatioChange(this.attackRatio);
              }}
              class="absolute left-0 right-0 top-0 m-0 h-5 cursor-pointer attackRatio opacity-0"
            />
          </div>
          <div class="text-center text-xs sg-text-muted">
            Attack with ${(this.attackRatio * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    `;
  }

  createRenderRoot() {
    return this; // Disable shadow DOM to allow Tailwind styles
  }
}
