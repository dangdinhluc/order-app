import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'order-app-offline';
const STORE_NAME = 'pending-sync';
const DB_VERSION = 1;

export interface OfflineItem {
    id?: number;
    localId: string;
    endpoint: string;
    method: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any;
    timestamp: number;
    status: 'pending' | 'syncing' | 'failed';
    retryCount: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    store.createIndex('status', 'status');
                    store.createIndex('localId', 'localId', { unique: true });
                }
            },
        });
    }
    return dbPromise;
};

export const offlineStore = {
    async add(item: Omit<OfflineItem, 'id' | 'timestamp' | 'status' | 'retryCount'>) {
        const db = await getDB();
        return db.add(STORE_NAME, {
            ...item,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0,
        });
    },

    async getAllPending(): Promise<OfflineItem[]> {
        const db = await getDB();
        return db.getAllFromIndex(STORE_NAME, 'status', 'pending');
    },

    async updateStatus(id: number, status: OfflineItem['status']) {
        const db = await getDB();
        const item = await db.get(STORE_NAME, id);
        if (item) {
            item.status = status;
            if (status === 'failed') {
                item.retryCount += 1;
            }
            await db.put(STORE_NAME, item);
        }
    },

    async remove(id: number) {
        const db = await getDB();
        return db.delete(STORE_NAME, id);
    },

    async clear() {
        const db = await getDB();
        return db.clear(STORE_NAME);
    }
};
