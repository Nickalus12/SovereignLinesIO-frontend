// Helper to manage UI element visibility consistently
export class UIManager {
  private static gameUIElements = [
    'control-panel',
    'events-display', 
    'chat-display',
    'leader-board',
    'team-stats',
    'player-panel',
    'options-menu',
    'replay-panel',
    'player-info-overlay',
    'heads-up-message',
    'player-team-label',
    'top-bar',
    'spawn-timer',
    'build-menu',
    'main-radial-menu'
  ];

  static showGameUI() {
    console.log('Showing game UI elements');
    this.gameUIElements.forEach(selector => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.style.display = '';
        // Trigger update for LitElement
        if ('requestUpdate' in element && typeof element.requestUpdate === 'function') {
          (element as any).requestUpdate();
        }
      }
    });
  }

  static hideGameUI() {
    console.log('Hiding game UI elements');
    this.gameUIElements.forEach(selector => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.style.display = 'none';
        // Trigger update for LitElement
        if ('requestUpdate' in element && typeof element.requestUpdate === 'function') {
          (element as any).requestUpdate();
        }
      }
    });
  }

  static resetGameUI() {
    console.log('Resetting game UI state');
    this.hideGameUI();
    
    // Reset any persistent state
    const controlPanel = document.querySelector('control-panel') as any;
    if (controlPanel && controlPanel.tick) {
      // Force a tick to reset internal state
      controlPanel._population = 0;
      controlPanel._gold = 0n;
      controlPanel._troops = 0;
      controlPanel._workers = 0;
    }
    
    const topBar = document.querySelector('top-bar') as any;
    if (topBar) {
      topBar._population = 0;
      topBar._lastPopulationIncreaseRate = 0;
      topBar._popRateIsIncreasing = false;
    }
  }
}