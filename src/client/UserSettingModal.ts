import { LitElement, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import { translationManager } from "../client/TranslationManager";
import { UserSettings } from "../core/game/UserSettings";
import "./components/baseComponents/setting/SettingKeybind";
import { SettingKeybind } from "./components/baseComponents/setting/SettingKeybind";
import "./components/baseComponents/setting/SettingNumber";
import "./components/baseComponents/setting/SettingSlider";
import "./components/baseComponents/setting/SettingToggle";
import "./LanguageModal";

@customElement("user-setting")
export class UserSettingModal extends LitElement {
  private userSettings: UserSettings = new UserSettings();

  @state() private settingsMode: "basic" | "keybinds" = "basic";
  @state() private keybinds: Record<string, string> = {};

  @state() private keySequence: string[] = [];
  @state() private showEasterEggSettings = false;
  @state() private showLanguageModal = false;
  @state() private currentLang = localStorage.getItem("lang") || "en";
  @state() private languageList: any[] = [];
  @state() private countryUIExpanded = false;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);

    const savedKeybinds = localStorage.getItem("settings.keybinds");
    if (savedKeybinds) {
      try {
        this.keybinds = JSON.parse(savedKeybinds);
      } catch (e) {
        console.warn("Invalid keybinds JSON:", e);
      }
    }

    // Initialize language data
    this.initializeLanguageData();
  }

  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
    isModalOpen: boolean;
  };

  createRenderRoot() {
    return this;
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeyDown);
    super.disconnectedCallback();
    document.body.style.overflow = "auto";
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.modalEl?.isModalOpen || this.showEasterEggSettings) return;

    const key = e.key.toLowerCase();
    const nextSequence = [...this.keySequence, key].slice(-4);
    this.keySequence = nextSequence;

    if (nextSequence.join("") === "evan") {
      this.triggerEasterEgg();
      this.keySequence = [];
    }
  };

  private triggerEasterEgg() {
    console.log("🪺 Setting~ unlocked by EVAN combo!");
    this.showEasterEggSettings = true;
    const popup = document.createElement("div");
    popup.className = "easter-egg-popup";
    popup.textContent = "🎉 You found a secret setting!";
    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 5000);
  }

  toggleDarkMode(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;

    if (typeof enabled !== "boolean") {
      console.warn("Unexpected toggle event payload", e);
      return;
    }

    this.userSettings.set("settings.darkMode", enabled);

    if (enabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    console.log("🌙 Dark Mode:", enabled ? "ON" : "OFF");
  }

  private toggleEmojis(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.emojis", enabled);

    console.log("🤡 Emojis:", enabled ? "ON" : "OFF");
  }

  private toggleFxLayer(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.specialEffects", enabled);

    console.log("💥 Special effects:", enabled ? "ON" : "OFF");
  }

  private toggleAnonymousNames(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.anonymousNames", enabled);

    console.log("🙈 Anonymous Names:", enabled ? "ON" : "OFF");
  }

  private toggleHideNationNames(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.hideNationNames", enabled);
    document.dispatchEvent(new CustomEvent("country-ui-settings-changed"));

    console.log("🏳️ Hide Nation Names:", enabled ? "ON" : "OFF");
  }

  private toggleHideCrowns(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.hideCrowns", enabled);
    document.dispatchEvent(new CustomEvent("country-ui-settings-changed"));

    console.log("👑 Hide Crowns:", enabled ? "ON" : "OFF");
  }

  private toggleLeftClickOpensMenu(e: CustomEvent<{ checked: boolean }>) {
    const enabled = e.detail?.checked;
    if (typeof enabled !== "boolean") return;

    this.userSettings.set("settings.leftClickOpensMenu", enabled);
    console.log("🖱️ Left Click Opens Menu:", enabled ? "ON" : "OFF");

    this.requestUpdate();
  }

  private sliderAttackRatio(e: CustomEvent<{ value: number }>) {
    const value = e.detail?.value;
    if (typeof value === "number") {
      const ratio = value / 100;
      localStorage.setItem("settings.attackRatio", ratio.toString());
    } else {
      console.warn("Slider event missing detail.value", e);
    }
  }

  private sliderTroopRatio(e: CustomEvent<{ value: number }>) {
    const value = e.detail?.value;
    if (typeof value === "number") {
      const ratio = value / 100;
      localStorage.setItem("settings.troopRatio", ratio.toString());
    } else {
      console.warn("Slider event missing detail.value", e);
    }
  }

  private handleKeybindChange(
    e: CustomEvent<{ action: string; value: string }>,
  ) {
    const { action, value } = e.detail;
    const prevValue = this.keybinds[action] ?? "";

    const values = Object.entries(this.keybinds)
      .filter(([k]) => k !== action)
      .map(([, v]) => v);
    if (values.includes(value) && value !== "Null") {
      const popup = document.createElement("div");
      popup.className = "setting-popup";
      popup.textContent = `The key "${value}" is already assigned to another action.`;
      document.body.appendChild(popup);
      const element = this.renderRoot.querySelector(
        `setting-keybind[action="${action}"]`,
      ) as SettingKeybind;
      if (element) {
        element.value = prevValue;
        element.requestUpdate();
      }
      return;
    }
    this.keybinds = { ...this.keybinds, [action]: value };
    localStorage.setItem("settings.keybinds", JSON.stringify(this.keybinds));
  }

  private async initializeLanguageData() {
    // Get current language from translation manager
    this.currentLang = translationManager.getCurrentLanguage();
    
    // Build language list using translation manager
    const availableLanguages = translationManager.getAvailableLanguages();
    this.languageList = availableLanguages.map(code => {
      const langData = translationManager.getLanguageData(code);
      const langInfo = langData?.lang || {};
      return {
        code: code,
        name: langInfo.lang_name || langInfo.en || code,
        nativeName: langInfo.lang_native || langInfo.native || langInfo.lang_name || code,
        en: langInfo.en || code,
        native: langInfo.native || langInfo.lang_native || code,
        svg: langInfo.svg || 'xx'
      };
    });
  }

  private getCurrentLanguageDisplay(): string {
    const currentLangData = this.languageList.find(
      (lang) => lang.code === this.currentLang
    );
    if (currentLangData) {
      return `${currentLangData.nativeName} (${currentLangData.name})`;
    }
    return "English";
  }

  private async openLanguageModal() {
    // Ensure language data is loaded before opening
    if (this.languageList.length === 0) {
      await this.initializeLanguageData();
    }
    this.showLanguageModal = true;
    this.requestUpdate();
  }

  private async handleLanguageSelected(e: CustomEvent) {
    const newLang = e.detail.lang;
    this.currentLang = newLang;
    await translationManager.setLanguage(newLang);
    this.showLanguageModal = false;
    
    // Reload the page to apply the new language
    // This is the simplest way to ensure all components get the new translations
    window.location.reload();
  }
  
  private renderUIToggle(icon: string, label: string, enabled: boolean, onClick: () => void) {
    return html`
      <button
        class="ui-toggle-btn ${enabled ? 'enabled' : 'disabled'}"
        @click=${() => {
          onClick();
          this.requestUpdate();
          document.dispatchEvent(new CustomEvent("country-ui-settings-changed"));
        }}
        title="${label}"
      >
        <span class="icon">${icon}</span>
        <span class="label">${label}</span>
      </button>
    `;
  }

  render() {
    return html`
      <style>
        .country-ui-container {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          margin-top: 8px;
        }
        .country-ui-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
        }
        .ui-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .ui-toggle-btn.enabled {
          background-color: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.4);
          color: #86efac;
        }
        .ui-toggle-btn.disabled {
          background-color: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }
        .ui-toggle-btn:hover {
          transform: scale(1.05);
        }
        .ui-toggle-btn .icon {
          font-size: 16px;
        }
        .ui-toggle-btn .label {
          font-size: 11px;
        }
      </style>
      <o-modal title="${translateText("user_setting.title")}">
        <div class="modal-overlay">
          <div class="modal-content user-setting-modal">
            <div class="flex mb-4 w-full justify-center">
              <button
                class="w-1/2 text-center px-3 py-1 rounded-l 
      ${this.settingsMode === "basic"
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-gray-400"}"
                @click=${() => (this.settingsMode = "basic")}
              >
                ${translateText("user_setting.tab_basic")}
              </button>
              <button
                class="w-1/2 text-center px-3 py-1 rounded-r 
      ${this.settingsMode === "keybinds"
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-gray-400"}"
                @click=${() => (this.settingsMode = "keybinds")}
              >
                ${translateText("user_setting.tab_keybinds")}
              </button>
            </div>

            <div class="settings-list">
              ${this.settingsMode === "basic"
                ? this.renderBasicSettings()
                : this.renderKeybindSettings()}
            </div>
          </div>
        </div>
      </o-modal>

      <language-modal
        .visible=${this.showLanguageModal}
        .languageList=${this.languageList}
        .currentLang=${this.currentLang}
        @language-selected=${this.handleLanguageSelected}
        @close-modal=${() => (this.showLanguageModal = false)}
      ></language-modal>
    `;
  }

  private renderBasicSettings() {
    return html`
      <!-- 🌐 Language Selection -->
      <div class="setting-item vertical">
        <div class="toggle-row">
          <label class="setting-label">${translateText("user_setting.language_label") || "Language"}</label>
          <button
            class="language-button"
            @click=${this.openLanguageModal}
            style="
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 4px;
              padding: 4px 12px;
              color: white;
              cursor: pointer;
              font-size: 14px;
              transition: background 0.2s;
              display: flex;
              align-items: center;
              gap: 8px;
            "
            @mouseenter=${(e: MouseEvent) => {
              (e.target as HTMLElement).style.background = "rgba(255, 255, 255, 0.2)";
            }}
            @mouseleave=${(e: MouseEvent) => {
              (e.target as HTMLElement).style.background = "rgba(255, 255, 255, 0.1)";
            }}
          >
            ${this.getCurrentLanguageDisplay()}
          </button>
        </div>
        <div class="setting-description">${translateText("user_setting.language_desc") || "Select your preferred language"}</div>
      </div>

      <!-- 🌙 Dark Mode -->
      <setting-toggle
        label="${translateText("user_setting.dark_mode_label")}"
        description="${translateText("user_setting.dark_mode_desc")}"
        id="dark-mode-toggle"
        .checked=${this.userSettings.darkMode()}
        @change=${(e: CustomEvent<{ checked: boolean }>) =>
          this.toggleDarkMode(e)}
      ></setting-toggle>

      <!-- 😊 Emojis -->
      <setting-toggle
        label="${translateText("user_setting.emojis_label")}"
        description="${translateText("user_setting.emojis_desc")}"
        id="emoji-toggle"
        .checked=${this.userSettings.emojis()}
        @change=${this.toggleEmojis}
      ></setting-toggle>

      <!-- 💥 Special effects -->
      <setting-toggle
        label="${translateText("user_setting.special_effects_label")}"
        description="${translateText("user_setting.special_effects_desc")}"
        id="special-effect-toggle"
        .checked=${this.userSettings.fxLayer()}
        @change=${this.toggleFxLayer}
      ></setting-toggle>

      <!-- 🖱️ Left Click Menu -->
      <setting-toggle
        label="${translateText("user_setting.left_click_label")}"
        description="${translateText("user_setting.left_click_desc")}"
        id="left-click-toggle"
        .checked=${this.userSettings.leftClickOpensMenu()}
        @change=${this.toggleLeftClickOpensMenu}
      ></setting-toggle>

      <!-- 🙈 Anonymous Names -->
      <setting-toggle
        label="${translateText("user_setting.anonymous_names_label")}"
        description="${translateText("user_setting.anonymous_names_desc")}"
        id="anonymous-names-toggle"
        .checked=${this.userSettings.anonymousNames()}
        @change=${this.toggleAnonymousNames}
      ></setting-toggle>

      <!-- 🗺️ Country UI Settings -->
      <div class="setting-item vertical country-ui-container">
        <div class="toggle-row">
          <label class="setting-label" style="cursor: pointer;" @click=${() => this.countryUIExpanded = !this.countryUIExpanded}>
            ${translateText("user_setting.country_ui_label")}
            <span style="margin-left: 8px; font-size: 12px;">${this.countryUIExpanded ? "▼" : "▶"}</span>
          </label>
        </div>
        <div class="setting-description">${translateText("user_setting.country_ui_desc")}</div>
        
        <div class="country-ui-options" style="display: ${this.countryUIExpanded ? 'block' : 'none'};">
          <div class="country-ui-grid">
            ${this.renderUIToggle("🏳️", "Names", this.userSettings.showNationNames(), () => this.userSettings.toggleShowNationNames())}
            ${this.renderUIToggle("👑", "Crowns", this.userSettings.showCrowns(), () => this.userSettings.toggleShowCrowns())}
            ${this.renderUIToggle("⚔️", "Troops", this.userSettings.showTroops(), () => this.userSettings.toggleShowTroops())}
            ${this.renderUIToggle("🏴", "Flags", this.userSettings.showFlags(), () => this.userSettings.toggleShowFlags())}
            ${this.renderUIToggle("🤝", "Alliances", this.userSettings.showAlliances(), () => this.userSettings.toggleShowAlliances())}
            ${this.renderUIToggle("✉️", "Requests", this.userSettings.showAllianceRequests(), () => this.userSettings.toggleShowAllianceRequests())}
            ${this.renderUIToggle("🎯", "Targets", this.userSettings.showTargets(), () => this.userSettings.toggleShowTargets())}
            ${this.renderUIToggle("🛡️", "Traitors", this.userSettings.showTraitors(), () => this.userSettings.toggleShowTraitors())}
            ${this.renderUIToggle("📵", "Offline", this.userSettings.showDisconnected(), () => this.userSettings.toggleShowDisconnected())}
            ${this.renderUIToggle("🚫", "Embargo", this.userSettings.showEmbargoes(), () => this.userSettings.toggleShowEmbargoes())}
            ${this.renderUIToggle("☢️", "Nukes", this.userSettings.showNukes(), () => this.userSettings.toggleShowNukes())}
          </div>
          
          <div style="display: flex; gap: 8px; justify-content: center; margin-top: 12px;">
            <button
              class="country-ui-button"
              @click=${() => {
                this.userSettings.toggleAllCountryUI(true);
                this.requestUpdate();
                document.dispatchEvent(new CustomEvent("country-ui-settings-changed"));
              }}
              style="
                background: rgba(34, 197, 94, 0.2);
                border: 1px solid rgba(34, 197, 94, 0.4);
                border-radius: 4px;
                padding: 4px 12px;
                color: #86efac;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
              "
              @mouseenter=${(e: MouseEvent) => {
                (e.target as HTMLElement).style.background = "rgba(34, 197, 94, 0.3)";
              }}
              @mouseleave=${(e: MouseEvent) => {
                (e.target as HTMLElement).style.background = "rgba(34, 197, 94, 0.2)";
              }}
            >
              ${translateText("user_setting.show_all_ui")}
            </button>
            <button
              class="country-ui-button"
              @click=${() => {
                this.userSettings.toggleAllCountryUI(false);
                this.requestUpdate();
                document.dispatchEvent(new CustomEvent("country-ui-settings-changed"));
              }}
              style="
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.4);
                border-radius: 4px;
                padding: 4px 12px;
                color: #fca5a5;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
              "
              @mouseenter=${(e: MouseEvent) => {
                (e.target as HTMLElement).style.background = "rgba(239, 68, 68, 0.3)";
              }}
              @mouseleave=${(e: MouseEvent) => {
                (e.target as HTMLElement).style.background = "rgba(239, 68, 68, 0.2)";
              }}
            >
              ${translateText("user_setting.hide_all_ui")}
            </button>
          </div>
        </div>
      </div>

      <!-- ⚔️ Attack Ratio -->
      <setting-slider
        label="${translateText("user_setting.attack_ratio_label")}"
        description="${translateText("user_setting.attack_ratio_desc")}"
        min="1"
        max="100"
        .value=${Number(localStorage.getItem("settings.attackRatio") ?? "0.2") *
        100}
        @change=${this.sliderAttackRatio}
      ></setting-slider>

      <!-- 🪖🛠️ Troop Ratio -->
      <setting-slider
        label="${translateText("user_setting.troop_ratio_label")}"
        description="${translateText("user_setting.troop_ratio_desc")}"
        min="1"
        max="100"
        .value=${Number(localStorage.getItem("settings.troopRatio") ?? "0.95") *
        100}
        @change=${this.sliderTroopRatio}
      ></setting-slider>

      ${this.showEasterEggSettings
        ? html`
            <setting-slider
              label="${translateText(
                "user_setting.easter_writing_speed_label",
              )}"
              description="${translateText(
                "user_setting.easter_writing_speed_desc",
              )}"
              min="0"
              max="100"
              value="40"
              easter="true"
              @change=${(e: CustomEvent) => {
                const value = e.detail?.value;
                if (value !== undefined) {
                  console.log("Changed:", value);
                } else {
                  console.warn("Slider event missing detail.value", e);
                }
              }}
            ></setting-slider>

            <setting-number
              label="${translateText("user_setting.easter_bug_count_label")}"
              description="${translateText(
                "user_setting.easter_bug_count_desc",
              )}"
              value="100"
              min="0"
              max="1000"
              easter="true"
              @change=${(e: CustomEvent) => {
                const value = e.detail?.value;
                if (value !== undefined) {
                  console.log("Changed:", value);
                } else {
                  console.warn("Slider event missing detail.value", e);
                }
              }}
            ></setting-number>
          `
        : null}
    `;
  }

  private renderKeybindSettings() {
    return html`
      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.view_options")}
      </div>

      <setting-keybind
        action="toggleView"
        label=${translateText("user_setting.toggle_view")}
        description=${translateText("user_setting.toggle_view_desc")}
        defaultKey="Space"
        .value=${this.keybinds["toggleView"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.attack_ratio_controls")}
      </div>

      <setting-keybind
        action="attackRatioDown"
        label=${translateText("user_setting.attack_ratio_down")}
        description=${translateText("user_setting.attack_ratio_down_desc")}
        defaultKey="Digit1"
        .value=${this.keybinds["attackRatioDown"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <setting-keybind
        action="attackRatioUp"
        label=${translateText("user_setting.attack_ratio_up")}
        description=${translateText("user_setting.attack_ratio_up_desc")}
        defaultKey="Digit2"
        .value=${this.keybinds["attackRatioUp"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.attack_keybinds")}
      </div>

      <setting-keybind
        action="boatAttack"
        label=${translateText("user_setting.boat_attack")}
        description=${translateText("user_setting.boat_attack_desc")}
        defaultKey="KeyB"
        .value=${this.keybinds["boatAttack"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.zoom_controls")}
      </div>

      <setting-keybind
        action="zoomOut"
        label=${translateText("user_setting.zoom_out")}
        description=${translateText("user_setting.zoom_out_desc")}
        defaultKey="KeyQ"
        .value=${this.keybinds["zoomOut"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <setting-keybind
        action="zoomIn"
        label=${translateText("user_setting.zoom_in")}
        description=${translateText("user_setting.zoom_in_desc")}
        defaultKey="KeyE"
        .value=${this.keybinds["zoomIn"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <div class="text-center text-white text-base font-semibold mt-5 mb-2">
        ${translateText("user_setting.camera_movement")}
      </div>

      <setting-keybind
        action="centerCamera"
        label=${translateText("user_setting.center_camera")}
        description=${translateText("user_setting.center_camera_desc")}
        defaultKey="KeyC"
        .value=${this.keybinds["centerCamera"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <setting-keybind
        action="moveUp"
        label=${translateText("user_setting.move_up")}
        description=${translateText("user_setting.move_up_desc")}
        defaultKey="KeyW"
        .value=${this.keybinds["moveUp"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <setting-keybind
        action="moveLeft"
        label=${translateText("user_setting.move_left")}
        description=${translateText("user_setting.move_left_desc")}
        defaultKey="KeyA"
        .value=${this.keybinds["moveLeft"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <setting-keybind
        action="moveDown"
        label=${translateText("user_setting.move_down")}
        description=${translateText("user_setting.move_down_desc")}
        defaultKey="KeyS"
        .value=${this.keybinds["moveDown"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>

      <setting-keybind
        action="moveRight"
        label=${translateText("user_setting.move_right")}
        description=${translateText("user_setting.move_right_desc")}
        defaultKey="KeyD"
        .value=${this.keybinds["moveRight"] ?? ""}
        @change=${this.handleKeybindChange}
      ></setting-keybind>
    `;
  }

  public async open() {
    // Ensure language data is loaded
    if (this.languageList.length === 0) {
      await this.initializeLanguageData();
    }
    // Update current language in case it changed
    this.currentLang = localStorage.getItem("lang") || "en";
    this.requestUpdate();
    this.modalEl?.open();
  }

  public close() {
    this.modalEl?.close();
  }
}
