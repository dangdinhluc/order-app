// PWA Service Worker Registration
export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('[PWA] Service Worker not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        console.log('[PWA] Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        dispatchEvent(new CustomEvent('swUpdate', { detail: registration }));
                    }
                });
            }
        });

        return registration;
    } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
        return null;
    }
}

// Request push notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.log('[PWA] Notifications not supported');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
}

// Subscribe to push notifications
export async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
                import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
            )
        });

        console.log('[PWA] Push subscription:', subscription);
        return subscription;
    } catch (error) {
        console.error('[PWA] Push subscription failed:', error);
        return null;
    }
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): BufferSource | undefined {
    if (!base64String) return undefined;
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Check if app is installed as PWA
export function isPWAInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone === true;
}

// Check online status
export function isOnline(): boolean {
    return navigator.onLine;
}

// Listen for online/offline events
export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}

// Show local notification
export async function showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission !== 'granted') {
        console.log('[PWA] Notification permission not granted');
        return;
    }

    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options
    });
}

// Install prompt handling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let deferredPrompt: any = null;

export function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Dispatch event for UI to show install button
        dispatchEvent(new CustomEvent('installAvailable'));
    });
}

export async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt) {
        console.log('[PWA] Install prompt not available');
        return false;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;

    return outcome === 'accepted';
}

export function isInstallPromptAvailable(): boolean {
    return deferredPrompt !== null;
}
