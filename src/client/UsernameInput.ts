import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { v4 as uuidv4 } from "uuid";
import { translateText } from "../client/Utils";
import { UserSettings } from "../core/game/UserSettings";
import {
  MAX_USERNAME_LENGTH,
  validateUsername,
} from "../core/validations/username";

const usernameKey: string = "username";

@customElement("username-input")
export class UsernameInput extends LitElement {
  @state() private username: string = "";
  @property({ type: String }) validationError: string = "";
  private _isValid: boolean = true;
  private userSettings: UserSettings = new UserSettings();

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
    this.dispatchUsernameEvent();
  }

  render() {
    return html`
      <input
        type="text"
        .value=${this.username}
        @input=${this.handleChange}
        @change=${this.handleChange}
        placeholder="${translateText("username.enter_username")}"
        maxlength="${MAX_USERNAME_LENGTH}"
        class="w-full px-4 py-2 text-2xl text-center focus:outline-none military-glass-input"
      />
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

  private async handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.username = input.value.trim();
    const result = validateUsername(this.username);
    this._isValid = result.isValid;
    if (result.isValid) {
      this.storeUsername(this.username);
      this.validationError = "";
      
      // Auto-create guest account if not already authenticated
      try {
        const { authService } = await import("./auth/AuthService");
        const isAuthenticated = await authService.isAuthenticated();
        const currentUser = await authService.getCurrentUser();
        
        // Only create guest if not authenticated or if username changed
        if (!isAuthenticated || (currentUser && currentUser.username !== this.username)) {
          await authService.loginAsGuest(this.username);
          console.log('Guest account created/updated for:', this.username);
        }
      } catch (error) {
        console.warn('Could not auto-create guest account:', error);
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
}
