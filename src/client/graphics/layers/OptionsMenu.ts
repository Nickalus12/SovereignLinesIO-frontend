import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import { GameType } from "../../../core/game/Game";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { GameView } from "../../../core/game/GameView";
import { UserSettings } from "../../../core/game/UserSettings";
import { AlternateViewEvent, RefreshGraphicsEvent, ReplaySpeedChangeEvent } from "../../InputHandler";
import { GoToPlayerEvent } from "./Leaderboard";
import { PauseGameEvent } from "../../Transport";
import { ReplaySpeedMultiplier } from "../../utilities/ReplaySpeedMultiplier";
import { renderNumber, renderTroops } from "../../Utils";
import { Layer } from "./Layer";

const button = ({
  classes = "",
  onClick = () => {},
  title = "",
  children,
  variant = "default",
}) => html`
  <button
    class="sg-button sg-button--small ${variant === 'primary' ? 'sg-button--primary' : ''} 
           flex items-center justify-center
           font-medium ${classes}"
    @click=${onClick}
    aria-label=${title}
    title=${title}
  >
    ${children}
  </button>
`;

const secondsToHms = (d: number): string => {
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor((d % 3600) % 60);
  let time = d === 0 ? "-" : `${s}s`;
  if (m > 0) time = `${m}m` + time;
  if (h > 0) time = `${h}h` + time;
  return time;
};

