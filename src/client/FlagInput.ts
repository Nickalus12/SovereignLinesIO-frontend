import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import Countries from "./data/countries.json";
import { CustomFlag, FlagTier, FlagElementType } from "../core/game/FlagTypes";
import { SimpleAuthService } from "./auth/SimpleAuthService";

const flagKey: string = "flag";
const customFlagsKey: string = "customFlags";

@customElement("flag-input")
export class FlagInput extends LitElement {
  @state() private flag: string = "";
  @state() private search: string = "";
  @state() private showModal: boolean = false;
  @state() private activeTab: 'countries' | 'custom' | 'create' = 'countries';
  @state() private customFlags: CustomFlag[] = [];

  private authService = SimpleAuthService.getInstance();

  static styles = css`
    @media (max-width: 768px) {
      .flag-modal {
        width: 80vw;
      }

      .dropdown-item {
        width: calc(100% / 3 - 15px);
      }
    }
  `;

  private handleSearch(e: Event) {
    this.search = String((e.target as HTMLInputElement).value);
  }

  private setFlag(flag: string) {
    if (flag === "xx") {
      flag = "";
    }
    this.flag = flag;
    this.showModal = false;
    this.storeFlag(flag);
  }

  public getCurrentFlag(): string {
    return this.flag;
  }

  private getStoredFlag(): string {
    const storedFlag = localStorage.getItem(flagKey);
    if (storedFlag) {
      return storedFlag;
    }
    return "";
  }

  private storeFlag(flag: string) {
    if (flag) {
      localStorage.setItem(flagKey, flag);
    } else if (flag === "") {
      localStorage.removeItem(flagKey);
    }
  }

