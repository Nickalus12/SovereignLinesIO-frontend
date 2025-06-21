import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import warshipIcon from "../../../../resources/images/BattleshipIconWhite.svg";
import cityIcon from "../../../../resources/images/CityIconWhite.svg";
import goldCoinIcon from "../../../../resources/images/GoldCoinIcon.svg";
import mirvIcon from "../../../../resources/images/MIRVIcon.svg";
import missileSiloIcon from "../../../../resources/images/MissileSiloIconWhite.svg";
import hydrogenBombIcon from "../../../../resources/images/MushroomCloudIconWhite.svg";
import atomBombIcon from "../../../../resources/images/NukeIconWhite.svg";
import portIcon from "../../../../resources/images/PortIcon.svg";
import samlauncherIcon from "../../../../resources/images/SamLauncherIconWhite.svg";
import shieldIcon from "../../../../resources/images/ShieldIconWhite.svg";
import supplyTruckIcon from "../../../../resources/images/TransportIcon.svg";
import { translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { Cell, Gold, PlayerActions, UnitType } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameView } from "../../../core/game/GameView";
import { BuildUnitIntentEvent } from "../../Transport";
import { renderNumber } from "../../Utils";
import { Layer } from "./Layer";

export interface BuildItemDisplay {
  unitType: UnitType;
  icon: string;
  description?: string;
  key?: string;
  countable?: boolean;
}

export const buildTable: BuildItemDisplay[][] = [
  [
    {
      unitType: UnitType.AtomBomb,
      icon: atomBombIcon,
      description: "build_menu.desc.atom_bomb",
      key: "unit_type.atom_bomb",
      countable: false,
    },
    {
      unitType: UnitType.MIRV,
      icon: mirvIcon,
      description: "build_menu.desc.mirv",
      key: "unit_type.mirv",
      countable: false,
    },
    {
      unitType: UnitType.HydrogenBomb,
      icon: hydrogenBombIcon,
      description: "build_menu.desc.hydrogen_bomb",
      key: "unit_type.hydrogen_bomb",
      countable: false,
    },
    {
      unitType: UnitType.Warship,
      icon: warshipIcon,
      description: "build_menu.desc.warship",
      key: "unit_type.warship",
      countable: true,
    },
    {
      unitType: UnitType.SupplyTruck,
      icon: supplyTruckIcon,
      description: "build_menu.desc.supply_truck",
      key: "unit_type.supply_truck",
      countable: true,
    },
    {
      unitType: UnitType.Port,
      icon: portIcon,
      description: "build_menu.desc.port",
      key: "unit_type.port",
      countable: true,
    },
    {
      unitType: UnitType.MissileSilo,
      icon: missileSiloIcon,
      description: "build_menu.desc.missile_silo",
      key: "unit_type.missile_silo",
      countable: true,
    },
    // needs new icon
    {
      unitType: UnitType.SAMLauncher,
      icon: samlauncherIcon,
      description: "build_menu.desc.sam_launcher",
      key: "unit_type.sam_launcher",
      countable: true,
    },
    {
      unitType: UnitType.DefensePost,
      icon: shieldIcon,
      description: "build_menu.desc.defense_post",
      key: "unit_type.defense_post",
      countable: true,
    },
    {
      unitType: UnitType.City,
      icon: cityIcon,
      description: "build_menu.desc.city",
      key: "unit_type.city",
      countable: true,
    },
  ],
];

export const flattenedBuildTable = buildTable.flat();

