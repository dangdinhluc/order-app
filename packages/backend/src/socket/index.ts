import { Server as SocketIOServer, Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    role?: string;
    tableSessionToken?: string;
}

export const setupSocketHandlers = (io: SocketIOServer) => {
    io.on('connection', (socket: AuthenticatedSocket) => {
        console.log('🔌 Client connected:', socket.id);

        // POS/Kitchen staff joins their room
        socket.on('join:pos', ({ userId }) => {
            socket.userId = userId;
            socket.join('pos-room');
            console.log(`👤 User ${userId} joined POS room`);
        });

        socket.on('join:kitchen', ({ userId }) => {
            socket.userId = userId;
            socket.join('kitchen-room');
            console.log(`👨‍🍳 User ${userId} joined Kitchen room`);
        });

        socket.on('join:boss', ({ userId }) => {
            socket.userId = userId;
            socket.join('boss-room');
            console.log(`📊 Owner ${userId} joined Boss room`);
        });

        // Customer joins table room (for real-time cart sync)
        socket.on('join:table', ({ sessionToken }) => {
            socket.tableSessionToken = sessionToken;
            socket.join(`table-${sessionToken}`);
            console.log(`🍽️ Customer joined table session: ${sessionToken}`);
        });

        // Cart sync between devices at same table
        socket.on('cart:sync', ({ sessionToken, cart }) => {
            socket.to(`table-${sessionToken}`).emit('cart:updated', { cart });
        });

        // Service call from customer
        socket.on('service:call', ({ tableId, type, message }) => {
            io.to('pos-room').emit('service:call', { tableId, type, message });
            console.log(`🔔 Service call from table ${tableId}: ${type}`);
        });

        socket.on('disconnect', () => {
            console.log('🔌 Client disconnected:', socket.id);
        });
    });

    console.log('📡 Socket.IO handlers initialized');
};

// Helper functions to emit events from routes
export const emitToKitchen = (io: SocketIOServer, event: string, data: unknown) => {
    io.to('kitchen-room').emit(event, data);
};

export const emitToPOS = (io: SocketIOServer, event: string, data: unknown) => {
    io.to('pos-room').emit(event, data);
};

export const emitToBoss = (io: SocketIOServer, event: string, data: unknown) => {
    io.to('boss-room').emit(event, data);
};

export const emitToTable = (io: SocketIOServer, sessionToken: string, event: string, data: unknown) => {
    io.to(`table-${sessionToken}`).emit(event, data);
};
