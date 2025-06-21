import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { achievementService, AchievementProgress } from "./AchievementService";
import { AchievementCategory } from "./AchievementDefinitions";

@customElement("achievement-grid")
export class AchievementGrid extends LitElement {
  @state() private achievements: AchievementProgress[] = [];
  @state() private selectedCategory: AchievementCategory | 'all' | 'unlocked' = 'unlocked';
  @state() private selectedAchievement: AchievementProgress | null = null;
  @state() private summary = {
    unlocked: 0,
    total: 0,
    percentage: 0,
    points: 0,
    totalPossiblePoints: 0
  };

  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;
  private tabsElement: HTMLElement | null = null;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Achievement Summary */
    .achievement-summary {
      display: flex;
      justify-content: space-around;
      padding: 16px;
      background: linear-gradient(135deg, rgba(74, 95, 58, 0.2) 0%, rgba(26, 47, 26, 0.15) 100%);
      border: 2px solid rgba(74, 95, 58, 0.4);
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .summary-stat {
      text-align: center;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 900;
      color: #8fbc8f;
      display: block;
      margin-bottom: 4px;
      font-family: 'Courier New', monospace;
    }

    .stat-label {
      font-size: 12px;
      color: rgba(143, 188, 143, 0.8);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
    }

    /* Category Tabs */
    .achievement-tabs {
      display: flex;
      gap: 8px;
      padding: 0 16px 16px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      user-select: none;
      
      /* Hide scrollbar for Chrome, Safari and Opera */
      &::-webkit-scrollbar {
        display: none;
      }
      
      /* Hide scrollbar for IE, Edge and Firefox */
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }

    .achievement-tabs.dragging {
      cursor: grabbing;
    }
    
    .achievement-tabs.dragging .tab-btn {
      cursor: grabbing !important;
    }

    .tab-btn {
      background: rgba(74, 95, 58, 0.2);
      border: 1px solid rgba(74, 95, 58, 0.4);
      color: #8fbc8f;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer !important;
      font-family: 'Courier New', monospace;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .tab-btn:hover {
      background: rgba(74, 95, 58, 0.3);
      transform: translateY(-1px);
    }

    .tab-btn.active {
      background: linear-gradient(135deg, #4a5f3a 0%, #3a4f2a 100%);
      border-color: #8fbc8f;
      color: #ffffff;
    }

    /* Achievement Grid */
    .achievement-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      padding: 12px;
    }

    @media (max-width: 768px) {
      .achievement-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        padding: 8px;
      }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: rgba(143, 188, 143, 0.8);
      font-family: 'Courier New', monospace;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .empty-desc {
      font-size: 14px;
      opacity: 0.8;
      line-height: 1.6;
    }

    /* Achievement Cards */
    .achievement-card {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid #333;
      border-radius: 6px;
      padding: 10px;
      min-height: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      transition: all 0.2s;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }

    .achievement-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .achievement-card.unlocked {
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
      border-color: #4ade80;
    }

    /* Enhanced unlocked cards when viewing unlocked tab */
    .unlocked-view .achievement-card {
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.08) 100%);
      border-color: #4ade80;
      animation: unlockedGlow 4s ease-in-out infinite;
    }

