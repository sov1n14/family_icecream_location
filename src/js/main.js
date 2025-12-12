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
        // Register Service Worker
        ServiceWorkerService.register();

        // Initialize Offline Listener
        this._initOfflineListener();

        // Initialize Map
        this.mapController.init();
        
        // Auto-locate on load
        this.mapController.locateUser();

        this.loadingController.show();

        try {
            const { stores, lastUpdated } = await StoreService.fetchStores();
            this.mapController.renderMarkers(stores);
            this.mapController.updateLastUpdatedTime(lastUpdated);
        } catch (error) {
            console.error('Failed to initialize application:', error);
            // Check if we are offline
            if (!navigator.onLine) {
                 this.notificationService.show('目前處於離線模式，無法更新資料', 'error');
            } else {
                 this.notificationService.show(CONFIG.MESSAGES.FETCH_ERROR, 'error');
            }
        } finally {
            this.loadingController.hide();
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
