import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/pos');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    // Quick login buttons for demo
    const quickLogin = async (role: 'owner' | 'cashier' | 'kitchen') => {
        const emails: Record<string, string> = {
            owner: 'owner@hybrid-pos.local',
            cashier: 'cashier@hybrid-pos.local',
            kitchen: 'kitchen@hybrid-pos.local',
        };
        setEmail(emails[role]);
        setPassword('password123');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-400 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full blur-3xl opacity-20"></div>
            </div>

            <div className="relative bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
                        <span className="text-3xl">🍜</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">Hybrid POS</h1>
                    <p className="text-slate-500 text-sm">Nhà hàng & Tạp hóa</p>
                </div>

                {/* Error message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Login form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-slate-700 text-sm font-medium mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="email@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-slate-700 text-sm font-medium mb-2">
                            Mật khẩu
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Đang đăng nhập...
                            </span>
                        ) : (
                            'Đăng nhập'
                        )}
                    </button>
                </form>

                {/* Quick login for demo */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-slate-400 text-xs text-center mb-4">Demo: Click để đăng nhập nhanh</p>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => quickLogin('owner')}
                            className="px-3 py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-orange-600 text-xs font-medium transition"
                        >
                            👑 Chủ quán
                        </button>
                        <button
                            onClick={() => quickLogin('cashier')}
                            className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 text-xs font-medium transition"
                        >
                            💳 Thu ngân
                        </button>
                        <button
                            onClick={() => quickLogin('kitchen')}
                            className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-600 text-xs font-medium transition"
                        >
                            👨‍🍳 Bếp
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
