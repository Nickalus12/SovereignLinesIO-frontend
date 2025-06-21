import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { authService } from "./AuthService";

@customElement("terms-acceptance-modal")
export class TermsAcceptanceModal extends LitElement {
  @state() private isOpen = false;
  @state() private isLoading = false;
  @state() private error = "";
  @state() private ageConfirmed = false;
  @state() private termsAccepted = false;
  @state() private scrolledToBottom = false;
  @state() private showDeclineMessage = false;
  @state() private termsVersion = "1.0"; // Current TOS version

  // Store the callback to execute after acceptance
  private onAcceptCallback?: () => void;

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
        linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(10, 15, 5, 0.95) 100%);
      backdrop-filter: blur(12px) saturate(120%);
      -webkit-backdrop-filter: blur(12px) saturate(120%);
      z-index: 10001;
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
      max-width: 580px;
      max-height: 85vh;
      min-height: 600px;
      transform: translateY(30px) scale(0.9);
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 
        0 32px 80px rgba(0, 0, 0, 0.7),
        0 16px 40px rgba(74, 95, 58, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-overlay.active .modal-container {
      transform: translateY(0) scale(1);
    }

    /* Tactical header sweep effect */
    .modal-header {
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.15) 0%, rgba(45, 59, 37, 0.2) 50%, rgba(26, 47, 26, 0.15) 100%),
        linear-gradient(45deg, rgba(143, 188, 143, 0.02) 0%, transparent 100%);
      backdrop-filter: blur(16px);
      padding: 24px 32px;
      position: relative;
      border-bottom: 1px solid rgba(143, 188, 143, 0.15);
      flex-shrink: 0;
    }

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
      text-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 20px rgba(143, 188, 143, 0.3);
    }

    .modal-subtitle {
      text-align: center;
      color: rgba(143, 188, 143, 0.7);
      font-size: 14px;
      margin-top: 8px;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
    }

    .modal-body {
      padding: 20px 28px;
      position: relative;
      flex: 1;
      overflow: visible;
      display: flex;
      flex-direction: column;
    }

    .terms-scroll-wrapper {
      position: relative;
      margin-bottom: 16px;
    }

    .terms-scroll-container {
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.4) 100%),
        linear-gradient(45deg, rgba(74, 95, 58, 0.05) 0%, transparent 100%);
      border: 2px solid rgba(143, 188, 143, 0.15);
      border-radius: 12px;
      padding: 16px 20px;
      height: 180px;
      overflow-y: auto;
      position: relative;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: rgba(212, 224, 196, 0.9);
      box-shadow: 
        inset 0 2px 8px rgba(0, 0, 0, 0.3),
        0 1px 0 rgba(255, 255, 255, 0.05);
    }

    /* Custom scrollbar */
    .terms-scroll-container::-webkit-scrollbar {
      width: 8px;
    }

    .terms-scroll-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
    }

    .terms-scroll-container::-webkit-scrollbar-thumb {
      background: rgba(143, 188, 143, 0.3);
      border-radius: 4px;
      transition: background 0.3s ease;
    }

    .terms-scroll-container::-webkit-scrollbar-thumb:hover {
      background: rgba(143, 188, 143, 0.5);
    }

    .terms-content h3 {
      color: #8fbc8f;
      font-size: 16px;
      margin: 20px 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid rgba(143, 188, 143, 0.2);
      padding-bottom: 8px;
    }

    .terms-content h3:first-child {
      margin-top: 0;
    }

    .terms-content p {
      margin: 12px 0;
      color: rgba(212, 224, 196, 0.8);
    }

    .terms-content ul {
      margin: 12px 0;
      padding-left: 24px;
    }

    .terms-content li {
      color: rgba(212, 224, 196, 0.8);
      margin: 8px 0;
    }

    .terms-content strong {
      color: #a8d5a8;
      font-weight: 700;
    }

    .scroll-indicator {
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(143, 188, 143, 0.3);
      border-radius: 4px;
      padding: 4px 12px;
      font-size: 11px;
      color: rgba(143, 188, 143, 0.9);
      font-family: 'Courier New', monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: opacity 0.3s ease;
      white-space: nowrap;
    }

    .scroll-indicator.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .checkbox-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .checkbox-group {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.08) 0%, rgba(45, 59, 37, 0.12) 100%),
        linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
      border: 2px solid rgba(143, 188, 143, 0.15);
      border-radius: 8px;
      transition: all 0.3s ease;
      position: relative;
    }

    .checkbox-group.disabled {
      opacity: 0.4;
      background: 
        linear-gradient(135deg, rgba(20, 20, 20, 0.08) 0%, rgba(10, 10, 10, 0.12) 100%),
        linear-gradient(45deg, rgba(255, 255, 255, 0.01) 0%, transparent 100%);
      border-color: rgba(100, 100, 100, 0.2);
    }

    .checkbox-group.disabled::after {
      content: '🔒 Scroll to review terms first';
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      color: rgba(143, 188, 143, 0.6);
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .checkbox-group:hover:not(.disabled) {
      border-color: rgba(143, 188, 143, 0.3);
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.12) 0%, rgba(45, 59, 37, 0.16) 100%),
        linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
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
      flex-shrink: 0;
      margin-top: 2px;
    }

    .checkbox-group.disabled .checkbox-input {
      cursor: not-allowed;
      opacity: 0.5;
      border-color: rgba(100, 100, 100, 0.3);
      background: rgba(0, 0, 0, 0.1);
    }

    .checkbox-input:checked {
      background: #4a5f3a;
      border-color: #5a7f3a;
      box-shadow: 0 0 12px rgba(143, 188, 143, 0.3);
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
      color: #d4e0c4;
      font-size: 14px;
      cursor: pointer;
      line-height: 1.4;
      font-family: 'Courier New', monospace;
      transition: color 0.3s ease;
    }

    .checkbox-group.disabled .checkbox-label {
      cursor: not-allowed;
      color: rgba(212, 224, 196, 0.4);
    }

    .checkbox-label strong {
      color: #8fbc8f;
      font-weight: 700;
    }

    .policy-link {
      color: #8fbc8f;
      text-decoration: underline;
      text-decoration-color: rgba(143, 188, 143, 0.5);
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .policy-link:hover {
      color: #a8d5a8;
      text-decoration-color: #a8d5a8;
      text-shadow: 0 0 8px rgba(143, 188, 143, 0.3);
    }

    .helpful-tip {
      background: 
        linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(255, 235, 59, 0.05) 100%),
        linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
      border: 2px solid rgba(255, 193, 7, 0.2);
      border-radius: 8px;
      padding: 10px 16px;
      margin-top: 8px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      transition: all 0.3s ease;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.3;
    }

    .helpful-tip.hidden {
      opacity: 0;
      max-height: 0;
      margin: 0;
      padding: 0;
      border-width: 0;
      overflow: hidden;
    }

    .tip-icon {
      font-size: 18px;
      margin-top: 2px;
      flex-shrink: 0;
      animation: tipPulse 2s ease-in-out infinite;
    }

    @keyframes tipPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .tip-text {
      color: #ffd54f;
      flex: 1;
    }

    .tip-text strong {
      color: #ffecb3;
      font-weight: 700;
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
      font-family: 'Courier New', monospace;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 
        0 4px 16px rgba(255, 69, 58, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
    
    .error-message::before {
      content: '⚠';
      font-size: 18px;
      color: #ff6b6b;
      text-shadow: 0 0 8px rgba(255, 107, 107, 0.5);
    }

    .button-group {
      display: flex;
      gap: 12px;
    }

    .submit-button {
      flex: 1;
      padding: 16px 24px;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.8) 0%, rgba(58, 79, 42, 0.9) 50%, rgba(45, 59, 37, 0.8) 100%),
        linear-gradient(45deg, rgba(143, 188, 143, 0.1) 0%, transparent 100%);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 2px solid rgba(143, 188, 143, 0.4);
      border-radius: 12px;
      color: #ffffff;
      font-size: 16px;
      font-weight: 900;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 2px;
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
      opacity: 0.5;
      cursor: not-allowed;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.4) 0%, rgba(58, 79, 42, 0.4) 50%, rgba(45, 59, 37, 0.4) 100%);
    }

    .decline-button {
      padding: 16px 24px;
      background: 
        linear-gradient(135deg, rgba(255, 69, 58, 0.15) 0%, rgba(255, 45, 32, 0.2) 100%),
        linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 2px solid rgba(255, 69, 58, 0.3);
      border-radius: 12px;
      color: #ff8a80;
      font-size: 14px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .decline-button:hover {
      background: 
        linear-gradient(135deg, rgba(255, 69, 58, 0.25) 0%, rgba(255, 45, 32, 0.3) 100%),
        linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
      border-color: rgba(255, 69, 58, 0.5);
      transform: translateY(-2px);
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.3),
        0 0 20px rgba(255, 69, 58, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

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

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .modal-overlay {
        padding: 16px;
      }

      .modal-container {
        max-width: 100%;
        max-height: 90vh;
        min-height: auto;
      }

      .modal-header {
        padding: 16px 20px;
      }

      .modal-body {
        padding: 16px 20px;
      }

      .modal-title {
        font-size: 20px;
        letter-spacing: 2px;
      }

      .modal-subtitle {
        font-size: 12px;
      }

      .terms-scroll-container {
        height: 140px;
        padding: 12px 16px;
        font-size: 11px;
      }

      .checkbox-group {
        padding: 10px 12px;
      }

      .checkbox-label {
        font-size: 12px;
      }

      .helpful-tip {
        padding: 8px 12px;
        font-size: 10px;
      }

      .button-group {
        flex-direction: column;
        gap: 8px;
      }

      .submit-button,
      .decline-button {
        width: 100%;
        padding: 14px 20px;
        font-size: 14px;
        letter-spacing: 1px;
      }
    }

    /* Very small screens */
    @media (max-width: 480px) {
      .modal-overlay {
        padding: 8px;
      }

      .modal-container {
        max-height: 95vh;
      }

      .modal-header {
        padding: 12px 16px;
      }

      .modal-body {
        padding: 12px 16px;
      }

      .modal-title {
        font-size: 18px;
      }

      .terms-scroll-container {
        height: 120px;
        font-size: 10px;
      }

      .decline-message {
        padding: 16px;
        height: auto;
        min-height: 300px;
      }

      .decline-message-content {
        margin-bottom: 20px;
      }

      .decline-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .decline-title {
        font-size: 20px;
        margin-bottom: 12px;
      }

      .decline-message-text {
        font-size: 14px;
        margin-bottom: 16px;
      }

      .decline-buttons {
        flex-direction: column;
        gap: 12px;
      }

      .return-button,
      .exit-button {
        width: 100%;
        padding: 14px 24px;
        font-size: 14px;
        letter-spacing: 1px;
      }
    }

    /* Decline Message Styles */
    .decline-message {
      text-align: center;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      min-height: 300px;
      max-height: 400px;
      position: relative;
    }

    /* Smaller modal container for decline message */
    .modal-container.decline-mode {
      min-height: auto;
      max-height: 70vh;
    }

    .decline-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.8;
      animation: gentlePulse 3s ease-in-out infinite;
    }

    @keyframes gentlePulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.05); opacity: 1; }
    }

    .decline-title {
      font-size: 22px;
      font-weight: 700;
      color: #8fbc8f;
      margin-bottom: 12px;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .decline-message-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }

    .decline-message-text {
      font-size: 14px;
      line-height: 1.4;
      color: rgba(212, 224, 196, 0.9);
      margin-bottom: 16px;
      max-width: 400px;
      font-family: 'Courier New', monospace;
    }

    .decline-message-text strong {
      color: #a8d5a8;
      font-weight: 700;
    }

    .decline-buttons {
      display: flex;
      gap: 16px;
      margin-top: auto;
      flex-shrink: 0;
    }

    .return-button {
      padding: 16px 32px;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.8) 0%, rgba(58, 79, 42, 0.9) 50%, rgba(45, 59, 37, 0.8) 100%),
        linear-gradient(45deg, rgba(143, 188, 143, 0.1) 0%, transparent 100%);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 2px solid rgba(143, 188, 143, 0.4);
      border-radius: 12px;
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 4px 16px rgba(74, 95, 58, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    }

    .return-button:hover {
      background: 
        linear-gradient(135deg, rgba(90, 127, 58, 0.9) 0%, rgba(74, 111, 42, 1) 50%, rgba(58, 79, 42, 0.9) 100%);
      border-color: rgba(143, 188, 143, 0.7);
      transform: translateY(-2px) scale(1.02);
      box-shadow: 
        0 12px 40px rgba(0, 0, 0, 0.4),
        0 6px 24px rgba(74, 95, 58, 0.4),
        0 0 30px rgba(143, 188, 143, 0.3);
    }

    .exit-button {
      padding: 16px 32px;
      background: 
        linear-gradient(135deg, rgba(100, 100, 100, 0.3) 0%, rgba(80, 80, 80, 0.4) 100%);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 2px solid rgba(150, 150, 150, 0.3);
      border-radius: 12px;
      color: rgba(200, 200, 200, 0.9);
      font-size: 14px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .exit-button:hover {
      background: 
        linear-gradient(135deg, rgba(120, 120, 120, 0.4) 0%, rgba(100, 100, 100, 0.5) 100%);
      border-color: rgba(150, 150, 150, 0.5);
      transform: translateY(-1px);
    }
  `;

  render() {
    if (this.showDeclineMessage) {
      return html`
        <div class="modal-overlay ${this.isOpen ? 'active' : ''}">
          <div class="modal-container decline-mode">
            <div class="modal-header">
              <h2 class="modal-title">
                ◤ ACCESS DENIED ◥
              </h2>
              <p class="modal-subtitle">Service Agreement Required</p>
            </div>
            
            <div class="modal-body">
              <div class="decline-message">
                <div class="decline-message-content">
                  <div class="decline-icon">🛡️</div>
                  <h3 class="decline-title">Mission Cannot Proceed</h3>
                  <div class="decline-message-text">
                    <p>We understand your decision, operative.</p>
                    
                    <p>However, <strong>Sovereign Lines</strong> requires acceptance of our operational agreements to maintain mission security and integrity.</p>
                    
                    <p><strong>You may return and accept the agreements at any time to join our forces.</strong></p>
                  </div>
                </div>
                <div class="decline-buttons">
                  <button class="return-button" @click=${this.handleReturnToTerms}>
                    RETURN & ACCEPT
                  </button>
                  <button class="exit-button" @click=${this.handleFinalExit}>
                    Exit Mission
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="modal-overlay ${this.isOpen ? 'active' : ''}">
        <div class="modal-container">
          <div class="modal-header">
            <h2 class="modal-title">
              ◤ OPERATIONAL AGREEMENT ◥
            </h2>
            <p class="modal-subtitle">Terms of Service & Privacy Policy</p>
          </div>
          
          <div class="modal-body">
            ${this.error ? html`
              <div class="error-message">
                ${this.error}
              </div>
            ` : ''}
            
            <div class="terms-scroll-wrapper">
              <div class="terms-scroll-container" @scroll=${this.handleScroll}>
                <div class="terms-content">
                  <h3>◤ MISSION BRIEFING ◥</h3>
                  <p>Welcome to <strong>Sovereign Lines</strong>, operative. By accessing our tactical systems, you agree to these operational parameters.</p>
                  
                  <h3>◤ OPERATIONAL REQUIREMENTS ◥</h3>
                  <ul>
                    <li>Operatives must be <strong>13 years of age or older</strong> to engage in missions</li>
                    <li>All tactical communications must maintain operational security</li>
                    <li>Harassment, toxic behavior, or conduct unbecoming of an operative will result in immediate termination</li>
                    <li>Exploiting system vulnerabilities is grounds for court martial</li>
                  </ul>

                  <h3>◤ DATA COLLECTION PROTOCOLS ◥</h3>
                  <p>Your operational data is classified and protected:</p>
                  <ul>
                    <li>We collect: callsign, email, and mission statistics</li>
                    <li>Data is encrypted using military-grade protocols</li>
                    <li>We never share your intel with third parties</li>
                    <li>You may request data extraction or deletion at any time</li>
                  </ul>

                  <h3>◤ RULES OF ENGAGEMENT ◥</h3>
                  <ul>
                    <li>Respect all fellow operatives regardless of rank or origin</li>
                    <li>No impersonation of command staff or other operatives</li>
                    <li>Keep communications tactical and mission-focused</li>
                    <li>Report security breaches to command immediately</li>
                    <li>Multiple accounts per operative are prohibited</li>
                  </ul>

                  <h3>◤ SUBSCRIPTION INTEL ◥</h3>
                  <p>Premium clearance levels grant enhanced operational capabilities:</p>
                  <ul>
                    <li>All payments are processed securely through Stripe</li>
                    <li>Subscriptions auto-renew unless cancelled</li>
                    <li>Refunds available within 48 hours of purchase</li>
                    <li>Premium features enhance but don't guarantee mission success</li>
                  </ul>

                  <h3>◤ PRIVACY PROTOCOLS ◥</h3>
                  <p>Your privacy is paramount to operational security:</p>
                  <ul>
                    <li>We use cookies for authentication and preferences only</li>
                    <li>No tracking pixels or third-party analytics</li>
                    <li>Communications are encrypted end-to-end</li>
                    <li>You control your data visibility to other operatives</li>
                  </ul>

                  <h3>◤ LIABILITY LIMITATIONS ◥</h3>
                  <p>Sovereign Lines Command provides tactical systems "as-is" without warranty. We are not liable for:</p>
                  <ul>
                    <li>Connection issues during critical operations</li>
                    <li>Lost progress due to technical malfunctions</li>
                    <li>Actions taken by other operatives</li>
                    <li>Strategic or tactical failures</li>
                  </ul>

                  <h3>◤ COMMAND AUTHORITY ◥</h3>
                  <p>Final decisions on all matters rest with Sovereign Lines Command. We reserve the right to:</p>
                  <ul>
                    <li>Modify these terms with 30-day notice</li>
                    <li>Suspend or terminate accounts violating protocols</li>
                    <li>Adjust game balance and features as needed</li>
                    <li>Maintain operational security at all costs</li>
                  </ul>

                  <h3>◤ CONTACT COMMAND ◥</h3>
                  <p>For inquiries, support, or to report violations:</p>
                  <ul>
                    <li>Discord: Join our secure command channel</li>
                    <li>Email: sovereignio@gmail.com</li>
                    <li>Response time: 24-48 hours standard ops</li>
                  </ul>

                  <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
                  <p><strong>Version:</strong> ${this.termsVersion}</p>
                </div>
              </div>
              
              <div class="scroll-indicator ${this.scrolledToBottom ? 'hidden' : ''}">
                ↓ Scroll to review all terms
              </div>
            </div>

            <div class="checkbox-section">
              <div class="checkbox-group ${!this.scrolledToBottom ? 'disabled' : ''}" @click=${(e: Event) => this.handleAgeCheckboxClick(e)}>
                <input
                  type="checkbox"
                  id="age-confirm"
                  class="checkbox-input"
                  ?checked=${this.ageConfirmed}
                  ?disabled=${!this.scrolledToBottom}
                  @change=${(e: Event) => this.scrolledToBottom && (this.ageConfirmed = (e.target as HTMLInputElement).checked)}
                />
                <label class="checkbox-label" for="age-confirm">
                  I confirm that I am <strong>13 years of age or older</strong> and eligible for service
                </label>
              </div>

              <div class="checkbox-group ${!this.scrolledToBottom || !this.ageConfirmed ? 'disabled' : ''}" @click=${(e: Event) => this.handleTermsCheckboxClick(e)}>
                <input
                  type="checkbox"
                  id="terms-accept"
                  class="checkbox-input"
                  ?checked=${this.termsAccepted}
                  ?disabled=${!this.scrolledToBottom || !this.ageConfirmed}
                  @change=${(e: Event) => this.scrolledToBottom && this.ageConfirmed && (this.termsAccepted = (e.target as HTMLInputElement).checked)}
                />
                <label class="checkbox-label" for="terms-accept">
                  I have read and accept the <strong><a href="/terms-of-service.html" target="_blank" class="policy-link">Terms of Service</a></strong> and <strong><a href="/privacy-policy.html" target="_blank" class="policy-link">Privacy Policy</a></strong>
                </label>
              </div>
              
              <div class="helpful-tip ${!this.scrolledToBottom || !this.ageConfirmed ? 'hidden' : ''}">
                <span class="tip-icon">💡</span>
                <span class="tip-text">
                  <strong>Tactical Advantage:</strong> Review the complete operational briefings above for full mission details and your rights as an operative
                </span>
              </div>
            </div>

            <div class="button-group">
              <button
                class="submit-button"
                ?disabled=${!this.canAccept() || this.isLoading}
                @click=${this.handleAccept}
              >
                ${this.isLoading ? html`<span class="spinner"></span>` : ''}
                ${this.isLoading ? '◦ PROCESSING ◦' : '◤ ACCEPT & CONTINUE ◥'}
              </button>
              
              <button
                class="decline-button"
                @click=${this.handleDecline}
                ?disabled=${this.isLoading}
              >
                DECLINE
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private canAccept(): boolean {
    return this.ageConfirmed && this.termsAccepted && this.scrolledToBottom;
  }

  private handleScroll(e: Event) {
    const container = e.target as HTMLElement;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
    this.scrolledToBottom = this.scrolledToBottom || isAtBottom;
  }

  private handleAgeCheckboxClick(e: Event) {
    if (!this.scrolledToBottom) {
      e.preventDefault();
      e.stopPropagation();
      this.showError('⚠ Please scroll to the bottom to review all terms before accepting');
      
      setTimeout(() => {
        this.error = '';
      }, 3000);
    }
  }

  private handleTermsCheckboxClick(e: Event) {
    if (!this.scrolledToBottom) {
      e.preventDefault();
      e.stopPropagation();
      this.showError('⚠ Please scroll to the bottom to review all terms before accepting');
      
      setTimeout(() => {
        this.error = '';
      }, 3000);
    } else if (!this.ageConfirmed) {
      e.preventDefault();
      e.stopPropagation();
      this.showError('⚠ Please confirm your age first before accepting the terms');
      
      setTimeout(() => {
        this.error = '';
      }, 3000);
    }
  }

  private showError(message: string) {
    this.error = message;
  }

  async open(onAccept?: () => void) {
    this.isOpen = true;
    this.error = "";
    this.ageConfirmed = false;
    this.termsAccepted = false;
    this.scrolledToBottom = false;
    this.showDeclineMessage = false;
    this.onAcceptCallback = onAccept;
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.error = "";
    this.isLoading = false;
    this.showDeclineMessage = false;
    document.body.style.overflow = '';
  }

  private async handleAccept() {
    if (!this.canAccept()) return;

    this.isLoading = true;
    this.error = "";

    try {
      // Get current user
      const user = await authService.getCurrentUser();
      console.log('Terms acceptance - Current user:', user);
      
      // Always store acceptance locally first (works for all scenarios)
      const acceptanceData = {
        acceptedAt: new Date().toISOString(),
        version: this.termsVersion,
        userId: user?.id || 'guest-' + Date.now()
      };

      localStorage.setItem('terms_accepted', JSON.stringify(acceptanceData));
      console.log('Terms acceptance stored locally:', acceptanceData);

      // If we have an authenticated user, try to update their profile
      if (user) {
        try {
          console.log('Attempting to update user profile with terms acceptance');
          const success = await authService.updateProfile({
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: this.termsVersion
          } as any);

          if (success) {
            console.log('User profile updated successfully');
          } else {
            console.warn('Profile update failed, but local storage updated - continuing anyway');
          }
        } catch (profileError) {
          console.warn('Profile update error, but local storage updated - continuing anyway:', profileError);
          // Don't fail the entire process if profile update fails
        }
      } else {
        console.log('No authenticated user - guest mode, using local storage only');
      }

      // Always succeed if we got this far - local storage is sufficient
      console.log('Terms acceptance completed successfully');

      this.close();
      
      // Execute callback if provided
      if (this.onAcceptCallback) {
        this.onAcceptCallback();
      }

      // Dispatch success event
      this.dispatchEvent(new CustomEvent('terms-accepted', {
        bubbles: true,
        composed: true,
        detail: { version: this.termsVersion }
      }));

    } catch (error) {
      console.error('Critical TOS acceptance error:', error);
      this.error = "An error occurred: " + (error instanceof Error ? error.message : String(error));
    } finally {
      this.isLoading = false;
    }
  }

  private handleDecline() {
    // Show decline message instead of immediately closing
    this.showDeclineMessage = true;
    this.error = "";
  }

  private handleReturnToTerms() {
    // Reset to show the terms again
    this.showDeclineMessage = false;
    this.ageConfirmed = false;
    this.termsAccepted = false;
    this.scrolledToBottom = false;
    this.error = "";
  }

  private handleFinalExit() {
    // Close modal and log out user
    this.close();
    
    // Dispatch decline event
    this.dispatchEvent(new CustomEvent('terms-declined', {
      bubbles: true,
      composed: true
    }));

    // Log out the user since they declined the terms
    authService.logout();

    // Close the browser window/tab since user declined terms
    // This is legal as the user explicitly chose to decline
    try {
      window.close();
    } catch (error) {
      // If window.close() fails (some browsers restrict it), redirect to a goodbye page
      window.location.href = 'about:blank';
    }
  }

  /**
   * Check if user needs to accept terms
   */
  static async shouldShowTerms(user: any): Promise<boolean> {
    // Check local storage first for quick access (works for all user types)
    const localAcceptance = localStorage.getItem('terms_accepted');
    if (localAcceptance) {
      try {
        const { version, userId, acceptedAt } = JSON.parse(localAcceptance);
        
        // If current version is accepted, no need to show
        if (version === "1.0") {
          // For authenticated users, ensure it matches their ID
          if (user && userId !== user.id) {
            // Different user logged in, clear old acceptance
            localStorage.removeItem('terms_accepted');
          } else {
            // Valid acceptance found
            return false;
          }
        }
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('terms_accepted');
      }
    }

    // If we have a user, check their profile for terms acceptance
    if (user) {
      const termsAcceptedAt = (user as any).termsAcceptedAt;
      const termsVersion = (user as any).termsVersion;

      // If user profile has current version accepted, update local storage and don't show
      if (termsAcceptedAt && termsVersion === "1.0") {
        localStorage.setItem('terms_accepted', JSON.stringify({
          acceptedAt: termsAcceptedAt,
          version: termsVersion,
          userId: user.id
        }));
        return false;
      }
    }

    // Show terms if no valid acceptance found
    return true;
  }
}

// Export helper function for easy checking
export async function checkTermsAcceptance(onAcceptCallback?: () => void): Promise<void> {
  const user = await authService.getCurrentUser();
  if (!user) return;

  const shouldShow = await TermsAcceptanceModal.shouldShowTerms(user);
  if (shouldShow) {
    // Get or create modal instance
    let modal = document.querySelector('terms-acceptance-modal') as TermsAcceptanceModal;
    if (!modal) {
      modal = document.createElement('terms-acceptance-modal') as TermsAcceptanceModal;
      document.body.appendChild(modal);
    }
    modal.open(onAcceptCallback);
  } else if (onAcceptCallback) {
    // Terms already accepted, proceed
    onAcceptCallback();
  }
}