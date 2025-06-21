import { SubscriptionModal } from "../SubscriptionModal";
import { SubscriptionTier } from "../../core/SubscriptionSchemas";

export class SubscriptionButton {
  private element: HTMLElement;
  private modal: SubscriptionModal | null = null;
  private currentTier: SubscriptionTier = SubscriptionTier.Free;
  private pulseInterval: number | null = null;

  constructor(private container: HTMLElement) {
    this.element = this.createElement();
    this.container.appendChild(this.element);
    this.setupEventListeners();
    this.loadSubscriptionStatus();
    this.startPulseAnimation();
  }

  private createElement(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'subscription-button';
    button.innerHTML = `
      <div class="subscription-button-glow"></div>
      <div class="subscription-button-content">
        <div class="subscription-icon-wrapper">
          <span class="subscription-icon"></span>
        </div>
        <span class="subscription-text">VIP</span>
        <div class="subscription-sparkle"></div>
      </div>
      <div class="subscription-button-border"></div>
    `;
    
    return button;
  }

  private setupEventListeners() {
    this.element.addEventListener('click', () => {
      this.openModal();
    });

    // Listen for subscription updates via custom events
    window.addEventListener('subscription:updated', ((event: CustomEvent) => {
      this.currentTier = event.detail.tier;
      this.updateButtonAppearance();
    }) as EventListener);

    // Listen for special promotions
    window.addEventListener('subscription:promotion', ((event: CustomEvent) => {
      this.showPromotion(event.detail.message);
    }) as EventListener);
  }

  private async loadSubscriptionStatus() {
    try {
      const response = await fetch('/api/subscription/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.currentTier = data.tier || SubscriptionTier.Free;
        this.updateButtonAppearance();
      }
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  }

  private updateButtonAppearance() {
    const icon = this.element.querySelector('.subscription-icon') as HTMLElement;
    const text = this.element.querySelector('.subscription-text') as HTMLElement;
    const iconWrapper = this.element.querySelector('.subscription-icon-wrapper') as HTMLElement;

    // Update based on current tier
    switch (this.currentTier) {
      case SubscriptionTier.Free:
        icon.textContent = '';
        text.textContent = 'ENLIST';
        this.element.className = 'subscription-button tier-free attention-grabbing';
        break;
        
      case SubscriptionTier.Premium:
        icon.textContent = '';
        text.textContent = 'PREMIUM';
        this.element.className = 'subscription-button tier-premium';
        break;
        
      case SubscriptionTier.Elite:
        icon.textContent = '';
        text.textContent = 'ELITE';
        this.element.className = 'subscription-button tier-elite';
        break;
        
      case SubscriptionTier.Sovereign:
        icon.textContent = '';
        text.textContent = 'SOVEREIGN';
        this.element.className = 'subscription-button tier-sovereign';
        this.addSovereignEffects();
        break;
    }

    // Add tier-specific icon animations
    if (this.currentTier !== SubscriptionTier.Free) {
      iconWrapper.classList.add('premium-spin');
    }
  }

  private addSovereignEffects() {
    // Remove any existing particle containers first
    const existingParticles = this.element.querySelector('.sovereign-particles');
    if (existingParticles) {
      existingParticles.remove();
    }

    // Add tactical data stream effects for Sovereign tier
    const particleContainer = document.createElement('div');
    particleContainer.className = 'sovereign-particles';
    this.element.appendChild(particleContainer);

    // Create tactical command interface particles
    const particleTypes = ['stream', 'binary', 'pulse', 'stream'];
    
    for (let i = 0; i < 4; i++) {
      const particle = document.createElement('div');
      const particleType = particleTypes[i];
      particle.className = `particle ${particleType}`;
      particleContainer.appendChild(particle);
    }
  }

  private startPulseAnimation() {
    // Add aggressive attention animations for free users
    if (this.currentTier === SubscriptionTier.Free) {
      // Multiple animation cycles
      this.pulseInterval = window.setInterval(() => {
        // Add multiple effects in sequence
        this.element.classList.add('pulse-glow');
        
        setTimeout(() => {
          this.element.classList.add('sparkle-active');
        }, 500);
        
        setTimeout(() => {
          this.element.classList.add('border-flash');
        }, 1000);
        
        setTimeout(() => {
          this.element.classList.remove('pulse-glow', 'sparkle-active', 'border-flash');
        }, 3000);
      }, 8000); // Every 8 seconds

      // Initial attention grab after 3 seconds
      setTimeout(() => {
        this.element.classList.add('pulse-glow');
        setTimeout(() => {
          this.element.classList.add('sparkle-active');
        }, 500);
        setTimeout(() => {
          this.element.classList.add('border-flash');
        }, 1000);
        setTimeout(() => {
          this.element.classList.remove('pulse-glow', 'sparkle-active', 'border-flash');
        }, 3000);
      }, 3000);
      
      // Add constant subtle animation
      this.element.classList.add('constant-glow');
    } else if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
      this.element.classList.remove('constant-glow');
    }
  }

  private showPromotion(message: string) {
    const promo = document.createElement('div');
    promo.className = 'subscription-promo';
    promo.textContent = message;
    
    this.element.appendChild(promo);
    
    // Animate in
    setTimeout(() => {
      promo.classList.add('show');
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
      promo.classList.remove('show');
      setTimeout(() => {
        promo.remove();
      }, 300);
    }, 5000);
  }

  private openModal() {
    if (!this.modal) {
      this.modal = new SubscriptionModal();
    }
    this.modal.show();

    // Track analytics
    this.trackEvent('subscription_button_clicked', {
      current_tier: this.currentTier,
    });
  }

  private trackEvent(event: string, data: any) {
    // Send to analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, data);
    }
  }

  public destroy() {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
    }
    this.element.remove();
    if (this.modal) {
      this.modal.destroy();
    }
  }
}