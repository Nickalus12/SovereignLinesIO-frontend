import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { authService, User } from "./AuthService";

@customElement("account-settings-modal")
export class AccountSettingsModal extends LitElement {
  @state() private isOpen = false;
  @state() private isLoading = false;
  @state() private error = "";
  @state() private success = "";
  @state() private user: User | null = null;
  @state() private activeTab: 'profile' | 'security' | 'preferences' = 'profile';
  @state() private showCurrentPassword = false;
  @state() private showNewPassword = false;

  static styles = css`
    :host {
      display: block;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    .modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    .modal-container {
      background: linear-gradient(135deg, #1a2f1a 0%, #0f1f0f 100%);
      border: 2px solid #2d4a2d;
      border-radius: 12px;
      width: 100%;
      max-width: 720px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      transform: translateY(20px) scale(0.95);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(74, 95, 58, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      position: relative;
      overflow: hidden;
    }

    .modal-overlay.active .modal-container {
      transform: translateY(0) scale(1);
    }

    .modal-header {
      background: linear-gradient(135deg, #2d4a2d 0%, #1a3a1a 100%);
      padding: 24px 32px;
      position: relative;
      border-bottom: 1px solid rgba(143, 188, 143, 0.2);
      flex-shrink: 0;
    }

    .modal-title {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-align: center;
      text-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 20px rgba(143, 188, 143, 0.3);
    }

    .close-button {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #8fbc8f;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 20px;
    }

    .close-button:hover {
      background: rgba(143, 188, 143, 0.2);
      border-color: #4a5f3a;
      transform: rotate(90deg);
    }

    /* Tabs */
    .tabs {
      display: flex;
      padding: 0 32px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(74, 95, 58, 0.2);
      flex-shrink: 0;
    }

    .tab {
      padding: 16px 24px;
      color: rgba(143, 188, 143, 0.7);
      cursor: pointer;
      position: relative;
      transition: color 0.3s ease;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .tab:hover {
      color: #8fbc8f;
    }

    .tab.active {
      color: #a8d5a8;
    }

    .tab::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 3px;
      background: #5a7f3a;
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .tab.active::after {
      transform: scaleX(1);
    }

    .modal-body {
      padding: 32px;
      overflow-y: auto;
      flex: 1;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      color: #8fbc8f;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 14px 18px;
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(74, 95, 58, 0.3);
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      transition: all 0.3s ease;
      outline: none;
      font-family: inherit;
    }

    .form-textarea {
      min-height: 100px;
      resize: vertical;
    }

    .form-input:focus,
    .form-textarea:focus {
      border-color: #5a7f3a;
      background: rgba(0, 0, 0, 0.5);
      box-shadow: 
        0 0 0 3px rgba(90, 127, 58, 0.2),
        inset 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .form-input::placeholder,
    .form-textarea::placeholder {
      color: rgba(143, 188, 143, 0.4);
    }

    .password-wrapper {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #8fbc8f;
      cursor: pointer;
      padding: 8px;
      transition: color 0.3s ease;
    }

    .password-toggle:hover {
      color: #a8d5a8;
    }

    /* Avatar upload */
    .avatar-section {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 32px;
    }

    .avatar-preview {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%);
      border: 3px solid #5a7f3a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      text-transform: uppercase;
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
    }

    .avatar-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-upload {
      flex: 1;
    }

    .upload-button {
      padding: 10px 20px;
      background: rgba(74, 95, 58, 0.2);
      border: 2px solid rgba(74, 95, 58, 0.3);
      border-radius: 8px;
      color: #8fbc8f;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-block;
    }

    .upload-button:hover {
      background: rgba(74, 95, 58, 0.3);
      border-color: #4a5f3a;
      color: #a8d5a8;
    }

    .upload-input {
      display: none;
    }

    .upload-info {
      margin-top: 8px;
      font-size: 12px;
      color: rgba(143, 188, 143, 0.6);
    }

    /* Message displays */
    .error-message,
    .success-message {
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .error-message {
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      color: #ff6b6b;
    }

    .success-message {
      background: rgba(0, 255, 0, 0.1);
      border: 1px solid rgba(0, 255, 0, 0.3);
      color: #4dff4d;
    }

    /* Form actions */
    .form-actions {
      display: flex;
      gap: 16px;
      margin-top: 32px;
    }

    .button {
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid transparent;
      flex: 1;
    }

    .button-primary {
      background: linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%);
      border-color: #5a7f3a;
      color: #fff;
    }

    .button-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #5a7f3a 0%, #4a6f2a 100%);
      transform: translateY(-2px);
      box-shadow: 
        0 8px 20px rgba(74, 95, 58, 0.3),
        0 0 40px rgba(143, 188, 143, 0.2);
    }

    .button-secondary {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(143, 188, 143, 0.3);
      color: #8fbc8f;
    }

    .button-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(143, 188, 143, 0.5);
      color: #a8d5a8;
    }

    .button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Danger zone */
    .danger-zone {
      margin-top: 48px;
      padding-top: 32px;
      border-top: 1px solid rgba(255, 0, 0, 0.2);
    }

    .danger-title {
      color: #ff6b6b;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .button-danger {
      background: rgba(255, 0, 0, 0.1);
      border-color: rgba(255, 0, 0, 0.3);
      color: #ff6b6b;
    }

    .button-danger:hover:not(:disabled) {
      background: rgba(255, 0, 0, 0.2);
      border-color: rgba(255, 0, 0, 0.5);
      color: #ff8888;
    }

    /* Loading spinner */
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    this.user = await authService.getCurrentUser();
  }

  render() {
    return html`
      <div class="modal-overlay ${this.isOpen ? 'active' : ''}" @click=${this.handleOverlayClick}>
        <div class="modal-container" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h2 class="modal-title">Account Settings</h2>
            <button class="close-button" @click=${this.close} aria-label="Close">
              ×
            </button>
          </div>
          
