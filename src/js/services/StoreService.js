import { CONFIG } from '../config.js';
import StoreWorker from '../../worker/store.worker.js?worker';

/**
 * Service to handle data fetching and normalization
 * Uses a Web Worker to process data off the main thread
 */
export class StoreService {
    /**
     * Fetches store data using a Web Worker
     * @returns {Promise<{stores: Array, lastUpdated: string}>}
     */
    static fetchStores() {
        return new Promise((resolve, reject) => {
            // Use Vite's worker import syntax
            const worker = new StoreWorker();

            worker.onmessage = function(e) {
                if (e.data.type === 'SUCCESS') {
                    resolve(e.data.payload);
                    worker.terminate(); // Clean up worker
                } else if (e.data.type === 'ERROR') {
                    reject(new Error(e.data.error));
                    worker.terminate();
                }
            };

            worker.onerror = function(error) {
                reject(error);
                worker.terminate();
            };

            // Pass necessary config to worker
            const workerConfig = {
                DATA_URL: CONFIG.DATA_URL,
                MARKERS: CONFIG.MARKERS,
                COLORS: CONFIG.COLORS
            };

            // Start the fetch process
            worker.postMessage({ 
                type: 'FETCH_STORES',
                config: workerConfig
            });
        });
    }
}
