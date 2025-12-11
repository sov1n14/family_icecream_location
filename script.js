/**
 * Application Constants and Configuration
 * Centralizes all static configuration to avoid magic values
 */
const CONFIG = {
    MAP_ID: 'map',
    DATA_URL: 'stores.json',
    DEFAULT_CENTER: [25.0320, 121.5143], // Taipei
    DEFAULT_ZOOM: 13,
    TILE_LAYER: {
        URL: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        SUBDOMAINS: 'abcd',
        MAX_ZOOM: 20
    },
    MARKERS: {
        BLUE: 'blue',
        RED: 'red',
        BLUE_STRIPED: 'blue-striped',
        RED_STRIPED: 'red-striped',
        DEFAULT: 'blue'
    },
    COLORS: {
        BLUE: '#2b82cb',
        RED: '#e04e39'
    },
    MESSAGES: {
        LOCATION_NOT_SUPPORTED: '您的瀏覽器不支援地理位置功能',
        LOCATION_DENIED: '請允許存取位置資訊以顯示您附近的店舖。\n若您先前已拒絕，請檢查瀏覽器網址列或設定中的權限設定。',
        LOCATION_UNAVAILABLE: '無法偵測到您的目前位置，請確認您的裝置已開啟 GPS 或連上網路。',
        LOCATION_TIMEOUT: '取得位置資訊逾時，請稍後再試。',
        LOCATION_UNKNOWN_ERROR: '無法取得您的位置。',
        USER_LOCATION_POPUP: '您的目前位置'
    }
};

/**
 * Service to handle data fetching and normalization
 * Follows Single Responsibility Principle: Data Access
 */
class StoreService {
    /**
     * Fetches store data from the source JSON
     * @returns {Promise<{stores: Array, lastUpdated: string}>}
     */
    static async fetchStores() {
        try {
            const response = await fetch(CONFIG.DATA_URL);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const rawData = await response.json();
            
            // Extract metadata (first element usually contains timestamp)
            let lastUpdated = '';
            if (rawData.length > 0 && rawData[0].last_updated) {
                lastUpdated = rawData[0].last_updated;
            }

            // Filter and normalize data
            const stores = rawData
                .map(StoreService._normalizeStoreData)
                .filter(store => store.isValid);
                
            return { stores, lastUpdated };
        } catch (error) {
            console.error('Failed to fetch stores:', error);
            throw error;
        }
    }

    /**
     * Normalizes raw store data into a consistent format
     * @param {Object} rawStore - The raw store object from JSON
     * @returns {Object} Normalized store object
     * @private
     */
    static _normalizeStoreData(rawStore) {
        // Validate essential coordinates
        const hasCoordinates = rawStore.py && rawStore.px && 
                             !isNaN(parseFloat(rawStore.py)) && 
                             !isNaN(parseFloat(rawStore.px));

        return {
            name: rawStore.NAME || 'Unknown Store',
            latitude: parseFloat(rawStore.py),
            longitude: parseFloat(rawStore.px),
            address: rawStore.addr || '',
            phone: rawStore.TEL || '',
            flavorType: rawStore.flavorType || '',
            markerColor: rawStore.markerColor || CONFIG.MARKERS.DEFAULT,
            isValid: hasCoordinates
        };
    }
}

/**
 * Helper class for generating HTML content
 * Follows Single Responsibility Principle: UI Generation
 */
class UIHelpers {
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
        let flavorClass = 'store-popup-flavor';
        
        // Determine color style based on marker color logic
        const colorStyle = (store.markerColor.includes('red')) 
            ? `color: ${CONFIG.COLORS.RED};` 
            : `color: ${CONFIG.COLORS.BLUE};`;

        if (store.flavorType.includes('特殊造型')) {
            flavorHtml = flavorHtml.replace(' (', '<br>(');
            flavorClass += ' store-popup-flavor--multiline';
        }

        return `
            <div class="store-popup">
                <b>
                    <a href="${mapUrl}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="store-popup-link">
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
            <div id="last-updated" class="last-updated"></div>
        `;
    }
}

/**
 * Manages Map interactions and layers
 * Follows Single Responsibility Principle: Map Management
 */
class MapController {
    constructor(mapId) {
        this.mapId = mapId;
        this.map = null;
        this.icons = {};
        this.userMarker = null;
        this.watchId = null;
    }

    /**
     * Initialize the map application
     */
    init() {
        this._initMap();
        this._initIcons();
        this._addControls();
    }

    _initMap() {
        this.map = L.map(this.mapId).setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);
        
