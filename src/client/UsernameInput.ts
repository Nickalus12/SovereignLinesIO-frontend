import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { v4 as uuidv4 } from "uuid";
import { translateText } from "../client/Utils";
import { UserSettings } from "../core/game/UserSettings";
import {
  MAX_USERNAME_LENGTH,
  validateUsername,
} from "../core/validations/username";
import { CustomFlag, FlagTier, FlagElementType } from "../core/game/FlagTypes";
import { SimpleAuthService } from "./auth/SimpleAuthService";
import Countries from "./data/countries.json";
import "./components/flag-generator/FlagGeneratorModal";

const usernameKey: string = "username";
const flagKey: string = "flag";
const customFlagsKey: string = "customFlags";

@customElement("username-input")
export class UsernameInput extends LitElement {
  @state() private username: string = "";
  @state() private currentFlag: string = "";
  @state() private showFlagModal: boolean = false;
  @state() private activeTab: 'countries' | 'custom' | 'create' = 'countries';
  @state() private customFlags: CustomFlag[] = [];
  @state() private flagSearch: string = "";
  @state() private showGeneratorModal: boolean = false;
  @property({ type: String }) validationError: string = "";
  private _isValid: boolean = true;
  private userSettings: UserSettings = new UserSettings();
  private authService = SimpleAuthService.getInstance();

  // Remove static styles since we're using Tailwind

  createRenderRoot() {
    // Disable shadow DOM to allow Tailwind classes to work
    return this;
  }

  public getCurrentUsername(): string {
    return this.username;
  }

