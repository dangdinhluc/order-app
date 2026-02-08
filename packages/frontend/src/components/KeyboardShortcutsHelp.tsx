import { Keyboard, X } from 'lucide-react';
import { getShortcutsList } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
    if (!isOpen) return null;

    const shortcuts = getShortcutsList();

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600">
                    <div className="flex items-center gap-2 text-white">
                        <Keyboard size={22} />
                        <h2 className="font-bold text-lg">Phím tắt</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Shortcuts List */}
                <div className="p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                        {shortcuts.map((shortcut, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between py-2 px-3 
                                           bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                            >
                                <span className="text-slate-700">{shortcut.description}</span>
                                <kbd className="px-2.5 py-1 bg-white border border-slate-200 
                                               rounded-lg text-sm font-mono font-semibold 
                                               text-slate-600 shadow-sm">
                                    {shortcut.key}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 text-center">
                    <p className="text-sm text-slate-500">
                        Nhấn <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs font-mono">?</kbd> để hiện/ẩn trợ giúp
                    </p>
                </div>
            </div>
        </div>
    );
}
