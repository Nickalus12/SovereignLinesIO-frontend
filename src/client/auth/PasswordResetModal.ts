import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { authService } from "./AuthService";

@customElement("password-reset-modal")
export class PasswordResetModal extends LitElement {
  @state() private isOpen = false;
  @state() private isLoading = false;
  @state() private error = "";
  @state() private success = false;
  @state() private email = "";

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
      max-width: 420px;
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

    .description {
      color: rgba(143, 188, 143, 0.8);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
      text-align: center;
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

    .form-input::placeholder {
      color: rgba(143, 188, 143, 0.4);
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
      color: #4dff4d;
      font-size: 14px;
      text-align: center;
    }

    .success-message h3 {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 700;
    }

    .success-message p {
      margin: 0;
      line-height: 1.5;
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
            <h2 class="modal-title">Reset Password</h2>
            <button class="close-button" @click=${this.close} aria-label="Close">
              ×
            </button>
          </div>
          
          <div class="modal-body">
            ${this.success ? html`
              <div class="success-message">
                <h3>Email Sent!</h3>
                <p>We've sent password reset instructions to <strong>${this.email}</strong>.</p>
                <p style="margin-top: 12px; font-size: 13px; opacity: 0.8;">
                  Please check your email and follow the link to reset your password.
                </p>
              </div>
              
              <div class="footer-link">
                <a @click=${this.close}>Close</a>
              </div>
            ` : html`
              <p class="description">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
              
              ${this.error ? html`
                <div class="error-message">
                  <span>⚠</span> ${this.error}
                </div>
              ` : ''}
              
              <form @submit=${this.handleSubmit}>
                <div class="form-group">
                  <label class="form-label" for="reset-email">Email Address</label>
                  <input
                    type="email"
                    id="reset-email"
                    class="form-input"
                    placeholder="Enter your email"
                    required
                    .value=${this.email}
                    @input=${(e: Event) => this.email = (e.target as HTMLInputElement).value}
                  />
                </div>
                
                <button
                  type="submit"
                  class="submit-button"
                  ?disabled=${this.isLoading}
                >
                  ${this.isLoading ? html`<span class="spinner"></span>` : ''}
                  ${this.isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              
              <div class="footer-link">
                <a @click=${this.showLogin}>
                  Back to Sign In
                </a>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  open() {
    this.isOpen = true;
    this.error = "";
    this.success = false;
    this.email = "";
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.error = "";
    this.success = false;
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
    
    this.isLoading = true;
    this.error = "";
    
    try {
      const success = await authService.requestPasswordReset(this.email);
      if (success) {
        this.success = true;
      } else {
        this.error = "Failed to send reset email. Please check your email address and try again.";
      }
    } catch (error) {
      this.error = "An error occurred. Please try again.";
      console.error('Password reset error:', error);
    } finally {
      this.isLoading = false;
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