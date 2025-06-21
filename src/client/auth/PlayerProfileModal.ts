import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SimpleAuthService } from "./SimpleAuthService";
import { translateText } from "../Utils";

@customElement("player-profile-modal")
export class PlayerProfileModal extends LitElement {
  @property({ type: Boolean }) open = false;
  @state() private activeTab: 'profile' | 'stats' | 'badges' = 'profile';
  
  private authService = SimpleAuthService.getInstance();
  private profile = this.authService.getProfile();
  private stats = this.authService.getStats();

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      pointer-events: none;
    }

    .backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      pointer-events: auto;
    }

    .modal {
      position: relative;
      background: #1a1a1a;
      border: 2px solid #444;
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
    }

    .header {
      background: #2a2a2a;
      padding: 16px 20px;
      border-bottom: 1px solid #444;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .title {
      font-size: 20px;
      font-weight: bold;
      color: #4ade80;
    }

    .close-button {
      background: none;
      border: none;
      color: #999;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .close-button:hover {
      color: #fff;
    }

    .tabs {
      display: flex;
      background: #2a2a2a;
      border-bottom: 1px solid #444;
    }

    .tab {
      flex: 1;
      padding: 12px;
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }

    .tab:hover {
      color: #fff;
    }

    .tab.active {
      color: #4ade80;
      border-bottom-color: #4ade80;
    }

    .content {
      padding: 20px;
      overflow-y: auto;
      max-height: calc(90vh - 140px);
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #333;
    }

    .flag {
      font-size: 48px;
      line-height: 1;
    }

    .profile-info {
      flex: 1;
    }

    .username {
      font-size: 24px;
      font-weight: bold;
      color: #fff;
      margin-bottom: 8px;
    }

    .rank {
      font-size: 16px;
      color: #4ade80;
      margin-bottom: 4px;
    }

    .play-stats {
      font-size: 14px;
      color: #999;
    }

    .progress-section {
      margin-bottom: 32px;
    }

    .progress-label {
      font-size: 14px;
      color: #999;
      margin-bottom: 8px;
    }

    .progress-bar {
      background: #333;
      height: 24px;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      background: #4ade80;
      height: 100%;
      transition: width 0.3s ease;
    }

    .progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      color: #fff;
      font-weight: bold;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: #2a2a2a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 16px;
    }

    .stat-label {
      font-size: 14px;
      color: #999;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #4ade80;
    }

    .building-stats {
      background: #2a2a2a;
      border: 1px solid #333;
      border-radius: 8px;
      overflow: hidden;
    }

    .stats-table {
      width: 100%;
      border-collapse: collapse;
    }

    .stats-table th {
      background: #333;
      padding: 12px;
      text-align: left;
      font-size: 14px;
      color: #999;
      font-weight: normal;
    }

    .stats-table td {
      padding: 12px;
      border-top: 1px solid #333;
      font-size: 14px;
      color: #fff;
    }

    .stats-table tr:hover {
      background: #333;
    }

    .badges-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 16px;
    }

    .badge {
      aspect-ratio: 1;
      background: #2a2a2a;
      border: 2px solid #333;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      transition: all 0.2s;
      cursor: pointer;
    }

    .badge:hover {
      border-color: #4ade80;
      transform: scale(1.05);
    }

    .badge.locked {
      opacity: 0.3;
      cursor: default;
    }

    .badge.locked:hover {
      border-color: #333;
      transform: none;
    }

    @media (max-width: 600px) {
      .modal {
        width: 100%;
        height: 100%;
        max-height: 100vh;
        border-radius: 0;
      }

      .content {
        max-height: calc(100vh - 140px);
      }

      .profile-header {
        flex-direction: column;
        text-align: center;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  render() {
    if (!this.open) return null;

    return html`
      <div class="backdrop" @click=${this.close}></div>
      <div class="modal">
        <div class="header">
          <div class="title">${translateText("profile.title")}</div>
          <button class="close-button" @click=${this.close}>×</button>
        </div>

        <div class="tabs">
          <button 
            class="tab ${this.activeTab === 'profile' ? 'active' : ''}"
            @click=${() => this.activeTab = 'profile'}
          >
            ${translateText("profile.tab_profile")}
          </button>
          <button 
            class="tab ${this.activeTab === 'stats' ? 'active' : ''}"
            @click=${() => this.activeTab = 'stats'}
          >
            ${translateText("profile.tab_stats")}
          </button>
          <button 
            class="tab ${this.activeTab === 'badges' ? 'active' : ''}"
            @click=${() => this.activeTab = 'badges'}
          >
            ${translateText("profile.tab_badges")}
          </button>
        </div>

        <div class="content">
          ${this.activeTab === 'profile' ? this.renderProfile() : ''}
          ${this.activeTab === 'stats' ? this.renderStats() : ''}
          ${this.activeTab === 'badges' ? this.renderBadges() : ''}
        </div>
      </div>
    `;
  }

  private renderProfile() {
    if (!this.profile) return html`<div>No profile data</div>`;

    const rankName = this.authService.getRankName(this.profile.rank);
    const nextRank = this.authService.getRankName(this.profile.rank + 1);
    const progress = this.calculateRankProgress();

    return html`
      <div class="profile-header">
        <div class="flag">${this.profile.flag || '🏳️'}</div>
        <div class="profile-info">
          <div class="username">${this.profile.username}</div>
          <div class="rank">${rankName}</div>
          <div class="play-stats">
            ${translateText("profile.wins")}: ${this.profile.wins} | 
            ${translateText("profile.play_time")}: ${this.formatPlayTime(this.profile.playTimeSeconds)}
          </div>
        </div>
      </div>

      ${this.profile.rank < 4 ? html`
        <div class="progress-section">
          <div class="progress-label">
            ${translateText("profile.progress_to")} ${nextRank}
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
            <div class="progress-text">${Math.floor(progress)}%</div>
          </div>
        </div>
      ` : ''}

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">${translateText("profile.total_games")}</div>
          <div class="stat-value">${this.stats.totalGamesPlayed}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${translateText("profile.win_rate")}</div>
          <div class="stat-value">${this.calculateWinRate()}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${translateText("profile.current_streak")}</div>
          <div class="stat-value">${this.stats.winStreak}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${translateText("profile.best_streak")}</div>
          <div class="stat-value">${this.stats.bestWinStreak}</div>
        </div>
      </div>
    `;
  }

  private renderStats() {
    const buildingTypes = [
      { key: 'City', label: translateText("units.city") },
      { key: 'DefensePost', label: translateText("units.defense_post") },
      { key: 'Port', label: translateText("units.port") },
      { key: 'Warship', label: translateText("units.warship") },
      { key: 'MissileSilo', label: translateText("units.missile_silo") },
      { key: 'SAMLauncher', label: translateText("units.sam_launcher") }
    ];

    return html`
      <div class="building-stats">
        <table class="stats-table">
          <thead>
            <tr>
              <th>${translateText("profile.building")}</th>
              <th>${translateText("profile.built")}</th>
              <th>${translateText("profile.destroyed")}</th>
              <th>${translateText("profile.ratio")}</th>
            </tr>
          </thead>
          <tbody>
            ${buildingTypes.map(type => {
              const built = this.stats.unitsBuilt[type.key] || 0;
              const destroyed = this.stats.unitsDestroyed[type.key] || 0;
              const ratio = destroyed > 0 ? (built / destroyed).toFixed(2) : built.toString();
              
              return html`
                <tr>
                  <td>${type.label}</td>
                  <td>${built}</td>
                  <td>${destroyed}</td>
                  <td>${ratio}</td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderBadges() {
    const allBadges = [
      { id: 'first_win', icon: '🏆', name: translateText("badges.first_win"), locked: !this.hasBadge('first_win') },
      { id: '10_wins', icon: '⭐', name: translateText("badges.10_wins"), locked: !this.hasBadge('10_wins') },
      { id: '100_wins', icon: '💫', name: translateText("badges.100_wins"), locked: !this.hasBadge('100_wins') },
      { id: 'contributor', icon: '💻', name: translateText("badges.contributor"), locked: !this.hasBadge('contributor') },
      { id: 'translator', icon: '🌐', name: translateText("badges.translator"), locked: !this.hasBadge('translator') },
      { id: 'beta_tester', icon: '🧪', name: translateText("badges.beta_tester"), locked: !this.hasBadge('beta_tester') },
      { id: 'supporter', icon: '❤️', name: translateText("badges.supporter"), locked: !this.hasBadge('supporter') }
    ];

    return html`
      <div class="badges-grid">
        ${allBadges.map(badge => html`
          <div class="badge ${badge.locked ? 'locked' : ''}" title="${badge.name}">
            ${badge.icon}
          </div>
        `)}
      </div>
    `;
  }

  private hasBadge(badgeId: string): boolean {
    return this.profile?.badges.includes(badgeId) || false;
  }

  private calculateRankProgress(): number {
    if (!this.profile) return 0;
    
    const { wins, playTimeSeconds, rank } = this.profile;
    const hoursPlayed = playTimeSeconds / 3600;
    const currentScore = wins * 10 + Math.floor(hoursPlayed * 5);
    
    const rankThresholds = [0, 50, 200, 500, 1000];
    const currentThreshold = rankThresholds[rank];
    const nextThreshold = rankThresholds[rank + 1] || 1000;
    
    return ((currentScore - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  }

  private calculateWinRate(): number {
    if (this.stats.totalGamesPlayed === 0) return 0;
    return Math.round((this.stats.totalWins / this.stats.totalGamesPlayed) * 100);
  }

  private formatPlayTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  private close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('close'));
  }
}