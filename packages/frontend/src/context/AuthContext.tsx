import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { User } from '../services/api';
import { socketService } from '../services/socket';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing token and validate
        const token = localStorage.getItem('token');
        if (token) {
            // Try to get user from token
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({
                    id: payload.id,
                    email: payload.email,
                    name: payload.name,
                    role: payload.role,
                });

                // Connect socket and join room based on role
                socketService.connect();
                if (payload.role === 'kitchen') {
                    socketService.joinRoom('kitchen', payload.id);
                } else if (payload.role === 'owner') {
                    socketService.joinRoom('boss', payload.id);
                } else {
                    socketService.joinRoom('pos', payload.id);
                }
            } catch {
                localStorage.removeItem('token');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const response = await api.login(email, password);
        if (response.data?.user) {
            setUser(response.data.user);

            // Connect socket
            socketService.connect();
            const role = response.data.user.role;
            if (role === 'kitchen') {
                socketService.joinRoom('kitchen', response.data.user.id);
            } else if (role === 'owner') {
                socketService.joinRoom('boss', response.data.user.id);
            } else {
                socketService.joinRoom('pos', response.data.user.id);
            }
        }
    };

    const logout = () => {
        api.logout();
        setUser(null);
        socketService.disconnect();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
