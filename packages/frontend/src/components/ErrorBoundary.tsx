import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Đã xảy ra lỗi
                        </h1>
                        <p className="text-slate-500 mb-6">
                            Xin lỗi, ứng dụng gặp sự cố không mong muốn. Vui lòng tải lại trang.
                        </p>

                        {this.state.error && (
                            <div className="bg-slate-100 p-4 rounded-lg text-left mb-6 overflow-auto max-h-48">
                                <p className="text-red-600 font-mono text-xs break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleGoHome}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium flex items-center gap-2 transition-colors"
                            >
                                <Home size={18} />
                                Về trang chủ
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-200"
                            >
                                <RefreshCw size={18} />
                                Tải lại trang
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
