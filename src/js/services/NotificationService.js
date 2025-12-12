import { CONFIG } from '../config.js';

/**
 * Manages toast notifications for user feedback
 */
export class NotificationService {
    constructor() {
        this.container = document.getElementById(CONFIG.UI.TOAST_CONTAINER_ID);
        this.lastMessageTime = 0;
        this.lastMessageText = '';
        this.currentToast = null;
    }

    /**
     * Shows a toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'info' or 'error'
     */
    show(message, type = 'info') {
        if (!this.container) return;

        const now = Date.now();
        // Prevent duplicate messages within 2 seconds
        if (message === this.lastMessageText && (now - this.lastMessageTime) < 2000) {
            return;
        }
        
        // Remove existing toast if any
        if (this.currentToast) {
            this.currentToast.remove();
            this.currentToast = null;
        }

        this.lastMessageText = message;
        this.lastMessageTime = now;

        const toast = document.createElement('div');
        this.currentToast = toast;
        toast.className = CONFIG.UI.CSS_CLASSES.TOAST;
        if (type === 'error') {
            toast.classList.add(CONFIG.UI.CSS_CLASSES.TOAST_ERROR);
        }
        toast.textContent = message;

        this.container.appendChild(toast);

        // Trigger reflow for animation
        void toast.offsetWidth;
        toast.classList.add(CONFIG.UI.CSS_CLASSES.TOAST_SHOW);

        setTimeout(() => {
            if (this.currentToast === toast) {
                toast.classList.remove(CONFIG.UI.CSS_CLASSES.TOAST_SHOW);
                setTimeout(() => {
                    if (toast.parentNode === this.container) {
                        this.container.removeChild(toast);
                    }
                    if (this.currentToast === toast) {
                        this.currentToast = null;
                    }
                }, 300); // Wait for transition out
            }
        }, CONFIG.UI.TOAST_TIMEOUT);
    }
}