        L.tileLayer(CONFIG.TILE_LAYER.URL, {
            attribution: CONFIG.TILE_LAYER.ATTRIBUTION,
            subdomains: CONFIG.TILE_LAYER.SUBDOMAINS,
            maxZoom: CONFIG.TILE_LAYER.MAX_ZOOM
        }).addTo(this.map);
    }

    _initIcons() {
        // Base configuration for custom CSS pins
        const pinDefaults = {
            iconSize: [30, 30],
            iconAnchor: [15, 36], // Pointing tip location relative to icon top-left
            popupAnchor: [0, -36]
        };

        const createIcon = (className) => L.divIcon({
            className: `custom-pin ${className}`,
            ...pinDefaults
        });

        this.icons[CONFIG.MARKERS.BLUE] = createIcon('marker-blue');
        this.icons[CONFIG.MARKERS.RED] = createIcon('marker-red');
        this.icons[CONFIG.MARKERS.BLUE_STRIPED] = createIcon('marker-blue-striped');
        this.icons[CONFIG.MARKERS.RED_STRIPED] = createIcon('marker-red-striped');
    }

    _addControls() {
        this._addLegend();
        this._addLocateControl();
    }

    _addLegend() {
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = UIHelpers.createLegendContent();
            return div;
        };
        legend.addTo(this.map);
    }

    _addLocateControl() {
        const locateControl = L.control({ position: 'bottomright' });
        
        locateControl.onAdd = () => {
            const container = L.DomUtil.create('div', 'leaflet-control-locate leaflet-bar leaflet-control');
            container.title = "Show my location";
            
            // Create inner icon element
            L.DomUtil.create('div', 'leaflet-control-locate-icon', container);
            
            L.DomEvent.disableClickPropagation(container);
            container.onclick = (e) => {
                e.preventDefault();
                this.locateUser(true);
            };
            return container;
        };
        
        locateControl.addTo(this.map);
    }

    /**
     * Updates the Last Updated timestamp in the UI
     * @param {string} date 
     */
    updateLastUpdatedTime(date) {
        const el = document.getElementById('last-updated');
        if (el && date) {
            el.textContent = `Last Updated Data Time: ${date}`;
        }
    }

    /**
     * Renders store markers on the map
     * @param {Array} stores 
     */
    renderMarkers(stores) {
        if (!this.map) return;

        stores.forEach(store => {
            const icon = this.icons[store.markerColor] || this.icons[CONFIG.MARKERS.DEFAULT];
            const popupContent = UIHelpers.createStorePopupContent(store);

            L.marker([store.latitude, store.longitude], { icon: icon })
                .addTo(this.map)
                .bindPopup(popupContent);
        });
    }

    /**
     * Handles user location request
     * @param {boolean} isManualRequest 
     */
    locateUser(isManualRequest = false) {
        if (!navigator.geolocation) {
            alert(CONFIG.MESSAGES.LOCATION_NOT_SUPPORTED);
            return;
        }

        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => this._handleLocationSuccess(position),
            (error) => this._handleLocationError(error, isManualRequest),
            options
        );
    }

    _handleLocationSuccess(position) {
        const { latitude, longitude } = position.coords;
        
        this._updateUserMarker(latitude, longitude);
        this.map.setView([latitude, longitude], 15);

        // Start watching for updates
        this.watchId = navigator.geolocation.watchPosition(
            (pos) => this._updateUserMarker(pos.coords.latitude, pos.coords.longitude),
            (err) => console.warn('Error watching position:', err.message),
            { enableHighAccuracy: true }
        );
    }

    _handleLocationError(error, isManualRequest) {
        console.warn('Location access denied or failed:', error.message);
        
        if (!isManualRequest) return;

        let message = CONFIG.MESSAGES.LOCATION_UNKNOWN_ERROR;
        switch(error.code) {
            case 1: // PERMISSION_DENIED
                message = CONFIG.MESSAGES.LOCATION_DENIED;
                break;
            case 2: // POSITION_UNAVAILABLE
                message = CONFIG.MESSAGES.LOCATION_UNAVAILABLE;
                break;
            case 3: // TIMEOUT
                message = CONFIG.MESSAGES.LOCATION_TIMEOUT;
                break;
        }
        alert(message);
    }

    _updateUserMarker(lat, lng) {
        if (this.userMarker) {
            this.userMarker.setLatLng([lat, lng]);
        } else {
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="pulse"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            this.userMarker = L.marker([lat, lng], {
                icon: userIcon,
                zIndexOffset: 1000
            })
            .addTo(this.map)
            .bindPopup(CONFIG.MESSAGES.USER_LOCATION_POPUP);
        }
    }
}

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const mapController = new MapController(CONFIG.MAP_ID);
    mapController.init();
    
    // Auto-locate on load
    mapController.locateUser();

    try {
        const { stores, lastUpdated } = await StoreService.fetchStores();
        mapController.renderMarkers(stores);
        mapController.updateLastUpdatedTime(lastUpdated);
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Could add a visual error message to the user here
    }
});
