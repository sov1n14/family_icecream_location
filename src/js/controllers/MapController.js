import { CONFIG } from '../config.js';
import { LocationService } from '../services/LocationService.js';
import { UIHelpers } from '../helpers/UIHelpers.js';

/**
 * Manages Map interactions and layers
 * Follows Single Responsibility Principle: Map Management
 */
export class MapController {
    constructor(mapId, notificationService, locationService) {
        this.mapId = mapId;
        this.notificationService = notificationService;
        this.locationService = locationService;
        this.map = null;
        this.markersLayer = null; // Cluster group layer
        this.icons = {};
        this.userMarker = null;
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
            chunkedLoading: true,
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
        this.icons[CONFIG.MARKERS.BLUE] = UIHelpers.createPinIcon('marker-blue');
        this.icons[CONFIG.MARKERS.RED] = UIHelpers.createPinIcon('marker-red');
        this.icons[CONFIG.MARKERS.BLUE_STRIPED] = UIHelpers.createPinIcon('marker-blue-striped');
        this.icons[CONFIG.MARKERS.RED_STRIPED] = UIHelpers.createPinIcon('marker-red-striped');
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
        const el = document.getElementById(CONFIG.UI.LAST_UPDATED_ID);
        if (el && date) {
            el.textContent = `資料最後更新時間: ${date}`;
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
    async locateUser(isManualRequest = false) {
        if (this.locateButton) {
            this.locateButton.classList.add('loading');
        }

        try {
            const position = await this.locationService.getCurrentPosition();
            this._handleLocationSuccess(position);

            // Start watching for updates
            this.locationService.watchPosition(
                (pos) => this._updateUserMarker(pos.coords.latitude, pos.coords.longitude),
                (err) => console.warn('Error watching position:', err.message)
            );
        } catch (error) {
            this._handleLocationError(error, isManualRequest);
        }
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

        if (error.message === 'GEOLOCATION_NOT_SUPPORTED') {
            this.notificationService?.show(CONFIG.MESSAGES.LOCATION_NOT_SUPPORTED, 'error');
            return;
        }

        console.warn('Location access denied or failed:', error.message);
        
        // Throttle error messages
        const now = Date.now();
        if (now - this.lastErrorTime < 5000) {
            return;
        }
        this.lastErrorTime = now;

        const message = LocationService.getErrorMessage(error);
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
