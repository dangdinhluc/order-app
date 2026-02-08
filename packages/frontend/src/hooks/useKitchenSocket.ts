import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useKitchenSocket = () => {
    const { user } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [latestEvent, setLatestEvent] = useState<{ type: string; data: any } | null>(null);

    useEffect(() => {
        if (!user || user.role !== 'kitchen' && user.role !== 'owner') return;

        // Initialize socket
        socketRef.current = io(SOCKET_URL, {
            auth: {
                token: localStorage.getItem('token')
            }
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Kitchen events
        socket.on('kitchen:new_order', (data) => {
            setLatestEvent({ type: 'new_order', data });
        });

        socket.on('kitchen:status_changed', (data) => {
            setLatestEvent({ type: 'status_changed', data });
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    return { isConnected, latestEvent };
};
