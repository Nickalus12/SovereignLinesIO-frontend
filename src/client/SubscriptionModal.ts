import { BaseModal } from "./components/baseComponents/BaseModal";
import { SubscriptionTier, SubscriptionBenefits, SubscriptionPricing, calculateSupporterPackage, getSupporterPackageBreakpoints } from "../core/SubscriptionSchemas";

export class SubscriptionModal extends BaseModal {
  private selectedTier: SubscriptionTier = SubscriptionTier.Premium;
  private selectedBilling: "monthly" | "yearly" = "monthly";
  private currentTier: SubscriptionTier = SubscriptionTier.Free;
  private supporterAmount: number = 10;

  constructor() {
    super("subscription-modal");
    this.loadCurrentSubscription();
  }

  private async loadCurrentSubscription() {
    try {
      const response = await fetch("/api/subscription/current", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        this.currentTier = data.tier || SubscriptionTier.Free;
        this.updateDisplay();
      }
    } catch (error) {
      console.error("Failed to load subscription:", error);
    }
  }

  protected createContent(): string {
    return `
      <style>
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        
        .modal-overlay.active {
          opacity: 1;
          visibility: visible;
        }
        
        .modal-container {
          position: relative;
          max-width: 95vw;
          max-height: 95vh;
          margin: 20px;
          transform: scale(0.7);
          transition: transform 0.3s ease;
        }
        
        .modal-container.active {
          transform: scale(1);
        }
        
        .modal-close {
          position: absolute;
          top: 10px;
          right: 15px;
          background: none;
          border: none;
          font-size: 28px;
          color: #fff;
          cursor: pointer;
          z-index: 10001;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
          line-height: 1;
        }
        
        .modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.1);
        }
        
        .modal-content {
          border-radius: 8px;
          overflow: hidden;
        }
        
        .subscription-modal-content {
          background: linear-gradient(135deg, #0a0f1a 0%, #1a1f2e 100%);
          color: #fff;
          padding: 2rem;
          border-radius: 8px;
          border: 2px solid #2d3b25;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .subscription-header {
          text-align: center;
          margin-bottom: 2rem;
          border-bottom: 2px solid #2d3b25;
          padding-bottom: 1.5rem;
        }
        
        .subscription-header h2 {
          font-size: 2.5rem;
          font-weight: bold;
          color: #4a5f3a;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .subscription-header .subtitle {
          color: #a0a8b0;
          font-size: 1.1rem;
          margin: 0;
        }
        
        .billing-toggle {
          display: flex;
          justify-content: center;
          gap: 0;
          margin-bottom: 2rem;
          background: rgba(45, 59, 37, 0.3);
          border-radius: 4px;
          padding: 4px;
          border: 1px solid #2d3b25;
        }
        
        .billing-option {
          flex: 1;
          padding: 0.8rem 1.5rem;
          background: transparent;
          color: #a0a8b0;
          border: none;
          cursor: pointer;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        
        .billing-option.active {
          background: linear-gradient(180deg, #4a5f3a 0%, #2d3b25 100%);
          color: #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .billing-option:hover:not(.active) {
          background: rgba(74, 95, 58, 0.2);
          color: #fff;
        }
        
        .subscription-tiers {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.2rem;
          margin-bottom: 2rem;
        }
        
        .tier-card {
          background: linear-gradient(135deg, rgba(74, 95, 58, 0.1) 0%, rgba(45, 59, 37, 0.1) 100%);
          border: 2px solid #2d3b25;
          border-radius: 8px;
          padding: 1.5rem;
          position: relative;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .tier-card:hover {
          border-color: #4a5f3a;
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(74, 95, 58, 0.2);
        }
        
        .tier-card.current {
          border-color: #4a5f3a;
          box-shadow: 0 0 20px rgba(74, 95, 58, 0.3);
        }
        
        .tier-card.premium {
          border-color: #8b5a2b;
        }
        
        .tier-card.premium:hover {
          border-color: #9b6a3b;
          box-shadow: 0 8px 24px rgba(139, 90, 43, 0.2);
        }
        
        .tier-card.elite {
          border-color: #2b5a8b;
        }
        
        .tier-card.elite:hover {
          border-color: #3b6a9b;
          box-shadow: 0 8px 24px rgba(43, 90, 139, 0.2);
        }
        
        .tier-card.sovereign {
          border-color: #6b2b8b;
          box-shadow: 0 0 15px rgba(107, 43, 139, 0.3);
        }
        
        .tier-card.sovereign:hover {
          border-color: #7b3b9b;
          box-shadow: 0 8px 24px rgba(107, 43, 139, 0.3);
        }
        
        .popular-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(180deg, #2b5a8b 0%, #20406b 100%);
          color: #fff;
          padding: 0.3rem 0.8rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: bold;
          letter-spacing: 1px;
        }
        
        .current-badge {
          position: absolute;
          top: -10px;
          right: 1rem;
          background: linear-gradient(180deg, #4a5f3a 0%, #2d3b25 100%);
          color: #fff;
          padding: 0.3rem 0.8rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: bold;
          letter-spacing: 1px;
        }
        
        .tier-header {
          text-align: center;
          margin-bottom: 1rem;
        }
        
        .tier-name {
          font-size: 1.5rem;
          font-weight: bold;
          color: #fff;
          margin: 0 0 0.5rem 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .tier-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.2rem;
        }
        
        .currency {
          font-size: 1.2rem;
          color: #4a5f3a;
          font-weight: bold;
        }
        
        .amount {
          font-size: 2rem;
          font-weight: bold;
          color: #4a5f3a;
        }
        
        .period {
          font-size: 1rem;
          color: #a0a8b0;
        }
        
        .tier-badge {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        
        .tier-benefits {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem 0;
          flex-grow: 1;
        }
        
        .tier-benefits li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0;
          color: #e0e0e0;
          font-size: 0.9rem;
        }
        
        .tier-benefits .icon-check {
          color: #4a5f3a;
          font-weight: bold;
        }
        
        .tier-benefits .icon-check::before {
          content: "✓";
        }
        
        .tier-select-btn {
          width: 100%;
          background: linear-gradient(180deg, #4a5f3a 0%, #2d3b25 100%);
          color: #fff;
          border: 2px solid #2d3b25;
          border-radius: 4px;
          padding: 0.8rem 1rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          margin-top: auto;
        }
        
        .tier-select-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, #5a6f4a 0%, #3a4a30 100%);
          border-color: #3a4a30;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
        }
        
        .tier-select-btn:disabled {
          background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
          border-color: #2a2a2a;
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .tier-select-btn.current {
          background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
          border-color: #2a2a2a;
        }
        
        /* Supporter Card Styles */
        .tier-card.supporter {
          border-color: #ff6b6b;
          background: linear-gradient(135deg, rgba(74, 95, 58, 0.1) 0%, rgba(45, 59, 37, 0.1) 100%);
        }
        
        .tier-card.supporter:hover {
          border-color: #ff5757;
          box-shadow: 0 8px 24px rgba(255, 107, 107, 0.2);
        }
        
        .supporter-slider-container {
          margin: 1rem 0;
        }
        
        .supporter-amount-display {
          text-align: center;
          margin-bottom: 1rem;
        }
        
        .supporter-amount {
          font-size: 2rem;
          font-weight: bold;
          color: #ff6b6b;
          transition: color 0.3s ease;
        }
        
        .supporter-amount.supporter {
          color: #ff6b6b;
        }
        
        .supporter-amount.premium {
          color: #8b5a2b;
        }
        
        .supporter-amount.elite {
          color: #2b5a8b;
        }
        
        .supporter-amount.sovereign {
          color: #6b2b8b;
        }
        
        .supporter-amount.patron {
          color: #ffd700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
        }
        
        .supporter-duration {
          font-size: 0.95rem;
          color: #e0e0e0;
          margin-top: 0.5rem;
          font-weight: 500;
          background: rgba(0, 0, 0, 0.2);
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(5px);
        }
        
        .supporter-slider {
          width: 100%;
          -webkit-appearance: none;
          appearance: none;
          height: 12px;
          border-radius: 6px;
          background: linear-gradient(to right, 
            #ff6b6b 0%, 
            #ff6b6b 5%, 
            #8b5a2b 25%, 
            #2b5a8b 50%, 
            #6b2b8b 100%);
          outline: none;
          opacity: 0.9;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .supporter-slider:hover {
          opacity: 1;
        }
        
        .supporter-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b6b 0%, #fff 50%, #ff6b6b 100%);
          cursor: pointer;
          border: 3px solid #fff;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), 0 0 10px rgba(255, 107, 107, 0.6);
          transition: all 0.2s ease;
        }
        
        .supporter-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 107, 107, 0.8);
        }
        
        .supporter-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b6b 0%, #fff 50%, #ff6b6b 100%);
          cursor: pointer;
          border: 3px solid #fff;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), 0 0 10px rgba(255, 107, 107, 0.6);
          transition: all 0.2s ease;
        }
        
        .supporter-breakpoints {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.7rem;
          color: #a0a8b0;
        }
        
        .breakpoint {
          text-align: center;
          cursor: pointer;
          transition: color 0.2s;
        }
        
        .breakpoint.highlight {
          color: #ff6b6b;
          font-weight: bold;
        }
        
        .breakpoint:hover {
          color: #fff;
        }
        
        .supporter-features {
          font-size: 0.85rem;
          color: #e0e0e0;
          text-align: center;
          margin: 1rem 0;
          min-height: 60px;
        }
        
        .slider-tier-indicator {
          text-align: center;
          font-size: 0.8rem;
          font-weight: bold;
          margin-top: 0.5rem;
          padding: 0.3rem 0.8rem;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 87, 87, 0.1) 100%);
          border: 1px solid rgba(255, 107, 107, 0.3);
          transition: all 0.3s ease;
        }
        
        .slider-tier-indicator.supporter {
          color: #ff6b6b;
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 87, 87, 0.05) 100%);
        }
        
        .slider-tier-indicator.premium {
          color: #8b5a2b;
          background: linear-gradient(135deg, rgba(139, 90, 43, 0.15) 0%, rgba(139, 90, 43, 0.05) 100%);
          border-color: rgba(139, 90, 43, 0.3);
        }
        
        .slider-tier-indicator.elite {
          color: #2b5a8b;
          background: linear-gradient(135deg, rgba(43, 90, 139, 0.15) 0%, rgba(43, 90, 139, 0.05) 100%);
          border-color: rgba(43, 90, 139, 0.3);
        }
        
        .slider-tier-indicator.sovereign {
          color: #6b2b8b;
          background: linear-gradient(135deg, rgba(107, 43, 139, 0.15) 0%, rgba(107, 43, 139, 0.05) 100%);
          border-color: rgba(107, 43, 139, 0.3);
        }
        
        .slider-tier-indicator.patron {
          color: #ffd700;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%);
          border-color: rgba(255, 215, 0, 0.3);
        }
        
        .one-time-badge {
          position: absolute;
          top: -10px;
          left: 1rem;
          background: linear-gradient(180deg, #ff6b6b 0%, #e74c3c 100%);
          color: #fff;
          padding: 0.3rem 0.8rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: bold;
          letter-spacing: 1px;
        }
        
        .subscription-comparison {
          margin-bottom: 2rem;
        }
        
        .subscription-comparison h3 {
          text-align: center;
          color: #4a5f3a;
          font-size: 1.5rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          background: rgba(45, 59, 37, 0.1);
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #2d3b25;
        }
        
        .comparison-table th {
          background: linear-gradient(180deg, #4a5f3a 0%, #2d3b25 100%);
          color: #fff;
          padding: 0.8rem;
          text-align: center;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 0.9rem;
        }
        
        .comparison-table td {
          padding: 0.6rem;
          text-align: center;
          border-bottom: 1px solid rgba(45, 59, 37, 0.3);
          color: #e0e0e0;
        }
        
        .comparison-table .feature-name {
          text-align: left;
          font-weight: 600;
          color: #fff;
        }
        
        .comparison-table .icon-check {
          color: #4a5f3a;
        }
        
        .comparison-table .icon-check::before {
          content: "✓";
        }
        
        .comparison-table .icon-x {
          color: #ff4444;
        }
        
        .comparison-table .icon-x::before {
          content: "✗";
        }
        
        .subscription-footer {
          text-align: center;
          padding-top: 1.5rem;
          border-top: 2px solid #2d3b25;
        }
        
        .payment-info {
          color: #a0a8b0;
          font-size: 0.9rem;
          margin: 0;
        }
        
        .icon-lock::before {
          content: "🔒";
          margin-right: 0.5rem;
        }
        
        @media (max-width: 768px) {
          .subscription-modal-content {
            padding: 1rem;
            margin: 1rem;
          }
          
          .subscription-header h2 {
            font-size: 1.8rem;
          }
          
          .subscription-tiers {
            grid-template-columns: 1fr;
          }
          
          .billing-toggle {
            flex-direction: column;
          }
        }
      </style>
      <div class="subscription-modal-content">
        <div class="subscription-header">
          <h2>Choose Your Sovereign Rank</h2>
          <p class="subtitle">Support the kingdom and unlock exclusive features!</p>
        </div>

        <div class="billing-toggle">
          <button class="billing-option monthly active" data-billing="monthly">Monthly</button>
          <button class="billing-option yearly" data-billing="yearly">Yearly (Save 17%)</button>
        </div>

        <div class="subscription-tiers">
          ${this.createSupporterCard()}
          ${this.createTierCard(SubscriptionTier.Premium)}
          ${this.createTierCard(SubscriptionTier.Elite)}
          ${this.createTierCard(SubscriptionTier.Sovereign)}
        </div>

        <div class="subscription-comparison">
          <h3>Feature Comparison</h3>
          <table class="comparison-table">
            ${this.createComparisonTable()}
          </table>
        </div>

        <div class="subscription-footer">
          <p class="payment-info">
            <i class="icon-lock"></i> Secure payment via Stripe
            <br>Cancel anytime • Instant activation
          </p>
        </div>
      </div>
    `;
  }

