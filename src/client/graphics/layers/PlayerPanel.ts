import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import allianceIcon from "../../../../resources/images/AllianceIconWhite.svg";
import chatIcon from "../../../../resources/images/ChatIconWhite.svg";
import donateGoldIcon from "../../../../resources/images/DonateGoldIconWhite.svg";
import donateTroopIcon from "../../../../resources/images/DonateTroopIconWhite.svg";
import emojiIcon from "../../../../resources/images/EmojiIconWhite.svg";
import targetIcon from "../../../../resources/images/TargetIconWhite.svg";
import traitorIcon from "../../../../resources/images/TraitorIconWhite.svg";
import { translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { AllPlayers, PlayerActions } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameView, PlayerView } from "../../../core/game/GameView";
import { flattenedEmojiTable } from "../../../core/Util";
import { MouseUpEvent } from "../../InputHandler";
import {
  SendAllianceRequestIntentEvent,
  SendBreakAllianceIntentEvent,
  SendDonateGoldIntentEvent,
  SendDonateTroopsIntentEvent,
  SendEmbargoIntentEvent,
  SendEmojiIntentEvent,
  SendTargetPlayerIntentEvent,
} from "../../Transport";
import { renderNumber, renderTroops } from "../../Utils";
import { UIState } from "../UIState";
import { ChatModal } from "./ChatModal";
import { EmojiTable } from "./EmojiTable";
import { Layer } from "./Layer";

@customElement("player-panel")
export class PlayerPanel extends LitElement implements Layer {
  public g: GameView;
  public eventBus: EventBus;
  public emojiTable: EmojiTable;
  public uiState: UIState;

  private actions: PlayerActions | null = null;
  private tile: TileRef | null = null;

  @state()
  public isVisible: boolean = false;

  @state()
  private allianceExpiryText: string | null = null;

  public show(actions: PlayerActions, tile: TileRef) {
    this.actions = actions;
    this.tile = tile;
    this.isVisible = true;
    this.requestUpdate();
  }

  public hide() {
    this.isVisible = false;
    this.requestUpdate();
  }

  private handleClose(e: Event) {
    e.stopPropagation();
    this.hide();
  }

