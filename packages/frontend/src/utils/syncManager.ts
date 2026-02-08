import { offlineStore, OfflineItem } from './offlineStore';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

class SyncManager {
    private isSyncing = false;
    private intervalId: number | null = null;

    constructor() {
        // Listen for online event to trigger sync immediately
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('🌐 App is online. Triggering sync...');
                this.sync();
            });
        }
    }

    /**
     * Start periodic sync checking
     */
    start(intervalMs = 30000) {
        if (this.intervalId) return;

        // Initial sync
        this.sync();

        this.intervalId = window.setInterval(() => this.sync(), intervalMs);
    }

    /**
     * Stop periodic sync
     */
    stop() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Perform sync operation for all pending items
     */
    async sync() {
        if (this.isSyncing || !navigator.onLine) return;

        const pendingItems = await offlineStore.getAllPending();
        if (pendingItems.length === 0) return;

        this.isSyncing = true;
        console.log(`🔄 [SyncManager] Starting sync for ${pendingItems.length} items...`);

        const toastId = toast.loading(`Đang đồng bộ ${pendingItems.length} đơn hàng...`, {
            position: 'bottom-right'
        });

        let successCount = 0;
        let failCount = 0;

        for (const item of pendingItems) {
            try {
                await offlineStore.updateStatus(item.id!, 'syncing');

                // Use a special header to let backend know this is a sync request
                // and provide the localId for idempotency check
                const response = await fetch(`${import.meta.env.VITE_API_URL || ''}${item.endpoint}`, {
                    method: item.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Local-Id': item.localId,
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(item.body)
                });

                if (response.ok) {
                    await offlineStore.remove(item.id!);
                    successCount++;
                } else {
                    throw new Error(`Server returned ${response.status}`);
                }
            } catch (error) {
                console.error(`❌ [SyncManager] Failed to sync item ${item.id}:`, error);
                await offlineStore.updateStatus(item.id!, 'pending'); // Set back to pending for next retry
                failCount++;
            }
        }

        this.isSyncing = false;

        // Final notification
        toast.dismiss(toastId);
        if (successCount > 0) {
            toast.success(`Đã đồng bộ thành công ${successCount} đơn hàng!`, {
                position: 'bottom-right',
                duration: 4000
            });
        }
        if (failCount > 0) {
            toast.error(`Có ${failCount} đơn hàng chưa thể đồng bộ. Sẽ thử lại sau.`, {
                position: 'bottom-right'
            });
        }
    }
}

export const syncManager = new SyncManager();