    @keyframes unlockedGlow {
      0%, 100% { 
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.2);
      }
      50% { 
        box-shadow: 0 0 16px rgba(74, 222, 128, 0.3);
      }
    }

    .achievement-card.locked {
      opacity: 0.6;
    }

    /* Rarity borders */
    .achievement-card.rare {
      border-color: #3b82f6;
    }

    .achievement-card.rare.unlocked {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
    }

    .achievement-card.epic {
      border-color: #8b5cf6;
    }

    .achievement-card.epic.unlocked {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(109, 40, 217, 0.05) 100%);
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.2);
    }

    .achievement-card.legendary {
      border-color: #f59e0b;
    }

    .achievement-card.legendary.unlocked {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%);
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
      animation: legendaryPulse 3s ease-in-out infinite;
    }

    @keyframes legendaryPulse {
      0%, 100% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.2); }
      50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.4); }
    }

    /* Progress bar */
    .achievement-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.1);
    }

    .achievement-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4ade80, #22c55e);
      transition: width 0.3s ease;
    }

    /* Content */
    .achievement-icon {
      font-size: 24px;
      margin-bottom: 4px;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
    }

    .achievement-name {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.2;
      margin-bottom: 2px;
      color: #fff;
      font-family: 'Courier New', monospace;
    }

    .achievement-progress {
      font-size: 10px;
      color: #888;
      margin-top: auto;
      font-family: 'Courier New', monospace;
    }

    /* Mobile optimizations */
    @media (max-width: 480px) {
      .achievement-card {
        min-height: 70px;
        padding: 8px;
      }
      
      .achievement-icon {
        font-size: 20px;
      }
      
      .achievement-name {
        font-size: 11px;
      }

      .achievement-tabs {
        padding: 0 8px 12px;
        gap: 6px;
      }

      .tab-btn {
        padding: 6px 12px;
        font-size: 11px;
      }
    }

    /* Achievement Detail Modal */
    .achievement-detail {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(10, 25, 10, 0.98) 0%, rgba(5, 15, 5, 0.98) 100%);
      border: 2px solid #4ade80;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10002;
      color: white;
      font-family: 'Courier New', monospace;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
    }

    .achievement-detail-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10001;
      cursor: pointer;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .detail-icon {
      font-size: 48px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    .detail-info h3 {
      margin: 0 0 4px 0;
      font-size: 20px;
      color: #ffd700;
      text-transform: uppercase;
    }

    .detail-info .rarity {
      font-size: 12px;
      text-transform: uppercase;
      opacity: 0.8;
    }

    .detail-description {
      margin: 16px 0;
      font-size: 14px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.9);
    }

    .detail-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }

    .detail-stat {
      text-align: center;
    }

    .detail-stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #4ade80;
    }

    .detail-stat-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
    }

    .detail-progress {
      margin-top: 20px;
    }

    .detail-progress-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }

    .detail-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4ade80, #22c55e);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .close-detail {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      color: #ff6b6b;
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadAchievements();
    
    // Add global mouseup listener to handle mouse up outside the element
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  private loadAchievements() {
    this.summary = achievementService.getAchievementSummary();
    
    if (this.selectedCategory === 'unlocked') {
      // Show only unlocked achievements
      this.achievements = achievementService.getAllAchievements()
        .filter(ap => ap.isUnlocked)
        .sort((a, b) => {
          // Sort by most recently unlocked (if we had timestamps)
          // For now, sort by rarity (legendary first) then by points
          const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
          const rarityDiff = rarityOrder[a.achievement.rarity] - rarityOrder[b.achievement.rarity];
          return rarityDiff !== 0 ? rarityDiff : b.achievement.points - a.achievement.points;
        });
    } else if (this.selectedCategory === 'all') {
      this.achievements = achievementService.getAllAchievements();
    } else {
      this.achievements = achievementService.getAchievementsByCategory(this.selectedCategory);
    }
  }

  render() {
    return html`
      <!-- Achievement Summary -->
      <div class="achievement-summary">
        <div class="summary-stat">
          <span class="stat-value">${this.summary.unlocked}/${this.summary.total}</span>
          <span class="stat-label">Unlocked</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value">${this.summary.percentage.toFixed(1)}%</span>
          <span class="stat-label">Complete</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value">${this.summary.points.toLocaleString()}</span>
          <span class="stat-label">Points</span>
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="achievement-tabs ${this.isDragging ? 'dragging' : ''}"
        @mousedown=${this.handleMouseDown}
        @mousemove=${this.handleMouseMove}
        @mouseup=${this.handleMouseUp}
        @mouseleave=${this.handleMouseLeave}
      >
        <button 
          class="tab-btn ${this.selectedCategory === 'unlocked' ? 'active' : ''}"
          @click=${() => this.selectCategory('unlocked')}
        >
          🏆 Unlocked ${this.summary.unlocked > 0 ? `(${this.summary.unlocked})` : ''}
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'all' ? 'active' : ''}"
          @click=${() => this.selectCategory('all')}
        >
          All
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'territory' ? 'active' : ''}"
          @click=${() => this.selectCategory('territory')}
        >
          🗺️
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'combat' ? 'active' : ''}"
          @click=${() => this.selectCategory('combat')}
        >
          ⚔️
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'builder' ? 'active' : ''}"
          @click=${() => this.selectCategory('builder')}
        >
          🏗️
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'naval' ? 'active' : ''}"
          @click=${() => this.selectCategory('naval')}
        >
          ⚓
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'nuclear' ? 'active' : ''}"
          @click=${() => this.selectCategory('nuclear')}
        >
          ☢️
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'defense' ? 'active' : ''}"
          @click=${() => this.selectCategory('defense')}
        >
          🛡️
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'diplomat' ? 'active' : ''}"
          @click=${() => this.selectCategory('diplomat')}
        >
          🤝
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'economist' ? 'active' : ''}"
          @click=${() => this.selectCategory('economist')}
        >
          💰
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'speed' ? 'active' : ''}"
          @click=${() => this.selectCategory('speed')}
        >
          ⏱️
        </button>
        <button 
          class="tab-btn ${this.selectedCategory === 'special' ? 'active' : ''}"
          @click=${() => this.selectCategory('special')}
        >
          🎯
        </button>
      </div>

      <!-- Achievement Grid -->
      ${this.achievements.length > 0 ? html`
        <div class="achievement-grid ${this.selectedCategory === 'unlocked' ? 'unlocked-view' : ''}">
          ${this.achievements.map(ap => this.renderAchievementCard(ap))}
        </div>
      ` : html`
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <div class="empty-title">No Achievements Yet</div>
          <div class="empty-desc">
            ${this.selectedCategory === 'unlocked' 
              ? 'Start playing to unlock achievements and earn rewards!'
              : 'No achievements in this category.'
            }
          </div>
        </div>
      `}

      <!-- Achievement Detail Modal -->
      ${this.selectedAchievement ? this.renderAchievementDetail() : ''}
    `;
  }

  private renderAchievementCard(ap: AchievementProgress) {
    const { achievement, isUnlocked, progress, currentValue } = ap;
    const progressText = currentValue >= achievement.requirement.value 
      ? 'Complete!' 
      : `${currentValue}/${achievement.requirement.value}`;

    return html`
      <div 
        class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'} ${achievement.rarity}"
        @click=${() => this.selectedAchievement = ap}
      >
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-progress">
          ${this.selectedCategory === 'unlocked' && isUnlocked ? html`
            <span style="color: #4ade80;">✓ ${achievement.points} pts</span>
          ` : progressText}
        </div>
        
        ${this.selectedCategory !== 'unlocked' ? html`
          <div class="achievement-progress-bar">
            <div class="achievement-progress-fill" style="width: ${progress}%"></div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderAchievementDetail() {
    if (!this.selectedAchievement) return '';
    
    const { achievement, isUnlocked, progress, currentValue } = this.selectedAchievement;
    const progressText = `${currentValue} / ${achievement.requirement.value}`;

    return html`
      <div class="achievement-detail-overlay" @click=${() => this.selectedAchievement = null}></div>
      <div class="achievement-detail">
        <button class="close-detail" @click=${() => this.selectedAchievement = null}>×</button>
        
        <div class="detail-header">
          <div class="detail-icon">${achievement.icon}</div>
          <div class="detail-info">
            <h3>${achievement.name}</h3>
            <div class="rarity ${achievement.rarity}">${achievement.rarity}</div>
          </div>
        </div>

        <div class="detail-description">
          ${achievement.fullDescription}
        </div>

        <div class="detail-stats">
          <div class="detail-stat">
            <div class="detail-stat-value">${achievement.points}</div>
            <div class="detail-stat-label">Points</div>
          </div>
          <div class="detail-stat">
            <div class="detail-stat-value">${isUnlocked ? '✓' : progress.toFixed(0) + '%'}</div>
            <div class="detail-stat-label">${isUnlocked ? 'Unlocked' : 'Progress'}</div>
          </div>
        </div>

        <div class="detail-progress">
          <div>${progressText}</div>
          <div class="detail-progress-bar">
            <div class="detail-progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  private selectCategory(category: AchievementCategory | 'all' | 'unlocked') {
    // Don't switch category if we're dragging
    if (this.isDragging) return;
    
    this.selectedCategory = category;
    this.loadAchievements();
  }

  private handleMouseDown = (e: MouseEvent) => {
    const tabs = e.currentTarget as HTMLElement;
    this.isDragging = true;
    this.startX = e.pageX - tabs.offsetLeft;
    this.scrollLeft = tabs.scrollLeft;
    this.tabsElement = tabs;
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging || !this.tabsElement) return;
    e.preventDefault();
    const x = e.pageX - this.tabsElement.offsetLeft;
    const walk = (x - this.startX) * 2; // Multiply by 2 for faster scrolling
    this.tabsElement.scrollLeft = this.scrollLeft - walk;
  }

  private handleMouseUp = () => {
    this.isDragging = false;
    this.tabsElement = null;
    this.requestUpdate(); // Update to remove dragging class
  }

  private handleMouseLeave = () => {
    this.isDragging = false;
    this.tabsElement = null;
    this.requestUpdate(); // Update to remove dragging class
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'achievement-grid': AchievementGrid;
  }
}