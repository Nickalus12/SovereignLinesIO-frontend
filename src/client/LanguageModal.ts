import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translateText } from "../client/Utils";

@customElement("language-modal")
export class LanguageModal extends LitElement {
  @property({ type: Boolean }) visible = false;
  @property({ type: Array }) languageList: any[] = [];
  @property({ type: String }) currentLang = "en";

  createRenderRoot() {
    return this; // Use Light DOM instead of Shadow DOM
  }

  static styles = css`
    .language-modal-backdrop {
      position: fixed;
      padding: 1rem;
      z-index: 1000;
      left: 0;
      bottom: 0;
      right: 0;
      top: 0;
      background-color: rgba(0, 0, 0, 0.7);
      overflow-y: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .language-modal-wrapper {
      background: linear-gradient(135deg, rgba(20, 25, 20, 0.95) 0%, rgba(15, 20, 15, 0.98) 100%);
      border-radius: 16px;
      min-width: 340px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(74, 95, 58, 0.2);
    }

    .language-modal-header {
      position: relative;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      font-size: 20px;
      font-weight: 600;
      background: linear-gradient(135deg, rgba(74, 95, 58, 0.15) 0%, rgba(74, 95, 58, 0.05) 100%);
      text-align: center;
      color: #d4e0c4;
      padding: 1.5rem 3rem 1.5rem 1.5rem;
      border-bottom: 1px solid rgba(74, 95, 58, 0.2);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .language-modal-close {
      cursor: pointer;
      position: absolute;
      right: 1.2rem;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
      color: #d4e0c4;
      font-weight: bold;
    }
    
    .language-modal-close:hover {
      background: rgba(255, 67, 67, 0.3);
      transform: translateY(-50%) scale(1.1);
    }

    .language-modal-content {
      position: relative;
      color: #e0e0e0;
      padding: 1.8rem;
      max-height: 60dvh;
      overflow-y: auto;
    }

    .lang-button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      border-radius: 8px;
      transition: all 0.2s;
      border: 1px solid rgba(74, 95, 58, 0.3);
      background-color: rgba(255, 255, 255, 0.05);
      color: #e0e0e0;
      cursor: pointer;
      font-size: 14px;
    }

    .lang-button:hover {
      background-color: rgba(74, 95, 58, 0.2);
      border-color: rgba(74, 95, 58, 0.5);
      transform: translateX(4px);
    }

    .lang-button.active {
      background-color: rgba(74, 95, 58, 0.3);
      border-color: rgba(74, 95, 58, 0.6);
      color: #d4e0c4;
      font-weight: 500;
    }

    .flag-icon {
      width: 24px;
      height: 16px;
      object-fit: contain;
      border-radius: 2px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    @keyframes rainbow {
      0% {
        background-color: #990033;
      }
      20% {
        background-color: #996600;
      }
      40% {
        background-color: #336600;
      }
      60% {
        background-color: #008080;
      }
      80% {
        background-color: #1c3f99;
      }
      100% {
        background-color: #5e0099;
      }
    }

    .lang-button.debug {
      animation: rainbow 10s infinite;
      font-weight: bold;
      color: #fff;
      border: 2px dashed aqua;
      box-shadow: 0 0 4px aqua;
    }
  `;

  private close = () => {
    this.dispatchEvent(
      new CustomEvent("close-modal", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has("visible")) {
      if (this.visible) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.body.style.overflow = "auto";
  }

  private selectLanguage = (lang: string) => {
    this.dispatchEvent(
      new CustomEvent("language-selected", {
        detail: { lang },
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    if (!this.visible) return null;

    return html`
      <style>
        .language-modal-backdrop {
          position: fixed;
          padding: 1rem;
          z-index: 10000;
          left: 0;
          bottom: 0;
          right: 0;
          top: 0;
          background-color: rgba(0, 0, 0, 0.7);
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .language-modal-wrapper {
          background: linear-gradient(135deg, rgba(20, 25, 20, 0.95) 0%, rgba(15, 20, 15, 0.98) 100%);
          border-radius: 16px;
          min-width: 340px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(74, 95, 58, 0.2);
        }

        .language-modal-header {
          position: relative;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          font-size: 20px;
          font-weight: 600;
          background: linear-gradient(135deg, rgba(74, 95, 58, 0.15) 0%, rgba(74, 95, 58, 0.05) 100%);
          text-align: center;
          color: #d4e0c4;
          padding: 1.5rem 3rem 1.5rem 1.5rem;
          border-bottom: 1px solid rgba(74, 95, 58, 0.2);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .language-modal-close {
          cursor: pointer;
          position: absolute;
          right: 1.2rem;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
          color: #d4e0c4;
          font-weight: bold;
        }
        
        .language-modal-close:hover {
          background: rgba(255, 67, 67, 0.3);
          transform: translateY(-50%) scale(1.1);
        }

        .language-modal-content {
          position: relative;
          color: #e0e0e0;
          padding: 1.8rem;
          max-height: 60dvh;
          overflow-y: auto;
        }

        .lang-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s;
          border: 1px solid rgba(74, 95, 58, 0.3);
          background-color: rgba(255, 255, 255, 0.05);
          color: #e0e0e0;
          cursor: pointer;
          font-size: 14px;
        }

        .lang-button:hover {
          background-color: rgba(74, 95, 58, 0.2);
          border-color: rgba(74, 95, 58, 0.5);
          transform: translateX(4px);
        }

        .lang-button.active {
          background-color: rgba(74, 95, 58, 0.3);
          border-color: rgba(74, 95, 58, 0.6);
          color: #d4e0c4;
          font-weight: 500;
        }

        .flag-icon {
          width: 24px;
          height: 16px;
          object-fit: contain;
          border-radius: 2px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        @keyframes rainbow {
          0% { background-color: #990033; }
          20% { background-color: #996600; }
          40% { background-color: #336600; }
          60% { background-color: #008080; }
          80% { background-color: #1c3f99; }
          100% { background-color: #5e0099; }
        }

        .lang-button.debug {
          animation: rainbow 10s infinite;
          font-weight: bold;
          color: #fff;
          border: 2px dashed aqua;
          box-shadow: 0 0 4px aqua;
        }
      </style>
      <aside class="language-modal-backdrop">
        <div class="language-modal-wrapper">
          <header class="language-modal-header">
            ${translateText("select_lang.title") || "Select Language"}
            <div class="language-modal-close" @click=${this.close}>✕</div>
          </header>

          <section class="language-modal-content">
            ${this.languageList && this.languageList.length > 0 ? 
              this.languageList.map((lang) => {
                const isActive = this.currentLang === lang.code;
                return html`
                  <button
                    class="lang-button ${isActive ? "active" : ""} ${lang.code === "debug" ? "debug" : ""}"
                    @click=${() => this.selectLanguage(lang.code)}
                  >
                    <img
                      src="/flags/${lang.svg || 'xx'}.svg"
                      class="flag-icon"
                      alt="${lang.code}"
                      @error=${(e: Event) => {
                        const img = e.target as HTMLImageElement;
                        img.src = '/flags/xx.svg';
                      }}
                    />
                    <span>${lang.nativeName || lang.native || lang.code} ${lang.name ? `(${lang.name})` : lang.en ? `(${lang.en})` : ''}</span>
                  </button>
                `;
              }) : 
              html`<div style="text-align: center; padding: 2rem; color: #999;">Loading languages...</div>`
            }
          </section>
        </div>
      </aside>
    `;
  }
}
