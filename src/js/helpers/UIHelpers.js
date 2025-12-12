import { CONFIG } from '../config.js';

/**
 * Helper class for generating HTML content
 * Follows Single Responsibility Principle: UI Generation
 */
export class UIHelpers {
    /**
     * Escapes HTML to prevent XSS
     * @param {string} text 
     * @returns {string}
     */
    static escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Generates popup HTML for a store
     * @param {Object} store 
     * @returns {string}
     */
    static createStorePopupContent(store) {
        const safeName = this.escapeHtml(store.name);
        const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(store.name)}`;
        const safeAddress = this.escapeHtml(store.address);
        const safePhone = this.escapeHtml(store.phone);
        
        // Handle flavor display logic
        let flavorHtml = this.escapeHtml(store.flavorType);
        let flavorClass = CONFIG.UI.CSS_CLASSES.POPUP_FLAVOR;
        const colorStyle = `color: ${store.displayColor};`;

        if (store.isSpecialShape) {
            flavorHtml = flavorHtml.replace(' (', '<br>(');
            flavorClass += ` ${CONFIG.UI.CSS_CLASSES.POPUP_FLAVOR_MULTILINE}`;
        }

        return `
            <div class="store-popup">
                <b>
                    <a href="${mapUrl}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="${CONFIG.UI.CSS_CLASSES.POPUP_LINK}">
                        ${safeName}
                    </a>
                </b><br>
                <span class="${flavorClass}" style="${colorStyle}">
                    ${flavorHtml}
                </span><br>
                地址: ${safeAddress}<br>
                電話: ${safePhone}
            </div>
        `;
    }

    /**
     * Generates the Legend HTML
     * @returns {string}
     */
    static createLegendContent() {
        return `
            <div class="legend-item"><i class="marker-blue"></i> 單口味 (Single)</div>
            <div class="legend-item"><i class="marker-red"></i> 雙口味 (Dual)</div>
            <div class="legend-item"><i class="marker-blue-striped"></i> 單口味 + 特殊造型 (Single + Shape)</div>
            <div class="legend-item"><i class="marker-red-striped"></i> 雙口味 + 特殊造型 (Dual + Shape)</div>
            <div id="${CONFIG.UI.LAST_UPDATED_ID}" class="last-updated"></div>
        `;
    }

    /**
     * Creates a Leaflet DivIcon with custom CSS pin style
     * @param {string} className 
     * @returns {L.DivIcon}
     */
    static createPinIcon(className) {
        return L.divIcon({
            className: 'pin-wrapper',
            html: `<div class="custom-pin ${className}"></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 36], // Pointing tip location relative to icon top-left
            popupAnchor: [0, -36]
        });
    }
}
