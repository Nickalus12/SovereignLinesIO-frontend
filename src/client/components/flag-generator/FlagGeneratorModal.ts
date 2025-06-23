import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { FlagGeneratorEngine, FlagStyle, ColorScheme, FlagTier } from '../../../core/flag-generator/FlagGeneratorEngine';
import { authService } from '../../auth/AuthService';

@customElement('flag-generator-modal')
export class FlagGeneratorModal extends LitElement {
  @state() private generatedSvg: string = '';
  @state() private isGenerating: boolean = false;
  @state() private style: FlagStyle = 'modern';
  @state() private complexity: number = 5;
  @state() private colorScheme: ColorScheme = 'vibrant';
  @state() private primaryColor: string = '';
  @state() private error: string = '';
  @state() private generationsToday: number = 0;
  @state() private userTier: FlagTier = 'free';
  
  private engine = new FlagGeneratorEngine();

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
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    }

    .modal-content {
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.15) 0%, rgba(45, 59, 37, 0.2) 50%, rgba(26, 47, 26, 0.15) 100%),
        linear-gradient(45deg, rgba(143, 188, 143, 0.05) 0%, transparent 100%);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 2px solid rgba(143, 188, 143, 0.3);
      border-radius: 12px;
      padding: 1.25rem;
      max-width: 400px;
      width: 100%;
      min-height: 450px;
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 4px 16px rgba(74, 95, 58, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2);
    }

    h2 {
      color: #8fbc8f;
      font-size: 1rem;
      font-weight: 800;
      margin-bottom: 1rem;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-family: 'Courier New', monospace;
    }

    .controls {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-shrink: 0;
    }

    .control-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      color: #a8d5a8;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: 'Courier New', monospace;
    }

    select, input {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(143, 188, 143, 0.25);
      color: #e8f0e0;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    select:focus, input:focus {
      outline: none;
      border-color: rgba(143, 188, 143, 0.5);
      background: rgba(0, 0, 0, 0.4);
      box-shadow: 0 0 0 2px rgba(143, 188, 143, 0.15);
    }

    input[type="range"] {
      -webkit-appearance: none;
      background: transparent;
      padding: 0;
      height: 20px;
    }

    input[type="range"]::-webkit-slider-track {
      background: rgba(143, 188, 143, 0.2);
      height: 3px;
      border-radius: 1.5px;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      background: #8fbc8f;
      border-radius: 50%;
      cursor: pointer;
      margin-top: -4.5px;
    }

    input[type="color"] {
      height: 30px;
      padding: 0.2rem;
      cursor: pointer;
    }

    .range-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .range-value {
      color: #8fbc8f;
      font-weight: bold;
      font-size: 0.75rem;
      min-width: 1.5rem;
      text-align: center;
    }

    .preview {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(143, 188, 143, 0.2);
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 120px;
      flex-shrink: 0;
    }

    .flag-preview {
      height: 80px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    .flag-preview svg {
      height: 100%;
      width: auto;
      display: block;
    }

    .placeholder {
      color: rgba(143, 188, 143, 0.5);
      font-size: 0.75rem;
      text-align: center;
      font-family: 'Courier New', monospace;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-shrink: 0;
      margin-bottom: 0.5rem;
    }

    button {
      background: 
        linear-gradient(135deg, rgba(74, 95, 58, 0.2) 0%, rgba(45, 59, 37, 0.25) 100%);
      color: #8fbc8f;
      border: 1px solid rgba(143, 188, 143, 0.3);
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Courier New', monospace;
      box-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(8px);
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: rgba(143, 188, 143, 0.5);
      background: 
        linear-gradient(135deg, rgba(90, 127, 58, 0.25) 0%, rgba(58, 79, 42, 0.3) 100%);
      color: #a8d5a8;
      box-shadow: 
        0 4px 8px rgba(0, 0, 0, 0.4),
        0 0 12px rgba(143, 188, 143, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    button:active {
      transform: translateY(0);
      box-shadow: 
        0 1px 2px rgba(0, 0, 0, 0.4),
        inset 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    button.primary {
      background: 
        linear-gradient(135deg, rgba(90, 127, 58, 0.3) 0%, rgba(74, 95, 58, 0.35) 100%);
      border-color: rgba(143, 188, 143, 0.4);
      color: #a8d5a8;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error {
      background: rgba(255, 69, 58, 0.15);
      border: 1px solid rgba(255, 69, 58, 0.3);
      color: #ff8a80;
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      margin-bottom: 0.75rem;
      text-align: center;
      font-size: 0.7rem;
      font-family: 'Courier New', monospace;
    }

    .info {
      background: rgba(74, 95, 58, 0.1);
      border: 1px solid rgba(143, 188, 143, 0.2);
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      margin-bottom: 0.75rem;
      text-align: center;
      font-size: 0.65rem;
      color: #8fbc8f;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    @media (max-width: 480px) {
      .modal-content {
        padding: 1rem;
        max-width: calc(100vw - 2rem);
        margin: 0 auto;
      }

      h2 {
        font-size: 0.9rem;
        margin-bottom: 0.75rem;
      }

      .control-group {
        grid-template-columns: 1fr;
      }

      .preview {
        height: 100px;
        padding: 0.75rem;
      }

      .flag-preview {
        height: 60px;
      }

      button {
        padding: 0.4rem 0.8rem;
        font-size: 0.7rem;
      }
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadGenerationsToday();
    this.userTier = await this.getUserTier();
  }

  private async loadGenerationsToday() {
    try {
      // Get auth token if available
      const token = await authService.getToken();
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/flags/stats', {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        this.generationsToday = data.generationsToday;
        return;
      }
    } catch (error) {
      console.warn('Failed to load stats from API, using local storage');
    }
    
    // Fallback to local storage
    const stored = localStorage.getItem('flag_generations_today');
    const today = new Date().toDateString();
    
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        this.generationsToday = data.count;
      } else {
        // Reset for new day
        this.generationsToday = 0;
        this.saveGenerationsToday();
      }
    }
  }

  private saveGenerationsToday() {
    const data = {
      date: new Date().toDateString(),
      count: this.generationsToday
    };
    localStorage.setItem('flag_generations_today', JSON.stringify(data));
  }


  private async generateFlag() {
    this.isGenerating = true;
    this.error = '';
    
    try {
      // Get auth token if available
      const token = await authService.getToken();
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Call API to generate flag
      console.log('Generating flag with params:', {
        style: this.style,
        complexity: this.complexity,
        colorScheme: this.colorScheme,
        primaryColor: this.primaryColor
      });
      
      const response = await fetch('/api/flags/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          params: {
            style: this.style,
            complexity: this.complexity,
            colorScheme: this.colorScheme,
            primaryColor: this.primaryColor || undefined
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          const resetTime = error.resetAt ? new Date(error.resetAt).toLocaleTimeString() : 'tomorrow';
          throw new Error(`Daily generation limit reached. Try again after ${resetTime}.`);
        }
        throw new Error(error.error || 'Generation failed');
      }
      
      const data = await response.json();
      console.log('Received flag data:', data);
      console.log('Flag SVG:', data.flag.svg);
      this.generatedSvg = data.flag.svg;
      this.generationsToday = data.generationsToday;
      this.saveGenerationsToday();
      
    } catch (error: any) {
      console.error('Flag generation failed:', error);
      this.error = error.message || 'Generation failed. Please try again.';
    } finally {
      this.isGenerating = false;
    }
  }

  render() {
    return html`
      <div class="modal-overlay" @click=${this.close}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <h2>AI Flag Generator</h2>
          
          ${this.error ? html`<div class="error">${this.error}</div>` : ''}
          
          <div class="info">
            DAILY: ${this.generationsToday}/${this.getDailyLimit()} | TIER: ${this.getTierName()}
          </div>
          
          <div class="controls">
            <div class="control-group">
              <label>
                Style
                <select @change=${(e: Event) => this.style = (e.target as HTMLSelectElement).value as FlagStyle}>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="abstract">Abstract</option>
                  <option value="heraldic">Heraldic</option>
                </select>
              </label>
              
              <label>
                Colors
                <select @change=${(e: Event) => this.colorScheme = (e.target as HTMLSelectElement).value as ColorScheme}>
                  <option value="vibrant">Vibrant</option>
                  <option value="muted">Muted</option>
                  <option value="complementary">Complement</option>
                  <option value="analogous">Analogous</option>
                  <option value="monochrome">Monochrome</option>
                </select>
              </label>
            </div>
            
            <label>
              Complexity
              <div class="range-wrapper">
                <input type="range" min="1" max="${this.engine.getGenerationLimits(this.userTier).maxComplexity}" .value=${this.complexity}
                       @input=${(e: Event) => this.complexity = Number((e.target as HTMLInputElement).value)}>
                <span class="range-value">${this.complexity}</span>
              </div>
            </label>
            
            <label>
              Primary Color
              <input type="color" .value=${this.primaryColor || '#4a5f3a'}
                     @change=${(e: Event) => this.primaryColor = (e.target as HTMLInputElement).value}>
            </label>
          </div>
          
          <div class="preview">
            ${this.generatedSvg ? html`
              <div class="flag-preview" .innerHTML=${this.generatedSvg}></div>
            ` : html`
              <div class="placeholder">GENERATE TO PREVIEW</div>
            `}
          </div>
          
          <div class="actions">
            <button class="primary" @click=${this.generateFlag} ?disabled=${this.isGenerating || this.getRemainingGenerations() === 0}>
              ${this.isGenerating ? 'PROCESSING...' : this.getRemainingGenerations() === 0 ? 'LIMIT REACHED' : 'GENERATE'}
            </button>
            <button @click=${this.useFlag} ?disabled=${!this.generatedSvg}>
              USE FLAG
            </button>
            <button @click=${this.close}>CANCEL</button>
          </div>
        </div>
      </div>
    `;
  }

  private async getUserTier(): Promise<FlagTier> {
    try {
      const user = await authService.getCurrentUser();
      if (user?.subscriptionTier) {
        return user.subscriptionTier as FlagTier;
      }
    } catch (error) {
      console.error('Failed to get user tier:', error);
    }
    return 'free';
  }
  
  private getRemainingGenerations(): number {
    return this.engine.getRemainingGenerations(this.generationsToday, this.userTier);
  }
  
  private getDailyLimit(): string {
    const limits = this.engine.getGenerationLimits(this.userTier);
    return limits.dailyGenerations === -1 ? '∞' : limits.dailyGenerations.toString();
  }
  
  private getTierName(): string {
    return this.userTier.toUpperCase();
  }

  private async useFlag() {
    if (this.generatedSvg) {
      try {
        // Save to server if user is authenticated
        const token = await authService.getToken();
        if (token) {
          const headers: any = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          };
          
          const response = await fetch('/api/flags/save', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              flag: {
                svg: this.generatedSvg,
                metadata: {
                  style: this.style,
                  complexity: this.complexity,
                  colorScheme: this.colorScheme,
                  primaryColor: this.primaryColor
                }
              },
              name: `AI Flag ${new Date().toLocaleDateString()}`
            })
          });
          
          if (!response.ok) {
            console.warn('Failed to save flag to server:', await response.text());
          }
        }
      } catch (error) {
        console.error('Error saving flag to server:', error);
      }
      
      // Dispatch event for local storage
      this.dispatchEvent(new CustomEvent('flag-generated', {
        detail: { 
          svg: this.generatedSvg, 
          id: Date.now().toString(),
          metadata: {
            style: this.style,
            complexity: this.complexity,
            colorScheme: this.colorScheme
          }
        }
      }));
      // Close the modal after using the flag
      this.close();
    }
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }
}