  private handleAllianceClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(new SendAllianceRequestIntentEvent(myPlayer, other));
    this.hide();
  }

  private handleBreakAllianceClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(new SendBreakAllianceIntentEvent(myPlayer, other));
    this.hide();
  }

  private handleDonateTroopClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(
      new SendDonateTroopsIntentEvent(
        other,
        myPlayer.troops() * this.uiState.attackRatio,
      ),
    );
    this.hide();
  }

  private handleDonateGoldClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(new SendDonateGoldIntentEvent(other, null));
    this.hide();
  }

  private handleEmbargoClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(new SendEmbargoIntentEvent(other, "start"));
    this.hide();
  }

  private handleStopEmbargoClick(
    e: Event,
    myPlayer: PlayerView,
    other: PlayerView,
  ) {
    e.stopPropagation();
    this.eventBus.emit(new SendEmbargoIntentEvent(other, "stop"));
    this.hide();
  }

  private handleEmojiClick(e: Event, myPlayer: PlayerView, other: PlayerView) {
    e.stopPropagation();
    this.emojiTable.showTable((emoji: string) => {
      if (myPlayer === other) {
        this.eventBus.emit(
          new SendEmojiIntentEvent(
            AllPlayers,
            flattenedEmojiTable.indexOf(emoji),
          ),
        );
      } else {
        this.eventBus.emit(
          new SendEmojiIntentEvent(other, flattenedEmojiTable.indexOf(emoji)),
        );
      }
      this.emojiTable.hideTable();
      this.hide();
    });
  }

  private handleChat(e: Event, sender: PlayerView, other: PlayerView) {
    this.ctModal.open(sender, other);
    this.hide();
  }

  private handleTargetClick(e: Event, other: PlayerView) {
    e.stopPropagation();
    this.eventBus.emit(new SendTargetPlayerIntentEvent(other.id()));
    this.hide();
  }

  createRenderRoot() {
    return this;
  }

  private ctModal;

  init() {
    this.eventBus.on(MouseUpEvent, (e: MouseEvent) => this.hide());

    this.ctModal = document.querySelector("chat-modal") as ChatModal;
  }

  async tick() {
    if (this.isVisible && this.tile) {
      const myPlayer = this.g.myPlayer();
      if (myPlayer !== null && myPlayer.isAlive()) {
        this.actions = await myPlayer.actions(this.tile);

        if (this.actions?.interaction?.allianceCreatedAtTick !== undefined) {
          const createdAt = this.actions.interaction.allianceCreatedAtTick;
          const durationTicks = this.g.config().allianceDuration();
          const expiryTick = createdAt + durationTicks;
          const remainingTicks = expiryTick - this.g.ticks();

          if (remainingTicks > 0) {
            const remainingSeconds = Math.max(
              0,
              Math.floor(remainingTicks / 10),
            ); // 10 ticks per second
            this.allianceExpiryText = this.formatDuration(remainingSeconds);
          }
        } else {
          this.allianceExpiryText = null;
        }
        this.requestUpdate();
      }
    }
  }

  private formatDuration(totalSeconds: number): string {
    if (totalSeconds <= 0) return "0s";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    let time = "";
    if (minutes > 0) time += `${minutes}m `;
    time += `${seconds}s`;
    return time.trim();
  }

  private renderTraitorTimer(player: PlayerView) {
    // Calculate remaining traitor time
    const traitorDuration = this.g.config().traitorDuration();
    const currentTick = this.g.ticks();
    const playerData = this.g.allPlayers().get(player.id());
    
    if (!playerData || !playerData.isTraitor) return html``;
    
    // We need to estimate when they became a traitor based on the game state
    // For now, show the defense debuff percentage
    const debuffPercent = Math.round((1 - this.g.config().traitorDefenseDebuff()) * 100);
    
    return html`
      <span class="text-sm text-yellow-200">
        -${debuffPercent}% defense
      </span>
    `;
  }

  render() {
    if (!this.isVisible) {
      return html``;
    }
    const myPlayer = this.g.myPlayer();
    if (myPlayer === null) return;
    if (this.tile === null) return;
    let other = this.g.owner(this.tile);
    if (!other.isPlayer()) {
      this.hide();
      console.warn("Tile is not owned by a player");
      return;
    }
    other = other as PlayerView;

    const canDonate = this.actions?.interaction?.canDonate;
    const canSendAllianceRequest =
      this.actions?.interaction?.canSendAllianceRequest;
    const canSendEmoji =
      other === myPlayer
        ? this.actions?.canSendEmojiAllPlayers
        : this.actions?.interaction?.canSendEmoji;
    const canBreakAlliance = this.actions?.interaction?.canBreakAlliance;
    const canTarget = this.actions?.interaction?.canTarget;
    const canEmbargo = this.actions?.interaction?.canEmbargo;

    return html`
      <div
        class="sg-modal-backdrop flex items-center justify-center overflow-auto"
        @contextmenu=${(e) => e.preventDefault()}
        @wheel=${(e) => e.stopPropagation()}
      >
        <div
          class="sg-panel pointer-events-auto max-h-[90vh] overflow-y-auto sg-scrollable min-w-[320px] w-auto m-4"
        >
          <!-- Close button -->
          <button
            @click=${this.handleClose}
            class="sg-button--close"
            style="top: 1rem; right: 1rem; transform: none;"
          >
            ✕
          </button>

          <!-- Header -->
          <div class="sg-panel-header">
            <h2 class="sg-panel-title">${other?.name()}</h2>
          </div>
          
          <!-- Content -->
          <div class="sg-panel-content">
            <div class="flex flex-col gap-4">
              <!-- Resources section -->
              <div class="sg-grid sg-grid--2 gap-3">
                <div class="sg-card p-3 text-center">
                  <div class="sg-text-muted text-sm mb-2">
                    ${translateText("player_panel.gold")}
                  </div>
                  <div class="sg-text-primary font-bold text-lg" translate="no">
                    💰 ${renderNumber(other.gold() || 0)}
                  </div>
                </div>
                <div class="sg-card p-3 text-center">
                  <div class="sg-text-muted text-sm mb-2">
                    ${translateText("player_panel.troops")}
                  </div>
                  <div class="sg-text-primary font-bold text-lg" translate="no">
                    ⚔️ ${renderTroops(other.troops() || 0)}
                  </div>
                </div>
              </div>

              <!-- Status Cards -->
              <div class="sg-grid sg-grid--2 gap-3">
                <!-- Traitor Status -->
                <div class="sg-card p-3 ${other.isTraitor() ? 'border-red-500 bg-red-900/20' : ''}">
                  <div class="sg-text-muted text-sm mb-2">
                    ${translateText("player_panel.traitor")}
                  </div>
                  <div class="sg-text-primary">
                    ${other.isTraitor()
                      ? html`
                          <div class="flex flex-col gap-1">
                            <span class="font-bold text-red-400">⚠️ ${translateText("player_panel.yes")}</span>
                            ${this.renderTraitorTimer(other)}
                          </div>
                        `
                      : html`<span class="text-green-400">✅ ${translateText("player_panel.no")}</span>`}
                  </div>
                </div>

                <!-- Betrayals -->
                <div class="sg-card p-3 text-center">
                  <div class="sg-text-muted text-sm mb-2">
                    ${translateText("player_panel.betrayals")}
                  </div>
                  <div class="sg-text-primary font-bold text-lg">
                    🗡️ ${other.data.betrayals ?? 0}
                  </div>
                </div>
              </div>

              <!-- Embargo Status -->
              <div class="sg-card p-3">
                <div class="sg-text-muted text-sm mb-2">
                  ${translateText("player_panel.embargo")}
                </div>
                <div class="sg-text-primary">
                  ${other.hasEmbargoAgainst(myPlayer)
                    ? html`<span class="text-red-400">🚫 ${translateText("player_panel.yes")}</span>`
                    : html`<span class="text-green-400">✅ ${translateText("player_panel.no")}</span>`}
                </div>
              </div>

              <!-- Alliances -->
              <div class="sg-card p-3">
                <div class="sg-text-muted text-sm mb-2">
                  ${translateText("player_panel.alliances")} (${other.allies().length})
                </div>
                <div class="sg-text-primary max-h-20 overflow-y-auto sg-scrollable" translate="no">
                  ${other.allies().length > 0
                    ? html`
                        <div class="flex flex-wrap gap-1">
                          ${other.allies().map(p => html`
                            <span class="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm">
                              🤝 ${p.name()}
                            </span>
                          `)}
                        </div>
                      `
                    : html`<span class="text-gray-400">🔹 ${translateText("player_panel.none")}</span>`}
                </div>
              </div>

              <!-- Alliance Timer -->
              ${this.allianceExpiryText !== null
                ? html`
                    <div class="sg-card p-3 border-blue-500 bg-blue-900/20">
                      <div class="sg-text-muted text-sm mb-2">
                        ${translateText("player_panel.alliance_time_remaining")}
                      </div>
                      <div class="sg-text-primary font-bold">
                        ⏰ ${this.allianceExpiryText}
                      </div>
                    </div>
                  `
                : ""}

              <!-- Action Buttons -->
              <div class="flex flex-wrap justify-center gap-2">
                <!-- Chat -->
                <button
                  @click=${(e) => this.handleChat(e, myPlayer, other)}
                  class="sg-button sg-button--small p-3"
                  title="Chat"
                >
                  <img src=${chatIcon} alt="Chat" class="w-6 h-6" />
                </button>
                
                <!-- Target -->
                ${canTarget
                  ? html`<button
                      @click=${(e) => this.handleTargetClick(e, other)}
                      class="sg-button sg-button--small sg-button--danger p-3"
                      title="Target"
                    >
                      <img src=${targetIcon} alt="Target" class="w-6 h-6" />
                    </button>`
                  : ""}
                
                <!-- Break Alliance -->
                ${canBreakAlliance
                  ? html`<button
                      @click=${(e) => this.handleBreakAllianceClick(e, myPlayer, other)}
                      class="sg-button sg-button--small sg-button--danger p-3"
                      title="Break Alliance"
                    >
                      <img src=${traitorIcon} alt="Break Alliance" class="w-6 h-6" />
                    </button>`
                  : ""}
                
                <!-- Send Alliance -->
                ${canSendAllianceRequest
                  ? html`<button
                      @click=${(e) => this.handleAllianceClick(e, myPlayer, other)}
                      class="sg-button sg-button--small sg-button--success p-3"
                      title="Send Alliance"
                    >
                      <img src=${allianceIcon} alt="Alliance" class="w-6 h-6" />
                    </button>`
                  : ""}
                
                <!-- Donate Troops -->
                ${canDonate
                  ? html`<button
                      @click=${(e) => this.handleDonateTroopClick(e, myPlayer, other)}
                      class="sg-button sg-button--small sg-button--primary p-3"
                      title="Donate Troops"
                    >
                      <img src=${donateTroopIcon} alt="Donate Troops" class="w-6 h-6" />
                    </button>`
                  : ""}
                
                <!-- Donate Gold -->
                ${canDonate
                  ? html`<button
                      @click=${(e) => this.handleDonateGoldClick(e, myPlayer, other)}
                      class="sg-button sg-button--small sg-button--primary p-3"
                      title="Donate Gold"
                    >
                      <img src=${donateGoldIcon} alt="Donate Gold" class="w-6 h-6" />
                    </button>`
                  : ""}
                
                <!-- Send Emoji -->
                ${canSendEmoji
                  ? html`<button
                      @click=${(e) => this.handleEmojiClick(e, myPlayer, other)}
                      class="sg-button sg-button--small p-3"
                      title="Send Emoji"
                    >
                      <img src=${emojiIcon} alt="Emoji" class="w-6 h-6" />
                    </button>`
                  : ""}
              </div>
              
              <!-- Trade Controls -->
              ${other !== myPlayer ? html`
                <div class="mt-2">
                  ${canEmbargo
                    ? html`<button
                        @click=${(e) => this.handleEmbargoClick(e, myPlayer, other)}
                        class="sg-button sg-button--danger w-full"
                      >
                        🚫 ${translateText("player_panel.stop_trade")}
                      </button>`
                    : html`<button
                        @click=${(e) => this.handleStopEmbargoClick(e, myPlayer, other)}
                        class="sg-button sg-button--success w-full"
                      >
                        ✅ ${translateText("player_panel.start_trade")}
                      </button>`}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