  connectedCallback() {
    super.connectedCallback();
    this.username = this.getStoredUsername();
    this.currentFlag = localStorage.getItem(flagKey) || '';
    this.loadCustomFlags();
    this.dispatchUsernameEvent();
    
    // Listen for username changes from profile
    window.addEventListener('username-changed', this.handleExternalUsernameChange);
    
    // Listen for flag changes
    window.addEventListener('flag-changed', this.handleFlagChanged.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('flag-changed', this.handleFlagChanged.bind(this));
    window.removeEventListener('username-changed', this.handleExternalUsernameChange);
    // Clean up any remaining flag modal
    this.removeFlagModalFromBody();
    // Also ensure we clean up any stuck flag creator modals
    const flagCreatorModal = document.getElementById('flag-creator-modal-body');
    if (flagCreatorModal) {
      flagCreatorModal.remove();
    }
  }

  private handleFlagChanged(event: CustomEvent) {
    this.currentFlag = event.detail.flag || '';
  }

  render() {
    // Render flag modal to document body when shown
    if (this.showFlagModal) {
      this.renderFlagModalToBody();
    } else {
      this.removeFlagModalFromBody();
    }

    return html`
      ${this.showGeneratorModal ? html`
        <flag-generator-modal 
          @close=${() => this.showGeneratorModal = false}
          @flag-generated=${this.handleGeneratedFlag}>
        </flag-generator-modal>
      ` : ''}
      <div class="relative w-full" style="z-index: 5;">
        <!-- Responsive styles for mobile -->
        <style>
          @media (max-width: 640px) {
            .mobile-responsive-input {
              padding: 0.625rem 0.875rem;
              gap: 0.5rem;
              min-height: 2.5rem;
            }
            .mobile-responsive-input input {
              font-size: 1.125rem;
            }
            .flag-container-mobile {
              width: 28px !important;
              height: 20px !important;
            }
          }
          @media (max-width: 480px) {
            .mobile-responsive-input {
              padding: 0.625rem 0.875rem;
              gap: 0.5rem;
              min-height: 2.75rem;
            }
            .mobile-responsive-input input {
              font-size: 1.125rem;
            }
            .flag-container-mobile {
              width: 28px !important;
              height: 20px !important;
            }
          }
        </style>
        <!-- Single cohesive button with flag and username -->
        <div 
          class="military-glass-input flex items-center gap-1.5 px-2.5 py-1 cursor-pointer transition-all duration-300 mobile-responsive-input"
          @click=${this.handleClick}
          style="min-height: 2rem;"
          role="button"
          tabindex="0"
          aria-label="Open profile"
        >
          <!-- Flag section inside the button -->
          <div 
            class="flag-container flex-shrink-0 flag-container-mobile"
            @click=${(e: Event) => { e.stopPropagation(); this.handleFlagClick(e); }}
            title="Select your flag"
            style="
              width: 24px;
              height: 17px;
              position: relative;
              border: 1px solid rgba(143, 188, 143, 0.3);
              border-radius: 3px;
              overflow: hidden;
              background: rgba(26, 47, 26, 0.4);
              transition: all 0.2s ease;
            "
            onmouseover="this.style.borderColor='rgba(143, 188, 143, 0.6)'; this.style.boxShadow='0 0 8px rgba(143, 188, 143, 0.2)';"
            onmouseout="this.style.borderColor='rgba(143, 188, 143, 0.3)'; this.style.boxShadow='none';"
          >
            ${this.currentFlag ? this.renderCurrentFlag() : html`
              <div class="w-full h-full flex items-center justify-center">
                <span style="
                  font-size: 12px;
                  color: rgba(143, 188, 143, 0.6);
                  font-weight: bold;
                  font-family: 'Courier New', monospace;
                ">?</span>
              </div>
            `}
          </div>
          
          <!-- Username display/input area -->
          <div class="flex-1 text-xs sm:text-sm text-center cursor-pointer"
               style="
                 color: inherit;
                 font-weight: inherit;
                 font-family: inherit;
                 letter-spacing: inherit;
                 padding: 0 4px;
               ">
            ${this.username || translateText("username.enter_username")}
          </div>
        </div>
      </div>
      ${this.validationError
        ? html`<div
            id="username-validation-error"
            class="absolute z-10 w-full mt-2 px-3 py-1 text-lg military-glass-error"
          >
            ${this.validationError}
          </div>`
        : null}
    `;
  }

  private handleClick(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if the click target is the flag container or its children
    const target = e.target as HTMLElement;
    const flagContainer = target.closest('.flag-container');
    
    // If clicking on the flag container, it will be handled by handleFlagClick
    if (flagContainer) {
      return;
    }
    
    console.log('UsernameInput: Username area clicked, opening profile');
    
    // Open profile dropdown
    window.dispatchEvent(new CustomEvent('open-profile-dropdown', {
      bubbles: true,
      composed: true
    }));
  }

  private handleFlagClick(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('UsernameInput: Flag clicked, opening flag modal');
    
    // Open the flag modal directly
    this.showFlagModal = true;
  }
  
  private handleExternalUsernameChange = (event: CustomEvent) => {
    if (event.detail?.username && event.detail.username !== this.username) {
      this.username = event.detail.username;
      this.storeUsername(this.username);
      this._isValid = validateUsername(this.username).isValid;
      this.requestUpdate();
    }
  }

  // Public method to trigger flag modal from external components
  public openFlagModal() {
    this.showFlagModal = true;
  }

  private async handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.username = input.value.trim();
    const result = validateUsername(this.username);
    this._isValid = result.isValid;
    if (result.isValid) {
      this.storeUsername(this.username);
      this.validationError = "";
      
      // Update the username for the current session
      // This sets the operative's name without triggering login flows
      try {
        const { authService } = await import("./auth/AuthService");
        const currentUser = await authService.getCurrentUser();
        
        // Always dispatch username change event for real-time updates
        if (currentUser && currentUser.username !== this.username) {
          // Update the cached user data with new username
          const updatedUser = { ...currentUser, username: this.username };
          localStorage.setItem('auth_user', JSON.stringify(updatedUser));
          
          // Dispatch username change event for UI updates
          window.dispatchEvent(new CustomEvent('username-changed', {
            detail: { username: this.username, user: updatedUser }
          }));
        } else {
          // For guests or no user, still dispatch the event
          localStorage.setItem('preferred_username', this.username);
          
          // Dispatch username change event without user object
          window.dispatchEvent(new CustomEvent('username-changed', {
            detail: { username: this.username, user: null }
          }));
        }
        
        this.dispatchUsernameEvent();
      } catch (error) {
        console.warn('Could not update username:', error);
      }
    } else {
      this.validationError = result.error ?? "";
    }
  }

