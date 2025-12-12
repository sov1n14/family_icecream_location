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
    UI: {
        LOADING_OVERLAY_ID: 'loading-overlay',
        TOAST_CONTAINER_ID: 'toast-container',
        LAST_UPDATED_ID: 'last-updated',
        TOAST_TIMEOUT: 3000,
        CSS_CLASSES: {
            POPUP_FLAVOR: 'store-popup-flavor',
            POPUP_FLAVOR_MULTILINE: 'store-popup-flavor--multiline',
            POPUP_LINK: 'store-popup-link',
            TOAST: 'toast',
            TOAST_SHOW: 'show',
            TOAST_ERROR: 'error',
            LOADING_HIDDEN: 'hidden'
        }
    },
    MESSAGES: {
        LOCATION_NOT_SUPPORTED: '您的瀏覽器不支援地理位置功能',
        LOCATION_DENIED: '請允許存取位置資訊以顯示您附近的店舖。\n若您先前已拒絕，請檢查瀏覽器網址列或設定中的權限設定。',
        LOCATION_UNAVAILABLE: '無法偵測到您的目前位置，請確認您的裝置已開啟 GPS 或連上網路。',
        LOCATION_TIMEOUT: '取得位置資訊逾時，請稍後再試。',
        LOCATION_UNKNOWN_ERROR: '無法取得您的位置。',
        USER_LOCATION_POPUP: '您的目前位置',
        FETCH_ERROR: '暫時無法取得店舖資料，請檢查網路連線。'
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

        const flavorType = rawStore.flavorType || '';
        const isSpecialShape = flavorType.includes('特殊造型');
        const markerColor = rawStore.markerColor || CONFIG.MARKERS.DEFAULT;
        
        // Pre-determine display color for UI
        const displayColor = (markerColor.includes('red')) 
            ? CONFIG.COLORS.RED 
            : CONFIG.COLORS.BLUE;

        return {
            name: rawStore.NAME || 'Unknown Store',
            latitude: parseFloat(rawStore.py),
            longitude: parseFloat(rawStore.px),
            address: rawStore.addr || '',
            phone: rawStore.TEL || '',
            flavorType: flavorType,
            markerColor: markerColor,
            isSpecialShape: isSpecialShape,
            displayColor: displayColor,
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
            <div id="last-updated" class="last-updated"></div>
        `;
    }
}

/**
 * Controls the full-screen loading overlay
 */
class LoadingController {
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

/**
 * Manages toast notifications for user feedback
 */
class NotificationService {
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

/**
 * Manages Map interactions and layers
 * Follows Single Responsibility Principle: Map Management
 */
class MapController {
    constructor(mapId, notificationService) {
        this.mapId = mapId;
        this.notificationService = notificationService;
        this.map = null;
        this.markersLayer = null; // Cluster group layer
        this.icons = {};
        this.userMarker = null;
        this.watchId = null;
        this.locateButton = null;
        this.lastErrorTime = 0; // Throttle timestamp for location errors
    }

    /**
     * Initialize the map application
     */
    init() {
        this._initMap();
        this._initIcons();
        this._initMarkersLayer();
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

    _initMarkersLayer() {
        this.markersLayer = L.markerClusterGroup({
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            spiderfyOnMaxZoom: true,
            removeOutsideVisibleBounds: true,
            maxClusterRadius: 60,
            iconCreateFunction: function(cluster) {
                const markers = cluster.getAllChildMarkers();
                let redCount = 0;
                
                markers.forEach(marker => {
                    // Check directly from our custom option
                    if (marker.options.markerColor && marker.options.markerColor.includes('red')) {
                        redCount++;
                    }
                });

                // Determine majority color
                let colorClass;
                if (redCount === markers.length / 2) {
                    colorClass = 'marker-cluster-split';
                } else if (redCount > markers.length / 2) {
                    colorClass = 'marker-cluster-red';
                } else {
                    colorClass = 'marker-cluster-blue';
                }

                return L.divIcon({ 
                    html: '<div><span>' + cluster.getChildCount() + '</span></div>', 
                    className: 'marker-cluster ' + colorClass, 
                    iconSize: new L.Point(40, 40) 
                });
            }
        });
        this.map.addLayer(this.markersLayer);
    }

    _initIcons() {
        // Base configuration for custom CSS pins
        const pinDefaults = {
            iconSize: [30, 30],
            iconAnchor: [15, 36], // Pointing tip location relative to icon top-left
            popupAnchor: [0, -36]
        };

        const createIcon = (className) => L.divIcon({
            className: 'pin-wrapper',
            html: `<div class="custom-pin ${className}"></div>`,
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
            
            this.locateButton = container;

            L.DomEvent.disableClickPropagation(container);
            container.onclick = (e) => {
                e.preventDefault();
                if (this.locateButton && this.locateButton.classList.contains('loading')) {
                    return;
                }
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
        if (!this.markersLayer) return;

        this.markersLayer.clearLayers();
        const markers = [];

        stores.forEach(store => {
            const icon = this.icons[store.markerColor] || this.icons[CONFIG.MARKERS.DEFAULT];
            const popupContent = UIHelpers.createStorePopupContent(store);

            const marker = L.marker([store.latitude, store.longitude], { 
                icon: icon,
                markerColor: store.markerColor 
            }).bindPopup(popupContent);
            
            markers.push(marker);
        });

        this.markersLayer.addLayers(markers);
    }

    /**
     * Handles user location request
     * @param {boolean} isManualRequest 
     */
    locateUser(isManualRequest = false) {
        if (!navigator.geolocation) {
            this.notificationService?.show(CONFIG.MESSAGES.LOCATION_NOT_SUPPORTED, 'error');
            return;
        }

        if (this.locateButton) {
            this.locateButton.classList.add('loading');
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
            (position) => {
                this._handleLocationSuccess(position);
                
                // Start watching ONLY after successful initial location
                this.watchId = navigator.geolocation.watchPosition(
                    (pos) => this._updateUserMarker(pos.coords.latitude, pos.coords.longitude),
                    (err) => console.warn('Error watching position:', err.message),
                    { enableHighAccuracy: true }
                );
            },
            (error) => this._handleLocationError(error, isManualRequest),
            options
        );
    }

    _handleLocationSuccess(position) {
        if (this.locateButton) {
            this.locateButton.classList.remove('loading');
        }

        const { latitude, longitude } = position.coords;
        
        this._updateUserMarker(latitude, longitude);
        this.map.setView([latitude, longitude], 15);
    }

    _handleLocationError(error, isManualRequest) {
        if (this.locateButton) {
            this.locateButton.classList.remove('loading');
        }

        console.warn('Location access denied or failed:', error.message, 'Code:', error.code);
        
        if (!isManualRequest) return;

        // Throttle error messages (prevent showing multiple errors within 5 seconds)
        const now = Date.now();
        if (now - this.lastErrorTime < 5000) {
            return;
        }
        this.lastErrorTime = now;

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
        this.notificationService?.show(message, 'error');
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
    const loadingController = new LoadingController();
    const notificationService = new NotificationService();
    const mapController = new MapController(CONFIG.MAP_ID, notificationService);
    
    mapController.init();
    
    // Auto-locate on load
    mapController.locateUser();

    loadingController.show();

    try {
        const { stores, lastUpdated } = await StoreService.fetchStores();
        mapController.renderMarkers(stores);
        mapController.updateLastUpdatedTime(lastUpdated);
    } catch (error) {
        console.error('Failed to initialize application:', error);
        notificationService.show(CONFIG.MESSAGES.FETCH_ERROR, 'error');
    } finally {
        loadingController.hide();
    }
});
