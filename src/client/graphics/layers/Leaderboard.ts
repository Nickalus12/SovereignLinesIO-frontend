import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../../../client/Utils";
import { EventBus, GameEvent } from "../../../core/EventBus";
import { GameView, PlayerView, UnitView } from "../../../core/game/GameView";
import { renderNumber } from "../../Utils";
import { Layer } from "./Layer";

interface Entry {
  name: string;
  position: number;
  score: string;
  gold: string;
  troops: string;
  isMyPlayer: boolean;
  player: PlayerView;
}

export class GoToPlayerEvent implements GameEvent {
  constructor(public player: PlayerView) {}
}

export class GoToPositionEvent implements GameEvent {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

export class GoToUnitEvent implements GameEvent {
  constructor(public unit: UnitView) {}
}

@customElement("leader-board")
export class Leaderboard extends LitElement implements Layer {
  public game: GameView | null = null;
  public eventBus: EventBus | null = null;

  players: Entry[] = [];

  @state()
  private _leaderboardHidden = true;
  private _shownOnInit = false;
  private showTopFive = true;

  @state()
  private _sortKey: "tiles" | "gold" | "troops" = "tiles";

  @state()
  private _sortOrder: "asc" | "desc" = "desc";

  init() {}

  tick() {
    // Always hide standalone leaderboard since it's integrated into unified control panel
    this._leaderboardHidden = true;
    return;

    if (this.game.ticks() % 10 === 0) {
      this.updateLeaderboard();
    }
  }

  private setSort(key: "tiles" | "gold" | "troops") {
    if (this._sortKey === key) {
      this._sortOrder = this._sortOrder === "asc" ? "desc" : "asc";
    } else {
      this._sortKey = key;
      this._sortOrder = "desc";
    }
    this.updateLeaderboard();
  }

  private updateLeaderboard() {
    if (this.game === null) throw new Error("Not initialized");
    const myPlayer = this.game.myPlayer();

    let sorted = this.game.playerViews();

    const compare = (a: number, b: number) =>
      this._sortOrder === "asc" ? a - b : b - a;

    switch (this._sortKey) {
      case "gold":
        sorted = sorted.sort((a, b) =>
          compare(Number(a.gold()), Number(b.gold())),
        );
        break;
      case "troops":
        sorted = sorted.sort((a, b) => compare(a.troops(), b.troops()));
        break;
      default:
        sorted = sorted.sort((a, b) =>
          compare(a.numTilesOwned(), b.numTilesOwned()),
        );
    }

    const numTilesWithoutFallout =
      this.game.numLandTiles() - this.game.numTilesWithFallout();

    const playersToShow = this.showTopFive ? sorted.slice(0, 5) : sorted;

    this.players = playersToShow.map((player, index) => {
      let troops = player.troops() / 10;
      if (!player.isAlive()) {
        troops = 0;
      }
      return {
        name: player.displayName(),
        position: index + 1,
        score: formatPercentage(
          player.numTilesOwned() / numTilesWithoutFallout,
        ),
        gold: renderNumber(player.gold()),
        troops: renderNumber(troops),
        isMyPlayer: player === myPlayer,
        player: player,
      };
    });

    if (
      myPlayer !== null &&
      this.players.find((p) => p.isMyPlayer) === undefined
    ) {
      let place = 0;
      for (const p of sorted) {
        place++;
        if (p === myPlayer) {
          break;
        }
      }

      let myPlayerTroops = myPlayer.troops() / 10;
      if (!myPlayer.isAlive()) {
        myPlayerTroops = 0;
      }
      this.players.pop();
      this.players.push({
        name: myPlayer.displayName(),
        position: place,
        score: formatPercentage(
          myPlayer.numTilesOwned() / this.game.numLandTiles(),
        ),
        gold: renderNumber(myPlayer.gold()),
        troops: renderNumber(myPlayerTroops),
        isMyPlayer: true,
        player: myPlayer,
      });
    }

    this.requestUpdate();
  }

  private handleRowClickPlayer(player: PlayerView) {
    if (this.eventBus === null) return;
    this.eventBus.emit(new GoToPlayerEvent(player));
  }

  renderLayer(context: CanvasRenderingContext2D) {}
  shouldTransform(): boolean {
    return false;
  }

