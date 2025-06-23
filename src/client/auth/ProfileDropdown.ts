import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { authService, User } from "./AuthService";
import { profileService, ProfileData, GameStats } from "./ProfileService";
import { achievementService } from "./AchievementService";
import { statsTracker } from "./StatsTracker";
import "./AchievementGrid";
import { SubscriptionModal } from "../SubscriptionModal";
import { checkTermsAcceptance } from "./TermsAcceptanceModal";
import Countries from "../data/countries.json";

@customElement("profile-dropdown")
export class ProfileDropdown extends LitElement {
  @state() private isOpen = false;
  @state() private user: User | null = null;
  @state() private isLoggedIn = false;
  @state() private profileData: ProfileData | null = null;
  @state() private isLoading = false;
  @state() private error: string | null = null;
  @state() private currentFlag: string = "";
  @state() private showFlagPicker = false;
  @state() private flagSearch = "";
  @state() private editingName = false;

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .profile-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Auth button styles are in auth.css */
    
    /* Override to ensure proper styling */
    .auth-button {
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.2) 100%),
        linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%) !important;
      color: #ffffff !important;
      border: 2px solid #5a7f3a !important;
      padding: 14px 36px !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 1.5px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      position: relative !important;
      overflow: hidden !important;
      font-family: 'Courier New', monospace !important;
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -2px 0 rgba(0, 0, 0, 0.3) !important;
      text-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 10px rgba(255, 255, 255, 0.1) !important;
    }
    
    .auth-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s ease;
    }
    
    .auth-button::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        repeating-linear-gradient(
          60deg,
          transparent,
          transparent 5px,
          rgba(255, 255, 255, 0.03) 5px,
          rgba(255, 255, 255, 0.03) 6px
        );
      pointer-events: none;
    }
    
    .auth-button:hover {
      background: linear-gradient(135deg, #5a7f3a 0%, #4a6f2a 100%) !important;
      transform: translateY(-2px) !important;
      box-shadow: 
        0 6px 20px rgba(0, 0, 0, 0.6),
        0 0 30px rgba(90, 127, 58, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
      border-color: #6a8f4a !important;
    }
    
    .auth-button:hover::before {
      left: 100%;
    }
    
    .auth-button:active {
      transform: translateY(0) !important;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.5),
        inset 0 1px 2px rgba(0, 0, 0, 0.3) !important;
    }
    
    /* Add glow animation */
    @keyframes militaryGlow {
      0%, 100% {
        box-shadow: 
          0 4px 12px rgba(0, 0, 0, 0.5),
          0 0 20px rgba(90, 127, 58, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -2px 0 rgba(0, 0, 0, 0.3);
      }
      50% {
        box-shadow: 
          0 4px 12px rgba(0, 0, 0, 0.5),
          0 0 40px rgba(90, 127, 58, 0.6),
          0 0 60px rgba(90, 127, 58, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -2px 0 rgba(0, 0, 0, 0.3);
      }
    }
    
    .auth-button--primary {
      animation: militaryGlow 3s ease-in-out infinite;
    }

    /* VIP-style Profile Button */
    .profile-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.2) 100%),
        linear-gradient(135deg, #1a2f1a 0%, #0f1f0f 100%);
      border: 2px solid #2a4f2a;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0;
      max-width: fit-content;
      box-shadow: 
        0 6px 20px rgba(0, 0, 0, 0.6),
        0 2px 8px rgba(0, 0, 0, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -2px 0 rgba(0, 0, 0, 0.4);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
      overflow: visible;
    }

    /* Decorative corner accents */
    .profile-trigger::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(45deg, #3a5f3a 0%, transparent 20%),
        linear-gradient(225deg, #3a5f3a 0%, transparent 20%),
        linear-gradient(135deg, #3a5f3a 0%, transparent 20%),
        linear-gradient(315deg, #3a5f3a 0%, transparent 20%);
      background-size: 8px 8px;
      background-position: 
        top left,
        top right,
        bottom right,
        bottom left;
      background-repeat: no-repeat;
      border-radius: 12px;
      opacity: 0.5;
      pointer-events: none;
    }

    .profile-trigger:hover {
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.2) 100%),
        linear-gradient(135deg, #2a3f2a 0%, #1a2f1a 100%);
      border-color: #3a5f3a;
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.7),
        0 3px 10px rgba(0, 0, 0, 0.9),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        inset 0 -2px 0 rgba(0, 0, 0, 0.5);
    }

    .profile-trigger.active {
      transform: translateY(0);
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.6),
        0 2px 6px rgba(0, 0, 0, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        inset 0 -1px 0 rgba(0, 0, 0, 0.3);
    }

    /* Guest Account Indicator */
    .profile-trigger.guest {
      border-color: rgba(255, 235, 59, 0.8);
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.2) 100%),
        linear-gradient(135deg, #2f2a1a 0%, #1f1a0f 100%);
    }

    .guest-caution-badge {
      position: absolute;
      top: -12px;
      right: -12px;
      background: #ffd600;
      color: #000;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.6),
        0 0 0 2px rgba(0, 0, 0, 0.9);
      z-index: 10;
    }

    .profile-trigger.guest:hover {
      border-color: #ffd600;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.2) 100%),
        linear-gradient(135deg, #3f3a2a 0%, #2f2a1a 100%);
    }

    /* Authenticated Account Indicator */
    .profile-trigger.authenticated {
      border-color: rgba(74, 222, 128, 0.6);
    }

    .auth-check-badge {
      position: absolute;
      top: -12px;
      right: -12px;
      background: #4ade80;
      color: #000;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.6),
        0 0 0 2px rgba(0, 0, 0, 0.9);
      z-index: 10;
    }

    .profile-trigger.authenticated:hover {
      border-color: #4ade80;
    }

    .profile-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%);
      border: 2px solid #5a7f4a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 10px;
      color: #fff;
      text-transform: uppercase;
      overflow: hidden;
      font-family: 'Courier New', monospace;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    /* Keep avatar styling consistent - only border changes */
    .profile-trigger.guest .profile-avatar {
      border-color: rgba(255, 235, 59, 0.6);
    }

    .profile-trigger.authenticated .profile-avatar {
      border-color: rgba(74, 222, 128, 0.6);
    }

    .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .profile-username {
      font-size: 11px;
      font-weight: 600;
      color: inherit;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'Courier New', monospace;
    }


    /* Profile Modal Overlay - Like ENLIST button */
    .profile-overlay {
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

    .profile-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    
    .profile-overlay.active .profile-modal {
      transform: translateY(0) scale(1) rotateX(0);
    }

    /* Revolutionary Command Profile Interface */
    .profile-modal {
      background: 
        linear-gradient(135deg, #0a1f0a 0%, #051505 50%, #020a02 100%),
        radial-gradient(ellipse at top, rgba(74, 95, 58, 0.15) 0%, transparent 70%),
        radial-gradient(ellipse at bottom, rgba(26, 47, 26, 0.1) 0%, transparent 70%);
      border: 2px solid transparent;
      background-clip: padding-box;
      border-radius: 16px;
      width: 100%;
      max-width: 650px;
      max-height: 85vh;
      overflow-y: auto;
      transform: translateY(20px) scale(0.95) rotateX(4deg);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 
        0 30px 60px rgba(0, 0, 0, 0.7),
        0 15px 30px rgba(74, 95, 58, 0.2),
        0 8px 16px rgba(143, 188, 143, 0.1),
        0 0 0 1px rgba(74, 95, 58, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -1px 0 rgba(0, 0, 0, 0.3);
      position: relative;
      /* Custom scrollbar */
      scrollbar-width: thin;
      scrollbar-color: rgba(143, 188, 143, 0.3) rgba(74, 95, 58, 0.1);
    }

    .profile-modal::-webkit-scrollbar {
      width: 8px;
    }

    .profile-modal::-webkit-scrollbar-track {
      background: rgba(74, 95, 58, 0.1);
      border-radius: 4px;
    }

    .profile-modal::-webkit-scrollbar-thumb {
      background: rgba(143, 188, 143, 0.3);
      border-radius: 4px;
    }

    .profile-modal::-webkit-scrollbar-thumb:hover {
      background: rgba(143, 188, 143, 0.5);
    }

    /* Disable animations on mobile for better performance */
    @media (max-width: 768px) {
      * {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0.1s !important;
      }
      
      .profile-trigger::before {
        display: none;  /* Remove shine effect on mobile */
      }
      
      .auth-button--primary {
        animation: none !important;  /* Disable glow animation */
      }
    }
    
    /* Tablet Responsive Design (768px - 1024px) */
    @media (min-width: 768px) and (max-width: 1024px) {
      .profile-trigger {
        font-size: 12px;
        padding: 11px 18px;
        gap: 7px;
        letter-spacing: 0.9px;
      }
      
      .profile-avatar {
        width: 22px;
        height: 22px;
        font-size: 10px;
      }
      
      .profile-modal {
        max-width: 90vw;
        max-height: 85vh;
      }
    }
    
    /* Mobile Responsive Design - ENHANCED */
    @media (max-width: 768px) {
      /* Profile trigger button optimization - Increased touch target */
      .profile-trigger {
        font-size: 12px;  /* Increased from 11px for better readability */
        padding: 12px 18px; /* Increased padding for better touch target (min 44px height) */
        gap: 8px;
        letter-spacing: 0.8px;
        min-height: 44px;  /* Ensure minimum touch target height */
      }
      
      .profile-avatar {
        width: 24px;  /* Increased from 20px */
        height: 24px;
        font-size: 10px;  /* Increased from 9px */
        border-width: 2px;
      }
      
      .guest-caution-badge,
      .auth-check-badge {
        width: 22px;  /* Slightly larger */
        height: 22px;
        font-size: 13px;
        top: -10px;
        right: -10px;
      }
      
      .profile-username {
        font-size: 12px;  /* Increased from 10px for better readability */
        max-width: 80px;  /* Slightly wider */
        letter-spacing: 0.3px;
      }
      
      /* Modal optimizations */
      .profile-overlay {
        padding: 12px;  /* More padding for edge protection */
        display: flex;
        align-items: flex-start;  /* Align to top on mobile */
        padding-top: 40px;  /* Space from top for status bar */
      }
      
      .profile-modal {
        max-width: calc(100vw - 24px);  /* Account for padding */
        max-height: calc(100vh - 60px);  /* Leave space at top/bottom */
        border-radius: 12px;
        margin: 0 auto;
        border-width: 1px;
        transform: translateY(0) scale(1) rotateX(0);  /* Remove 3D transform on mobile */
      }

      .command-header {
        padding: 12px 16px;  /* More vertical padding */
      }

      .profile-header-content {
        gap: 16px;
        flex-wrap: wrap;  /* Allow wrapping on very small screens */
      }

      .flag-square-border {
        width: 48px;  /* Slightly larger for better touch */
        height: 36px;
      }

      .flag-placeholder {
        font-size: 20px;
      }
      
      .operator-info {
        gap: 6px;
      }
      
      .operator-rank {
        font-size: 12px;  /* Minimum readable size */
        letter-spacing: 1px;
      }

      .operator-name {
        font-size: 16px;  /* Slightly larger */
        letter-spacing: 1px;
        line-height: 1.2;
      }
      
      .operator-designation {
        font-size: 11px;  /* Increased from 10px */
      }
      
      .clearance-level {
        font-size: 14px;
      }
      
      .clearance-status {
        font-size: 10px;  /* Minimum readable size */
      }

      .achievements-section,
      .medals-section,
      .stats-dashboard {
        padding: 12px 16px;
      }
      
      .achievements-title,
      .stats-title {
        font-size: 11px;
        letter-spacing: 0.5px;
      }

      .medals-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .achievement-path {
        padding: 8px;
      }
      
      .path-name {
        font-size: 9px;
      }
      
      .tier-icon {
        font-size: 14px;
      }
      
      .tier-name {
        font-size: 9px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }
      
      .stat-card {
        padding: 8px;
      }
      
      .stat-primary {
        font-size: 14px;
      }
      
      .stat-label {
        font-size: 8px;
      }
      
      .stat-secondary {
        font-size: 9px;
      }
      
      .upgrade-section {
        padding: 12px 16px;
      }
      
      .upgrade-content {
        flex-direction: column;
        text-align: center;
        gap: 8px;
      }
      
      .upgrade-icon {
        font-size: 20px;
      }
      
      .upgrade-title {
        font-size: 12px;
      }
      
      .upgrade-subtitle {
        font-size: 9px;
      }
      
      .upgrade-btn-large {
        width: 100%;
        padding: 10px 16px;
        font-size: 11px;
      }

      .dropdown-items {
        padding: 16px 0;
      }

      .dropdown-item {
        padding: 16px 20px;  /* Increased for better touch targets */
        font-size: 13px;  /* More readable */
        gap: 12px;
        min-height: 48px;  /* Ensure minimum touch target */
        display: flex;
        align-items: center;
      }
      
      .dropdown-icon {
        width: 20px;  /* Slightly larger icons */
        height: 20px;
      }
      
      .guest-warning {
        margin: 16px;
        padding: 16px;
      }
      
      .guest-warning-icon {
        font-size: 32px;
      }
      
      .guest-warning-title {
        font-size: 14px;
        letter-spacing: 1px;
      }
      
      .guest-warning-text {
        font-size: 12px;
      }
      
      .guest-upgrade-btn {
        padding: 10px 20px;
        font-size: 12px;
      }
    }

    @media (max-width: 480px) {
      /* Maintain minimum touch targets and readability */
      .profile-trigger {
        font-size: 11px;  /* No smaller than 11px for readability */
        padding: 10px 14px;  /* Maintain touch target */
        gap: 6px;
        letter-spacing: 0.5px;
        min-height: 44px;  /* Ensure minimum touch target */
      }
      
      .profile-avatar {
        width: 20px;  /* Keep reasonable size */
        height: 20px;
        font-size: 9px;  /* Minimum 9px */
      }
      
      .profile-username {
        font-size: 11px;  /* No smaller than 11px */
        max-width: 70px;
        letter-spacing: 0.2px;
      }
      
      /* Modal fine-tuning for small screens */
      .profile-modal {
        border-radius: 8px;
        max-height: 95vh;
      }

      .command-header {
        padding: 8px 12px 0 12px;
      }

      .operator-avatar {
        width: 32px;  /* Slightly larger */
        height: 32px;
        font-size: 14px;
        border: 1px solid #5a7f4a;
      }

      .operator-name {
        font-size: 14px;  /* Keep readable */
        letter-spacing: 0.5px;
      }

      .clearance-level {
        font-size: 12px;  /* Keep readable */
      }
      
      .clearance-badge {
        padding: 6px;
      }

      .achievements-section,
      .medals-section,
      .stats-dashboard {
        padding: 8px 12px;
      }

      .medals-grid,
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 6px;
      }
      
      .achievement-path {
        padding: 6px;
      }

      .stat-primary {
        font-size: 12px;
      }
      
      .stat-card {
        padding: 6px;
      }

      .medal-icon {
        font-size: 12px;
      }

      .dropdown-item {
        padding: 12px 16px;  /* Better touch target even on small screens */
        font-size: 11px;  /* Minimum readable size */
        gap: 8px;
        letter-spacing: 0.3px;
        min-height: 40px;  /* Ensure touch target */
      }

      .close-button {
        width: 36px;  /* Minimum touch target size */
        height: 36px;
        font-size: 16px;  /* Larger X */
        top: 12px;
        right: 12px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .guest-warning {
        margin: 8px;
        padding: 8px;
      }
      
      .guest-warning-icon {
        font-size: 20px;
        margin-bottom: 6px;
      }
      
      .guest-warning-title {
        font-size: 11px;
      }
      
      .guest-warning-text {
        font-size: 9px;
        line-height: 1.3;
      }
      
      .guest-upgrade-btn {
        padding: 6px 12px;
        font-size: 9px;
      }
    }

    .profile-overlay.active .profile-modal {
      transform: translateY(0) scale(1) rotateX(0deg);
    }

    /* Tactical HUD Scanner Lines */
    .profile-modal::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(0deg, transparent 24px, rgba(143, 188, 143, 0.02) 25px, rgba(143, 188, 143, 0.02) 26px, transparent 27px),
        linear-gradient(90deg, transparent 24px, rgba(143, 188, 143, 0.02) 25px, rgba(143, 188, 143, 0.02) 26px, transparent 27px);
      background-size: 25px 25px;
      pointer-events: none;
      opacity: 0.8;
      z-index: 1;
    }


    /* Revolutionary Close Interface */
    .close-button {
      position: absolute;
      top: 24px;
      right: 24px;
      background: 
        radial-gradient(circle, rgba(255, 87, 87, 0.2) 0%, rgba(139, 69, 19, 0.1) 100%);
      border: 2px solid rgba(255, 87, 87, 0.4);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      color: #ff5757;
      font-size: 20px;
      font-weight: 900;
      cursor: pointer;
      z-index: 100;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', monospace;
    }

    .close-button:hover {
      background: 
        radial-gradient(circle, rgba(255, 87, 87, 0.4) 0%, rgba(139, 69, 19, 0.2) 100%);
      border-color: rgba(255, 87, 87, 0.8);
      color: #ffffff;
      transform: scale(1.1);
      box-shadow: 0 0 20px rgba(255, 87, 87, 0.4);
    }

    /* Clean Profile Header */
    .command-header {
      position: relative;
      padding: 32px;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(26, 47, 26, 0.1) 100%);
      border-bottom: 2px solid rgba(74, 95, 58, 0.2);
      z-index: 10;
    }

    .profile-header-content {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    /* Square Flag Design */
    .flag-square {
      position: relative;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .flag-square:hover {
      transform: translateY(-2px);
    }

    .flag-square-border {
      width: 80px;
      height: 60px;
      position: relative;
      border: 2px solid transparent;
      border-radius: 4px;
      background: linear-gradient(135deg, #4a5f3a 0%, #5a7f4a 50%, #3a4f2a 100%);
      background-clip: border-box;
      transition: all 0.3s ease;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.3),
        0 0 12px rgba(74, 95, 58, 0.2);
    }

    .flag-square-border:hover {
      background: linear-gradient(135deg, #5a7f4a 0%, #6a9f5a 50%, #4a6f3a 100%);
      box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.4),
        0 0 20px rgba(90, 127, 58, 0.3);
    }

    /* VIP Border Styles */
    .flag-square-border.vip-gold {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ff9500 100%);
      box-shadow: 
        0 2px 8px rgba(255, 215, 0, 0.3),
        0 0 16px rgba(255, 215, 0, 0.2);
    }

    .flag-square-border.vip-gold:hover {
      box-shadow: 
        0 4px 12px rgba(255, 215, 0, 0.4),
        0 0 24px rgba(255, 215, 0, 0.3);
    }

    .flag-square-border.vip-diamond {
      background: linear-gradient(135deg, #e0e0e0 0%, #ffffff 50%, #b0b0b0 100%);
      box-shadow: 
        0 2px 8px rgba(255, 255, 255, 0.3),
        0 0 16px rgba(255, 255, 255, 0.2);
    }

    .flag-square-border.vip-diamond:hover {
      box-shadow: 
        0 4px 12px rgba(255, 255, 255, 0.4),
        0 0 24px rgba(255, 255, 255, 0.3);
    }

    .flag-square-border.vip-animated {
      background: linear-gradient(
        135deg,
        #ff0000 0%,
        #ff7f00 17%,
        #ffff00 33%,
        #00ff00 50%,
        #0000ff 67%,
        #4b0082 83%,
        #9400d3 100%
      );
      background-size: 200% 200%;
      animation: rainbowShift 3s ease-in-out infinite;
    }

    .flag-square-inner {
      width: calc(100% - 4px);
      height: calc(100% - 4px);
      margin: 2px;
      border-radius: 2px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }

    .flag-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .flag-placeholder {
      font-size: 32px;
      color: #4a5f3a;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }

    /* User Info Section */
    .user-info-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .user-level {
      font-size: 14px;
      color: #8fbc8f;
      font-family: 'Courier New', monospace;
      opacity: 0.8;
    }

    .operator-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: 
        linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 50%, #2a3f1a 100%),
        radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1), transparent 70%);
      border: 6px solid #5a7f4a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 48px;
      color: #fff;
      text-transform: uppercase;
      overflow: hidden;
      position: relative;
      font-family: 'Courier New', monospace;
      box-shadow: 
        0 16px 40px rgba(0, 0, 0, 0.6),
        0 8px 20px rgba(74, 95, 58, 0.4),
        0 0 30px rgba(143, 188, 143, 0.3),
        inset 0 4px 0 rgba(255, 255, 255, 0.2),
        inset 0 -4px 0 rgba(0, 0, 0, 0.3);
    }

    .operator-avatar.flag-avatar {
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .operator-avatar.flag-avatar:hover {
      transform: scale(1.05);
      border-color: #8fbc8f;
      box-shadow: 
        0 20px 50px rgba(0, 0, 0, 0.7),
        0 10px 25px rgba(74, 95, 58, 0.5),
        0 0 40px rgba(143, 188, 143, 0.4),
        inset 0 4px 0 rgba(255, 255, 255, 0.3),
        inset 0 -4px 0 rgba(0, 0, 0, 0.4);
    }

    .flag-full {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .operator-avatar::before {
      content: '';
      position: absolute;
      inset: -3px;
      background: linear-gradient(
        45deg,
        rgba(74, 95, 58, 0.2) 0%,
        rgba(143, 188, 143, 0.4) 50%,
        rgba(74, 95, 58, 0.2) 100%
      );
      background-size: 200% 200%;
      border-radius: 50%;
      animation: avatarShimmer 3s ease-in-out infinite;
      z-index: -1;
    }

    @keyframes avatarShimmer {
      0%, 100% {
        background-position: 0% 0%;
        opacity: 0.4;
      }
      50% {
        background-position: 100% 100%;
        opacity: 0.7;
      }
    }

    .operator-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .operator-rank {
      font-size: 10px;
      font-weight: 600;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.9;
      font-family: 'Courier New', monospace;
    }

    .operator-name {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-family: 'Courier New', monospace;
      text-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 12px rgba(143, 188, 143, 0.4);
      position: relative;
    }

    .operator-name.editable {
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .operator-name.editable:hover {
      color: #8fbc8f;
      text-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 16px rgba(143, 188, 143, 0.6);
    }

    .edit-icon {
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .operator-name.editable:hover .edit-icon {
      opacity: 0.7;
    }

    .operator-name-input {
      background: rgba(0, 0, 0, 0.6);
      border: 2px solid #8fbc8f;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-family: 'Courier New', monospace;
      text-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 12px rgba(143, 188, 143, 0.4);
      width: 100%;
      transition: all 0.3s ease;
    }

    .operator-name-input:focus {
      outline: none;
      background: rgba(0, 0, 0, 0.8);
      box-shadow: 0 0 30px rgba(143, 188, 143, 0.4);
    }

    .operator-designation {
      font-size: 8px;
      font-weight: 600;
      color: #4a6f3a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      font-family: 'Courier New', monospace;
    }

    .clearance-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px;
      background: 
        radial-gradient(circle, rgba(74, 95, 58, 0.2) 0%, rgba(26, 47, 26, 0.1) 100%);
      border: 1px solid rgba(143, 188, 143, 0.4);
      border-radius: 8px;
      position: relative;
    }

    .clearance-level {
      font-size: 16px;
      font-weight: 700;
      color: #8fbc8f;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 8px rgba(143, 188, 143, 0.5);
    }

    .clearance-status {
      font-size: 10px;
      font-weight: 600;
      color: #4ade80;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
    }

    .clearance-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 12px #4ade80;
      animation: pulse 2s ease-in-out infinite;
    }

    /* Command Interface Header */
    .dropdown-header {
      padding: 8px 16px;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(74, 95, 58, 0.1) 100%),
        linear-gradient(45deg, rgba(26, 47, 26, 0.3) 0%, rgba(15, 31, 15, 0.4) 100%);
      border-bottom: 1px solid rgba(74, 95, 58, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
      z-index: 2;
    }

    .dropdown-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, #8fbc8f, transparent);
      opacity: 0.6;
    }

    .dropdown-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%);
      border: 2px solid #5a7f3a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: #fff;
      text-transform: uppercase;
      overflow: hidden;
      flex-shrink: 0;
    }

    .dropdown-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .dropdown-info {
      flex: 1;
      min-width: 0;
    }

    .dropdown-username {
      font-size: 14px;
      font-weight: 700;
      color: #8fbc8f;
      margin: 0 0 2px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown-email {
      font-size: 11px;
      color: rgba(143, 188, 143, 0.7);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Achievements Section */
    .achievements-section {
      padding: 6px 16px;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(26, 47, 26, 0.15) 100%);
      border-bottom: 1px solid rgba(74, 95, 58, 0.3);
      position: relative;
      z-index: 10;
    }

    .achievements-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-bottom: 4px;
      position: relative;
    }

    .achievements-title {
      font-size: 12px;
      font-weight: 700;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 8px rgba(143, 188, 143, 0.4);
    }

    .medals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 4px;
      margin-bottom: 6px;
    }

    .achievement-path {
      padding: 4px;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.1) 0%, rgba(26, 47, 26, 0.15) 100%);
      border: 1px solid rgba(74, 95, 58, 0.4);
      border-radius: 4px;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .achievement-path.earned {
      border-color: rgba(255, 215, 0, 0.6);
      background: 
        linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(74, 95, 58, 0.15) 100%);
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
    }

    .achievement-path.locked {
      opacity: 0.6;
      border-color: rgba(74, 95, 58, 0.3);
    }

    .path-header {
      margin-bottom: 2px;
      text-align: center;
    }

    .path-name {
      font-size: 10px;
      font-weight: 700;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: 'Courier New', monospace;
      margin-bottom: 2px;
    }

    .achievement-path.earned .path-name {
      color: #ffd700;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
    }

    .path-subtitle {
      font-size: 8px;
      color: rgba(143, 188, 143, 0.7);
      font-style: italic;
      font-family: 'Courier New', monospace;
    }

    .current-tier {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 2px;
    }

    .tier-icon {
      font-size: 16px;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
    }

    .achievement-path.earned .tier-icon {
      animation: tierGlow 3s ease-in-out infinite;
    }

    @keyframes tierGlow {
      0%, 100% { 
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 8px rgba(255, 215, 0, 0.3));
      }
      50% { 
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 16px rgba(255, 215, 0, 0.6));
      }
    }

    .tier-info {
      flex: 1;
    }

    .tier-name {
      font-size: 10px;
      font-weight: 700;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: 'Courier New', monospace;
      margin-bottom: 2px;
    }

    .achievement-path.earned .tier-name {
      color: #ffd700;
    }

    .tier-progress {
      font-size: 8px;
      color: rgba(143, 188, 143, 0.8);
      font-family: 'Courier New', monospace;
    }

    .progress-container {
      margin-top: 2px;
    }

    .next-tier {
      font-size: 8px;
      color: rgba(143, 188, 143, 0.6);
      text-align: center;
      margin-top: 2px;
      font-family: 'Courier New', monospace;
    }

    /* Advanced Stats Dashboard */
    .stats-dashboard {
      padding: 6px 16px;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(26, 47, 26, 0.2) 100%);
      border-bottom: 1px solid rgba(74, 95, 58, 0.3);
      position: relative;
      z-index: 10;
    }

    .stats-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-bottom: 4px;
    }

    .stats-title {
      font-size: 12px;
      font-weight: 700;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 8px rgba(143, 188, 143, 0.4);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 4px;
    }

    .stat-card {
      padding: 4px;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.15) 0%, rgba(26, 47, 26, 0.1) 100%);
      border: 1px solid rgba(74, 95, 58, 0.4);
      border-radius: 4px;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, #8fbc8f, transparent);
      opacity: 0.6;
    }

    .stat-primary {
      font-size: 14px;
      font-weight: 700;
      color: #8fbc8f;
      margin-bottom: 2px;
      text-shadow: 0 0 8px rgba(143, 188, 143, 0.5);
      font-family: 'Courier New', monospace;
      line-height: 1;
    }

    .stat-label {
      font-size: 7px;
      color: rgba(143, 188, 143, 0.8);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      margin-bottom: 1px;
    }

    .stat-secondary {
      font-size: 10px;
      color: #4a6f3a;
      font-family: 'Courier New', monospace;
    }

    .progress-bar {
      width: 100%;
      height: 2px;
      background: rgba(26, 47, 26, 0.3);
      border-radius: 1px;
      overflow: hidden;
      margin-top: 2px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4a5f3a, #8fbc8f);
      border-radius: 2px;
      transition: width 0.8s ease;
      box-shadow: 0 0 4px rgba(143, 188, 143, 0.4);
    }

    /* Command Menu Interface */
    .dropdown-items {
      padding: 4px 0;
      position: relative;
      z-index: 2;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      color: #8fbc8f;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      font-size: 10px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-left: 2px solid transparent;
    }

    .dropdown-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      background: 
        linear-gradient(90deg, rgba(74, 95, 58, 0.2), transparent),
        linear-gradient(135deg, rgba(143, 188, 143, 0.05), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .dropdown-item:hover {
      background: 
        linear-gradient(90deg, rgba(74, 95, 58, 0.3) 0%, rgba(74, 95, 58, 0.1) 100%);
      color: #ffffff;
      border-left-color: #8fbc8f;
      text-shadow: 0 0 6px rgba(143, 188, 143, 0.4);
      transform: translateX(4px);
    }

    .dropdown-item:hover::before {
      opacity: 1;
    }

    .dropdown-icon {
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    .dropdown-divider {
      height: 1px;
      background: rgba(74, 95, 58, 0.2);
      margin: 4px 0;
    }

    .dropdown-item.danger {
      color: #ff6b6b;
    }

    .dropdown-item.danger:hover {
      background: rgba(255, 0, 0, 0.1);
      color: #ff8888;
    }

    /* Upgrade button styles */
    .upgrade-btn {
      background: linear-gradient(135deg, #8fbc8f 0%, #4a5f3a 100%);
      border: 1px solid #4a5f3a;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 9px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .upgrade-btn:hover {
      background: linear-gradient(135deg, #7aa67a 0%, #3a4f2a 100%);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(74, 95, 58, 0.4);
    }

    .upgrade-card {
      border: 1px solid #8fbc8f;
      background: linear-gradient(135deg, rgba(143, 188, 143, 0.1) 0%, rgba(74, 95, 58, 0.05) 100%);
    }

    /* Loading and error states */
    .shimmer {
      background: linear-gradient(90deg, 
        rgba(143, 188, 143, 0.1) 25%, 
        rgba(143, 188, 143, 0.3) 50%, 
        rgba(143, 188, 143, 0.1) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .stat-card.error {
      border: 2px solid #ff6b6b;
      background: linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(139, 69, 19, 0.05) 100%);
    }

    .stat-card.error .stat-secondary {
      color: #ff8888;
      font-size: 10px;
    }

    /* Upgrade Section Styles */
    .upgrade-section {
      padding: 12px 16px 16px 16px;
      position: relative;
      z-index: 10;
    }

    .upgrade-card-standalone {
      background: linear-gradient(135deg, rgba(143, 188, 143, 0.15) 0%, rgba(74, 95, 58, 0.1) 100%);
      border: 1px solid rgba(143, 188, 143, 0.4);
      border-radius: 8px;
      padding: 12px;
      position: relative;
      overflow: hidden;
    }

    .upgrade-card-standalone::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      right: -1px;
      bottom: -1px;
      background: linear-gradient(45deg, rgba(143, 188, 143, 0.3), rgba(74, 95, 58, 0.2));
      border-radius: 9px;
      z-index: -1;
      animation: upgradeGlow 3s ease-in-out infinite;
    }

    @keyframes upgradeGlow {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    .upgrade-content {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: space-between;
    }

    .upgrade-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .upgrade-text {
      flex: 1;
    }

    .upgrade-title {
      font-size: 10px;
      font-weight: 700;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: 'Courier New', monospace;
      margin-bottom: 2px;
    }

    .upgrade-subtitle {
      font-size: 8px;
      color: rgba(143, 188, 143, 0.8);
      font-family: 'Courier New', monospace;
    }

    .upgrade-btn-large {
      background: linear-gradient(135deg, #8fbc8f 0%, #4a5f3a 100%);
      border: 1px solid #4a5f3a;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 9px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .upgrade-btn-large:hover {
      background: linear-gradient(135deg, #7aa67a 0%, #3a4f2a 100%);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(74, 95, 58, 0.4);
    }

    /* Mobile responsive for upgrade section */
    @media (max-width: 768px) {
      .upgrade-content {
        flex-direction: column;
        text-align: center;
        gap: 16px;
      }

      .upgrade-btn-large {
        width: 100%;
        padding: 16px 24px;
      }
    }

    /* Tier badge */
    .tier-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: linear-gradient(135deg, #3d2f1f 0%, #1f1611 100%);
      border: 1px solid #b8860b;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      color: #ffd700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
    }

    .tier-badge.elite {
      background: linear-gradient(135deg, #1a1f3a 0%, #0f1428 100%);
      border-color: #4169e1;
      color: #87ceeb;
    }

    .tier-badge.sovereign {
      background: linear-gradient(135deg, #2d1b4e 0%, #1a0f2e 100%);
      border-color: #9333ea;
      color: #e9d5ff;
    }

    /* Guest Warning Banner */
    .guest-warning {
      margin: 6px 16px;
      padding: 8px;
      background: 
        linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%);
      border: 1px solid rgba(255, 193, 7, 0.4);
      border-radius: 6px;
      position: relative;
      overflow: hidden;
    }

    .guest-warning::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, 
        transparent, 
        rgba(255, 193, 7, 0.8), 
        rgba(255, 193, 7, 1),
        rgba(255, 193, 7, 0.8),
        transparent
      );
      animation: warningPulse 2s ease-in-out infinite;
    }

    @keyframes warningPulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    .guest-warning-icon {
      font-size: 16px;
      text-align: center;
      margin-bottom: 4px;
      filter: drop-shadow(0 0 6px rgba(255, 193, 7, 0.5));
    }

    .guest-warning-content {
      text-align: center;
    }

    .guest-warning-title {
      font-size: 10px;
      font-weight: 700;
      color: #ffc107;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 6px rgba(255, 193, 7, 0.5);
    }

    .guest-warning-text {
      font-size: 8px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.3;
      margin-bottom: 4px;
      font-family: 'Courier New', monospace;
    }

    .guest-upgrade-btn {
      background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
      border: 1px solid #ff9800;
      color: #000;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      box-shadow: 
        0 4px 12px rgba(255, 193, 7, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    .guest-upgrade-btn:hover {
      background: linear-gradient(135deg, #ffca28 0%, #ffa726 100%);
      transform: translateY(-1px);
      box-shadow: 
        0 3px 10px rgba(255, 193, 7, 0.4),
        0 0 15px rgba(255, 193, 7, 0.2);
    }

    /* Mobile responsive for guest warning */
    @media (max-width: 768px) {
      .guest-warning {
        margin: 4px 12px;
        padding: 6px;
      }

      .guest-warning-icon {
        font-size: 14px;
      }

      .guest-warning-title {
        font-size: 9px;
      }

      .guest-warning-text {
        font-size: 7px;
      }
    }

    /* Clickaway overlay */
    .clickaway-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999;
      display: none;
    }

    .clickaway-overlay.active {
      display: block;
    }

    /* Identity Configuration Section */
    .identity-section {
      padding: 6px 16px;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(26, 47, 26, 0.15) 100%);
      border-bottom: 1px solid rgba(74, 95, 58, 0.3);
      position: relative;
      z-index: 10;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 6px;
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 8px rgba(143, 188, 143, 0.4);
    }

    .identity-controls {
      display: grid;
      gap: 6px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .control-label {
      font-size: 8px;
      font-weight: 700;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-family: 'Courier New', monospace;
    }

    .callsign-input {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(74, 95, 58, 0.4);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 700;
      color: #ffffff;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.3s ease;
      width: 100%;
    }

    .callsign-input:focus {
      outline: none;
      border-color: #8fbc8f;
      background: rgba(0, 0, 0, 0.6);
      box-shadow: 0 0 10px rgba(143, 188, 143, 0.2);
    }

    .callsign-input::placeholder {
      color: rgba(143, 188, 143, 0.5);
      text-transform: none;
      font-weight: 400;
    }

    .control-hint {
      font-size: 7px;
      color: rgba(143, 188, 143, 0.6);
      font-style: italic;
      font-family: 'Courier New', monospace;
    }

    /* Flag Selector */
    .flag-selector {
      position: relative;
    }

    .current-flag {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(74, 95, 58, 0.4);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #ffffff;
      position: relative;
    }

    .current-flag:hover {
      border-color: #8fbc8f;
      background: rgba(0, 0, 0, 0.6);
    }

    .flag-icon {
      width: 24px;
      height: 16px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }

    .flag-name {
      flex: 1;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-size: 8px;
    }

    .no-flag {
      color: rgba(143, 188, 143, 0.6);
      font-style: italic;
    }

    .dropdown-arrow {
      font-size: 8px;
      color: #8fbc8f;
    }

    /* Flag Picker Modal */
    .flag-picker-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      padding: 20px;
    }

    .flag-picker {
      background: 
        linear-gradient(135deg, #0a1f0a 0%, #051505 100%);
      border: 3px solid #3a5f3a;
      border-radius: 16px;
      max-width: 600px;
      max-height: 80vh;
      width: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    }

    .flag-search {
      margin: 20px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.4);
      border: 2px solid rgba(74, 95, 58, 0.4);
      border-radius: 8px;
      color: #ffffff;
      font-size: 14px;
      font-family: 'Courier New', monospace;
    }

    .flag-search:focus {
      outline: none;
      border-color: #8fbc8f;
    }

    .flag-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
      padding: 0 20px 20px 20px;
      overflow-y: auto;
      max-height: 60vh;
    }

    .flag-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px;
      background: rgba(74, 95, 58, 0.1);
      border: 2px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .flag-option:hover {
      background: rgba(74, 95, 58, 0.3);
      border-color: #8fbc8f;
      transform: translateY(-2px);
    }

    .flag-option img {
      width: 40px;
      height: 28px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }

    .flag-option span {
      font-size: 11px;
      color: #8fbc8f;
      text-align: center;
      font-family: 'Courier New', monospace;
    }

    /* Mobile Responsive for Identity Section */
    @media (max-width: 768px) {
      .identity-section {
        padding: 20px;
      }

      .section-title {
        font-size: 14px;
      }

      .callsign-input,
      .current-flag {
        padding: 10px 14px;
        font-size: 14px;
      }

      .flag-picker {
        max-width: 95vw;
      }

      .flag-grid {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 8px;
      }

      .flag-option {
        padding: 8px;
      }

      .flag-option img {
        width: 32px;
        height: 22px;
      }

      .flag-option span {
        font-size: 10px;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.updateAuthState();
    
    // Load stored flag
    this.currentFlag = localStorage.getItem('flag') || '';
    
    // Listen for auth state changes
    window.addEventListener('auth-state-changed', this.updateAuthState.bind(this));
    window.addEventListener('login-success', this.updateAuthState.bind(this));
    
    // Listen for username changes to update in real-time
    window.addEventListener('username-changed', this.handleUsernameChanged.bind(this));
    
    // Listen for stats updates
    window.addEventListener('stats-updated', this.handleStatsUpdate.bind(this));
    window.addEventListener('achievement-unlocked', this.handleAchievementUnlock.bind(this));
    
    // Handle moving between header and main section
    window.addEventListener('auth-state-changed', this.updatePosition.bind(this));
    
    // Listen for open-profile-dropdown event from UsernameInput
    window.addEventListener('open-profile-dropdown', this.handleOpenProfileDropdown.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('auth-state-changed', this.updateAuthState.bind(this));
    window.removeEventListener('login-success', this.updateAuthState.bind(this));
    window.removeEventListener('username-changed', this.handleUsernameChanged.bind(this));
    window.removeEventListener('open-profile-dropdown', this.handleOpenProfileDropdown.bind(this));
  }

  private async updateAuthState() {
    this.isLoggedIn = await authService.isAuthenticated();
    if (this.isLoggedIn) {
      this.user = await authService.getCurrentUser();
      if (this.user?.id) {
        await this.loadProfileData(this.user.id);
        
        // Check if user needs to accept terms of service
        await checkTermsAcceptance();
      }
    } else {
      // Check if we have a username from the input field
      const usernameInput = document.querySelector('username-input') as any;
      const currentUsername = usernameInput?.getCurrentUsername?.() || localStorage.getItem('username');
      
      if (currentUsername && currentUsername !== 'Anon000') {
        // Create a guest user object for display
        this.user = {
          id: 'guest-' + Date.now(),
          username: currentUsername,
          email: `${currentUsername}@guest.local`,
          tier: 'free',
          createdAt: new Date().toISOString()
        };
      } else {
        this.user = null;
      }
      this.profileData = null;
      this.error = null;
    }
    this.requestUpdate();
    this.updatePosition();
  }
  
  private updatePosition() {
    // No need to update position anymore since profile is just a modal
  }

  render() {
    // Check if this is a guest user
    const isGuest = this.user?.email?.endsWith('@guest.local') || false;

    return html`
        
        <!-- Revolutionary Profile Interface -->
        <div class="profile-overlay ${this.isOpen ? 'active' : ''}" @click=${this.closeProfile}>
          <div class="profile-modal" @click=${(e: Event) => e.stopPropagation()}>
            <button class="close-button" @click=${this.closeProfile}>×</button>
            
            <!-- Clean Profile Header -->
            <div class="command-header">
              <div class="profile-header-content">
                <!-- Square Flag with VIP-ready border -->
                <div class="flag-square" @click=${this.toggleFlagPicker} title="Change flag">
                  <div class="flag-square-border ${isGuest ? '' : 'authenticated'}">
                    <div class="flag-square-inner">
                      ${this.currentFlag ? html`
                        <img src="/flags/${this.currentFlag}.svg" alt="${this.getFlagName(this.currentFlag)}" class="flag-image" />
                      ` : html`
                        <span class="flag-placeholder">?</span>
                      `}
                    </div>
                  </div>
                </div>
                
                <!-- User Info -->
                <div class="user-info-section">
                  ${this.editingName ? html`
                    <input
                      type="text"
                      class="operator-name-input"
                      .value=${this.user?.username || ''}
                      @input=${this.handleUsernameChange}
                      @blur=${this.stopEditingName}
                      @keydown=${this.handleNameKeydown}
                      placeholder="Enter username"
                      maxlength="20"
                    />
                  ` : html`
                    <div class="operator-name editable" @click=${this.startEditingName}>
                      ${this.user?.username || 'UNKNOWN'}
                      <span class="edit-icon">✏️</span>
                    </div>
                  `}
                  <div class="user-level">Level ${this.calculateLevel()} ${isGuest ? '• Guest' : '• Active'}</div>
                </div>
              </div>
            </div>

            ${this.showFlagPicker ? html`
              <div class="flag-picker-overlay" @click=${this.closeFlagPicker}>
                <div class="flag-picker" @click=${(e: Event) => e.stopPropagation()}>
                  <input
                    type="text"
                    class="flag-search"
                    placeholder="Search countries..."
                    @input=${this.handleFlagSearch}
                    .value=${this.flagSearch}
                  />
                  <div class="flag-grid">
                    ${this.getFilteredFlags().map(country => html`
                      <div class="flag-option" @click=${() => this.selectFlag(country.code)}>
                        <img src="/flags/${country.code}.svg" alt="${country.name}" />
                        <span>${country.name}</span>
                      </div>
                    `)}
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Guest Warning Banner - Moved to top -->
            ${isGuest ? html`
              <div class="guest-warning">
                <div class="guest-warning-icon">⚠️</div>
                <div class="guest-warning-content">
                  <div class="guest-warning-title">TEMPORARY GUEST ACCOUNT</div>
                  <div class="guest-warning-text">
                    Your progress is saved locally. Create a full account to secure your stats permanently and sync across devices.
                  </div>
                  <button class="guest-upgrade-btn" @click=${this.handleSignIn}>
                    🔐 SECURE YOUR ACCOUNT NOW
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- Achievements -->
            <div class="achievements-section">
              <div class="achievements-header">
                <div class="achievements-title">🏆 ACHIEVEMENTS 🏆</div>
              </div>
              <achievement-grid></achievement-grid>
            </div>

            <!-- Advanced Statistics -->
            <div class="stats-dashboard">
              <div class="stats-header">
                <div class="stats-title">📊 OPERATIONAL ANALYTICS 📊</div>
              </div>
              <div class="stats-grid">
                ${this.renderAdvancedStats()}
              </div>
            </div>

            <!-- Upgrade Section - Only show for non-guest free users -->
            ${!isGuest ? this.renderUpgradeSection() : ''}

            <!-- Command Actions -->
            <div class="dropdown-items">
              ${isGuest ? html`
                <a class="dropdown-item" @click=${this.handleEnlist}>
                  <span class="dropdown-icon">👑</span>
                  ◦ UNLOCK PREMIUM FEATURES
                </a>
              ` : html`
                <a class="dropdown-item" @click=${this.handleProfile}>
                  <span class="dropdown-icon">🎖️</span>
                  ◦ DETAILED SERVICE RECORD
                </a>
                <a class="dropdown-item" @click=${this.handleSettings}>
                  <span class="dropdown-icon">⚙️</span>
                  ◦ TACTICAL CONFIGURATION
                </a>
                <a class="dropdown-item" @click=${this.handleEnlist}>
                  <span class="dropdown-icon">👑</span>
                  ◦ UNLOCK PREMIUM FEATURES
                </a>
              `}
              
              <div class="dropdown-divider"></div>
              
              <a class="dropdown-item danger" @click=${this.handleLogout}>
                <span class="dropdown-icon">🚪</span>
                ◦ ${isGuest ? 'CLEAR GUEST DATA' : 'TERMINATE SESSION'}
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderTierBadge() {
    if (!this.user?.tier || this.user.tier === 'free') return '';
    
    const tierClass = this.user.tier === 'premium' ? '' : this.user.tier;
    const tierLabel = this.user.tier.charAt(0).toUpperCase() + this.user.tier.slice(1);
    
    return html`
      <div class="tier-badge ${tierClass}">
        <span>⭐</span>
        ${tierLabel}
      </div>
    `;
  }

  public openProfile() {
    console.log('ProfileDropdown: openProfile() called, setting isOpen to true');
    this.isOpen = true;
    this.requestUpdate(); // Force a re-render
    // Hide the main logo/banner when profile is open
    const header = document.querySelector('.l-header') as HTMLElement;
    if (header) {
      header.style.display = 'none';
    }
  }

  private handleOpenProfileDropdown() {
    console.log('ProfileDropdown: Received open-profile-dropdown event');
    this.openProfile();
  }

  private closeProfile() {
    this.isOpen = false;
    // Show the main logo/banner when profile is closed
    const header = document.querySelector('.l-header') as HTMLElement;
    if (header) {
      header.style.display = '';
    }
  }

  private handleSignIn() {
    this.dispatchEvent(new CustomEvent('show-login', {
      bubbles: true,
      composed: true
    }));
  }

  private handleRegister() {
    this.dispatchEvent(new CustomEvent('show-register', {
      bubbles: true,
      composed: true
    }));
  }

  private handleProfile() {
    this.closeProfile();
    this.dispatchEvent(new CustomEvent('show-profile', {
      bubbles: true,
      composed: true,
      detail: { user: this.user }
    }));
  }

  private handleSettings() {
    this.closeProfile();
    this.dispatchEvent(new CustomEvent('show-account-settings', {
      bubbles: true,
      composed: true
    }));
  }

  private handleEnlist() {
    this.closeProfile();
    // Show subscription modal
    const modal = new SubscriptionModal();
    modal.show();
  }


  private async handleLogout() {
    this.closeProfile();
    await authService.logout();
    this.profileData = null;
    this.error = null;
    this.updateAuthState();
  }

  /**
   * Load complete profile data for the user
   */
  private async loadProfileData(userId: string) {
    this.isLoading = true;
    this.error = null;
    
    try {
      const profileData = await profileService.getProfile(userId);
      if (profileData) {
        this.profileData = profileData;
      } else {
        this.error = 'Failed to load profile data';
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      this.error = 'Unable to connect to profile service';
    } finally {
      this.isLoading = false;
      this.requestUpdate();
    }
  }

  /**
   * Handle stats update events from game completion
   */
  private async handleStatsUpdate(event: CustomEvent) {
    const { gameResult } = event.detail;
    console.log('Stats updated, refreshing profile:', gameResult);
    
    if (this.user?.id) {
      // Refresh profile data after stats update
      await this.loadProfileData(this.user.id);
    }
  }

  /**
   * Handle achievement unlock events
   */
  private handleAchievementUnlock(event: CustomEvent) {
    const { achievement } = event.detail;
    console.log('Achievement unlocked:', achievement.name);
    
    // Force profile refresh to show new achievement
    if (this.user?.id) {
      this.loadProfileData(this.user.id);
    }
  }

  /**
   * Handle real-time username changes from UsernameInput
   */
  private handleUsernameChanged(event: CustomEvent) {
    const { username, user } = event.detail;
    console.log('Username changed to:', username);
    
    if (user) {
      // Update user object with new username
      this.user = { ...this.user, ...user };
    } else if (this.user) {
      // Just update the username
      this.user = { ...this.user, username };
    } else {
      // Create a guest user object
      this.user = {
        id: 'guest-' + Date.now(),
        username: username,
        email: `${username}@guest.local`,
        tier: 'free',
        createdAt: new Date().toISOString()
      };
    }
    
    this.requestUpdate();
  }

  private startEditingName() {
    this.editingName = true;
    // Focus the input after render
    setTimeout(() => {
      const input = this.shadowRoot?.querySelector('.operator-name-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  }

  private stopEditingName() {
    this.editingName = false;
  }

  private async handleUsernameChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newUsername = input.value.trim();
    
    if (newUsername && newUsername !== this.user?.username) {
      // Update username in localStorage
      localStorage.setItem('username', newUsername);
      
      // Update the user object
      if (this.user) {
        this.user = { ...this.user, username: newUsername };
      }
      
      // Dispatch event to update username input component
      window.dispatchEvent(new CustomEvent('username-changed', {
        detail: { username: newUsername, user: this.user }
      }));
      
      // Update username input component if it exists
      const usernameInput = document.querySelector('username-input') as any;
      if (usernameInput && usernameInput.updateUsername) {
        usernameInput.updateUsername(newUsername);
      }
    }
  }

  private handleNameKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.stopEditingName();
    } else if (event.key === 'Escape') {
      this.editingName = false;
      this.requestUpdate();
    }
  }


  private calculateLevel(): number {
    if (this.profileData?.level !== undefined) {
      return this.profileData.level;
    }
    
    // Fallback calculation for when profile isn't loaded yet
    const experiencePoints = this.profileData?.experiencePoints || 0;
    if (experiencePoints === 0) return 0;
    
    return profileService.calculateLevel(experiencePoints).level;
  }


  private renderAdvancedStats() {
    // Show loading state if profile is being loaded
    if (this.isLoading) {
      return html`
        <div class="stat-card">
          <div class="stat-primary shimmer">...</div>
          <div class="stat-label">Loading...</div>
        </div>
      `;
    }
    
    // Show error state if profile failed to load
    if (this.error) {
      return html`
        <div class="stat-card error">
          <div class="stat-primary">⚠️</div>
          <div class="stat-label">Error</div>
          <div class="stat-secondary">${this.error}</div>
        </div>
      `;
    }
    
    // Use real profile data or fallback to empty stats for new users
    const stats = this.profileData?.stats || { 
      gamesPlayed: 0, 
      wins: 0, 
      losses: 0,
      winRate: 0,
      totalPlayTime: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      lastPlayedAt: '',
      accountCreatedAt: new Date().toISOString(),
      daysActive: 0,
      averageGameDuration: 0,
      kdRatio: 0
    };
    
    const level = this.calculateLevel();
    const experienceToNext = this.profileData?.experienceToNextLevel || 0;
    
    // Calculate level progress
    let nextLevelProgress = 0;
    let progressText = '';
    
    if (level === 0 && stats.gamesPlayed === 0) {
      nextLevelProgress = 0;
      progressText = 'Play first game to gain experience';
    } else if (experienceToNext > 0) {
      const currentLevelExp = level * level * 100;
      const nextLevelExp = (level + 1) * (level + 1) * 100;
      const earnedInLevel = nextLevelExp - experienceToNext;
      const totalNeededInLevel = nextLevelExp - currentLevelExp;
      nextLevelProgress = (earnedInLevel / totalNeededInLevel) * 100;
      progressText = `${profileService.formatNumber(experienceToNext)} EXP to next level`;
    } else {
      nextLevelProgress = 100;
      progressText = 'Max level reached';
    }

    return html`
      <div class="stat-card">
        <div class="stat-primary">${level}</div>
        <div class="stat-label">Current Level</div>
        <div class="stat-secondary">${progressText}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${nextLevelProgress}%"></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-primary">${profileService.formatNumber(stats.gamesPlayed)}</div>
        <div class="stat-label">Total Battles</div>
        <div class="stat-secondary">${profileService.formatNumber(stats.wins)}W / ${profileService.formatNumber(stats.losses)}L</div>
      </div>

      <div class="stat-card">
        <div class="stat-primary">${stats.winRate.toFixed(1)}%</div>
        <div class="stat-label">Victory Rate</div>
        <div class="stat-secondary">${profileService.formatNumber(stats.wins)} victories</div>
      </div>

      <div class="stat-card">
        <div class="stat-primary">${profileService.formatDuration(stats.totalPlayTime)}</div>
        <div class="stat-label">Time Served</div>
        <div class="stat-secondary">${stats.daysActive} days active</div>
      </div>

      <div class="stat-card">
        <div class="stat-primary">${stats.currentWinStreak}</div>
        <div class="stat-label">Current Streak</div>
        <div class="stat-secondary">Best: ${stats.longestWinStreak}</div>
      </div>

      <div class="stat-card">
        <div class="stat-primary">${this.profileData?.tier?.toUpperCase() || 'FREE'}</div>
        <div class="stat-label">Access Tier</div>
        <div class="stat-secondary">
          ${this.profileData?.tier === 'free' ? 'Standard Access' : 'Premium features unlocked'}
        </div>
      </div>
    `;
  }

  private renderUpgradeSection() {
    if (this.profileData?.tier !== 'free') return '';
    
    return html`
      <div class="upgrade-section">
        <div class="upgrade-card-standalone">
          <div class="upgrade-content">
            <div class="upgrade-icon">🚀</div>
            <div class="upgrade-text">
              <div class="upgrade-title">Unlock Premium Features</div>
              <div class="upgrade-subtitle">Enhanced gameplay, exclusive content & more</div>
            </div>
            <button class="upgrade-btn-large" @click=${this.handleEnlist}>
              ENLIST NOW
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Handle username input in the profile modal
  private async handleUsernameChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const newUsername = input.value.trim();
    
    if (!newUsername) return;
    
    // Store username
    localStorage.setItem('username', newUsername);
    
    // Update user object
    if (this.user) {
      this.user = { ...this.user, username: newUsername };
      
      // Update cached auth user
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        const updatedUser = { ...currentUser, username: newUsername };
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
    } else {
      // Create guest user
      this.user = {
        id: 'guest-' + Date.now(),
        username: newUsername,
        email: `${newUsername}@guest.local`,
        tier: 'free',
        createdAt: new Date().toISOString()
      };
    }
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('username-changed', {
      detail: { username: newUsername, user: this.user }
    }));
    
    this.requestUpdate();
  }

  // Username editing methods
  private startEditingName() {
    this.editingName = true;
    this.requestUpdate();
    // Focus the input after render
    setTimeout(() => {
      const input = this.shadowRoot?.querySelector('.operator-name-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  private stopEditingName() {
    this.editingName = false;
    this.requestUpdate();
  }

  private handleNameKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.stopEditingName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      // Reset to original value
      const input = event.target as HTMLInputElement;
      input.value = this.user?.username || '';
      this.stopEditingName();
    }
  }

  // Flag picker methods
  private toggleFlagPicker() {
    this.showFlagPicker = !this.showFlagPicker;
  }

  private closeFlagPicker() {
    this.showFlagPicker = false;
    this.flagSearch = '';
  }

  private handleFlagSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    this.flagSearch = input.value.toLowerCase();
  }

  private getFilteredFlags() {
    if (!this.flagSearch) {
      return Countries;
    }
    
    return Countries.filter(country => 
      country.name.toLowerCase().includes(this.flagSearch) ||
      country.code.toLowerCase().includes(this.flagSearch)
    );
  }

  private getFlagName(code: string): string {
    const country = Countries.find(c => c.code === code);
    return country ? country.name : code.toUpperCase();
  }

  private selectFlag(code: string) {
    this.currentFlag = code;
    localStorage.setItem('flag', code);
    this.closeFlagPicker();
    
    // Update the flag input if it exists
    const flagInput = document.querySelector('flag-input') as any;
    if (flagInput && flagInput.setFlag) {
      flagInput.setFlag(code);
    }
    
    // Dispatch flag change event
    window.dispatchEvent(new CustomEvent('flag-changed', {
      detail: { flag: code }
    }));
  }

  private toggleFlagPicker() {
    // Instead of showing our own flag picker, trigger the UsernameInput flag modal
    const usernameInput = document.querySelector('username-input') as any;
    if (usernameInput && usernameInput.openFlagModal) {
      usernameInput.openFlagModal();
    } else {
      console.warn('UsernameInput component not found or openFlagModal method not available');
    }
  }

  public openFlagPicker() {
    // Use the same logic as toggleFlagPicker
    this.toggleFlagPicker();
  }

  private closeFlagPicker() {
    this.showFlagPicker = false;
    this.flagSearch = '';
  }

  private handleFlagSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.flagSearch = input.value;
  }

  private getFilteredFlags() {
    if (!this.flagSearch) return Countries;
    
    const search = this.flagSearch.toLowerCase();
    return Countries.filter(country => 
      country.name.toLowerCase().includes(search) ||
      country.code.toLowerCase().includes(search)
    );
  }

  private getFlagName(code: string): string {
    const country = Countries.find(c => c.code === code);
    return country?.name || 'Unknown';
  }
}