  private createTierCard(tier: SubscriptionTier): string {
    const benefits = SubscriptionBenefits[tier];
    const pricing = SubscriptionPricing[tier];
    const isCurrentTier = this.currentTier === tier;
    const price = this.selectedBilling === "monthly" ? pricing.monthly : pricing.yearly;
    const period = this.selectedBilling === "monthly" ? "month" : "year";

    const popularBadge = tier === SubscriptionTier.Elite ? '<span class="popular-badge">MOST POPULAR</span>' : '';
    const currentBadge = isCurrentTier ? '<span class="current-badge">CURRENT</span>' : '';

    return `
      <div class="tier-card ${tier} ${isCurrentTier ? 'current' : ''}" data-tier="${tier}">
        ${popularBadge}
        ${currentBadge}
        
        <div class="tier-header">
          <h3 class="tier-name">${this.getTierDisplayName(tier)}</h3>
          <div class="tier-price">
            <span class="currency">$</span>
            <span class="amount">${price.toFixed(2)}</span>
            <span class="period">/${period}</span>
          </div>
        </div>

        <div class="tier-badge">${this.getTierBadge(tier)}</div>

        <ul class="tier-benefits">
          ${this.getTierHighlights(tier).map(benefit => 
            `<li><i class="icon-check"></i> ${benefit}</li>`
          ).join('')}
        </ul>

        <button class="tier-select-btn ${isCurrentTier ? 'current' : ''}" 
                data-tier="${tier}"
                ${isCurrentTier ? 'disabled' : ''}>
          ${isCurrentTier ? 'Current Plan' : 'Select Plan'}
        </button>
      </div>
    `;
  }

