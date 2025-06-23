export class MobileDetection {
  static isMobile(): boolean {
    return window.innerWidth < 640 || 
           ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0);
  }
  
  static isTablet(): boolean {
    return window.innerWidth >= 640 && window.innerWidth < 1024;
  }
  
  static getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (this.isMobile()) return 'mobile';
    if (this.isTablet()) return 'tablet';
    return 'desktop';
  }
  
  static addViewportHandler() {
    // Handle viewport changes for better mobile support
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    window.addEventListener('resize', () => {
      vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
    
    // Prevent double-tap zoom on buttons
    document.addEventListener('touchstart', (e) => {
      if (e.target instanceof HTMLElement && 
          (e.target.tagName === 'BUTTON' || 
           e.target.tagName === 'A' || 
           e.target.tagName === 'INPUT')) {
        e.target.style.touchAction = 'manipulation';
      }
    });
  }
  
  static preventBounceScroll() {
    // Prevent bounce scroll on iOS
    document.body.addEventListener('touchmove', (e) => {
      // Allow scrolling in specific scrollable elements
      let el = e.target as HTMLElement;
      while (el && el !== document.body) {
        if (el.scrollHeight > el.clientHeight && 
            getComputedStyle(el).overflowY !== 'hidden') {
          return; // Allow scroll
        }
        el = el.parentElement as HTMLElement;
      }
      e.preventDefault();
    }, { passive: false });
  }
  
  static init() {
    this.addViewportHandler();
    if (this.isMobile()) {
      this.preventBounceScroll();
    }
  }
}