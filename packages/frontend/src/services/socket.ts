import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
    private pendingEmits: Array<{ event: string; data: unknown }> = [];
    private onConnectCallbacks: Array<() => void> = [];

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected');

            // Re-register all listeners
            this.listeners.forEach((callbacks, event) => {
                callbacks.forEach(callback => {
                    this.socket?.on(event, callback);
                });
            });

            // Process pending emits that were queued before connection
            this.pendingEmits.forEach(({ event, data }) => {
                this.socket?.emit(event, data);
            });
            this.pendingEmits = [];

            // Call onConnect callbacks
            this.onConnectCallbacks.forEach(cb => cb());
            this.onConnectCallbacks = [];
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }

    joinRoom(room: 'pos' | 'kitchen' | 'boss', userId: string) {
        const event = `join:${room}`;
        const data = { userId };
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            this.pendingEmits.push({ event, data });
        }
    }

    joinTable(sessionToken: string) {
        const event = 'join:table';
        const data = { sessionToken };
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            this.pendingEmits.push({ event, data });
        }
    }

    on(event: string, callback: (data: unknown) => void) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);
        // Register immediately if connected, will also be re-registered on reconnect via connect handler
        if (this.socket?.connected) {
            this.socket.on(event, callback);
        }
    }

    off(event: string, callback: (data: unknown) => void) {
        this.listeners.get(event)?.delete(callback);
        this.socket?.off(event, callback);
    }

    emit(event: string, data: unknown) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            this.pendingEmits.push({ event, data });
        }
    }
}

export const socketService = new SocketService();
