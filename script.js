/**
 * Configuration constants for the application
 */
const APP_CONFIG = {
    MAP_ID: 'map',
    DATA_URL: 'stores.json',
    DEFAULT_CENTER: [25.0330, 121.5654],
    DEFAULT_ZOOM: 13,
    TILE_LAYER: {
        URL: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        SUBDOMAINS: 'abcd',
        MAX_ZOOM: 20
    },
    ICONS: {
        RED: {
            URL: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            SHADOW_URL: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png'
        },
        BLUE: {
            URL: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            SHADOW_URL: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png'
        }
    }
};

/**
 * Service to handle data fetching and normalization
 */
class StoreService {
    /**
     * Fetches store data from the source JSON
     * @returns {Promise<Array>} Array of normalized store objects
     */
    static async fetchStores() {
        try {
            const response = await fetch(APP_CONFIG.DATA_URL);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const rawData = await response.json();
            return rawData.map(this._normalizeStoreData).filter(store => store.isValid);
        } catch (error) {
            console.error('Failed to fetch stores:', error);
            throw error;
        }
    }

    /**
     * Normalizes raw store data into a consistent format
     * @param {Object} rawStore - The raw store object from JSON
     * @returns {Object} Normalized store object
     */
    static _normalizeStoreData(rawStore) {
        return {
            name: rawStore.NAME || 'Unknown Store',
            latitude: parseFloat(rawStore.py),
            longitude: parseFloat(rawStore.px),
            address: rawStore.addr || '',
            phone: rawStore.TEL || '',
            road: rawStore.road || '',
            flavorType: rawStore.flavorType || '',
            markerColor: rawStore.markerColor || 'blue', // Default to blue
            isValid: !!(rawStore.py && rawStore.px)
        };
    }
}

/**
 * Class to manage Map operations
 */
class MapController {
    constructor(mapId) {
        this.mapId = mapId;
        this.map = null;
        this.icons = {};
        this.markers = [];
        this.hasUserLocation = false;
        this.userMarker = null;
        this.watchId = null;
    }

    /**
     * Initializes the map and resources
     */
    init() {
        this._initMap();
        this._initIcons();
        this._addLegend();
        this._addLocateControl();
    }

    _initMap() {
        this.map = L.map(this.mapId).setView(APP_CONFIG.DEFAULT_CENTER, APP_CONFIG.DEFAULT_ZOOM);
        
        L.tileLayer(APP_CONFIG.TILE_LAYER.URL, {
            attribution: APP_CONFIG.TILE_LAYER.ATTRIBUTION,
            subdomains: APP_CONFIG.TILE_LAYER.SUBDOMAINS,
            maxZoom: APP_CONFIG.TILE_LAYER.MAX_ZOOM
        }).addTo(this.map);
    }

    _initIcons() {
        const iconDefaults = {
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        };

        this.icons.red = new L.Icon({
            iconUrl: APP_CONFIG.ICONS.RED.URL,
            shadowUrl: APP_CONFIG.ICONS.RED.SHADOW_URL,
            ...iconDefaults
        });

        this.icons.blue = new L.Icon({
            iconUrl: APP_CONFIG.ICONS.BLUE.URL,
            shadowUrl: APP_CONFIG.ICONS.BLUE.SHADOW_URL,
            ...iconDefaults
        });
    }

    _addLegend() {
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = `
                <div class="legend-item"><i style="background: red;"></i> 雙口味 (Red)</div>
                <div class="legend-item"><i style="background: blue;"></i> 單口味 (Blue)</div>
            `;
            return div;
        };
        
        legend.addTo(this.map);
    }

    _addLocateControl() {
        const locateControl = L.control({ position: 'bottomright' });

        locateControl.onAdd = () => {
            const container = L.DomUtil.create('div', 'leaflet-control-locate leaflet-bar leaflet-control');
            const icon = L.DomUtil.create('div', 'leaflet-control-locate-icon', container);
            
            container.title = "Show my location";
            
            // Prevent map click propagation
            L.DomEvent.disableClickPropagation(container);

            container.onclick = (e) => {
                e.preventDefault();
                this.locateUser();
            };

            return container;
        };

        locateControl.addTo(this.map);
    }

    /**
     * Requests user location and centers map if granted
     * Also starts watching position for updates
     */
    locateUser() {
        if (!navigator.geolocation) {
            console.log('Geolocation is not supported by your browser');
            return;
        }

        // Clear existing watch if any
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        // Get initial position to center map
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.hasUserLocation = true;
                this._updateUserMarker(position);
                this.map.setView(
                    [position.coords.latitude, position.coords.longitude],
                    15
                );
            },
            (error) => {
                console.log('Location access denied or failed:', error.message);
            },
            options
        );

        // Start watching position
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this._updateUserMarker(position);
            },
            (error) => {
                console.log('Error watching position:', error.message);
            },
            options
        );
    }

    _updateUserMarker(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (this.userMarker) {
            this.userMarker.setLatLng([lat, lng]);
        } else {
            // Create a custom pulsing icon for user location
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="pulse"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            this.userMarker = L.marker([lat, lng], {
                icon: userIcon,
                zIndexOffset: 1000 // Ensure user marker is on top
            }).addTo(this.map);
            
            this.userMarker.bindPopup('您的目前位置');
        }
    }

    /**
     * Adds markers to the map
     * @param {Array} stores - Array of normalized store objects
     */
    renderMarkers(stores) {
        if (!this.map) return;

        const bounds = [];

        stores.forEach(store => {
            const icon = this.icons[store.markerColor] || this.icons.blue;
            const popupContent = this._createPopupContent(store);

            L.marker([store.latitude, store.longitude], { icon: icon })
                .addTo(this.map)
                .bindPopup(popupContent);

            bounds.push([store.latitude, store.longitude]);
        });

        if (bounds.length > 0 && !this.hasUserLocation) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    _createPopupContent(store) {
        return `
            <div class="store-popup">
                <b>${this._escapeHtml(store.name)}</b><br>
                <span style="color:${this._escapeHtml(store.markerColor)}; font-weight:bold;">${this._escapeHtml(store.flavorType)}</span><br>
                地址: ${this._escapeHtml(store.address)}<br>
                電話: ${this._escapeHtml(store.phone)}<br>
                路段: ${this._escapeHtml(store.road)}
            </div>
        `;
    }

    _escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Application Entry Point
document.addEventListener('DOMContentLoaded', async () => {
    const mapController = new MapController(APP_CONFIG.MAP_ID);
    mapController.init();
    mapController.locateUser();

    try {
        const stores = await StoreService.fetchStores();
        mapController.renderMarkers(stores);
    } catch (error) {
        // Error handling UI could be improved here (e.g., toast notification)
        console.error('Application initialization failed:', error);
    }
});


