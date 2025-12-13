/**
 * Service to handle Service Worker registration
 */
export class ServiceWorkerService {
    static register() {
        // Disable Service Worker in development to avoid caching issues
        // Safe check for import.meta.env to support non-Vite environments
        const isDev = import.meta.env && import.meta.env.DEV;
        
        if (isDev) {
            console.log('Service Worker disabled in development');
            // Unregister any existing service workers
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for(let registration of registrations) {
                        registration.unregister().then(() => {
                            console.log('Unregistered existing Service Worker in dev mode');
                        });
                    }
                });
            }
            return;
        }

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(error => {
                        console.log('ServiceWorker registration failed: ', error);
                    });
            });
        }
    }
}