  private dispatchFlagEvent() {
    this.dispatchEvent(
      new CustomEvent("flag-change", {
        detail: { flag: this.flag },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private loadCustomFlags() {
    const stored = localStorage.getItem(customFlagsKey);
    if (stored) {
      try {
        this.customFlags = JSON.parse(stored);
      } catch (e) {
        console.warn('Failed to load custom flags:', e);
        this.customFlags = [];
      }
    }
  }

  private saveCustomFlags() {
    localStorage.setItem(customFlagsKey, JSON.stringify(this.customFlags));
  }

  private addCustomFlag(flag: CustomFlag) {
    this.customFlags = [...this.customFlags, flag];
    this.saveCustomFlags();
  }

  private deleteCustomFlag(flagId: string) {
    this.customFlags = this.customFlags.filter(f => f.id !== flagId);
    this.saveCustomFlags();
    
    // If the deleted flag was currently selected, reset to default
    if (this.flag === `custom:${flagId}`) {
      this.setFlag("");
    }
  }

  private setCustomFlag(flag: CustomFlag) {
    this.flag = `custom:${flag.id}`;
    this.showModal = false;
    this.storeFlag(this.flag);
    this.dispatchFlagEvent();
  }


  private getUserTier(): FlagTier {
    const profile = this.authService.getProfile();
    return (profile?.tier as FlagTier) || FlagTier.Free;
  }

  private isCustomFlag(flagCode: string): boolean {
    return flagCode.startsWith('custom:');
  }

  private getCustomFlag(flagCode: string): CustomFlag | null {
    if (!this.isCustomFlag(flagCode)) return null;
    const flagId = flagCode.replace('custom:', '');
    return this.customFlags.find(f => f.id === flagId) || null;
  }

  private renderCustomFlagPreview(flag: CustomFlag): string {
    // Generate a simple SVG representation for preview
    // This is a simplified version - the full renderer would be more complex
    const elements = flag.elements.map(element => {
      const x = (element.position.x / 100) * flag.width;
      const y = (element.position.y / 100) * flag.height;
      const width = (element.size.width / 100) * flag.width;
      const height = (element.size.height / 100) * flag.height;

      switch (element.type) {
        case 'background':
          return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${(element as any).color}" />`;
        case 'shape':
          const shapeEl = element as any;
          if (shapeEl.shapeType === 'rectangle') {
            return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${shapeEl.fillColor}" />`;
          } else if (shapeEl.shapeType === 'circle') {
            return `<ellipse cx="${x + width/2}" cy="${y + height/2}" rx="${width/2}" ry="${height/2}" fill="${shapeEl.fillColor}" />`;
          }
          break;
        case 'text':
          const textEl = element as any;
          return `<text x="${x + width/2}" y="${y + height/2}" fill="${textEl.color}" font-size="${textEl.fontSize}" text-anchor="middle" dominant-baseline="middle">${textEl.text || 'Text'}</text>`;
        default:
          return '';
      }
      return '';
    }).join('');

    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${flag.width}" height="${flag.height}" viewBox="0 0 ${flag.width} ${flag.height}">${elements}</svg>`)}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.flag = this.getStoredFlag();
    this.loadCustomFlags();
    this.dispatchFlagEvent();
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        class="absolute left-0 top-0 w-full h-full ${this.showModal
          ? ""
          : "hidden"}"
        @click=${() => (this.showModal = false)}
      ></div>
      <div class="flex relative">
        <button
          @click=${() => (this.showModal = !this.showModal)}
          class="p-[4px] rounded-lg flex cursor-pointer military-glass-flag"
          title="Pick a flag!"
        >
          ${this.isCustomFlag(this.flag) ? 
            (() => {
              const customFlag = this.getCustomFlag(this.flag);
              return customFlag ? 
                html`<img class="size-[48px]" src="${this.renderCustomFlagPreview(customFlag)}" />` :
                html`<img class="size-[48px]" src="/flags/xx.svg" />`;
            })() :
            html`<img class="size-[48px]" src="/flags/${this.flag || "xx"}.svg" onerror="this.src='/flags/xx.svg'; this.onerror=null;" />`
          }
        </button>
        ${this.showModal
          ? html`
              <div
                class="text-white flex flex-col gap-[0.5rem] absolute top-[60px] left-[0px] w-[780%] h-[500px] max-h-[50vh] max-w-[87vw] p-[10px] rounded-[8px] z-[3] military-glass-modal ${this
                  .showModal
                  ? ""
                  : "hidden"}"
              >
                <!-- Tab Navigation -->
                <div class="flex border-b border-gray-600 mb-2">
                  <button
                    class="px-4 py-2 ${this.activeTab === 'countries' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-gray-400'}"
                    @click=${() => this.activeTab = 'countries'}
                  >
                    🌍 Countries (${Countries.length})
                  </button>
                  <button
                    class="px-4 py-2 ${this.activeTab === 'custom' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-gray-400'}"
                    @click=${() => this.activeTab = 'custom'}
                  >
                    🎨 Custom (${this.customFlags.length})
                  </button>
                  <button
                    class="px-4 py-2 ${this.activeTab === 'create' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-gray-400'}"
                    @click=${() => this.activeTab = 'create'}
                  >
                    ✨ Create New
                  </button>
                </div>

                ${this.activeTab === 'countries' ? html`
                  <input
                    class="h-[2rem] text-center text-lg focus:outline-none military-glass-search"
                    type="text"
                    placeholder="Search countries..."
                    @change=${this.handleSearch}
                    @keyup=${this.handleSearch}
                  />
                  <div class="flex flex-wrap justify-evenly gap-[1rem] overflow-y-auto overflow-x-hidden">
                    ${Countries.filter(
                      (country) =>
                        country.name
                          .toLowerCase()
                          .includes(this.search.toLowerCase()) ||
                        country.code
                          .toLowerCase()
                          .includes(this.search.toLowerCase()),
                    ).map(
                      (country) => html`
                        <button
                          @click=${() => this.setFlag(country.code)}
                          class="text-center cursor-pointer border-none bg-none opacity-70 sm:w-[calc(33.3333%-15px) w-[calc(100%/3-15px)] md:w-[calc(100%/4-15px)]"
                        >
                          <img
                            class="country-flag w-full h-auto"
                            src="/flags/${country.code}.svg"
                            onerror="this.src='/flags/xx.svg'; this.onerror=null;"
                          />
                          <span class="country-name">${country.name}</span>
                        </button>
                      `,
                    )}
                  </div>
                ` : ''}

                ${this.activeTab === 'custom' ? html`
                  <div class="flex flex-col gap-2 overflow-y-auto">
                    ${this.customFlags.length === 0 ? html`
                      <div class="text-center text-gray-400 py-8">
                        <div class="text-4xl mb-2">🎨</div>
                        <div>No custom flags yet!</div>
                        <div class="text-sm mt-2">Create your first custom flag to get started.</div>
                      </div>
                    ` : this.customFlags.map(flag => html`
                      <div class="flex items-center gap-3 p-2 rounded military-glass-search">
                        <img
                          class="w-12 h-8 border border-gray-500 rounded cursor-pointer"
                          src="${this.renderCustomFlagPreview(flag)}"
                          @click=${() => this.setCustomFlag(flag)}
                          title="Select this flag"
                        />
                        <div class="flex-1 cursor-pointer" @click=${() => this.setCustomFlag(flag)}>
                          <div class="font-medium text-sm">${flag.name}</div>
                          <div class="text-xs text-gray-400">${flag.elements.length} elements</div>
                        </div>
                        <!-- Edit button temporarily disabled - will need new implementation for embedded mode -->
                        <!-- <button
                          class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                          title="Edit flag"
                        >
                          Edit
                        </button> -->
                        <button
                          class="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                          @click=${() => this.deleteCustomFlag(flag.id)}
                          title="Delete flag"
                        >
                          Delete
                        </button>
                      </div>
                    `)}
                  </div>
                ` : ''}

                ${this.activeTab === 'create' ? html`
                  <div class="text-center py-8">
                    <div class="text-4xl mb-4">🎨</div>
                    <h3 class="text-lg font-bold mb-4">AI Flag Generator</h3>
                    <p class="text-sm text-gray-400 mb-6">
                      The AI Flag Generator is now integrated into the username input.
                      Please use the flag selector in the username field.
                    </p>
                  </div>
                ` : ''}
              </div>
            `
          : ""}
      </div>
    `;
  }
}
