import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { authService } from "./AuthService";

@customElement("register-modal")
export class RegisterModal extends LitElement {
  @state() private isOpen = false;
  @state() private isLoading = false;
  @state() private error = "";
  @state() private showPassword = false;
  @state() private passwordStrength = 0;
  @state() private passwordStrengthText = "";

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
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
      transform: translateY(20px) scale(0.95);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(74, 95, 58, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      position: relative;
    }

    .modal-overlay.active .modal-container {
      transform: translateY(0) scale(1);
    }

    /* Grid pattern overlay */
    .modal-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 40px,
          rgba(74, 95, 58, 0.03) 40px,
          rgba(74, 95, 58, 0.03) 41px
        ),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 40px,
          rgba(74, 95, 58, 0.03) 40px,
          rgba(74, 95, 58, 0.03) 41px
        );
      pointer-events: none;
    }

    .modal-header {
      background: linear-gradient(135deg, #2d4a2d 0%, #1a3a1a 100%);
      padding: 24px 32px;
      position: relative;
      border-bottom: 1px solid rgba(143, 188, 143, 0.2);
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

    .modal-body {
      padding: 32px;
    }

    .form-group {
      margin-bottom: 20px;
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

    .form-input {
      width: 100%;
      padding: 14px 18px;
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(74, 95, 58, 0.3);
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      transition: all 0.3s ease;
      outline: none;
    }

    .form-input:focus {
      border-color: #5a7f3a;
      background: rgba(0, 0, 0, 0.5);
      box-shadow: 
        0 0 0 3px rgba(90, 127, 58, 0.2),
        inset 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .form-input.error {
      border-color: rgba(255, 100, 100, 0.5);
    }

    .form-input::placeholder {
      color: rgba(143, 188, 143, 0.4);
    }

    .password-wrapper {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 12px;
      top: 14px;
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

    .password-strength {
      margin-top: 8px;
    }

    .password-strength-bar {
      height: 4px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .password-strength-fill {
      height: 100%;
      transition: width 0.3s ease, background-color 0.3s ease;
      border-radius: 2px;
    }

    .password-strength-fill.weak {
      width: 33%;
      background: #ff4444;
    }

    .password-strength-fill.medium {
      width: 66%;
      background: #ffaa00;
    }

    .password-strength-fill.strong {
      width: 100%;
      background: #44ff44;
    }

    .password-strength-text {
      font-size: 12px;
      margin-top: 6px;
      color: #8fbc8f;
      text-align: right;
    }

    .error-message {
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 20px;
      color: #ff6b6b;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .success-message {
      background: rgba(0, 255, 0, 0.1);
      border: 1px solid rgba(0, 255, 0, 0.3);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
      color: #4dff4d;
      font-size: 14px;
      text-align: center;
    }

    .submit-button {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%);
      border: 2px solid #5a7f3a;
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .submit-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      transition: left 0.5s ease;
    }

    .submit-button:hover:not(:disabled) {
      background: linear-gradient(135deg, #5a7f3a 0%, #4a6f2a 100%);
      transform: translateY(-2px);
      box-shadow: 
        0 8px 20px rgba(74, 95, 58, 0.3),
        0 0 40px rgba(143, 188, 143, 0.2);
    }

    .submit-button:hover:not(:disabled)::before {
      left: 100%;
    }

    .submit-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .terms-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin: 24px 0;
    }

    .checkbox-input {
      width: 20px;
      height: 20px;
      min-width: 20px;
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(74, 95, 58, 0.3);
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      transition: all 0.3s ease;
      margin-top: 2px;
    }

    .checkbox-input:checked {
      background: #4a5f3a;
      border-color: #5a7f3a;
    }

    .checkbox-input:checked::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #fff;
      font-size: 14px;
      font-weight: bold;
    }

    .terms-text {
      color: rgba(143, 188, 143, 0.8);
      font-size: 13px;
      line-height: 1.5;
    }

    .terms-text a {
      color: #8fbc8f;
      text-decoration: underline;
    }

    .divider {
      text-align: center;
      margin: 24px 0;
      position: relative;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(143, 188, 143, 0.2);
    }

    .divider-text {
      position: relative;
      display: inline-block;
      padding: 0 20px;
      background: linear-gradient(135deg, #1a2f1a 0%, #0f1f0f 100%);
      color: rgba(143, 188, 143, 0.6);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .footer-link {
      text-align: center;
      margin-top: 20px;
    }

    .footer-link a {
      color: #8fbc8f;
      font-size: 14px;
      text-decoration: none;
      cursor: pointer;
      transition: color 0.3s ease;
    }

    .footer-link a:hover {
      color: #a8d5a8;
      text-decoration: underline;
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

  render() {
    return html`
      <div class="modal-overlay ${this.isOpen ? 'active' : ''}" @click=${this.handleOverlayClick}>
        <div class="modal-container" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h2 class="modal-title">Create Account</h2>
            <button class="close-button" @click=${this.close} aria-label="Close">
              ×
            </button>
          </div>
          
          <div class="modal-body">
            ${this.error ? html`
              <div class="error-message">
                <span>⚠</span> ${this.error}
              </div>
            ` : ''}
            
            <form @submit=${this.handleSubmit}>
              <div class="form-group">
                <label class="form-label" for="register-username">Username</label>
                <input
                  type="text"
                  id="register-username"
                  class="form-input"
                  placeholder="Choose a username"
                  required
                  minlength="3"
                  maxlength="20"
                  pattern="[a-zA-Z0-9_-]+"
                  title="Username can only contain letters, numbers, underscores, and hyphens"
                  autocomplete="username"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label" for="register-email">Email</label>
                <input
                  type="email"
                  id="register-email"
                  class="form-input"
                  placeholder="Enter your email"
                  required
                  autocomplete="email"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label" for="register-password">Password</label>
                <div class="password-wrapper">
                  <input
                    type="${this.showPassword ? 'text' : 'password'}"
                    id="register-password"
                    class="form-input"
                    placeholder="Create a strong password"
                    required
                    minlength="8"
                    @input=${this.checkPasswordStrength}
                    autocomplete="new-password"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    @click=${() => this.showPassword = !this.showPassword}
                    aria-label="${this.showPassword ? 'Hide' : 'Show'} password"
                  >
                    ${this.showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <div class="password-strength">
                  <div class="password-strength-bar">
                    <div class="password-strength-fill ${this.getPasswordStrengthClass()}"></div>
                  </div>
                  ${this.passwordStrengthText ? html`
                    <div class="password-strength-text">${this.passwordStrengthText}</div>
                  ` : ''}
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="register-confirm-password">Confirm Password</label>
                <input
                  type="${this.showPassword ? 'text' : 'password'}"
                  id="register-confirm-password"
                  class="form-input"
                  placeholder="Confirm your password"
                  required
                  autocomplete="new-password"
                />
              </div>
              
              <div class="terms-checkbox">
                <input
                  type="checkbox"
                  id="accept-terms"
                  class="checkbox-input"
                  required
                />
                <label class="terms-text" for="accept-terms">
                  I agree to the <a href="/terms-of-service.html" target="_blank">Terms of Service</a> 
                  and <a href="/privacy-policy.html" target="_blank">Privacy Policy</a>
                </label>
              </div>
              
              <button
                type="submit"
                class="submit-button"
                ?disabled=${this.isLoading}
              >
                ${this.isLoading ? html`<span class="spinner"></span>` : ''}
                ${this.isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
            
            <div class="divider">
              <span class="divider-text">or</span>
            </div>
            
            <div class="footer-link">
              <a @click=${this.showLogin}>
                Already have an account? Sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  open() {
    this.isOpen = true;
    this.error = "";
    this.passwordStrength = 0;
    this.passwordStrengthText = "";
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.error = "";
    this.isLoading = false;
    document.body.style.overflow = '';
  }

  private handleOverlayClick(e: Event) {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const username = (form.querySelector('#register-username') as HTMLInputElement).value;
    const email = (form.querySelector('#register-email') as HTMLInputElement).value;
    const password = (form.querySelector('#register-password') as HTMLInputElement).value;
    const confirmPassword = (form.querySelector('#register-confirm-password') as HTMLInputElement).value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
      this.error = "Passwords do not match";
      return;
    }
    
    // Validate password strength
    if (this.passwordStrength < 2) {
      this.error = "Please choose a stronger password";
      return;
    }
    
    this.isLoading = true;
    this.error = "";
    
    try {
      const success = await authService.register(username, email, password);
      if (success) {
        // Show success message before closing
        this.error = "";
        const form = this.shadowRoot?.querySelector('form');
        if (form) {
          form.innerHTML = `
            <div class="success-message">
              <h3 style="margin: 0 0 12px 0;">Account Created Successfully!</h3>
              <p style="margin: 0;">Please check your email to verify your account.</p>
            </div>
          `;
        }
        
        setTimeout(() => {
          this.close();
          this.showLogin();
        }, 3000);
      } else {
        this.error = "Failed to create account. Email or username may already be in use.";
      }
    } catch (error) {
      this.error = "An error occurred. Please try again.";
      console.error('Registration error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private checkPasswordStrength(e: Event) {
    const password = (e.target as HTMLInputElement).value;
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Complexity checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    // Max strength is 5, normalize to 0-3
    this.passwordStrength = Math.min(3, Math.floor(strength * 3 / 5));
    
    switch (this.passwordStrength) {
      case 0:
      case 1:
        this.passwordStrengthText = "Weak";
        break;
      case 2:
        this.passwordStrengthText = "Medium";
        break;
      case 3:
        this.passwordStrengthText = "Strong";
        break;
    }
  }

  private getPasswordStrengthClass() {
    switch (this.passwordStrength) {
      case 0:
      case 1:
        return 'weak';
      case 2:
        return 'medium';
      case 3:
        return 'strong';
      default:
        return '';
    }
  }

  private showLogin() {
    this.close();
    this.dispatchEvent(new CustomEvent('show-login', {
      bubbles: true,
      composed: true
    }));
  }
}