          <div class="tabs">
            <div 
              class="tab ${this.activeTab === 'profile' ? 'active' : ''}"
              @click=${() => this.activeTab = 'profile'}
            >
              Profile
            </div>
            <div 
              class="tab ${this.activeTab === 'security' ? 'active' : ''}"
              @click=${() => this.activeTab = 'security'}
            >
              Security
            </div>
            <div 
              class="tab ${this.activeTab === 'preferences' ? 'active' : ''}"
              @click=${() => this.activeTab = 'preferences'}
            >
              Preferences
            </div>
          </div>
          
          <div class="modal-body">
            ${this.error ? html`
              <div class="error-message">
                <span>⚠</span> ${this.error}
              </div>
            ` : ''}
            
            ${this.success ? html`
              <div class="success-message">
                <span>✓</span> ${this.success}
              </div>
            ` : ''}
            
            ${this.activeTab === 'profile' ? this.renderProfileTab() : ''}
            ${this.activeTab === 'security' ? this.renderSecurityTab() : ''}
            ${this.activeTab === 'preferences' ? this.renderPreferencesTab() : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderProfileTab() {
    return html`
      <form @submit=${this.handleProfileSubmit}>
        <div class="avatar-section">
          <div class="avatar-preview">
            ${this.user?.avatar ? html`
              <img src=${this.user.avatar} alt="${this.user.username}" />
            ` : html`
              ${this.user?.username?.[0] || '?'}
            `}
          </div>
          <div class="avatar-upload">
            <label for="avatar-upload" class="upload-button">
              Change Avatar
            </label>
            <input
              type="file"
              id="avatar-upload"
              class="upload-input"
              accept="image/*"
              @change=${this.handleAvatarChange}
            />
            <div class="upload-info">
              Recommended: 200x200px, max 2MB
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="profile-username">Username</label>
          <input
            type="text"
            id="profile-username"
            class="form-input"
            .value=${this.user?.username || ''}
            placeholder="Enter username"
            required
            minlength="3"
            maxlength="20"
            pattern="[a-zA-Z0-9_-]+"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label" for="profile-email">Email</label>
          <input
            type="email"
            id="profile-email"
            class="form-input"
            .value=${this.user?.email || ''}
            placeholder="Enter email"
            required
          />
        </div>
        
        <div class="form-group">
          <label class="form-label" for="profile-bio">Bio</label>
          <textarea
            id="profile-bio"
            class="form-textarea"
            placeholder="Tell us about yourself..."
            maxlength="500"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button
            type="button"
            class="button button-secondary"
            @click=${this.close}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="button button-primary"
            ?disabled=${this.isLoading}
          >
            ${this.isLoading ? html`<span class="spinner"></span>` : ''}
            Save Changes
          </button>
        </div>
      </form>
    `;
  }

  private renderSecurityTab() {
    return html`
      <form @submit=${this.handlePasswordSubmit}>
        <div class="form-group">
          <label class="form-label" for="current-password">Current Password</label>
          <div class="password-wrapper">
            <input
              type="${this.showCurrentPassword ? 'text' : 'password'}"
              id="current-password"
              class="form-input"
              placeholder="Enter current password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              @click=${() => this.showCurrentPassword = !this.showCurrentPassword}
            >
              ${this.showCurrentPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="new-password">New Password</label>
          <div class="password-wrapper">
            <input
              type="${this.showNewPassword ? 'text' : 'password'}"
              id="new-password"
              class="form-input"
              placeholder="Enter new password"
              required
              minlength="8"
            />
            <button
              type="button"
              class="password-toggle"
              @click=${() => this.showNewPassword = !this.showNewPassword}
            >
              ${this.showNewPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="confirm-password">Confirm New Password</label>
          <input
            type="${this.showNewPassword ? 'text' : 'password'}"
            id="confirm-password"
            class="form-input"
            placeholder="Confirm new password"
            required
          />
        </div>
        
        <div class="form-actions">
          <button
            type="button"
            class="button button-secondary"
            @click=${() => this.activeTab = 'profile'}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="button button-primary"
            ?disabled=${this.isLoading}
          >
            ${this.isLoading ? html`<span class="spinner"></span>` : ''}
            Update Password
          </button>
        </div>
        
        <div class="danger-zone">
          <h3 class="danger-title">Danger Zone</h3>
          <button
            type="button"
            class="button button-danger"
            @click=${this.handleDeleteAccount}
          >
            Delete Account
          </button>
        </div>
      </form>
    `;
  }

  private renderPreferencesTab() {
    return html`
      <form @submit=${this.handlePreferencesSubmit}>
        <div class="form-group">
          <label class="form-label">Email Notifications</label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" checked />
            <span style="color: #8fbc8f; font-size: 14px;">Game invitations</span>
          </label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; margin-top: 12px;">
            <input type="checkbox" checked />
            <span style="color: #8fbc8f; font-size: 14px;">Weekly newsletter</span>
          </label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; margin-top: 12px;">
            <input type="checkbox" />
            <span style="color: #8fbc8f; font-size: 14px;">Promotional offers</span>
          </label>
        </div>
        
        <div class="form-group">
          <label class="form-label">Privacy</label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <input type="checkbox" />
            <span style="color: #8fbc8f; font-size: 14px;">Show profile to other players</span>
          </label>
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; margin-top: 12px;">
            <input type="checkbox" checked />
            <span style="color: #8fbc8f; font-size: 14px;">Show online status</span>
          </label>
        </div>
        
        <div class="form-actions">
          <button
            type="button"
            class="button button-secondary"
            @click=${this.close}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="button button-primary"
            ?disabled=${this.isLoading}
          >
            ${this.isLoading ? html`<span class="spinner"></span>` : ''}
            Save Preferences
          </button>
        </div>
      </form>
    `;
  }

  open() {
    this.isOpen = true;
    this.error = "";
    this.success = "";
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.error = "";
    this.success = "";
    this.isLoading = false;
    document.body.style.overflow = '';
  }

  private handleOverlayClick(e: Event) {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  private async handleProfileSubmit(e: Event) {
    e.preventDefault();
    this.error = "";
    this.success = "";
    this.isLoading = true;

    const form = e.target as HTMLFormElement;
    const username = (form.querySelector('#profile-username') as HTMLInputElement).value;
    const email = (form.querySelector('#profile-email') as HTMLInputElement).value;
    const bio = (form.querySelector('#profile-bio') as HTMLTextAreaElement).value;

    try {
      const success = await authService.updateProfile({
        username,
        email,
        // bio  // Add bio field when backend supports it
      });

      if (success) {
        this.success = "Profile updated successfully!";
        this.user = await authService.getCurrentUser();
        setTimeout(() => this.success = "", 3000);
      } else {
        this.error = "Failed to update profile";
      }
    } catch (error) {
      this.error = "An error occurred";
    } finally {
      this.isLoading = false;
    }
  }

  private async handlePasswordSubmit(e: Event) {
    e.preventDefault();
    this.error = "";
    this.success = "";
    this.isLoading = true;

    const form = e.target as HTMLFormElement;
    const currentPassword = (form.querySelector('#current-password') as HTMLInputElement).value;
    const newPassword = (form.querySelector('#new-password') as HTMLInputElement).value;
    const confirmPassword = (form.querySelector('#confirm-password') as HTMLInputElement).value;

    if (newPassword !== confirmPassword) {
      this.error = "New passwords do not match";
      this.isLoading = false;
      return;
    }

    // TODO: Implement password change when backend supports it
    this.error = "Password change not yet implemented";
    this.isLoading = false;
  }

  private async handlePreferencesSubmit(e: Event) {
    e.preventDefault();
    this.error = "";
    this.success = "";
    this.isLoading = true;

    // TODO: Implement preferences save when backend supports it
    setTimeout(() => {
      this.success = "Preferences saved successfully!";
      this.isLoading = false;
      setTimeout(() => this.success = "", 3000);
    }, 1000);
  }

  private async handleAvatarChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.error = "Avatar file size must be less than 2MB";
      return;
    }

    this.isLoading = true;
    this.error = "";

    try {
      const avatarUrl = await authService.uploadAvatar(file);
      if (avatarUrl) {
        this.user = await authService.getCurrentUser();
        this.success = "Avatar updated successfully!";
        setTimeout(() => this.success = "", 3000);
      } else {
        this.error = "Failed to upload avatar";
      }
    } catch (error) {
      this.error = "An error occurred uploading avatar";
    } finally {
      this.isLoading = false;
    }
  }

  private async handleDeleteAccount() {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      // TODO: Implement account deletion when backend supports it
      alert("Account deletion not yet implemented");
    }
  }
}