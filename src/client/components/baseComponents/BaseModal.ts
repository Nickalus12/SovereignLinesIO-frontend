export abstract class BaseModal {
  protected modalElement: HTMLElement | null = null;
  protected overlayElement: HTMLElement | null = null;
  protected isOpen = false;

  constructor(protected modalId: string) {}

  protected createModal() {
    // Create overlay
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'modal-overlay';
    this.overlayElement.addEventListener('click', () => this.hide());

    // Create modal container
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'modal-container';
    this.modalElement.id = this.modalId;
    this.modalElement.addEventListener('click', (e) => e.stopPropagation());

    // Create modal content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'modal-content';
    contentWrapper.innerHTML = this.createContent();

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => this.hide());

    // Assemble modal
    this.modalElement.appendChild(closeButton);
    this.modalElement.appendChild(contentWrapper);
    this.overlayElement.appendChild(this.modalElement);

    // Add to body
    document.body.appendChild(this.overlayElement);

    // Setup event listeners after creation
    this.setupEventListeners();
  }

  protected abstract createContent(): string;

  protected setupEventListeners(): void {
    // Override in subclasses
  }

  public show() {
    if (!this.modalElement) {
      this.createModal();
    }
    
    this.overlayElement?.classList.add('active');
    this.modalElement?.classList.add('active');
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
  }

  public hide() {
    this.overlayElement?.classList.remove('active');
    this.modalElement?.classList.remove('active');
    this.isOpen = false;
    document.body.style.overflow = '';
  }

  public toggle() {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  public destroy() {
    this.overlayElement?.remove();
    this.modalElement = null;
    this.overlayElement = null;
  }
}