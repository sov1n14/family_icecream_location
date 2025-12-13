// CSS imported in index.html for static deployment compatibility
import { CONFIG } from './config.js';
import { ServiceWorkerService } from './services/ServiceWorkerService.js';
import { StoreService } from './services/StoreService.js';
import { LocationService } from './services/LocationService.js';
import { NotificationService } from './services/NotificationService.js';
import { LoadingController } from './controllers/LoadingController.js';
import { MapController } from './controllers/MapController.js';

/**
 * Main Application Controller
 * Orchestrates the app initialization and component interaction
 */
class App {
    constructor() {
        this.loadingController = new LoadingController();
        this.notificationService = new NotificationService();
        this.locationService = new LocationService();
        this.mapController = new MapController(CONFIG.MAP_ID, this.notificationService, this.locationService);
    }

    async init() {
        try {
            // Register Service Worker
            ServiceWorkerService.register();

            // Initialize Offline Listener
            this._initOfflineListener();

            // Check if Leaflet is loaded (CDN might fail if offline)
            if (typeof L === 'undefined') {
                throw new Error('地圖元件 (Leaflet) 未載入，請檢查網路連線');
            }

            // Check if MarkerCluster is loaded
            if (typeof L.markerClusterGroup === 'undefined') {
                throw new Error('地圖叢集元件 (MarkerCluster) 未載入，請檢查網路連線');
            }

            // Initialize Map
            this.mapController.init();
            
            // Auto-locate on load
            this.mapController.locateUser();

            // Show loading initially (though it's visible by default)
            this.loadingController.show();

            const { stores, lastUpdated } = await StoreService.fetchStores();
            this.mapController.renderMarkers(stores);
            this.mapController.updateLastUpdatedTime(lastUpdated);

        } catch (error) {
            console.error('Application initialization failed:', error);
            
            this.loadingController.hide(); // Hide loading to show error toast
            
            // Check specific error types or network status
            if (!navigator.onLine) {
                 this.notificationService.show('目前處於離線模式，無法載入地圖或更新資料', 'error');
            } else {
                 this.notificationService.show(error.message || CONFIG.MESSAGES.FETCH_ERROR, 'error');
            }
        } finally {
            // Ensure loading is hidden if we succeeded or if we handled the error
            // (Note: we already hid it in catch, but this ensures it for success path)
            if (!this.loadingController.element.classList.contains(CONFIG.UI.CSS_CLASSES.LOADING_HIDDEN)) {
                this.loadingController.hide();
            }
        }
    }

    _initOfflineListener() {
        window.addEventListener('online', () => {
            this.notificationService.show('網路已連線', 'info');
        });
        window.addEventListener('offline', () => {
            this.notificationService.show('網路已斷線', 'error');
        });
    }
}

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