  private createSupporterCard(): string {
    const supporterPackage = calculateSupporterPackage(this.supporterAmount);
    const breakpoints = getSupporterPackageBreakpoints();
    const isCurrentTier = this.currentTier === SubscriptionTier.Supporter;

    return `
      <div class="tier-card supporter ${isCurrentTier ? 'current' : ''}" data-tier="supporter">
        <span class="one-time-badge">ONE TIME</span>
        ${isCurrentTier ? '<span class="current-badge">CURRENT</span>' : ''}
        
        <div class="tier-header">
          <h3 class="tier-name">Supporter</h3>
          <div class="supporter-amount-display">
            <div class="supporter-amount">$${this.supporterAmount.toFixed(0)}</div>
            <div class="supporter-duration">${supporterPackage.description}</div>
          </div>
        </div>

        <div class="tier-badge"></div>

        <div class="supporter-slider-container">
          <input type="range" 
                 class="supporter-slider" 
                 min="1" 
                 max="200" 
                 value="${this.supporterAmount}"
                 id="supporter-slider">
          <div class="slider-tier-indicator" id="slider-tier-indicator">
            ${this.getTierIndicatorText(supporterPackage.tier, this.supporterAmount)}
          </div>
          <div class="supporter-breakpoints">
            ${breakpoints.map(bp => `
              <div class="breakpoint ${bp.highlight ? 'highlight' : ''}" 
                   data-amount="${bp.amount}"
                   title="$${bp.amount} - ${bp.label}">
                $${bp.amount}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="supporter-features">
          ${this.getSupporterFeaturePreview(supporterPackage)}
        </div>

        <button class="tier-select-btn ${isCurrentTier ? 'current' : ''}" 
                data-tier="supporter"
                data-amount="${this.supporterAmount}"
                ${isCurrentTier ? 'disabled' : ''}>
          ${isCurrentTier ? 'Current Plan' : 'Support Now'}
        </button>
      </div>
    `;
  }

  private getSupporterFeaturePreview(supporterPackage: any): string {
    const features = [];
    
    if (supporterPackage.tier === SubscriptionTier.Supporter) {
      features.push("✨ Basic supporter perks");
      features.push("🎨 Name colors & badges");
    } else if (supporterPackage.tier === SubscriptionTier.Premium) {
      features.push("⭐ Full Premium features");
      features.push("🎮 Enhanced gameplay");
    } else if (supporterPackage.tier === SubscriptionTier.Elite) {
      features.push("💎 Full Elite experience");
      features.push("🏆 Priority access");
    } else if (supporterPackage.tier === SubscriptionTier.Sovereign) {
      if (this.supporterAmount >= 150) {
        features.push("👑💎 Exclusive Patron status");
        features.push("🌟 Unique cosmetics & benefits");
      } else {
        features.push("👑 Full Sovereign features");
        features.push("🌟 Maximum tier benefits");
      }
    }
    
    features.push(`⏰ ${supporterPackage.description}`);
    features.push("🎭 Discord role included");
    
    return features.join("<br>");
  }

  private getTierIndicatorText(tier: SubscriptionTier, amount: number): string {
    if (amount >= 150) {
      return "🏆 EXCLUSIVE PATRON TIER";
    } else if (tier === SubscriptionTier.Sovereign) {
      return "👑 SOVEREIGN TIER";
    } else if (tier === SubscriptionTier.Elite) {
      return "💎 ELITE TIER";
    } else if (tier === SubscriptionTier.Premium) {
      return "⭐ PREMIUM TIER";
    } else {
      return "🎉 SUPPORTER TIER";
    }
  }

  private getTierDisplayName(tier: SubscriptionTier): string {
    const names = {
      [SubscriptionTier.Free]: "Free",
      [SubscriptionTier.Supporter]: "Supporter",
      [SubscriptionTier.Premium]: "Premium",
      [SubscriptionTier.Elite]: "Elite",
      [SubscriptionTier.Sovereign]: "Sovereign",
    };
    return names[tier];
  }

  private getTierBadge(tier: SubscriptionTier): string {
    const badges = {
      [SubscriptionTier.Free]: "",
      [SubscriptionTier.Supporter]: "🎉",
      [SubscriptionTier.Premium]: "⭐",
      [SubscriptionTier.Elite]: "💎",
      [SubscriptionTier.Sovereign]: "👑",
    };
    return badges[tier];
  }

  private getTierHighlights(tier: SubscriptionTier): string[] {
    const benefits = SubscriptionBenefits[tier];
    const highlights: string[] = [];

    // Name colors
    if (tier === SubscriptionTier.Premium) {
      highlights.push("9 vibrant name colors");
    } else if (tier === SubscriptionTier.Elite) {
      highlights.push("20 premium name colors");
    } else if (tier === SubscriptionTier.Sovereign) {
      highlights.push("Animated gradient names");
    }

    // Borders
    if (benefits.borderStyles.length > 1) {
      if (tier === SubscriptionTier.Sovereign) {
        highlights.push("Exclusive animated borders");
      } else {
        highlights.push(`${benefits.borderStyles.length} border styles`);
      }
    }

    // Priority queue
    if (benefits.priorityQueue) {
      highlights.push("Priority matchmaking");
    }

    // XP boost
    if (benefits.xpBoost > 1) {
      highlights.push(`${Math.round((benefits.xpBoost - 1) * 100)}% XP boost`);
    }

    // Emojis
    if (benefits.emojisPerMinute === -1) {
      highlights.push("Unlimited emojis");
    } else if (benefits.emojisPerMinute > 5) {
      highlights.push(`${benefits.emojisPerMinute} emojis/minute`);
    }

    // Party size
    if (benefits.partySize > 4) {
      highlights.push(`Party size up to ${benefits.partySize}`);
    }

    // Exclusive features
    if (tier === SubscriptionTier.Elite) {
      highlights.push("Access to Elite maps");
      highlights.push("Custom loading screens");
    } else if (tier === SubscriptionTier.Sovereign) {
      highlights.push("Sovereign-exclusive maps");
      highlights.push("Custom victory music");
      highlights.push("Monthly exclusive cosmetic");
      highlights.push("Beta access to new features");
    }

    // Chat badge
    highlights.push(`${benefits.chatBadge} Chat badge`);

    return highlights;
  }

  private createComparisonTable(): string {
    const features = [
      { name: "Name Colors", key: "nameColors", type: "count" },
      { name: "Border Styles", key: "borderStyles", type: "count" },
      { name: "Emojis/Minute", key: "emojisPerMinute", type: "number" },
      { name: "Custom Flags", key: "customFlagSlots", type: "number" },
      { name: "Priority Queue", key: "priorityQueue", type: "boolean" },
      { name: "Party Size", key: "partySize", type: "number" },
      { name: "XP Boost", key: "xpBoost", type: "multiplier" },
      { name: "Replay Access", key: "replayAccess", type: "boolean" },
      { name: "Stats History", key: "statsHistory", type: "days" },
      { name: "Exclusive Maps", key: "exclusiveMaps", type: "count" },
    ];

    const tiers = [SubscriptionTier.Free, SubscriptionTier.Supporter, SubscriptionTier.Premium, SubscriptionTier.Elite, SubscriptionTier.Sovereign];

    let html = `
      <thead>
        <tr>
          <th>Feature</th>
          ${tiers.map(tier => `<th class="${tier}">${this.getTierDisplayName(tier)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
    `;

    features.forEach(feature => {
      html += '<tr>';
      html += `<td class="feature-name">${feature.name}</td>`;
      
      tiers.forEach(tier => {
        const benefits = SubscriptionBenefits[tier];
        const value = benefits[feature.key];
        html += `<td class="${tier}">`;
        
        switch (feature.type) {
          case "count":
            if (tier === SubscriptionTier.Supporter) {
              html += "Variable*";
            } else {
              html += Array.isArray(value) ? value.length : value;
            }
            break;
          case "number":
            if (tier === SubscriptionTier.Supporter) {
              html += "Variable*";
            } else {
              html += value === -1 ? "Unlimited" : value;
            }
            break;
          case "boolean":
            if (tier === SubscriptionTier.Supporter) {
              html += '<i class="icon-check"></i>*';
            } else {
              html += value ? '<i class="icon-check"></i>' : '<i class="icon-x"></i>';
            }
            break;
          case "multiplier":
            if (tier === SubscriptionTier.Supporter) {
              html += "Variable*";
            } else {
              html += `${value}x`;
            }
            break;
          case "days":
            if (tier === SubscriptionTier.Supporter) {
              html += "Variable*";
            } else {
              html += value === -1 ? "Unlimited" : `${value} days`;
            }
            break;
        }
        
        html += '</td>';
      });
      
      html += '</tr>';
    });

    html += '</tbody>';
    return html;
  }

  protected setupEventListeners(): void {
    super.setupEventListeners();

    // Billing toggle
    this.modalElement?.querySelectorAll('.billing-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        this.selectedBilling = target.dataset.billing as "monthly" | "yearly";
        this.updateBillingToggle();
        this.updatePrices();
      });
    });