  static styles = css`
    :host {
      display: block;
    }
    img.emoji {
      height: 1em;
      width: auto;
    }
    .leaderboard {
      position: fixed;
      top: 120px;
      left: 10px;
      z-index: 9997;
      background: linear-gradient(135deg, rgba(20, 25, 20, 0.95) 0%, rgba(15, 20, 15, 0.98) 100%);
      border: 1px solid rgba(74, 95, 58, 0.3);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(74, 95, 58, 0.1);
      backdrop-filter: blur(10px);
      padding: 16px;
      max-width: 500px;
      max-height: 40vh;
      overflow-y: auto;
      animation: sg-panel-slide-in 0.3s ease-out;
    }
    
    .leaderboard::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: radial-gradient(ellipse at top center, rgba(74, 95, 58, 0.15) 0%, transparent 100%);
      pointer-events: none;
      border-radius: 16px 16px 0 0;
    }
    
    @keyframes sg-panel-slide-in {
      from {
        opacity: 0;
        transform: translateX(-30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    .hidden {
      display: none !important;
    }
    .leaderboard__grid {
      display: grid;
      grid-template-columns: 40px 100px 85px 65px 65px;
      width: 100%;
      font-size: 14px;
    }

    .leaderboard__button {
      position: fixed;
      left: 10px;
      top: 120px;
      z-index: 9997;
      background: linear-gradient(135deg, rgba(74, 95, 58, 0.8) 0%, rgba(74, 95, 58, 0.6) 100%);
      border: 1px solid rgba(74, 95, 58, 0.5);
      border-radius: 8px;
      color: #d4e0c4;
      font-weight: 500;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .leaderboard__button:hover {
      background: linear-gradient(135deg, rgba(74, 95, 58, 0.9) 0%, rgba(74, 95, 58, 0.7) 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(74, 95, 58, 0.3);
    }

    .leaderboard__actionButton {
      background: linear-gradient(135deg, rgba(30, 35, 45, 0.8) 0%, rgba(25, 30, 40, 0.8) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #d4e0c4;
      padding: 6px 12px;
      margin: 0 4px 8px 0;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    
    .leaderboard__actionButton:hover {
      background: linear-gradient(135deg, rgba(74, 95, 58, 0.3) 0%, rgba(74, 95, 58, 0.15) 100%);
      border-color: rgba(74, 95, 58, 0.4);
      transform: translateY(-1px);
    }

    .leaderboard__row {
      display: contents;

      > div {
        display: flex;
        justify-content: center;
        text-align: center;
        align-items: center;
        padding: 8px 6px;
        border-bottom: 1px solid rgba(74, 95, 58, 0.2);
        color: #e0e0e0;
        transition: all 0.2s ease;
        position: relative;
      }

      &:hover {
        > div {
          background: rgba(74, 95, 58, 0.15);
          color: #d4e0c4;
        }
      }
    }
    
    .leaderboard__row--header {
      > div {
        background: linear-gradient(135deg, rgba(74, 95, 58, 0.2) 0%, rgba(74, 95, 58, 0.1) 100%);
        font-weight: 600;
        color: #d4e0c4;
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.5px;
        border-bottom: 2px solid rgba(74, 95, 58, 0.3);
        cursor: pointer;
      }
      
      > div:hover {
        background: linear-gradient(135deg, rgba(74, 95, 58, 0.3) 0%, rgba(74, 95, 58, 0.15) 100%);
      }
    }

    .myPlayer > div {
      font-weight: 600;
      color: #7fa050;
      background: rgba(127, 160, 80, 0.1);
      border-left: 3px solid #7fa050;
    }

    .player-name {
      max-width: 10ch;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (min-width: 980px) {
      .player-name {
        max-width: 14ch;
      }
      .leaderboard {
        top: 10px;
        left: 10px;
      }

      .leaderboard__button {
        left: 10px;
        top: 10px;
      }
    }
    @media (min-width: 1336px) {
      .leaderboard__grid {
        grid-template-columns: 60px 120px 105px 85px 85px;
        font-size: 16px;
      }
    }
  `;

  render() {
    return html`
      <button
        @click=${() => this.toggleLeaderboard()}
        class="leaderboard__button ${this._shownOnInit &&
        this._leaderboardHidden
          ? ""
          : "hidden"}"
      >
        ${translateText("leaderboard.title")}
      </button>
      <div
        class="leaderboard ${this._leaderboardHidden ? "hidden" : ""}"
        @contextmenu=${(e) => e.preventDefault()}
      >
        <button
          class="leaderboard__actionButton"
          @click=${() => this.hideLeaderboard()}
        >
          ${translateText("leaderboard.hide")}
        </button>
        <button
          class="leaderboard__actionButton"
          @click=${() => {
            this.showTopFive = !this.showTopFive;
            this.updateLeaderboard();
          }}
        >
          ${this.showTopFive ? "Show All" : "Show Top 5"}
        </button>
        <div class="leaderboard__grid">
          <div class="leaderboard__row leaderboard__row--header">
            <div>#</div>
            <div>${translateText("leaderboard.player")}</div>
            <div @click=${() => this.setSort("tiles")}>
              ${translateText("leaderboard.owned")}
              ${this._sortKey === "tiles"
                ? this._sortOrder === "asc"
                  ? "⬆️"
                  : "⬇️"
                : ""}
            </div>
            <div @click=${() => this.setSort("gold")}>
              ${translateText("leaderboard.gold")}
              ${this._sortKey === "gold"
                ? this._sortOrder === "asc"
                  ? "⬆️"
                  : "⬇️"
                : ""}
            </div>
            <div @click=${() => this.setSort("troops")}>
              ${translateText("leaderboard.troops")}
              ${this._sortKey === "troops"
                ? this._sortOrder === "asc"
                  ? "⬆️"
                  : "⬇️"
                : ""}
            </div>
          </div>
          ${this.players.map(
            (player) => html`
              <div
                class="leaderboard__row ${player.isMyPlayer
                  ? "myPlayer"
                  : "otherPlayer"}"
                @click=${() => this.handleRowClickPlayer(player.player)}
              >
                <div>${player.position}</div>
                <div class="player-name">${player.name}</div>
                <div>${player.score}</div>
                <div>${player.gold}</div>
                <div>${player.troops}</div>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  toggleLeaderboard() {
    this._leaderboardHidden = !this._leaderboardHidden;
    this.requestUpdate();
  }

  hideLeaderboard() {
    this._leaderboardHidden = true;
    this.requestUpdate();
  }

  showLeaderboard() {
    this._leaderboardHidden = false;
    this.requestUpdate();
  }

  get isVisible() {
    return !this._leaderboardHidden;
  }
  
  set isVisible(value: boolean) {
    this._leaderboardHidden = !value;
    this.requestUpdate();
  }
}

function formatPercentage(value: number): string {
  const perc = value * 100;
  if (perc > 99.5) {
    return "100%";
  }
  if (perc < 0.01) {
    return "0%";
  }
  if (perc < 0.1) {
    return perc.toPrecision(1) + "%";
  }
  return perc.toPrecision(2) + "%";
}
