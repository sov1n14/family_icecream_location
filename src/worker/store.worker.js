/**
 * Web Worker for handling store data fetching and processing
 * Runs in a background thread to avoid blocking the UI
 */

/**
 * Normalizes raw store data into a consistent format
 * @param {Object} rawStore - The raw store object constructed from array
 * @param {Object} config - The configuration object passed from main thread
 * @returns {Object} Normalized store object
 */
function normalizeStoreData(rawStore, config) {
    // Validate essential coordinates
    const hasCoordinates = rawStore.py && rawStore.px && 
                         !isNaN(parseFloat(rawStore.py)) && 
                         !isNaN(parseFloat(rawStore.px));

    if (!hasCoordinates) return { isValid: false };

    const flavorType = rawStore.flavorType || '';
    const isSpecialShape = flavorType.includes('特殊造型');
    const markerColor = rawStore.markerColor || config.MARKERS.DEFAULT;
    
    // Pre-determine display color for UI
    const displayColor = (markerColor.includes('red')) 
        ? config.COLORS.RED 
        : config.COLORS.BLUE;

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
        isValid: true
    };
}

/**
 * Fetches and processes store data
 * @param {Object} config - Configuration object
 */
async function fetchAndProcessStores(config) {
    try {
        const response = await fetch(config.DATA_URL);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const rawData = await response.json();
        
        let lastUpdated = '';
        let stores = [];

        // Check if data is in optimized format (Object with keys/data) or legacy format (Array)
        if (rawData.keys && Array.isArray(rawData.data)) {
            // New Optimized Format
            lastUpdated = rawData.last_updated || '';
            const keys = rawData.keys;
            
            stores = rawData.data.map(row => {
                // Map array back to object
                const storeObj = {};
                keys.forEach((key, index) => {
                    storeObj[key] = row[index];
                });
                return normalizeStoreData(storeObj, config);
            }).filter(store => store.isValid);

        } else if (Array.isArray(rawData)) {
            // Legacy Format (for backward compatibility or if update failed)
            if (rawData.length > 0 && rawData[0].last_updated) {
                lastUpdated = rawData[0].last_updated;
            }
            stores = rawData
                .map(store => normalizeStoreData(store, config))
                .filter(store => store.isValid);
        } else {
             throw new Error('Invalid data format');
        }
            
        // Send result back to main thread
        self.postMessage({
            type: 'SUCCESS',
            payload: { stores, lastUpdated }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error.message
        });
    }
}

// Listen for messages from the main thread
self.onmessage = function(e) {
    if (e.data.type === 'FETCH_STORES') {
        const config = e.data.config;
        if (!config) {
            self.postMessage({
                type: 'ERROR',
                error: 'Configuration missing in worker'
            });
            return;
        }
        fetchAndProcessStores(config);
    }
};
