import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { authService, User } from "./AuthService";
import { profileService, ProfileData, GameStats } from "./ProfileService";
import { achievementService } from "./AchievementService";
import { statsTracker } from "./StatsTracker";
import "./AchievementGrid";
import { SubscriptionModal } from "../SubscriptionModal";
import { checkTermsAcceptance } from "./TermsAcceptanceModal";

@customElement("profile-dropdown")
export class ProfileDropdown extends LitElement {
  @state() private isOpen = false;
  @state() private user: User | null = null;
  @state() private isLoggedIn = false;
  @state() private profileData: ProfileData | null = null;
  @state() private isLoading = false;
  @state() private error: string | null = null;

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

    /* Minimal Profile Button - Optimized for all screens */
    .profile-trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: rgba(74, 95, 58, 0.1);
      border: 1px solid rgba(74, 95, 58, 0.3);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: 600;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
      max-width: fit-content;
    }

    .profile-trigger:hover {
      background: rgba(74, 95, 58, 0.2);
      border-color: rgba(143, 188, 143, 0.5);
      color: #ffffff;
    }

    .profile-trigger.active {
      background: rgba(74, 95, 58, 0.3);
      border-color: #8fbc8f;
      color: #ffffff;
    }

    .profile-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%);
      border: 1px solid #5a7f4a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 9px;
      color: #fff;
      text-transform: uppercase;
      overflow: hidden;
      font-family: 'Courier New', monospace;
      flex-shrink: 0;
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

    /* Revolutionary Command Profile Interface */
    .profile-modal {
      background: 
        linear-gradient(135deg, #0a1f0a 0%, #051505 50%, #020a02 100%),
        radial-gradient(ellipse at top, rgba(74, 95, 58, 0.15) 0%, transparent 70%),
        radial-gradient(ellipse at bottom, rgba(26, 47, 26, 0.1) 0%, transparent 70%);
      border: 4px solid transparent;
      background-clip: padding-box;
      border-radius: 32px;
      width: 100%;
      max-width: 750px;
      max-height: 80vh;
      overflow-y: auto;
      transform: translateY(40px) scale(0.85) rotateX(8deg);
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 
        0 60px 120px rgba(0, 0, 0, 0.8),
        0 30px 60px rgba(74, 95, 58, 0.2),
        0 15px 30px rgba(143, 188, 143, 0.1),
        0 0 0 1px rgba(74, 95, 58, 0.4),
        inset 0 2px 0 rgba(255, 255, 255, 0.1),
        inset 0 -2px 0 rgba(0, 0, 0, 0.3);
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

    /* Mobile Responsive Design - ENHANCED */
    @media (max-width: 768px) {
      /* Profile trigger button optimization */
      .profile-trigger {
        font-size: 10px;
        padding: 4px 6px;
        gap: 4px;
        letter-spacing: 0.3px;
      }
      
      .profile-avatar {
        width: 18px;
        height: 18px;
        font-size: 8px;
        border-width: 1px;
      }
      
      .profile-username {
        font-size: 10px;
        max-width: 70px;
        letter-spacing: 0.3px;
      }
      
      /* Modal optimizations */
      .profile-overlay {
        padding: 10px;
      }
      
      .profile-modal {
        max-width: 95vw;
        max-height: 90vh;
        border-radius: 16px;
        margin: 0;
        border-width: 2px;
      }

      .command-header {
        padding: 20px 16px 0 16px;
      }
      
      .command-header::before {
        font-size: 10px;
        letter-spacing: 1px;
      }

      .operator-card {
        grid-template-columns: 60px 1fr;
        gap: 12px;
      }

      .clearance-badge {
        grid-column: 1 / -1;
        margin-top: 12px;
        padding: 12px;
        align-self: center;
        justify-self: center;
      }

      .operator-avatar {
        width: 60px;
        height: 60px;
        font-size: 24px;
        border: 3px solid #5a7f4a;
      }
      
      .operator-info {
        gap: 4px;
      }
      
      .operator-rank {
        font-size: 11px;
        letter-spacing: 1px;
      }

      .operator-name {
        font-size: 20px;
        letter-spacing: 1.5px;
      }
      
      .operator-designation {
        font-size: 10px;
      }
      
      .clearance-level {
        font-size: 18px;
      }
      
      .clearance-status {
        font-size: 9px;
      }

      .achievements-section,
      .medals-section,
      .stats-dashboard {
        padding: 20px 16px;
      }
      
      .achievements-title,
      .stats-title {
        font-size: 14px;
        letter-spacing: 1px;
      }

      .medals-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .achievement-path {
        padding: 16px;
      }
      
      .path-name {
        font-size: 12px;
      }
      
      .tier-icon {
        font-size: 24px;
      }
      
      .tier-name {
        font-size: 14px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .stat-card {
        padding: 16px;
      }
      
      .stat-primary {
        font-size: 24px;
      }
      
      .stat-label {
        font-size: 10px;
      }
      
      .stat-secondary {
        font-size: 12px;
      }
      
      .upgrade-section {
        padding: 20px 16px;
      }
      
      .upgrade-content {
        flex-direction: column;
        text-align: center;
        gap: 12px;
      }
      
      .upgrade-icon {
        font-size: 28px;
      }
      
      .upgrade-title {
        font-size: 16px;
      }
      
      .upgrade-subtitle {
        font-size: 11px;
      }
      
      .upgrade-btn-large {
        width: 100%;
        padding: 14px 20px;
        font-size: 13px;
      }

      .dropdown-items {
        padding: 12px 0;
      }

      .dropdown-item {
        padding: 12px 16px;
        font-size: 12px;
        gap: 10px;
      }
      
      .dropdown-icon {
        width: 18px;
        height: 18px;
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
      /* Ultra-compact profile trigger */
      .profile-trigger {
        font-size: 9px;
        padding: 3px 5px;
        gap: 3px;
        letter-spacing: 0.3px;
      }
      
      .profile-avatar {
        width: 16px;
        height: 16px;
        font-size: 8px;
      }
      
      .profile-username {
        font-size: 9px;
        max-width: 60px;
        letter-spacing: 0.2px;
      }
      
      /* Modal fine-tuning for small screens */
      .profile-modal {
        border-radius: 12px;
        max-height: 95vh;
      }

      .command-header {
        padding: 16px 12px 0 12px;
      }

      .operator-avatar {
        width: 50px;
        height: 50px;
        font-size: 20px;
        border: 2px solid #5a7f4a;
      }

      .operator-name {
        font-size: 18px;
        letter-spacing: 1px;
      }

      .clearance-level {
        font-size: 16px;
      }
      
      .clearance-badge {
        padding: 10px;
      }

      .achievements-section,
      .medals-section,
      .stats-dashboard {
        padding: 16px 12px;
      }

      .medals-grid,
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      
      .achievement-path {
        padding: 12px;
      }

      .stat-primary {
        font-size: 20px;
      }
      
      .stat-card {
        padding: 12px;
      }

      .medal-icon {
        font-size: 24px;
      }

      .dropdown-item {
        padding: 10px 12px;
        font-size: 11px;
        gap: 8px;
        letter-spacing: 0.5px;
      }

      .close-button {
        width: 32px;
        height: 32px;
        font-size: 16px;
        top: 12px;
        right: 12px;
      }
      
      .guest-warning {
        margin: 12px;
        padding: 12px;
      }
      
      .guest-warning-icon {
        font-size: 28px;
        margin-bottom: 8px;
      }
      
      .guest-warning-title {
        font-size: 13px;
      }
      
      .guest-warning-text {
        font-size: 11px;
        line-height: 1.4;
      }
      
      .guest-upgrade-btn {
        padding: 8px 16px;
        font-size: 11px;
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

    /* Command Header Interface */
    .command-header {
      position: relative;
      padding: 40px 40px 0 40px;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.1) 0%, rgba(26, 47, 26, 0.15) 100%);
      border-bottom: 3px solid rgba(74, 95, 58, 0.3);
      z-index: 10;
    }

    .command-header::before {
      content: '◤ SOVEREIGN COMMAND INTERFACE ◥';
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      color: #8fbc8f;
      font-size: 12px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.8;
    }

    .operator-card {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 24px;
      align-items: center;
      margin-bottom: 24px;
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
      gap: 8px;
    }

    .operator-rank {
      font-size: 14px;
      font-weight: 600;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.9;
      font-family: 'Courier New', monospace;
    }

    .operator-name {
      font-size: 32px;
      font-weight: 900;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 3px;
      font-family: 'Courier New', monospace;
      text-shadow: 
        0 4px 8px rgba(0, 0, 0, 0.8),
        0 0 20px rgba(143, 188, 143, 0.4);
      position: relative;
    }

    .operator-designation {
      font-size: 12px;
      font-weight: 600;
      color: #4a6f3a;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.8;
      font-family: 'Courier New', monospace;
    }

    .clearance-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: 
        radial-gradient(circle, rgba(74, 95, 58, 0.2) 0%, rgba(26, 47, 26, 0.1) 100%);
      border: 2px solid rgba(143, 188, 143, 0.4);
      border-radius: 16px;
      position: relative;
    }

    .clearance-level {
      font-size: 24px;
      font-weight: 900;
      color: #8fbc8f;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 10px rgba(143, 188, 143, 0.5);
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
      padding: 24px 28px;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(74, 95, 58, 0.1) 100%),
        linear-gradient(45deg, rgba(26, 47, 26, 0.3) 0%, rgba(15, 31, 15, 0.4) 100%);
      border-bottom: 2px solid rgba(74, 95, 58, 0.4);
      display: flex;
      align-items: center;
      gap: 20px;
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
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%);
      border: 3px solid #5a7f3a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 24px;
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
      font-size: 18px;
      font-weight: 700;
      color: #8fbc8f;
      margin: 0 0 4px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown-email {
      font-size: 13px;
      color: rgba(143, 188, 143, 0.7);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Achievements Section */
    .achievements-section {
      padding: 24px 20px;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(26, 47, 26, 0.15) 100%);
      border-bottom: 3px solid rgba(74, 95, 58, 0.3);
      position: relative;
      z-index: 10;
    }

    .achievements-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 16px;
      position: relative;
    }

    .achievements-title {
      font-size: 18px;
      font-weight: 900;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 12px rgba(143, 188, 143, 0.4);
    }

    .medals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .achievement-path {
      padding: 24px;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.1) 0%, rgba(26, 47, 26, 0.15) 100%);
      border: 2px solid rgba(74, 95, 58, 0.4);
      border-radius: 16px;
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
      margin-bottom: 16px;
      text-align: center;
    }

    .path-name {
      font-size: 14px;
      font-weight: 900;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
      margin-bottom: 4px;
    }

    .achievement-path.earned .path-name {
      color: #ffd700;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
    }

    .path-subtitle {
      font-size: 10px;
      color: rgba(143, 188, 143, 0.7);
      font-style: italic;
      font-family: 'Courier New', monospace;
    }

    .current-tier {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }

    .tier-icon {
      font-size: 32px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
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
      font-size: 16px;
      font-weight: 700;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
      margin-bottom: 4px;
    }

    .achievement-path.earned .tier-name {
      color: #ffd700;
    }

    .tier-progress {
      font-size: 12px;
      color: rgba(143, 188, 143, 0.8);
      font-family: 'Courier New', monospace;
    }

    .progress-container {
      margin-top: 16px;
    }

    .next-tier {
      font-size: 10px;
      color: rgba(143, 188, 143, 0.6);
      text-align: center;
      margin-top: 8px;
      font-family: 'Courier New', monospace;
    }

    /* Advanced Stats Dashboard */
    .stats-dashboard {
      padding: 32px 40px;
      background: 
        linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(26, 47, 26, 0.2) 100%);
      border-bottom: 3px solid rgba(74, 95, 58, 0.3);
      position: relative;
      z-index: 10;
    }

    .stats-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .stats-title {
      font-size: 18px;
      font-weight: 900;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 12px rgba(143, 188, 143, 0.4);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
    }

    .stat-card {
      padding: 24px;
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.15) 0%, rgba(26, 47, 26, 0.1) 100%);
      border: 2px solid rgba(74, 95, 58, 0.4);
      border-radius: 16px;
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
      font-size: 32px;
      font-weight: 900;
      color: #8fbc8f;
      margin-bottom: 8px;
      text-shadow: 0 0 12px rgba(143, 188, 143, 0.5);
      font-family: 'Courier New', monospace;
      line-height: 1;
    }

    .stat-label {
      font-size: 12px;
      color: rgba(143, 188, 143, 0.8);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      margin-bottom: 12px;
    }

    .stat-secondary {
      font-size: 14px;
      color: #4a6f3a;
      font-family: 'Courier New', monospace;
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(26, 47, 26, 0.3);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 8px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4a5f3a, #8fbc8f);
      border-radius: 3px;
      transition: width 0.8s ease;
      box-shadow: 0 0 8px rgba(143, 188, 143, 0.4);
    }

    /* Command Menu Interface */
    .dropdown-items {
      padding: 16px 0;
      position: relative;
      z-index: 2;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 28px;
      color: #8fbc8f;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-left: 4px solid transparent;
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
      text-shadow: 0 0 8px rgba(143, 188, 143, 0.4);
      transform: translateX(8px);
    }

    .dropdown-item:hover::before {
      opacity: 1;
    }

    .dropdown-icon {
      width: 20px;
      height: 20px;
      opacity: 0.7;
    }

    .dropdown-divider {
      height: 1px;
      background: rgba(74, 95, 58, 0.2);
      margin: 8px 0;
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
      border: 2px solid #4a5f3a;
      color: white;
      padding: 6px 16px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .upgrade-btn:hover {
      background: linear-gradient(135deg, #7aa67a 0%, #3a4f2a 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(74, 95, 58, 0.4);
    }

    .upgrade-card {
      border: 2px solid #8fbc8f;
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
      padding: 24px 40px 32px 40px;
      position: relative;
      z-index: 10;
    }

    .upgrade-card-standalone {
      background: linear-gradient(135deg, rgba(143, 188, 143, 0.15) 0%, rgba(74, 95, 58, 0.1) 100%);
      border: 2px solid rgba(143, 188, 143, 0.4);
      border-radius: 16px;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    .upgrade-card-standalone::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(45deg, rgba(143, 188, 143, 0.3), rgba(74, 95, 58, 0.2));
      border-radius: 18px;
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
      gap: 20px;
      justify-content: space-between;
    }

    .upgrade-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .upgrade-text {
      flex: 1;
    }

    .upgrade-title {
      font-size: 18px;
      font-weight: 900;
      color: #8fbc8f;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
      margin-bottom: 4px;
    }

    .upgrade-subtitle {
      font-size: 12px;
      color: rgba(143, 188, 143, 0.8);
      font-family: 'Courier New', monospace;
    }

    .upgrade-btn-large {
      background: linear-gradient(135deg, #8fbc8f 0%, #4a5f3a 100%);
      border: 2px solid #4a5f3a;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
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
      margin: 24px 40px;
      padding: 20px;
      background: 
        linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%);
      border: 2px solid rgba(255, 193, 7, 0.4);
      border-radius: 16px;
      position: relative;
      overflow: hidden;
    }

    .guest-warning::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
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
      font-size: 48px;
      text-align: center;
      margin-bottom: 12px;
      filter: drop-shadow(0 0 10px rgba(255, 193, 7, 0.5));
    }

    .guest-warning-content {
      text-align: center;
    }

    .guest-warning-title {
      font-size: 18px;
      font-weight: 900;
      color: #ffc107;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
    }

    .guest-warning-text {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.6;
      margin-bottom: 16px;
      font-family: 'Courier New', monospace;
    }

    .guest-upgrade-btn {
      background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
      border: 2px solid #ff9800;
      color: #000;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 
        0 4px 12px rgba(255, 193, 7, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    .guest-upgrade-btn:hover {
      background: linear-gradient(135deg, #ffca28 0%, #ffa726 100%);
      transform: translateY(-2px);
      box-shadow: 
        0 6px 20px rgba(255, 193, 7, 0.4),
        0 0 30px rgba(255, 193, 7, 0.2);
    }

    /* Mobile responsive for guest warning */
    @media (max-width: 768px) {
      .guest-warning {
        margin: 20px;
        padding: 16px;
      }

      .guest-warning-icon {
        font-size: 36px;
      }

      .guest-warning-title {
        font-size: 16px;
      }

      .guest-warning-text {
        font-size: 13px;
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
  `;

  connectedCallback() {
    super.connectedCallback();
    this.updateAuthState();
    
    // Listen for auth state changes
    window.addEventListener('auth-state-changed', this.updateAuthState.bind(this));
    window.addEventListener('login-success', this.updateAuthState.bind(this));
    
    // Listen for stats updates
    window.addEventListener('stats-updated', this.handleStatsUpdate.bind(this));
    window.addEventListener('achievement-unlocked', this.handleAchievementUnlock.bind(this));
    
    // Handle moving between header and main section
    window.addEventListener('auth-state-changed', this.updatePosition.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('auth-state-changed', this.updateAuthState.bind(this));
    window.removeEventListener('login-success', this.updateAuthState.bind(this));
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
      this.user = null;
      this.profileData = null;
      this.error = null;
    }
    this.requestUpdate();
    this.updatePosition();
  }
  
  private updatePosition() {
    const authSection = document.querySelector('.auth-section-main') as HTMLElement;
    
    if (!authSection) return;
    
    // Always keep profile in main section above flag area, never move to header
    if (this.parentElement !== authSection) {
      authSection.appendChild(this);
    }
    
    // Fix spacing issues
    if (this.isLoggedIn) {
      authSection.style.marginBottom = '20px';
      authSection.style.textAlign = 'center';
      authSection.style.display = 'block';
    } else {
      authSection.style.marginBottom = '20px';  
      authSection.style.textAlign = 'center';
      authSection.style.display = 'block';
    }
  }

  render() {
    if (!this.isLoggedIn) {
      return html`
        <div class="profile-section">
          <div class="profile-logged-out">
            <button 
              class="auth-button auth-button--primary" 
              @click=${this.handleSignIn}
              @mouseenter=${(e: MouseEvent) => {
                const btn = e.target as HTMLButtonElement;
                btn.style.background = 'linear-gradient(135deg, #5a7f3a 0%, #4a6f2a 100%)';
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.6), 0 0 30px rgba(90, 127, 58, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                btn.style.borderColor = '#6a8f4a';
              }}
              @mouseleave=${(e: MouseEvent) => {
                const btn = e.target as HTMLButtonElement;
                btn.style.background = 'linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%)';
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -2px 0 rgba(0, 0, 0, 0.3)';
                btn.style.borderColor = '#5a7f3a';
              }}
              style="
                background: linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%) !important;
                color: #ffffff !important;
                border: 2px solid #5a7f3a !important;
                padding: 14px 36px !important;
                font-size: 16px !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                letter-spacing: 1.5px !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                font-family: 'Courier New', monospace !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -2px 0 rgba(0, 0, 0, 0.3) !important;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 255, 255, 0.1) !important;
                position: relative !important;
                overflow: hidden !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              "
            >
              ENLIST
            </button>
          </div>
        </div>
      `;
    }

    // Check if this is a guest user
    const isGuest = this.user?.email?.endsWith('@guest.local') || false;

    return html`
      <div class="profile-section">
        <div class="profile-trigger" @click=${this.openProfile}>
          <div class="profile-avatar">
            ${this.user?.avatar ? html`
              <img src=${this.user.avatar} alt="${this.user.username}" />
            ` : html`
              ${this.user?.username?.[0] || '?'}
            `}
          </div>
          <span class="profile-username">${this.user?.username || 'Operative'}</span>
        </div>
        
        <!-- Revolutionary Profile Interface -->
        <div class="profile-overlay ${this.isOpen ? 'active' : ''}" @click=${this.closeProfile}>
          <div class="profile-modal" @click=${(e: Event) => e.stopPropagation()}>
            <button class="close-button" @click=${this.closeProfile}>×</button>
            
            <!-- Command Header -->
            <div class="command-header">
              <div class="operator-card">
                <div class="operator-avatar">
                  ${this.user?.avatar ? html`
                    <img src=${this.user.avatar} alt="${this.user.username}" />
                  ` : html`
                    ${this.user?.username?.[0] || '?'}
                  `}
                </div>
                <div class="operator-info">
                  <div class="operator-rank">◤ ${isGuest ? 'GUEST OPERATIVE' : 'FIELD OPERATIVE'} ◥</div>
                  <div class="operator-name">${this.user?.username || 'UNKNOWN'}</div>
                  <div class="operator-designation">✦ ${isGuest ? 'TEMPORARY ACCESS' : 'SOVEREIGN LINES COMMAND'}</div>
                </div>
                <div class="clearance-badge">
                  <div class="clearance-indicator"></div>
                  <div class="clearance-level">LVL ${this.calculateLevel()}</div>
                  <div class="clearance-status">${isGuest ? 'GUEST' : 'ACTIVE'}</div>
                </div>
              </div>
            </div>

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

  private openProfile() {
    this.isOpen = true;
    // Hide the main logo/banner when profile is open
    const header = document.querySelector('.l-header') as HTMLElement;
    if (header) {
      header.style.display = 'none';
    }
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
}