@customElement("build-menu")
export class BuildMenu extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;
  private clickedTile: TileRef;
  public playerActions: PlayerActions | null;
  private filteredBuildTable: BuildItemDisplay[][] = buildTable;

  tick() {
    if (!this._hidden) {
      this.refresh();
    }
  }

  static styles = css`
    :host {
      display: block;
    }
    .build-menu {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background: linear-gradient(135deg, rgba(20, 25, 20, 0.95) 0%, rgba(15, 20, 15, 0.98) 100%);
      border: 1px solid rgba(74, 95, 58, 0.3);
      border-radius: 16px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), 0 0 80px rgba(74, 95, 58, 0.1);
      backdrop-filter: blur(10px);
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 95vw;
      max-height: 95vh;
      overflow-y: auto;
      animation: sg-panel-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .build-menu::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 100px;
      background: radial-gradient(ellipse at top center, rgba(74, 95, 58, 0.15) 0%, transparent 100%);
      pointer-events: none;
    }
    
    @keyframes sg-panel-slide-in {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) translateY(30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) translateY(0) scale(1);
      }
    }
    .build-description {
      font-size: 0.6rem;
    }
    .build-row {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      width: 100%;
    }
    .build-button {
      position: relative;
      width: 130px;
      height: 150px;
      background: linear-gradient(135deg, rgba(30, 35, 45, 0.9) 0%, rgba(25, 30, 40, 0.95) 100%);
      border: 2px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #e0e0e0;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin: 8px;
      padding: 12px;
      gap: 6px;
      overflow: hidden;
    }
    
    .build-button::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 0%, rgba(74, 95, 58, 0.1) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .build-button:not(:disabled):hover {
      transform: translateY(-3px) scale(1.02);
      border-color: rgba(74, 95, 58, 0.4);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(74, 95, 58, 0.1);
      background: linear-gradient(135deg, rgba(74, 95, 58, 0.3) 0%, rgba(74, 95, 58, 0.15) 100%);
    }
    
    .build-button:not(:disabled):hover::before {
      opacity: 1;
    }
    
    .build-button:not(:disabled):active {
      transform: translateY(0) scale(1);
      background: linear-gradient(135deg, rgba(74, 95, 58, 0.15) 0%, rgba(74, 95, 58, 0.1) 100%);
    }
    
    .build-button:disabled {
      background: linear-gradient(135deg, rgba(60, 60, 60, 0.3) 0%, rgba(50, 50, 50, 0.3) 100%);
      border-color: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.3);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    
    .build-button:disabled img {
      opacity: 0.4;
      filter: grayscale(1);
    }
    
    .build-button:disabled .build-cost {
      color: #ff6b6b;
    }
    .build-icon {
      font-size: 40px;
      margin-bottom: 5px;
    }
    .build-name {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
      text-align: center;
      color: #d4e0c4;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }
    .build-cost {
      font-size: 13px;
      font-weight: 500;
      color: #7fa050;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .hidden {
      display: none !important;
    }
    .build-count-chip {
      position: absolute;
      top: -8px;
      right: -8px;
      background: linear-gradient(135deg, #5a7f3a 0%, #4a5f3a 100%);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      transition: all 0.3s ease;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      min-width: 20px;
    }
    
    .build-button:not(:disabled):hover > .build-count-chip {
      background: linear-gradient(135deg, #6a8f4a 0%, #5a7f3a 100%);
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(74, 95, 58, 0.4);
    }
    
    .build-button:disabled > .build-count-chip {
      background: linear-gradient(135deg, rgba(60, 60, 60, 0.5) 0%, rgba(50, 50, 50, 0.5) 100%);
      color: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.1);
    }
    .build-count {
      font-weight: bold;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .build-menu {
        padding: 10px;
        max-height: 80vh;
        width: 80vw;
      }
      .build-button {
        width: 140px;
        height: 120px;
        margin: 4px;
        padding: 6px;
        gap: 5px;
      }
      .build-icon {
        font-size: 28px;
      }
      .build-name {
        font-size: 12px;
        margin-bottom: 3px;
      }
      .build-cost {
        font-size: 11px;
      }
      .build-count {
        font-weight: bold;
        font-size: 10px;
      }
      .build-count-chip {
        padding: 1px 5px;
      }
    }

    @media (max-width: 480px) {
      .build-menu {
        padding: 8px;
        max-height: 70vh;
      }
      .build-button {
        width: calc(50% - 6px);
        height: 100px;
        margin: 3px;
        padding: 4px;
        border-width: 1px;
      }
      .build-icon {
        font-size: 24px;
      }
      .build-name {
        font-size: 10px;
        margin-bottom: 2px;
      }
      .build-cost {
        font-size: 9px;
      }
      .build-count {
        font-weight: bold;
        font-size: 8px;
      }
      .build-count-chip {
        padding: 0 3px;
      }
      .build-button img {
        width: 24px;
        height: 24px;
      }
      .build-cost img {
        width: 10px;
        height: 10px;
      }
    }
  `;

  @state()
  private _hidden = true;

  public canBuild(item: BuildItemDisplay): boolean {
    if (this.game?.myPlayer() === null || this.playerActions === null) {
      return false;
    }
    const buildableUnits = this.playerActions?.buildableUnits ?? [];
    const unit = buildableUnits.filter((u) => u.type === item.unitType);
    if (unit.length === 0) {
      return false;
    }
    return unit[0].canBuild !== false;
  }

  public cost(item: BuildItemDisplay): Gold {
    for (const bu of this.playerActions?.buildableUnits ?? []) {
      if (bu.type === item.unitType) {
        return bu.cost;
      }
    }
    return 0n;
  }

  public count(item: BuildItemDisplay): string {
    const player = this.game?.myPlayer();
    if (!player) {
      return "?";
    }

    return player.units(item.unitType).length.toString();
  }

  public onBuildSelected = (item: BuildItemDisplay) => {
    this.eventBus.emit(
      new BuildUnitIntentEvent(
        item.unitType,
        new Cell(this.game.x(this.clickedTile), this.game.y(this.clickedTile)),
      ),
    );
    this.hideMenu();
  };

  render() {
    return html`
      <div
        class="build-menu ${this._hidden ? "hidden" : ""}"
        @contextmenu=${(e) => e.preventDefault()}
      >
        <!-- Header -->
        <div style="margin-bottom: 20px; text-align: center;">
          <h2 style="color: #d4e0c4; font-size: 24px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);">
            🏗️ Build Menu
          </h2>
          <p style="color: rgba(212, 224, 196, 0.7); font-size: 14px; margin: 0;">
            Select a unit or structure to build
          </p>
        </div>
        ${this.filteredBuildTable.map(
          (row) => html`
            <div class="build-row">
              ${row.map(
                (item) => html`
                  <button
                    class="build-button"
                    @click=${() => this.onBuildSelected(item)}
                    ?disabled=${!this.canBuild(item)}
                    title=${!this.canBuild(item)
                      ? translateText("build_menu.not_enough_money")
                      : ""}
                  >
                    <img
                      src=${item.icon}
                      alt="${item.unitType}"
                      width="40"
                      height="40"
                    />
                    <span class="build-name"
                      >${item.key && translateText(item.key)}</span
                    >
                    <span class="build-description"
                      >${item.description &&
                      translateText(item.description)}</span
                    >
                    <span class="build-cost" translate="no">
                      ${renderNumber(
                        this.game && this.game.myPlayer() ? this.cost(item) : 0,
                      )}
                      <img
                        src=${goldCoinIcon}
                        alt="gold"
                        width="12"
                        height="12"
                        style="vertical-align: middle;"
                      />
                    </span>
                    ${item.countable
                      ? html`<div class="build-count-chip">
                          <span class="build-count">${this.count(item)}</span>
                        </div>`
                      : ""}
                  </button>
                `,
              )}
            </div>
          `,
        )}
      </div>
    `;
  }

  hideMenu() {
    this._hidden = true;
    this.requestUpdate();
  }

  showMenu(clickedTile: TileRef) {
    this.clickedTile = clickedTile;
    this._hidden = false;
    this.refresh();
  }

  private refresh() {
    this.game
      .myPlayer()
      ?.actions(this.clickedTile)
      .then((actions) => {
        this.playerActions = actions;
        this.requestUpdate();
      });

    // removed disabled buildings from the buildtable
    this.filteredBuildTable = this.getBuildableUnits();
  }

  private getBuildableUnits(): BuildItemDisplay[][] {
    return buildTable.map((row) =>
      row.filter((item) => !this.game?.config()?.isUnitDisabled(item.unitType)),
    );
  }

  get isVisible() {
    return !this._hidden;
  }
}
