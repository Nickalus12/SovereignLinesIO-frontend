import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { authService } from "./AuthService";

@customElement("login-modal")
export class LoginModal extends LitElement {
  @state() private isOpen = false;
  @state() private isLoading = false;
  @state() private error = "";
  @state() private rememberMe = false;
  @state() private showPassword = false;
  @state() private isNewUser = false;
  @state() private showUsernameField = false;
  @state() private email = "";
  @state() private password = "";
  @state() private username = "";

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
      background: 
        radial-gradient(circle at 30% 70%, rgba(74, 95, 58, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 70% 30%, rgba(143, 188, 143, 0.05) 0%, transparent 50%),
        linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(10, 15, 5, 0.9) 100%);
      backdrop-filter: blur(8px) saturate(120%);
      -webkit-backdrop-filter: blur(8px) saturate(120%);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      visibility: hidden;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    .modal-container {
      background: 
        linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%),
        linear-gradient(225deg, rgba(74, 95, 58, 0.1) 0%, rgba(45, 59, 37, 0.1) 50%, rgba(26, 47, 26, 0.15) 100%);
      backdrop-filter: blur(32px) saturate(180%);
      -webkit-backdrop-filter: blur(32px) saturate(180%);
      border: 2px solid transparent;
      background-clip: padding-box;
      border-radius: 24px;
      width: 100%;
      max-width: 520px;
      transform: translateY(30px) scale(0.9) rotateX(5deg);
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 
        0 32px 80px rgba(0, 0, 0, 0.7),
        0 16px 40px rgba(74, 95, 58, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2);
      position: relative;
      overflow: hidden;
    }

    .modal-overlay.active .modal-container {
      transform: translateY(0) scale(1) rotateX(0deg);
    }

    /* Revolutionary laser scan-in effect */
    .modal-container::before {
      content: '';
      position: absolute;
      top: -6px;
      left: 0;
      width: 100%;
      height: 6px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(143, 188, 143, 0.6) 10%,
        rgba(255, 255, 255, 1) 50%,
        rgba(143, 188, 143, 0.6) 90%,
        transparent 100%
      );
      box-shadow: 
        0 0 30px rgba(143, 188, 143, 1),
        0 0 60px rgba(143, 188, 143, 0.6),
        0 0 100px rgba(255, 255, 255, 0.4);
      opacity: 0;
      pointer-events: none;
      z-index: 10;
    }

    /* Scan-in animation only when modal opens */
    .modal-overlay.active .modal-container::before {
      animation: laserScanIn 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }

    /* Content reveal mask - content appears as laser passes */
    .modal-header,
    .modal-body {
      position: relative;
      overflow: hidden;
    }

    .modal-header::after,
    .modal-body::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        135deg, 
        rgba(26, 47, 26, 0.95) 0%, 
        rgba(15, 31, 15, 0.98) 100%
      );
      transform: translateY(0);
      transition: none;
      z-index: 1;
    }

    /* Content reveal animation */
    .modal-overlay.active .modal-header::after {
      animation: contentReveal 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      animation-delay: 0.2s;
    }

    .modal-overlay.active .modal-body::after {
      animation: contentReveal 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      animation-delay: 0.4s;
    }

    /* Ensure content is above the mask */
    .modal-title,
    .close-button,
    .modal-body > * {
      position: relative;
      z-index: 2;
    }

    /* Additional tactical grid overlay - appears after scan */
    .modal-container::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(rgba(143, 188, 143, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(143, 188, 143, 0.02) 1px, transparent 1px);
      background-size: 20px 20px;
      pointer-events: none;
      opacity: 0;
      z-index: 0;
    }

    .modal-overlay.active .modal-container::after {
      animation: gridFadeIn 1s ease-out forwards;
      animation-delay: 2s;
    }

    @keyframes laserScanIn {
      0% { 
        top: -6px; 
        opacity: 0;
      }
      5% { 
        opacity: 1;
      }
      95% { 
        opacity: 1;
      }
      100% { 
        top: calc(100% + 6px); 
        opacity: 0;
      }
    }

    @keyframes contentReveal {
      0% { 
        transform: translateY(0);
      }
      100% { 
        transform: translateY(-100%);
      }
    }

    @keyframes gridFadeIn {
      0% { 
        opacity: 0;
      }
      100% { 
        opacity: 0.3;
      }
    }

    .modal-header {
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.15) 0%, rgba(45, 59, 37, 0.2) 50%, rgba(26, 47, 26, 0.15) 100%),
        linear-gradient(45deg, rgba(143, 188, 143, 0.02) 0%, transparent 100%);
      backdrop-filter: blur(16px);
      padding: 32px 40px;
      position: relative;
      border-bottom: 1px solid rgba(143, 188, 143, 0.15);
      overflow: hidden;
    }

    /* Tactical command header effects */
    .modal-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 2px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(143, 188, 143, 0.8) 50%,
        transparent 100%
      );
      animation: headerSweep 4s ease-in-out infinite;
    }

    .modal-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(143, 188, 143, 0.6) 20%,
        rgba(255, 255, 255, 0.8) 50%,
        rgba(143, 188, 143, 0.6) 80%,
        transparent 100%
      );
      box-shadow: 0 0 10px rgba(143, 188, 143, 0.3);
    }

    @keyframes headerSweep {
      0%, 100% { left: -100%; opacity: 0; }
      50% { left: 100%; opacity: 1; }
    }

    .modal-title {
      margin: 0;
      font-size: 28px;
      font-weight: 900;
      background: linear-gradient(
        135deg,
        #8fbc8f 0%,
        #b8d4b8 30%,
        #8fbc8f 60%,
        #a0d0a0 100%
      );
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
      letter-spacing: 3px;
      text-align: center;
      font-family: 'Courier New', 'Consolas', monospace;
      position: relative;
      z-index: 1;
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
      padding: 40px 48px;
      position: relative;
      z-index: 2;
      background: 
        radial-gradient(circle at 20% 80%, rgba(74, 95, 58, 0.03) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(143, 188, 143, 0.02) 0%, transparent 50%);
    }

    .form-group {
      margin-bottom: 28px;
      position: relative;
    }

    .form-label {
      display: block;
      margin-bottom: 12px;
      color: #8fbc8f;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-family: 'Courier New', 'Consolas', monospace;
      text-shadow: 0 0 8px rgba(143, 188, 143, 0.3);
      position: relative;
    }

    .form-label::before {
      content: '▶';
      color: rgba(143, 188, 143, 0.6);
      margin-right: 8px;
      font-size: 10px;
    }

    .form-input {
      width: 100%;
      padding: 18px 24px;
      background: 
        linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%),
        linear-gradient(225deg, rgba(74, 95, 58, 0.08) 0%, rgba(26, 47, 26, 0.12) 100%);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 2px solid rgba(143, 188, 143, 0.15);
      border-radius: 12px;
      color: #ffffff;
      font-size: 16px;
      font-family: 'Courier New', 'Consolas', monospace;
      font-weight: 500;
      letter-spacing: 0.5px;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      outline: none;
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        inset 0 -1px 0 rgba(0, 0, 0, 0.1);
      position: relative;
    }

    .form-input:focus {
      border-color: rgba(143, 188, 143, 0.6);
      background: 
        linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%),
        linear-gradient(225deg, rgba(74, 95, 58, 0.15) 0%, rgba(26, 47, 26, 0.2) 100%);
      box-shadow: 
        0 0 0 4px rgba(143, 188, 143, 0.15),
        0 8px 32px rgba(0, 0, 0, 0.2),
        0 0 20px rgba(143, 188, 143, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2);
      transform: translateY(-1px);
    }

    .form-input::placeholder {
      color: rgba(143, 188, 143, 0.4);
      font-style: italic;
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

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0;
    }

    .checkbox-input {
      width: 20px;
      height: 20px;
      background: rgba(0, 0, 0, 0.3);
      border: 2px solid rgba(74, 95, 58, 0.3);
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      transition: all 0.3s ease;
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

    .checkbox-label {
      color: #8fbc8f;
      font-size: 14px;
      cursor: pointer;
    }

    .error-message {
      background: 
        linear-gradient(135deg, rgba(255, 69, 58, 0.08) 0%, rgba(255, 45, 32, 0.12) 100%),
        linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
      backdrop-filter: blur(16px);
      border: 2px solid rgba(255, 69, 58, 0.3);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      color: #ff8a80;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Courier New', 'Consolas', monospace;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 
        0 4px 16px rgba(255, 69, 58, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      position: relative;
      overflow: hidden;
    }
    
    .error-message::before {
      content: '⚠';
      font-size: 18px;
      color: #ff6b6b;
      text-shadow: 0 0 8px rgba(255, 107, 107, 0.5);
    }

    .submit-button {
      width: 100%;
      padding: 20px 32px;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.8) 0%, rgba(58, 79, 42, 0.9) 50%, rgba(45, 59, 37, 0.8) 100%),
        linear-gradient(45deg, rgba(143, 188, 143, 0.1) 0%, transparent 100%);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 2px solid rgba(143, 188, 143, 0.4);
      border-radius: 16px;
      color: #ffffff;
      font-size: 18px;
      font-weight: 900;
      font-family: 'Courier New', 'Consolas', monospace;
      text-transform: uppercase;
      letter-spacing: 3px;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 4px 16px rgba(74, 95, 58, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        inset 0 -2px 0 rgba(0, 0, 0, 0.2);
      text-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 16px rgba(143, 188, 143, 0.3);
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
        transparent 0%,
        rgba(255, 255, 255, 0.4) 30%,
        rgba(143, 188, 143, 0.6) 50%,
        rgba(255, 255, 255, 0.4) 70%,
        transparent 100%
      );
      transition: left 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1;
    }

    .submit-button::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        repeating-linear-gradient(
          45deg,
          transparent,
          transparent 2px,
          rgba(143, 188, 143, 0.03) 2px,
          rgba(143, 188, 143, 0.03) 4px
        );
      pointer-events: none;
      z-index: 0;
    }

    .submit-button:hover:not(:disabled) {
      background: 
        linear-gradient(135deg, rgba(90, 127, 58, 0.9) 0%, rgba(74, 111, 42, 1) 50%, rgba(58, 79, 42, 0.9) 100%),
        linear-gradient(45deg, rgba(143, 188, 143, 0.2) 0%, transparent 100%);
      border-color: rgba(143, 188, 143, 0.7);
      transform: translateY(-4px) scale(1.02);
      box-shadow: 
        0 16px 48px rgba(0, 0, 0, 0.4),
        0 8px 32px rgba(74, 95, 58, 0.4),
        0 0 40px rgba(143, 188, 143, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        inset 0 -2px 0 rgba(0, 0, 0, 0.3);
    }

    .submit-button:hover:not(:disabled)::before {
      left: 100%;
    }

    .submit-button:active:not(:disabled) {
      transform: translateY(-1px) scale(0.98);
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.3),
        0 2px 8px rgba(74, 95, 58, 0.3),
        inset 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .submit-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .divider {
      text-align: center;
      margin: 32px 0;
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

    .footer-links {
      display: block;
      text-align: left;
      margin-top: 8px;
    }

    .footer-link {
      color: #6a8c6a;
      font-size: 12px;
      text-decoration: none;
      cursor: pointer;
      transition: color 0.3s ease;
      opacity: 0.8;
      font-family: 'Courier New', monospace;
    }

    .footer-link:hover {
      color: #8fbc8f;
      text-decoration: underline;
      opacity: 1;
    }

    .password-requirements {
      margin-top: 8px;
      font-size: 11px;
      color: #6a8c6a;
      opacity: 0.8;
      font-family: 'Courier New', monospace;
    }

    /* Revolutionary tactical loading spinner */
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(143, 188, 143, 0.2);
      border-top: 3px solid #8fbc8f;
      border-right: 3px solid rgba(143, 188, 143, 0.6);
      border-radius: 50%;
      animation: tacSpin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      margin-right: 12px;
      box-shadow: 
        0 0 20px rgba(143, 188, 143, 0.3),
        inset 0 0 10px rgba(143, 188, 143, 0.1);
    }

    @keyframes tacSpin {
      0% { 
        transform: rotate(0deg);
        box-shadow: 0 0 20px rgba(143, 188, 143, 0.3);
      }
      50% { 
        transform: rotate(180deg);
        box-shadow: 0 0 30px rgba(143, 188, 143, 0.5);
      }
      100% { 
        transform: rotate(360deg);
        box-shadow: 0 0 20px rgba(143, 188, 143, 0.3);
      }
    }

    /* Tactical divider */
    .divider-text {
      position: relative;
      color: rgba(143, 188, 143, 0.6);
      font-family: 'Courier New', 'Consolas', monospace;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .divider-text::before,
    .divider-text::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 20px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(143, 188, 143, 0.4), transparent);
    }

    .divider-text::before {
      right: calc(100% + 12px);
    }

    .divider-text::after {
      left: calc(100% + 12px);
    }

    /* Discord third-party login */
    .third-party-section {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(143, 188, 143, 0.1);
    }

    .third-party-title {
      text-align: center;
      color: rgba(143, 188, 143, 0.6);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
      font-family: 'Courier New', 'Consolas', monospace;
    }

    .discord-button {
      width: 100%;
      padding: 14px 20px;
      background: 
        linear-gradient(135deg, rgba(88, 101, 242, 0.15) 0%, rgba(78, 91, 232, 0.15) 100%),
        linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 2px solid rgba(88, 101, 242, 0.3);
      border-radius: 12px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Courier New', 'Consolas', monospace;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      position: relative;
      overflow: hidden;
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .discord-button:hover {
      background: 
        linear-gradient(135deg, rgba(88, 101, 242, 0.25) 0%, rgba(78, 91, 232, 0.25) 100%),
        linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
      border-color: rgba(88, 101, 242, 0.5);
      transform: translateY(-1px);
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.2),
        0 0 20px rgba(88, 101, 242, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .discord-icon {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .welcome-message {
      background: linear-gradient(135deg, rgba(143, 188, 143, 0.15) 0%, rgba(74, 95, 58, 0.1) 100%);
      border: 1px solid rgba(143, 188, 143, 0.3);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      color: #8fbc8f;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideInDown 0.5s ease-out;
    }

    .welcome-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .welcome-text {
      flex: 1;
      line-height: 1.4;
    }

    @keyframes slideInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  render() {
    return html`
      <div class="modal-overlay ${this.isOpen ? 'active' : ''}" @click=${this.handleOverlayClick}>
        <div class="modal-container" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h2 class="modal-title">
              ◤ COMMAND ACCESS ◥
            </h2>
            <button class="close-button" @click=${this.close} aria-label="Close">
              ⨯
            </button>
          </div>
          
          <div class="modal-body">
            ${this.error ? html`
              <div class="error-message">
                ${this.error}
              </div>
            ` : ''}
            
            <form @submit=${this.handleSubmit}>
              <div class="form-group">
                <label class="form-label" for="login-email">Command Access ID</label>
                <input
                  type="email"
                  id="login-email"
                  class="form-input"
                  placeholder="operative@command.mil"
                  .value=${this.email}
                  @input=${(e: Event) => this.email = (e.target as HTMLInputElement).value}
                  required
                  autocomplete="email"
                />
              </div>
              
              ${this.showUsernameField ? html`
                <div class="welcome-message">
                  <div class="welcome-icon">🎖️</div>
                  <div class="welcome-text">
                    <strong>Welcome to Sovereign Lines Command!</strong><br>
                    You're registering as a new operative. Please choose your callsign.
                  </div>
                </div>
              ` : ''}
              
              ${this.showUsernameField ? html`
                <div class="form-group">
                  <label class="form-label" for="login-username">Operative Callsign</label>
                  <input
                    type="text"
                    id="login-username"
                    class="form-input"
                    placeholder="Alpha-Seven-Niner"
                    .value=${this.username}
                    @input=${(e: Event) => this.username = (e.target as HTMLInputElement).value}
                    required
                    autocomplete="username"
                  />
                </div>
              ` : ''}
              
              <div class="form-group">
                <label class="form-label" for="login-password">Security Clearance</label>
                <div class="password-wrapper">
                  <input
                    type="${this.showPassword ? 'text' : 'password'}"
                    id="login-password"
                    class="form-input"
                    placeholder="Enter access code"
                    .value=${this.password}
                    @input=${this.handlePasswordInput}
                    required
                    autocomplete="${this.isNewUser ? 'new-password' : 'current-password'}"
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
                ${!this.showUsernameField ? html`
                  <div class="footer-links" style="margin-top: 8px;">
                    <a class="footer-link" @click=${this.showForgotPassword} style="font-size: 12px;">
                      Security clearance recovery
                    </a>
                  </div>
                ` : html`
                  <div class="password-requirements">
                    Minimum 6 characters required
                  </div>
                `}
              </div>
              
              ${!this.isNewUser && !this.showUsernameField ? html`
                <div class="checkbox-group">
                  <input
                    type="checkbox"
                    id="remember-me"
                    class="checkbox-input"
                    ?checked=${this.rememberMe}
                    @change=${(e: Event) => this.rememberMe = (e.target as HTMLInputElement).checked}
                  />
                  <label class="checkbox-label" for="remember-me">
                    Maintain security clearance for 30 days
                  </label>
                </div>
              ` : ''}
              
              <button
                type="submit"
                class="submit-button"
                ?disabled=${this.isLoading}
              >
                ${this.isLoading ? html`<span class="spinner"></span>` : ''}
                ${this.isLoading ? '◦ AUTHENTICATING ◦' : '◤ ACCESS COMMAND ◥'}
              </button>
            </form>
            
            <!-- Third-party login options -->
            <div class="third-party-section">
              <div class="third-party-title">◤ Alternative Access Methods ◥</div>
              <button class="discord-button" @click=${this.handleDiscordLogin}>
                <svg class="discord-icon" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                Discord Command Link
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async open() {
    this.isOpen = true;
    this.error = "";
    this.isNewUser = false;
    this.email = "";
    this.password = "";
    this.username = "";
    
    // Check if current user is a guest and pre-fill their username
    const currentUser = await authService.getCurrentUser();
    if (currentUser?.email?.endsWith('@guest.local')) {
      // This is a guest user upgrading to full account
      this.username = currentUser.username;
    }
    
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.error = "";
    this.isLoading = false;
    this.isNewUser = false;
    document.body.style.overflow = '';
  }

  private handleOverlayClick(e: Event) {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  private async checkEmailExists() {
    // Removed - we'll check email on form submission instead
  }

  private handlePasswordInput(e: Event) {
    this.password = (e.target as HTMLInputElement).value;
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    
    // Validate password length first
    if (this.password.length < 6) {
      this.error = "Security clearance must be at least 6 characters";
      return;
    }
    
    this.isLoading = true;
    this.error = "";
    
    try {
      // First check if email exists
      const emailExists = await authService.checkEmailExists(this.email);
      
      if (emailExists) {
        // Existing user - attempt login
        const success = await authService.login(this.email, this.password, this.rememberMe);
        if (success) {
          this.close();
          this.dispatchEvent(new CustomEvent('login-success', {
            bubbles: true,
            composed: true
          }));
        } else {
          this.error = "Invalid security clearance. Please try again.";
        }
      } else {
        // New user - need username for registration
        if (!this.username) {
          // Show username field and update form
          this.isNewUser = true;
          this.showUsernameField = true;
          this.isLoading = false;
          // Focus on username field after render
          setTimeout(() => {
            const usernameInput = this.shadowRoot?.querySelector('#login-username') as HTMLInputElement;
            usernameInput?.focus();
          }, 100);
          return;
        }
        
        // Validate username length
        if (this.username.trim().length < 3) {
          this.error = "Operative callsign must be at least 3 characters";
          this.isLoading = false;
          return;
        }
        
        // We have all info, proceed with registration
        const success = await authService.register(this.email, this.password, this.username);
        if (success) {
          // Auto-login after registration
          const loginSuccess = await authService.login(this.email, this.password, true);
          if (loginSuccess) {
            this.close();
            this.dispatchEvent(new CustomEvent('login-success', {
              bubbles: true,
              composed: true
            }));
          }
        } else {
          this.error = "Registration failed. Please try again.";
        }
      }
    } catch (error) {
      this.error = "An error occurred. Please try again.";
      console.error('Authentication error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private showRegister() {
    this.close();
    this.dispatchEvent(new CustomEvent('show-register', {
      bubbles: true,
      composed: true
    }));
  }

  private showForgotPassword() {
    this.close();
    this.dispatchEvent(new CustomEvent('show-forgot-password', {
      bubbles: true,
      composed: true
    }));
  }

  private handleDiscordLogin() {
    console.log('Discord login initiated');
    // Import the existing Discord login function
    import('../jwt').then(({ discordLogin }) => {
      discordLogin();
    });
    this.close();
  }
}