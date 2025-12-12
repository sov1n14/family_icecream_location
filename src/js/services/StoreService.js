import { CONFIG } from '../config.js';

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
            // Use standard Worker constructor for static deployment compatibility
            // This works in browsers supporting ES modules and standardizes the path resolution
            const worker = new Worker(new URL('../../worker/store.worker.js', import.meta.url));

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
