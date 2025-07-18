// Custom fullscreen management for video player
// This provides a custom fullscreen mode without using browser fullscreen API

export interface FullscreenOptions {
  hideUI?: boolean;
  hideNavigation?: boolean;
  backgroundColor?: string;
  zIndex?: number;
}

export class CustomFullscreenManager {
  private static instance: CustomFullscreenManager;
  private isFullscreen: boolean = false;
  private originalStyles: Map<string, string> = new Map();
  private fullscreenElement: HTMLElement | null = null;
  private options: FullscreenOptions = {};
  private onFullscreenChange: ((isFullscreen: boolean) => void) | null = null;

  private constructor() {
    this.handleEscapeKey = this.handleEscapeKey.bind(this);
  }

  static getInstance(): CustomFullscreenManager {
    if (!CustomFullscreenManager.instance) {
      CustomFullscreenManager.instance = new CustomFullscreenManager();
    }
    return CustomFullscreenManager.instance;
  }

  private handleEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isFullscreen) {
      this.exitFullscreen();
    }
  }

  private hideUIElements() {
    const elementsToHide = [
      'header',
      'nav',
      '.header',
      '.navbar',
      '.sidebar',
      '.navigation',
      '[data-hide-fullscreen]'
    ];

    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement) {
          this.originalStyles.set(
            `${selector}-${Array.from(elements).indexOf(element)}-display`,
            htmlElement.style.display || 'initial'
          );
          htmlElement.style.display = 'none';
        }
      });
    });
  }

  private showUIElements() {
    const elementsToShow = [
      'header',
      'nav',
      '.header',
      '.navbar',
      '.sidebar',
      '.navigation',
      '[data-hide-fullscreen]'
    ];

    elementsToShow.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement) {
          const originalDisplay = this.originalStyles.get(
            `${selector}-${index}-display`
          );
          if (originalDisplay) {
            htmlElement.style.display = originalDisplay;
          }
        }
      });
    });
  }

  private applyFullscreenStyles(element: HTMLElement) {
    // Store original styles
    this.originalStyles.set('position', element.style.position || 'static');
    this.originalStyles.set('top', element.style.top || 'auto');
    this.originalStyles.set('left', element.style.left || 'auto');
    this.originalStyles.set('width', element.style.width || 'auto');
    this.originalStyles.set('height', element.style.height || 'auto');
    this.originalStyles.set('zIndex', element.style.zIndex || 'auto');
    this.originalStyles.set('backgroundColor', element.style.backgroundColor || 'transparent');

    // Apply fullscreen styles
    element.style.position = 'fixed';
    element.style.top = '0';
    element.style.left = '0';
    element.style.width = '100vw';
    element.style.height = '100vh';
    element.style.zIndex = (this.options.zIndex || 9999).toString();
    element.style.backgroundColor = this.options.backgroundColor || '#000';

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  private removeFullscreenStyles(element: HTMLElement) {
    // Restore original styles
    element.style.position = this.originalStyles.get('position') || 'static';
    element.style.top = this.originalStyles.get('top') || 'auto';
    element.style.left = this.originalStyles.get('left') || 'auto';
    element.style.width = this.originalStyles.get('width') || 'auto';
    element.style.height = this.originalStyles.get('height') || 'auto';
    element.style.zIndex = this.originalStyles.get('zIndex') || 'auto';
    element.style.backgroundColor = this.originalStyles.get('backgroundColor') || 'transparent';

    // Restore body scroll
    document.body.style.overflow = '';
  }

  enterFullscreen(element: HTMLElement, options: FullscreenOptions = {}) {
    if (this.isFullscreen) {
      return;
    }

    this.fullscreenElement = element;
    this.options = options;
    this.isFullscreen = true;

    // Apply fullscreen styles
    this.applyFullscreenStyles(element);

    // Hide UI elements if requested
    if (options.hideUI !== false) {
      this.hideUIElements();
    }

    // Add escape key listener
    document.addEventListener('keydown', this.handleEscapeKey);

    // Add fullscreen class to body
    document.body.classList.add('custom-fullscreen');

    // Notify listeners
    if (this.onFullscreenChange) {
      this.onFullscreenChange(true);
    }

    // Dispatch custom event
    const event = new CustomEvent('customfullscreenchange', {
      detail: { isFullscreen: true }
    });
    document.dispatchEvent(event);
  }

  exitFullscreen() {
    if (!this.isFullscreen || !this.fullscreenElement) {
      return;
    }

    // Remove fullscreen styles
    this.removeFullscreenStyles(this.fullscreenElement);

    // Show UI elements
    this.showUIElements();

    // Remove escape key listener
    document.removeEventListener('keydown', this.handleEscapeKey);

    // Remove fullscreen class from body
    document.body.classList.remove('custom-fullscreen');

    // Reset state
    this.isFullscreen = false;
    this.fullscreenElement = null;
    this.originalStyles.clear();

    // Notify listeners
    if (this.onFullscreenChange) {
      this.onFullscreenChange(false);
    }

    // Dispatch custom event
    const event = new CustomEvent('customfullscreenchange', {
      detail: { isFullscreen: false }
    });
    document.dispatchEvent(event);
  }

  toggleFullscreen(element: HTMLElement, options: FullscreenOptions = {}) {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen(element, options);
    }
  }

  getIsFullscreen(): boolean {
    return this.isFullscreen;
  }

  getFullscreenElement(): HTMLElement | null {
    return this.fullscreenElement;
  }

  onFullscreenChangeListener(callback: (isFullscreen: boolean) => void) {
    this.onFullscreenChange = callback;
  }

  removeFullscreenChangeListener() {
    this.onFullscreenChange = null;
  }
}

// Export singleton instance
export const fullscreenManager = CustomFullscreenManager.getInstance();

// Utility hooks for React components
export const useCustomFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = (event: CustomEvent) => {
      setIsFullscreen(event.detail.isFullscreen);
    };

    document.addEventListener('customfullscreenchange', handleFullscreenChange as EventListener);
    
    return () => {
      document.removeEventListener('customfullscreenchange', handleFullscreenChange as EventListener);
    };
  }, []);

  const enterFullscreen = React.useCallback((element: HTMLElement, options?: FullscreenOptions) => {
    fullscreenManager.enterFullscreen(element, options);
  }, []);

  const exitFullscreen = React.useCallback(() => {
    fullscreenManager.exitFullscreen();
  }, []);

  const toggleFullscreen = React.useCallback((element: HTMLElement, options?: FullscreenOptions) => {
    fullscreenManager.toggleFullscreen(element, options);
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
};

// Add React import for the hook
import React from 'react';