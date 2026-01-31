import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });

        // Re-register listeners on reconnect
        this.socket.on('connect', () => {
            this.listeners.forEach((callbacks, event) => {
                callbacks.forEach(callback => {
                    this.socket?.on(event, callback);
                });
            });
        });
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }

    joinRoom(room: 'pos' | 'kitchen' | 'boss', userId: string) {
        this.socket?.emit(`join:${room}`, { userId });
    }

    joinTable(sessionToken: string) {
        this.socket?.emit('join:table', { sessionToken });
    }

    on(event: string, callback: (data: unknown) => void) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);
        this.socket?.on(event, callback);
    }

    off(event: string, callback: (data: unknown) => void) {
        this.listeners.get(event)?.delete(callback);
        this.socket?.off(event, callback);
    }

    emit(event: string, data: unknown) {
        this.socket?.emit(event, data);
    }
}

export const socketService = new SocketService();
