import { CONFIG } from '../config.js';

/**
 * Controls the full-screen loading overlay
 */
export class LoadingController {
    constructor() {
        this.element = document.getElementById(CONFIG.UI.LOADING_OVERLAY_ID);
    }

    show() {
        if (this.element) {
            this.element.classList.remove(CONFIG.UI.CSS_CLASSES.LOADING_HIDDEN);
        }
    }

    hide() {
        if (this.element) {
            this.element.classList.add(CONFIG.UI.CSS_CLASSES.LOADING_HIDDEN);
        }
    }
}
