import { CONFIG } from '../config.js';

/**
 * Service to handle Geolocation logic
 * Encapsulates all navigator.geolocation interactions
 */
export class LocationService {
    constructor() {
        this.watchId = null;
    }

    /**
     * Checks if geolocation is supported by the browser
     * @returns {boolean}
     */
    get isSupported() {
        return 'geolocation' in navigator;
    }

    /**
     * Gets the current user position
     * @param {Object} options - Geolocation options
     * @returns {Promise<GeolocationPosition>}
     */
    getCurrentPosition(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }) {
        return new Promise((resolve, reject) => {
            if (!this.isSupported) {
                reject(new Error('GEOLOCATION_NOT_SUPPORTED'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    }

    /**
     * Watches the user's position
     * @param {Function} successCallback 
     * @param {Function} errorCallback 
     * @param {Object} options 
     */
    watchPosition(successCallback, errorCallback, options = { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }) {
        if (!this.isSupported) return;
        
        this.clearWatch();
        this.watchId = navigator.geolocation.watchPosition(
            successCallback, 
            errorCallback, 
            options
        );
    }

    /**
     * Stops watching the user's position
     */
    clearWatch() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    /**
     * Maps GeolocationPositionError to user-friendly messages
     * @param {GeolocationPositionError} error 
     * @returns {string}
     */
    static getErrorMessage(error) {
        switch(error.code) {
            case error.PERMISSION_DENIED:
                return CONFIG.MESSAGES.LOCATION_DENIED;
            case error.POSITION_UNAVAILABLE:
                return CONFIG.MESSAGES.LOCATION_UNAVAILABLE;
            case error.TIMEOUT:
                return CONFIG.MESSAGES.LOCATION_TIMEOUT;
            default:
                return CONFIG.MESSAGES.LOCATION_UNKNOWN_ERROR;
        }
    }
}
