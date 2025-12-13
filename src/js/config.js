/**
 * Application Constants and Configuration
 * Centralizes all static configuration to avoid magic values
 */
// Safe detection of BASE_URL for both Vite and raw source
const getBaseUrl = () => {
    if (import.meta.env && import.meta.env.BASE_URL) {
        return import.meta.env.BASE_URL;
    }
    // Fallback for raw hosting (e.g. GitHub Pages source deployment)
    const path = (typeof window !== 'undefined' ? window.location.pathname : self.location.pathname);
    return path.includes('/family_icecream_location/') ? '/family_icecream_location/' : '/';
};

export const CONFIG = {
    MAP_ID: 'map',
    DATA_URL: getBaseUrl() + 'stores.json', // Absolute path handling GitHub Pages subpath
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