@customElement("options-menu")
export class OptionsMenu extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;
  private userSettings: UserSettings = new UserSettings();

  @state()
  private showPauseButton: boolean = true;

  @state()
  private isPaused: boolean = false;

  @state()
  private timer: number = 0;

  @state()
  private showSettings: boolean = false;

  private isVisible = false;

  private hasWinner = false;

  @state()
  private alternateView: boolean = false;
  
  @state()
  private showCountryUI: boolean = false;
  
  @state()
  private showLeaderboard: boolean = false;
  
  @state()
  private showResources: boolean = false;

  @state()
  private currentSpeed: ReplaySpeedMultiplier = ReplaySpeedMultiplier.normal;

  @state()
  private topPlayers: any[] = [];

  @state()
  private showCountryInfo = false;
  
  @state()
  private selectedCountry: any = null;
  
  @state()
  private isCountryLocked: boolean = false;
  
  private isInSpawnPhase: boolean = true;

  private onTerrainButtonClick() {
    this.alternateView = !this.alternateView;
    this.eventBus.emit(new AlternateViewEvent(this.alternateView));
    this.requestUpdate();
  }

  private onSpeedChange(speed: ReplaySpeedMultiplier) {
    this.currentSpeed = speed;
    this.eventBus.emit(new ReplaySpeedChangeEvent(speed));
    this.requestUpdate();
  }

  private onExitButtonClick() {
    const isAlive = this.game.myPlayer()?.isAlive();
    if (isAlive) {
      const isConfirmed = confirm("Are you sure you want to exit the game?");
      if (!isConfirmed) return;
    }
    // Restore the main menu instead of reloading
    document.body.classList.remove("in-game");
    
    const header = document.querySelector(".l-header") as HTMLElement;
    const footer = document.querySelector(".l-footer") as HTMLElement;
    const mainContainer = document.querySelector("main") as HTMLElement;
    const settingsButton = document.getElementById("settings-button");
    
    if (header) header.style.display = "";
    if (footer) footer.style.display = "";
    if (mainContainer) mainContainer.style.display = "";
    if (settingsButton) settingsButton.classList.remove("hidden");
    
    // Clear the URL if we're in a multiplayer game
    if (window.location.pathname.startsWith('/join/')) {
      window.history.pushState({}, "", "/");
      sessionStorage.removeItem("inLobby");
    }
    
    // Emit game ended and leave lobby events
    document.dispatchEvent(new CustomEvent("game-ended"));
    document.dispatchEvent(new CustomEvent("leave-lobby"));
    
    // Restart the public lobby
    const publicLobby = document.querySelector("public-lobby") as any;
    if (publicLobby && publicLobby.connectedCallback) {
      publicLobby.connectedCallback();
    }
  }

  createRenderRoot() {
    return this;
  }

  private onSettingsButtonClick() {
    this.showSettings = !this.showSettings;
    this.requestUpdate();
  }

  private onPauseButtonClick() {
    this.isPaused = !this.isPaused;
    this.eventBus.emit(new PauseGameEvent(this.isPaused));
  }

  private onToggleEmojisButtonClick() {
    this.userSettings.toggleEmojis();
    this.requestUpdate();
  }

  private onToggleSpecialEffectsButtonClick() {
    this.userSettings.toggleFxLayer();
    this.requestUpdate();
  }

  private onToggleDarkModeButtonClick() {
    this.userSettings.toggleDarkMode();
    this.requestUpdate();
    this.eventBus.emit(new RefreshGraphicsEvent());
  }

  private onToggleRandomNameModeButtonClick() {
    this.userSettings.toggleRandomName();
  }

  private onToggleFocusLockedButtonClick() {
    this.userSettings.toggleFocusLocked();
    this.requestUpdate();
  }

  private onToggleLeftClickOpensMenu() {
    this.userSettings.toggleLeftClickOpenMenu();
  }

  private onToggleHideNationNames() {
    this.userSettings.toggleHideNationNames();
    this.requestUpdate();
    this.eventBus.emit(new RefreshGraphicsEvent());
  }

  private onToggleHideCrowns() {
    this.userSettings.toggleHideCrowns();
    this.requestUpdate();
    this.eventBus.emit(new RefreshGraphicsEvent());
  }
  
  private renderUIToggle(icon: string, label: string, enabled: boolean, onClick: () => void) {
    return html`
      <button
        class="sg-card sg-button--small ${enabled ? 'sg-card--selected' : ''} 
               p-2 flex flex-col items-center justify-center gap-1 min-h-[60px]
               text-xs transition-all duration-300"
        @click=${() => {
          onClick();
          this.requestUpdate();
          this.eventBus.emit(new RefreshGraphicsEvent());
        }}
        title="${label}"
      >
        <span class="text-lg">${icon}</span>
        <span class="text-[10px] text-center leading-tight">${label}</span>
      </button>
    `;
  }

  init() {
    console.log("init called from OptionsMenu");
    this.showPauseButton =
      this.game.config().gameConfig().gameType === GameType.Singleplayer ||
      this.game.config().isReplay();
    this.updateLeaderboard(); // Initialize leaderboard
    this.isInSpawnPhase = this.game.inSpawnPhase();
    this.isVisible = !this.isInSpawnPhase; // Hide during spawn phase
    this.requestUpdate();
  }

  tick() {
    const updates = this.game.updatesSinceLastTick();
    if (updates) {
      this.hasWinner = this.hasWinner || updates[GameUpdateType.Win].length > 0;
      
      // Auto-lock on countries when they attack you
      const myPlayer = this.game.myPlayer();
      if (myPlayer && updates[GameUpdateType.Attack]) {
        for (const attack of updates[GameUpdateType.Attack]) {
          if (attack.targetID === myPlayer.smallID()) {
            const attacker = this.game.playerBySmallID(attack.attackerID);
            if (attacker && this.showCountryInfo) {
              this.updateSelectedCountry(attacker);
            }
          }
        }
      }
    }
    
    // Check if we're still in spawn phase
    const currentlyInSpawnPhase = this.game.inSpawnPhase();
    const myPlayer = this.game.myPlayer();
    
    // Update spawn phase status
    if (this.isInSpawnPhase && (!currentlyInSpawnPhase || (myPlayer && myPlayer.isAlive()))) {
      // Show UI when spawn phase ends or when player has spawned and is alive
      this.isInSpawnPhase = false;
      this.isVisible = true;
    } else if (!this.isInSpawnPhase && currentlyInSpawnPhase && !myPlayer) {
      // Hide UI if we're back in spawn phase without a player
      this.isInSpawnPhase = true;
      this.isVisible = false;
    }
    
    if (this.game.inSpawnPhase()) {
      this.timer = 0;
    } else if (!this.hasWinner && this.game.ticks() % 10 === 0) {
      this.timer++;
    }
    
    // Update leaderboard every 10 ticks
    if (this.game.ticks() % 10 === 0) {
      this.updateLeaderboard();
    }
    
    this.requestUpdate();
  }

  private updateLeaderboard() {
    // Sort players by territory owned
    this.topPlayers = this.game.playerViews()
      .filter(player => player.isAlive())
      .sort((a, b) => b.numTilesOwned() - a.numTilesOwned())
      .slice(0, 5);
  }
  
  public updateSelectedCountry(player: any) {
    this.selectedCountry = player;
    this.isCountryLocked = true; // Lock when clicked
    if (!this.showCountryInfo && player) {
      this.showCountryInfo = true;
    }
    this.requestUpdate();
  }
  
  public updateHoveredCountry(player: any) {
    if (!this.isCountryLocked) {
      this.selectedCountry = player;
      this.requestUpdate();
    }
  }

  render() {
    if (!this.isVisible || this.isInSpawnPhase) {
      return html``;
    }
    return html`
      <div
        class="fixed top-2 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto"
        @contextmenu=${(e) => e.preventDefault()}
      >
        <!-- Horizontal Unified Control Panel -->
        <div class="sg-panel p-2 lg:p-3">
          
          <!-- Main Horizontal Control Bar - All in one line -->
          <div class="flex items-center gap-4 lg:gap-6">
            
            <!-- Timer Display -->
            <div class="sg-card px-2 py-1 lg:px-3 lg:py-2 flex items-center justify-center flex-shrink-0">
              <span class="font-mono text-xs lg:text-sm font-bold sg-text-primary">
                ${secondsToHms(this.timer)}
              </span>
            </div>
            
            <!-- All Controls in Center -->
            <div class="flex items-center gap-1 lg:gap-2">
              <!-- Pause/Speed Controls (Singleplayer only) -->
              ${this.showPauseButton ? html`
                ${button({
                  onClick: this.onPauseButtonClick,
                  title: this.isPaused ? "Resume" : "Pause",
                  children: this.isPaused ? "▶" : "⏸",
                  variant: this.isPaused ? "primary" : "default",
                  classes: "sg-button--small p-1 text-[10px]",
                })}
                ${button({
                  onClick: () => this.onSpeedChange(ReplaySpeedMultiplier.normal),
                  title: "Normal Speed",
                  children: "1x",
                  variant: this.currentSpeed === ReplaySpeedMultiplier.normal ? "primary" : "default",
                  classes: "sg-button--small px-1.5 py-1 text-[10px] min-w-0",
                })}
                ${button({
                  onClick: () => this.onSpeedChange(ReplaySpeedMultiplier.fast),
                  title: "Fast Speed", 
                  children: "2x",
                  variant: this.currentSpeed === ReplaySpeedMultiplier.fast ? "primary" : "default",
                  classes: "sg-button--small px-1.5 py-1 text-[10px] min-w-0",
                })}
                ${button({
                  onClick: () => this.onSpeedChange(ReplaySpeedMultiplier.fastest),
                  title: "Very Fast Speed",
                  children: "5x",
                  variant: this.currentSpeed === ReplaySpeedMultiplier.fastest ? "primary" : "default", 
                  classes: "sg-button--small px-1.5 py-1 text-[10px] min-w-0",
                })}
                <div class="w-px h-4 bg-white/20 mx-1"></div>
              ` : ''}
              
              <!-- Resources Toggle -->
              ${this.game?.myPlayer()?.isAlive() ? html`
                ${button({
                  onClick: () => {
                    this.showResources = !this.showResources;
                    this.requestUpdate();
                  },
                  title: "Resources",
                  children: "📊",
                  variant: this.showResources ? "primary" : "default",
                  classes: "sg-button--small p-1 text-sm",
                })}
              ` : ''}
              
              <!-- Leaderboard Toggle -->
              ${button({
                onClick: () => {
                  this.showLeaderboard = !this.showLeaderboard;
                  this.requestUpdate();
                },
                title: "Leaderboard",
                children: "🏆",
                variant: this.showLeaderboard ? "primary" : "default", 
                classes: "sg-button--small p-1 text-sm",
              })}
              
              <!-- Country Info Toggle -->
              ${button({
                onClick: () => {
                  this.showCountryInfo = !this.showCountryInfo;
                  this.requestUpdate();
                },
                title: "Country Info",
                children: "ℹ️",
                variant: this.showCountryInfo ? "primary" : "default", 
                classes: "sg-button--small p-1 text-sm",
              })}
              
              <!-- Settings Toggle -->
              ${button({
                onClick: this.onSettingsButtonClick,
                title: "Settings",
                children: "⚙️",
                variant: this.showSettings ? "primary" : "default",
                classes: "sg-button--small p-1 text-sm",
              })}
            </div>
            
            <!-- Exit Button -->
            ${button({
              onClick: this.onExitButtonClick,
              title: "Exit game",
              children: "❌",
              classes: "sg-button--danger sg-button--small p-1 text-sm flex-shrink-0",
            })}
          </div>
          
          <!-- Resources Panel (Expandable) -->
          ${this.showResources ? html`
            <div class="mt-3 pt-3 border-t border-white/10 flex justify-center">
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center max-w-2xl">
                <div class="sg-card p-2">
                  <div class="sg-text-muted text-xs">Population</div>
                  <div class="sg-text-primary font-bold text-sm">
                    👥 ${renderNumber(this.game.myPlayer()?.population() || 0)}
                  </div>
                </div>
                <div class="sg-card p-2">
                  <div class="sg-text-muted text-xs">Gold</div>
                  <div class="sg-text-primary font-bold text-sm">
                    💰 ${renderNumber(this.game.myPlayer()?.gold() || 0)}
                  </div>
                </div>
                <div class="sg-card p-2">
                  <div class="sg-text-muted text-xs">Troops</div>
                  <div class="sg-text-primary font-bold text-sm">
                    ⚔️ ${renderTroops(this.game.myPlayer()?.troops() || 0)}
                  </div>
                </div>
                <div class="sg-card p-2">
                  <div class="sg-text-muted text-xs">Territory</div>
                  <div class="sg-text-primary font-bold text-sm">
                    🏴 ${renderNumber(this.game.myPlayer()?.numTilesOwned() || 0)}
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- Leaderboard Panel (Expandable) -->
          ${this.showLeaderboard ? html`
            <div class="mt-3 pt-3 border-t border-white/10 flex justify-center">
              <div class="max-h-[40vh] overflow-y-auto max-w-2xl w-full">
                <div class="grid grid-cols-[30px_1fr_60px_50px_50px] sm:grid-cols-[40px_1fr_80px_60px_60px] gap-2 text-xs">
                  <!-- Header -->
                  <div class="sg-text-muted font-semibold text-center">#</div>
                  <div class="sg-text-muted font-semibold">Player</div>
                  <div class="sg-text-muted font-semibold text-center">Territory</div>
                  <div class="sg-text-muted font-semibold text-center">Gold</div>
                  <div class="sg-text-muted font-semibold text-center">Troops</div>
                  
                  <!-- Player Rows -->
                  ${this.topPlayers.map((player, index) => {
                    const isMyPlayer = player === this.game.myPlayer();
                    const numTilesWithoutFallout = this.game.numLandTiles() - this.game.numTilesWithFallout();
                    const territoryPercent = ((player.numTilesOwned() / numTilesWithoutFallout) * 100).toFixed(0);
                    return html`
                      <div class="text-center sg-text-secondary">${index + 1}</div>
                      <div 
                        class="sg-text-primary ${isMyPlayer ? 'font-bold text-green-400' : ''} truncate cursor-pointer hover:text-green-300 flex items-center gap-1"
                        @click=${() => {
                          this.updateSelectedCountry(player);
                          this.eventBus.emit(new GoToPlayerEvent(player));
                        }}
                        title="Click to view ${player.displayName()}"
                      >
                        <!-- Flag -->
                        ${player.flag() ? html`
                          <img class="h-3 w-3 object-cover rounded-[1px] flex-shrink-0" 
                               src="${`/flags/${player.flag()}.svg`}" 
                               alt="${player.displayName()}" />
                        ` : html`<div class="w-3 h-3 bg-gray-600 rounded-[1px] flex-shrink-0"></div>`}
                        <span class="truncate">${player.displayName()}</span>
                      </div>
                      <div class="text-center sg-text-secondary">${territoryPercent}%</div>
                      <div class="text-center sg-text-secondary">${Math.floor(Number(player.gold()) / 1000)}k</div>
                      <div class="text-center sg-text-secondary">${Math.floor(player.troops() / 10)}</div>
                    `;
                  })}
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- Country Info Panel (Expandable) -->
          ${this.showCountryInfo ? html`
            <div class="mt-3 pt-3 border-t border-white/10 flex justify-center">
              ${this.selectedCountry ? html`
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                  <!-- Basic Info -->
                  <div class="sg-card p-3">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        ${this.selectedCountry.flag() ? html`
                          <img class="h-6 w-6 object-cover rounded" 
                               src="${`/flags/${this.selectedCountry.flag()}.svg`}" 
                               alt="${this.selectedCountry.displayName()}" />
                        ` : html`<div class="w-6 h-6 bg-gray-600 rounded"></div>`}
                        <h4 class="sg-text-primary font-bold text-lg">${this.selectedCountry.displayName()}</h4>
                      </div>
                      ${this.isCountryLocked ? html`
                        <button
                          class="sg-button sg-button--small text-xs p-1"
                          @click=${() => {
                            this.isCountryLocked = false;
                            this.requestUpdate();
                          }}
                          title="Unlock to follow hover"
                        >
                          🔒
                        </button>
                      ` : html`
                        <span class="sg-text-muted text-xs">Following hover</span>
                      `}
                    </div>
                    <div class="space-y-1 text-xs">
                      <div class="flex justify-between">
                        <span class="sg-text-muted">Type:</span>
                        <span class="sg-text-secondary">
                          ${this.selectedCountry.type() === 0 ? 'Human' : 
                            this.selectedCountry.type() === 1 ? 'Bot' : 'Nation'}
                        </span>
                      </div>
                      ${this.selectedCountry.team() !== null ? html`
                        <div class="flex justify-between">
                          <span class="sg-text-muted">Team:</span>
                          <span class="sg-text-secondary">${this.selectedCountry.team()}</span>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                  
                  <!-- Stats -->
                  <div class="sg-card p-3">
                    <h5 class="sg-text-primary font-medium text-sm mb-2">Statistics</h5>
                    <div class="space-y-1 text-xs">
                      <div class="flex justify-between">
                        <span class="sg-text-muted">Territory:</span>
                        <span class="sg-text-secondary">${renderNumber(this.selectedCountry.numTilesOwned())} tiles</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="sg-text-muted">Troops:</span>
                        <span class="sg-text-secondary">${renderTroops(this.selectedCountry.troops())}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="sg-text-muted">Gold:</span>
                        <span class="sg-text-secondary">${renderNumber(this.selectedCountry.gold())}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="sg-text-muted">Attacking:</span>
                        <span class="sg-text-secondary">
                          ${renderTroops(this.selectedCountry.outgoingAttacks().reduce((sum, a) => sum + a.troops, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ` : html`
                <div class="text-center py-4 sg-text-muted text-sm">
                  Click on a player in the leaderboard or on the map to view their information
                </div>
              `}
            </div>
          ` : ''}
        </div>

        <!-- Settings Panel (Horizontal Grid) -->
        ${this.showSettings ? html`
          <div class="mt-3 pt-3 border-t border-white/10 flex justify-center">
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-w-3xl w-full">
              <!-- Game Settings in compact cards -->
              <button
                class="sg-card p-2 text-xs lg:text-sm hover:bg-black/20 transition-colors ${this.alternateView ? 'bg-green-600/20 border-green-500/30' : ''}"
                @click=${this.onTerrainButtonClick}
                title="Toggle Terrain View"
              >
                <div class="flex flex-col items-center gap-1">
                  <span class="text-lg">🌲</span>
                  <span class="text-center">Terrain</span>
                  <span class="text-[10px] ${this.alternateView ? 'text-green-400' : 'text-red-400'}">${this.alternateView ? "On" : "Off"}</span>
                </div>
              </button>
              
              <button
                class="sg-card p-2 text-xs lg:text-sm hover:bg-black/20 transition-colors ${this.userSettings.emojis() ? 'bg-green-600/20 border-green-500/30' : ''}"
                @click=${this.onToggleEmojisButtonClick}
                title="Toggle Emojis"
              >
                <div class="flex flex-col items-center gap-1">
                  <span class="text-lg">🙂</span>
                  <span class="text-center">Emojis</span>
                  <span class="text-[10px] ${this.userSettings.emojis() ? 'text-green-400' : 'text-red-400'}">${this.userSettings.emojis() ? "On" : "Off"}</span>
                </div>
              </button>
              
              <button
                class="sg-card p-2 text-xs lg:text-sm hover:bg-black/20 transition-colors ${this.userSettings.fxLayer() ? 'bg-green-600/20 border-green-500/30' : ''}"
                @click=${this.onToggleSpecialEffectsButtonClick}
                title="Toggle Special Effects"
              >
                <div class="flex flex-col items-center gap-1">
                  <span class="text-lg">💥</span>
                  <span class="text-center">Effects</span>
                  <span class="text-[10px] ${this.userSettings.fxLayer() ? 'text-green-400' : 'text-red-400'}">${this.userSettings.fxLayer() ? "On" : "Off"}</span>
                </div>
              </button>
              
              <button
                class="sg-card p-2 text-xs lg:text-sm hover:bg-black/20 transition-colors ${this.userSettings.darkMode() ? 'bg-green-600/20 border-green-500/30' : ''}"
                @click=${this.onToggleDarkModeButtonClick}
                title="Toggle Dark Mode"
              >
                <div class="flex flex-col items-center gap-1">
                  <span class="text-lg">🌙</span>
                  <span class="text-center">Dark Mode</span>
                  <span class="text-[10px] ${this.userSettings.darkMode() ? 'text-green-400' : 'text-red-400'}">${this.userSettings.darkMode() ? "On" : "Off"}</span>
                </div>
              </button>
              
              <button
                class="sg-card p-2 text-xs lg:text-sm hover:bg-black/20 transition-colors ${this.userSettings.anonymousNames() ? 'bg-green-600/20 border-green-500/30' : ''}"
                @click=${this.onToggleRandomNameModeButtonClick}
                title="Anonymous Names"
              >
                <div class="flex flex-col items-center gap-1">
                  <span class="text-lg">🥷</span>
                  <span class="text-center">Anonymous</span>
                  <span class="text-[10px] ${this.userSettings.anonymousNames() ? 'text-green-400' : 'text-red-400'}">${this.userSettings.anonymousNames() ? "On" : "Off"}</span>
                </div>
              </button>
              
              <button
                class="sg-card p-2 text-xs lg:text-sm hover:bg-black/20 transition-colors"
                @click=${this.onToggleLeftClickOpensMenu}
                title="Left Click Behavior"
              >
                <div class="flex flex-col items-center gap-1">
                  <span class="text-lg">🖱️</span>
                  <span class="text-center">Left Click</span>
                  <span class="text-[10px] text-blue-400">${this.userSettings.leftClickOpensMenu() ? "Menu" : "Attack"}</span>
                </div>
              </button>
              
              <button
                class="sg-card p-2 text-xs lg:text-sm hover:bg-black/20 transition-colors ${this.showCountryUI ? 'bg-green-600/20 border-green-500/30' : ''}"
                @click=${() => {
                  this.showCountryUI = !this.showCountryUI;
                  this.requestUpdate();
                }}
                title="Country UI Settings"
              >
                <div class="flex flex-col items-center gap-1">
                  <span class="text-lg">⚙️</span>
                  <span class="text-center">Country UI</span>
                  <span class="text-[10px]">${this.showCountryUI ? '▼' : '▶'}</span>
                </div>
              </button>
            </div>
          </div>
        ` : ''}
        
        <!-- Country UI Settings Panel (Horizontal Grid) -->
        ${this.showCountryUI ? html`
          <div class="mt-3 pt-3 border-t border-white/10 flex justify-center">
            <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-w-4xl w-full">
              ${this.renderUIToggle("🏳️", "Names", this.userSettings.showNationNames(), () => this.userSettings.toggleShowNationNames())}
              ${this.renderUIToggle("👑", "Crown", this.userSettings.showCrowns(), () => this.userSettings.toggleShowCrowns())}
              ${this.renderUIToggle("⚔️", "Troops", this.userSettings.showTroops(), () => this.userSettings.toggleShowTroops())}
              ${this.renderUIToggle("🏴", "Flags", this.userSettings.showFlags(), () => this.userSettings.toggleShowFlags())}
              ${this.renderUIToggle("🤝", "Allies", this.userSettings.showAlliances(), () => this.userSettings.toggleShowAlliances())}
              ${this.renderUIToggle("✉️", "Requests", this.userSettings.showAllianceRequests(), () => this.userSettings.toggleShowAllianceRequests())}
              ${this.renderUIToggle("🎯", "Targets", this.userSettings.showTargets(), () => this.userSettings.toggleShowTargets())}
              ${this.renderUIToggle("🛡️", "Traitors", this.userSettings.showTraitors(), () => this.userSettings.toggleShowTraitors())}
              ${this.renderUIToggle("📵", "Offline", this.userSettings.showDisconnected(), () => this.userSettings.toggleShowDisconnected())}
              ${this.renderUIToggle("🚫", "Embargo", this.userSettings.showEmbargoes(), () => this.userSettings.toggleShowEmbargoes())}
              ${this.renderUIToggle("☢️", "Nukes", this.userSettings.showNukes(), () => this.userSettings.toggleShowNukes())}
              ${this.renderUIToggle("📡", "SAM", this.userSettings.showSAMRadius(), () => this.userSettings.toggleShowSAMRadius())}
            </div>
            
            <div class="flex gap-2 justify-center mt-3 max-w-xs mx-auto">
              <button
                class="sg-button sg-button--small sg-button--success flex-1"
                @click=${() => {
                  this.userSettings.toggleAllCountryUI(true);
                  this.requestUpdate();
                  this.eventBus.emit(new RefreshGraphicsEvent());
                }}
              >
                Show All
              </button>
              <button
                class="sg-button sg-button--small sg-button--danger flex-1"
                @click=${() => {
                  this.userSettings.toggleAllCountryUI(false);
                  this.requestUpdate();
                  this.eventBus.emit(new RefreshGraphicsEvent());
                }}
              >
                Hide All
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}