  private getStoredUsername(): string {
    const storedUsername = localStorage.getItem(usernameKey);
    if (storedUsername) {
      return storedUsername;
    }
    return this.generateNewUsername();
  }

  private storeUsername(username: string) {
    if (username) {
      localStorage.setItem(usernameKey, username);
    }
  }

  private dispatchUsernameEvent() {
    this.dispatchEvent(
      new CustomEvent("username-change", {
        detail: { username: this.username },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private generateNewUsername(): string {
    const newUsername = "Anon" + this.uuidToThreeDigits();
    this.storeUsername(newUsername);
    return newUsername;
  }

  private uuidToThreeDigits(): string {
    const uuid = uuidv4();
    const cleanUuid = uuid.replace(/-/g, "").toLowerCase();
    const decimal = BigInt(`0x${cleanUuid}`);
    const threeDigits = decimal % 1000n;
    return threeDigits.toString().padStart(3, "0");
  }

  public isValid(): boolean {
    return this._isValid;
  }

  public updateUsername(username: string) {
    this.username = username;
    this.storeUsername(username);
    this.requestUpdate();
  }

  // Flag-related methods
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

  private setFlag(flag: string) {
    if (flag === "xx") {
      flag = "";
    }
    this.currentFlag = flag;
    this.showFlagModal = false;
    localStorage.setItem(flagKey, flag);
    this.dispatchFlagEvent();
  }

  private setCustomFlag(flag: CustomFlag) {
    this.currentFlag = `custom:${flag.id}`;
    this.showFlagModal = false;
    localStorage.setItem(flagKey, this.currentFlag);
    this.dispatchFlagEvent();
  }

  private dispatchFlagEvent() {
    this.dispatchEvent(
      new CustomEvent("flag-change", {
        detail: { flag: this.currentFlag },
        bubbles: true,
        composed: true,
      }),
    );
    
    // Also dispatch to window for other components
    window.dispatchEvent(
      new CustomEvent("flag-changed", {
        detail: { flag: this.currentFlag },
      }),
    );
  }

  private handleFlagSearch(e: Event) {
    this.flagSearch = String((e.target as HTMLInputElement).value);
  }

  // Open AI flag generator
  private openFlagCreator(existingFlagId?: string) {
    this.showFlagModal = false;
    this.showGeneratorModal = true;
  }

  private handleGeneratedFlag(e: CustomEvent) {
    const { svg, id, metadata } = e.detail;
    console.log('Handling generated flag:', { svg: svg.substring(0, 100), id, metadata });
    
    // Create custom flag object
    const generatedFlag: CustomFlag = {
      id: `ai_${id}`,
      name: `Generated Flag ${new Date().toLocaleDateString()}`,
      elements: [],
      tier: FlagTier.Free,
      width: 300,
      height: 200
    };
    
    // Store the SVG separately
    localStorage.setItem(`flag_svg_${generatedFlag.id}`, svg);
    console.log('Stored SVG for flag:', generatedFlag.id);
    
    // Add to custom flags
    this.customFlags.push(generatedFlag);
    this.saveCustomFlags();
    
    // Set as current flag
    console.log('Setting custom flag:', generatedFlag.id);
    this.setCustomFlag(generatedFlag);
    this.showGeneratorModal = false;
    
    // Force re-render to update the flag display
    this.requestUpdate();
    console.log('Current flag after update:', this.currentFlag);
  }

  private deleteCustomFlag(flagId: string) {
    this.customFlags = this.customFlags.filter(f => f.id !== flagId);
    this.saveCustomFlags();
    
    // If the deleted flag was currently selected, reset to default
    if (this.currentFlag === `custom:${flagId}`) {
      this.setFlag("");
    }
  }

  private getUserTier(): FlagTier {
    const profile = this.authService.getProfile();
    return (profile?.tier as FlagTier) || FlagTier.Free;
  }

  private isCustomFlag(flagCode: string): boolean {
    return flagCode.startsWith('custom:') || flagCode.startsWith('ai_');
  }

  private getCustomFlag(flagCode: string): CustomFlag | null {
    if (!this.isCustomFlag(flagCode)) return null;
    // Remove the 'custom:' prefix if present, but keep the full ID (including 'ai_')
    const flagId = flagCode.startsWith('custom:') ? flagCode.substring(7) : flagCode;
    return this.customFlags.find(f => f.id === flagId) || null;
  }

  private renderCustomFlagPreview(flag: CustomFlag): string {
    // Check if this is an AI-generated flag
    if (flag.id.startsWith('ai_')) {
      const storedSvg = localStorage.getItem(`flag_svg_${flag.id}`);
      if (storedSvg) {
        try {
          // Ensure the SVG is properly encoded
          const encodedSvg = btoa(unescape(encodeURIComponent(storedSvg)));
          return `data:image/svg+xml;base64,${encodedSvg}`;
        } catch (e) {
          console.error('Failed to encode SVG:', e);
          return '/flags/xx.svg';
        }
      }
    }
    
    // Generate a simple SVG representation for preview
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

  private renderCurrentFlag() {
    if (this.isCustomFlag(this.currentFlag)) {
      const customFlag = this.getCustomFlag(this.currentFlag);
      if (customFlag) {
        const preview = this.renderCustomFlagPreview(customFlag);
        return html`<img class="w-full h-full object-cover" src="${preview}" alt="Custom Flag" />`;
      } else {
        console.warn('Custom flag not found:', this.currentFlag);
        return html`<img class="w-full h-full object-cover" src="/flags/xx.svg" alt="Unknown Flag" />`;
      }
    } else {
      return html`
        <img 
          class="w-full h-full object-cover" 
          src="/flags/${this.currentFlag || 'xx'}.svg" 
          alt="Flag"
          @error=${(e: Event) => {
            const img = e.target as HTMLImageElement;
            img.src = '/flags/xx.svg';
          }}
        />
      `;
    }
  }



  public refreshCustomFlags() {
    this.loadCustomFlags();
    this.requestUpdate();
  }

  // Render flag modal to document body to escape container constraints
  private renderFlagModalToBody() {
    // Remove any existing flag modal
    this.removeFlagModalFromBody();

    // Create modal element
    const modalElement = document.createElement('div');
    modalElement.id = 'username-input-flag-modal';
    modalElement.innerHTML = this.getFlagModalHTML();
    
    // Apply inline styles to ensure it's above everything except top bar
    modalElement.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 9999 !important;
      pointer-events: auto !important;
    `;
    
    // Add event listeners
    this.attachModalEventListeners(modalElement);
    
    // Append to body
    document.body.appendChild(modalElement);
  }

  private removeFlagModalFromBody() {
    const existingModal = document.getElementById('username-input-flag-modal');
    if (existingModal) {
      existingModal.remove();
    }
  }

  private getFlagModalHTML(): string {
    const filteredCountries = (Countries || []).filter(
      (country) =>
        country.name &&
        country.code &&
        (country.name
          .toLowerCase()
          .includes(this.flagSearch.toLowerCase()) ||
        country.code
          .toLowerCase()
          .includes(this.flagSearch.toLowerCase())),
    );

    return `
      <!-- Add styles for proper modal scaling -->
      <style>
        .flag-modal-content {
          width: 90vw;
          max-width: 48rem;
          height: auto;
          max-height: calc(100vh - 120px);
          margin-top: 60px;
        }
        @media (max-height: 800px) {
          .flag-modal-content {
            max-height: calc(100vh - 80px);
            margin-top: 40px;
          }
        }
      </style>
      <!-- Modal Backdrop -->
      <div class="fixed inset-0 flex items-start justify-center flag-modal-backdrop overflow-y-auto" style="z-index: 9999 !important; background: rgba(0, 0, 0, 0.9);">
        <!-- Modal Content -->
        <div class="military-glass-modal flag-modal-content text-white flex flex-col rounded-lg relative" style="z-index: 9999 !important; padding: 1.5rem;" onclick="event.stopPropagation()">
          <!-- Header -->
          <div class="flex justify-between items-center border-b border-gray-600 pb-3 mb-4">
            <h2 class="text-2xl font-bold">Select Your Flag</h2>
            <button class="text-gray-400 hover:text-white text-3xl leading-none px-2" data-close-modal="true">×</button>
          </div>

          <!-- Tab Navigation -->
          <div class="flex border-b border-gray-600 mb-4">
            <button class="px-4 py-2 text-base ${this.activeTab === 'countries' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-gray-400'}" data-tab="countries">
              🌍 Countries (${filteredCountries.length})
            </button>
            <button class="px-4 py-2 text-base ${this.activeTab === 'custom' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-gray-400'}" data-tab="custom">
              🎨 Custom (${this.customFlags.length})
            </button>
            <button class="px-4 py-2 text-base ${this.activeTab === 'create' ? 'border-b-2 border-blue-400 text-blue-400' : 'text-gray-400'}" data-tab="create">
              ✨ Create New
            </button>
          </div>

          <!-- Tab Content -->
          <div class="flex-1 overflow-y-auto min-h-0">
            ${this.activeTab === 'countries' ? this.getCountriesTabHTML(filteredCountries) : ''}
            ${this.activeTab === 'custom' ? this.getCustomTabHTML() : ''}
            ${this.activeTab === 'create' ? this.getCreateTabHTML() : ''}
          </div>
        </div>
      </div>
    `;
  }

  private getCountriesTabHTML(filteredCountries: any[]): string {
    return `
      <div class="flex flex-col gap-2 overflow-y-auto h-full">
        <!-- Search box -->
        <input
          class="h-[2.5rem] text-center text-lg focus:outline-none military-glass-search"
          type="text"
          placeholder="Search countries..."
          value="${this.flagSearch}"
          data-flag-search="true"
        />
        
        <!-- Results count -->
        <div class="text-xs text-gray-400 text-center">
          ${filteredCountries.length} countries
        </div>
        
        <!-- Flag grid -->
        <div class="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto">
          ${filteredCountries.map(country => `
            <div
              class="text-center cursor-pointer hover:bg-gray-700 rounded-lg p-2 transition-all duration-200 hover:scale-105"
              title="${country.name}"
              data-select-flag="${country.code}"
            >
              <img
                class="w-full h-auto aspect-[3/2] object-cover border border-gray-500 rounded shadow-md"
                src="/flags/${country.code}.svg"
                onerror="this.src='/flags/xx.svg'; this.onerror=null;"
                alt="${country.name}"
                loading="lazy"
              />
              <div class="text-xs text-gray-300 mt-1 truncate">${country.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private getCustomTabHTML(): string {
    if (this.customFlags.length === 0) {
      return `
        <div class="flex flex-col gap-2 overflow-y-auto h-full">
          <div class="text-center text-gray-400 py-8">
            <div class="text-4xl mb-2">🎨</div>
            <div>No custom flags yet!</div>
            <div class="text-sm mt-2">Create your first custom flag to get started.</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="flex flex-col gap-2 overflow-y-auto h-full">
        ${this.customFlags.map(flag => `
          <div class="flex items-center gap-3 p-2 rounded military-glass-search">
            <img
              class="w-12 h-8 border border-gray-500 rounded cursor-pointer"
              src="${this.renderCustomFlagPreview(flag)}"
              title="Select this flag"
              alt="${flag.name}"
              data-select-custom-flag="${flag.id}"
            />
            <div class="flex-1 cursor-pointer" data-select-custom-flag="${flag.id}">
              <div class="font-medium text-sm">${flag.name}</div>
              <div class="text-xs text-gray-400">${flag.elements.length} elements</div>
            </div>
            <button
              class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
              title="Edit flag"
              data-edit-flag="${flag.id}"
            >
              Edit
            </button>
            <button
              class="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
              title="Delete flag"
              data-delete-flag="${flag.id}"
            >
              Delete
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  private getCreateTabHTML(): string {
    return `
      <div class="flex flex-col items-center justify-center h-full text-center p-6">
        <div class="text-5xl mb-6">🎨</div>
        <h3 class="text-2xl font-bold mb-4">AI Flag Generator</h3>
        <p class="text-base text-gray-400 mb-8 max-w-md mx-auto">
          CREATE UNIQUE FLAGS WITH OUR AI-POWERED GENERATOR
        </p>
        <button
          class="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-lg transition-colors"
          data-open-generator="true"
        >
          Generate New Flag
        </button>
        <div class="text-sm text-gray-400 mt-6">
          FREE TIER: 5 DAILY GENERATIONS • 3 COLORS MAX
        </div>
      </div>
    `;
  }

  private attachModalEventListeners(modalElement: HTMLElement) {
    // Close modal when clicking backdrop
    modalElement.addEventListener('click', (e) => {
      // Only close if clicking the backdrop itself
      if (e.target === modalElement.querySelector('.flag-modal-backdrop')) {
        this.showFlagModal = false;
        this.requestUpdate();
      }
    });

    // Close button
    const closeButton = modalElement.querySelector('[data-close-modal]');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.showFlagModal = false;
        this.requestUpdate();
      });
    }

    // Tab switching
    modalElement.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).dataset.tab as 'countries' | 'custom' | 'create';
        this.activeTab = tab;
        this.requestUpdate();
      });
    });

    // Flag search
    const searchInput = modalElement.querySelector('[data-flag-search]') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.flagSearch = (e.target as HTMLInputElement).value;
        this.requestUpdate();
      });
    }

    // Flag selection
    modalElement.querySelectorAll('[data-select-flag]').forEach(element => {
      element.addEventListener('click', (e) => {
        const code = (e.currentTarget as HTMLElement).dataset.selectFlag!;
        this.setFlag(code);
      });
    });

    // Custom flag selection
    modalElement.querySelectorAll('[data-select-custom-flag]').forEach(element => {
      element.addEventListener('click', (e) => {
        const flagId = (e.currentTarget as HTMLElement).dataset.selectCustomFlag!;
        const flag = this.customFlags.find(f => f.id === flagId);
        if (flag) {
          this.setCustomFlag(flag);
        }
      });
    });

    // Edit flag
    modalElement.querySelectorAll('[data-edit-flag]').forEach(element => {
      element.addEventListener('click', (e) => {
        const flagId = (e.target as HTMLElement).dataset.editFlag!;
        this.openFlagCreator(flagId);
      });
    });

    // Delete flag
    modalElement.querySelectorAll('[data-delete-flag]').forEach(element => {
      element.addEventListener('click', (e) => {
        const flagId = (e.target as HTMLElement).dataset.deleteFlag!;
        this.deleteCustomFlag(flagId);
      });
    });

    // Create flag (old button)
    const createButton = modalElement.querySelector('[data-create-flag]');
    if (createButton) {
      createButton.addEventListener('click', () => {
        this.openFlagCreator();
      });
    }
    
    // Open AI generator
    const generatorButton = modalElement.querySelector('[data-open-generator]');
    if (generatorButton) {
      generatorButton.addEventListener('click', () => {
        this.openFlagCreator();
      });
    }
  }
}