    // Supporter slider
    const supporterSlider = this.modalElement?.querySelector('#supporter-slider') as HTMLInputElement;
    if (supporterSlider) {
      supporterSlider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.supporterAmount = parseInt(target.value);
        this.updateSupporterDisplay();
      });
    }

    // Supporter breakpoint clicks
    this.modalElement?.querySelectorAll('.breakpoint').forEach(breakpoint => {
      breakpoint.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const amount = parseInt(target.dataset.amount || '10');
        this.supporterAmount = amount;
        
        // Update slider position
        if (supporterSlider) {
          supporterSlider.value = amount.toString();
        }
        
        this.updateSupporterDisplay();
      });
    });

    // Tier selection
    this.modalElement?.querySelectorAll('.tier-select-btn:not(.current)').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const tier = target.dataset.tier as SubscriptionTier;
        
        if (tier === SubscriptionTier.Supporter) {
          this.selectedTier = tier;
          await this.handleSupporterPurchase();
        } else {
          this.selectedTier = tier;
          await this.handleSubscribe();
        }
      });
    });
  }

  private updateBillingToggle() {
    this.modalElement?.querySelectorAll('.billing-option').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-billing') === this.selectedBilling);
    });
  }

  private updatePrices() {
    Object.values(SubscriptionTier).forEach(tier => {
      if (tier === SubscriptionTier.Free) return;
      
      const pricing = SubscriptionPricing[tier];
      const price = this.selectedBilling === "monthly" ? pricing.monthly : pricing.yearly;
      const period = this.selectedBilling === "monthly" ? "month" : "year";
      
      const priceElement = this.modalElement?.querySelector(`.tier-card[data-tier="${tier}"] .amount`);
      const periodElement = this.modalElement?.querySelector(`.tier-card[data-tier="${tier}"] .period`);
      
      if (priceElement) priceElement.textContent = price.toFixed(2);
      if (periodElement) periodElement.textContent = `/${period}`;
    });
  }

  private async handleSubscribe() {
    try {
      // Show loading state
      const btn = this.modalElement?.querySelector(`.tier-select-btn[data-tier="${this.selectedTier}"]`) as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Processing...";
      }

      // Create checkout session
      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          tier: this.selectedTier,
          billing: this.selectedBilling,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { checkoutUrl } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
      
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to process subscription. Please try again.");
      
      // Reset button
      const btn = this.modalElement?.querySelector(`.tier-select-btn[data-tier="${this.selectedTier}"]`) as HTMLButtonElement;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Select Plan";
      }
    }
  }

  private updateSupporterDisplay() {
    const supporterPackage = calculateSupporterPackage(this.supporterAmount);
    
    // Update amount display with tier-based coloring
    const amountElement = this.modalElement?.querySelector('.supporter-amount');
    if (amountElement) {
      amountElement.textContent = `$${this.supporterAmount.toFixed(0)}`;
      
      // Update amount color based on tier
      amountElement.className = 'supporter-amount';
      if (this.supporterAmount >= 150) {
        amountElement.classList.add('patron');
      } else if (supporterPackage.tier === SubscriptionTier.Sovereign) {
        amountElement.classList.add('sovereign');
      } else if (supporterPackage.tier === SubscriptionTier.Elite) {
        amountElement.classList.add('elite');
      } else if (supporterPackage.tier === SubscriptionTier.Premium) {
        amountElement.classList.add('premium');
      } else {
        amountElement.classList.add('supporter');
      }
    }
    
    // Update duration display
    const durationElement = this.modalElement?.querySelector('.supporter-duration');
    if (durationElement) {
      durationElement.textContent = supporterPackage.description;
    }
    
    // Update features preview
    const featuresElement = this.modalElement?.querySelector('.supporter-features');
    if (featuresElement) {
      featuresElement.innerHTML = this.getSupporterFeaturePreview(supporterPackage);
    }
    
    // Update tier indicator
    const tierIndicatorElement = this.modalElement?.querySelector('#slider-tier-indicator');
    if (tierIndicatorElement) {
      tierIndicatorElement.textContent = this.getTierIndicatorText(supporterPackage.tier, this.supporterAmount);
      
      // Update indicator styling based on tier
      tierIndicatorElement.className = 'slider-tier-indicator';
      if (this.supporterAmount >= 150) {
        tierIndicatorElement.classList.add('patron');
      } else if (supporterPackage.tier === SubscriptionTier.Sovereign) {
        tierIndicatorElement.classList.add('sovereign');
      } else if (supporterPackage.tier === SubscriptionTier.Elite) {
        tierIndicatorElement.classList.add('elite');
      } else if (supporterPackage.tier === SubscriptionTier.Premium) {
        tierIndicatorElement.classList.add('premium');
      } else {
        tierIndicatorElement.classList.add('supporter');
      }
    }
    
    // Update button amount
    const buttonElement = this.modalElement?.querySelector('.tier-select-btn[data-tier="supporter"]') as HTMLElement;
    if (buttonElement) {
      buttonElement.setAttribute('data-amount', this.supporterAmount.toString());
    }
    
    // Update breakpoint highlights
    const breakpoints = getSupporterPackageBreakpoints();
    this.modalElement?.querySelectorAll('.breakpoint').forEach((element) => {
      const htmlElement = element as HTMLElement;
      const amount = parseInt(htmlElement.dataset.amount || '0');
      const shouldHighlight = breakpoints.find(bp => bp.amount === amount)?.highlight || false;
      const isNearCurrent = Math.abs(amount - this.supporterAmount) <= 5;
      
      htmlElement.classList.toggle('highlight', shouldHighlight || isNearCurrent);
    });
  }

  private async handleSupporterPurchase() {
    try {
      // Show loading state
      const btn = this.modalElement?.querySelector('.tier-select-btn[data-tier="supporter"]') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Processing...";
      }

      // Create one-time payment session for supporter
      const response = await fetch("/api/subscription/create-supporter-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          amount: this.supporterAmount,
          tier: SubscriptionTier.Supporter,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create supporter checkout session");
      }

      const { checkoutUrl } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
      
    } catch (error) {
      console.error("Supporter purchase error:", error);
      alert("Failed to process supporter purchase. Please try again.");
      
      // Reset button
      const btn = this.modalElement?.querySelector('.tier-select-btn[data-tier="supporter"]') as HTMLButtonElement;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Support Now";
      }
    }
  }

  private updateDisplay() {
    // Recreate content with updated current tier
    if (this.modalElement) {
      const content = this.modalElement.querySelector('.modal-content');
      if (content) {
        content.innerHTML = this.createContent();
        this.setupEventListeners();
      }
    }
  }
}