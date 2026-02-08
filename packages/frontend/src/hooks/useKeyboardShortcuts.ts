import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description?: string;
    enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
    preventDefault?: boolean;
}

export function useKeyboardShortcuts(
    shortcuts: ShortcutConfig[],
    options: UseKeyboardShortcutsOptions = {}
) {
    const { enabled = true, preventDefault = true } = options;
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ignore if typing in input/textarea
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            // Allow Escape to work even in inputs
            if (event.key !== 'Escape') return;
        }

        for (const shortcut of shortcutsRef.current) {
            if (shortcut.enabled === false) continue;

            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                event.code.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
            const shiftMatch = !!shortcut.shift === event.shiftKey;
            const altMatch = !!shortcut.alt === event.altKey;

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                if (preventDefault) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                shortcut.action();
                return;
            }
        }
    }, [preventDefault]);

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, handleKeyDown]);
}

// Preset shortcuts for POS
export function usePOSShortcuts(callbacks: {
    onCategoryChange?: (index: number) => void;
    onProductSelect?: (index: number) => void;
    onSearch?: () => void;
    onCheckout?: () => void;
    onPrint?: () => void;
    onCancel?: () => void;
    onEscape?: () => void;
    onIncreaseQty?: () => void;
    onDecreaseQty?: () => void;
}) {
    const shortcuts: ShortcutConfig[] = [
        // F1-F6: Category selection
        { key: 'F1', action: () => callbacks.onCategoryChange?.(0), description: 'Danh mục 1' },
        { key: 'F2', action: () => callbacks.onCategoryChange?.(1), description: 'Danh mục 2' },
        { key: 'F3', action: () => callbacks.onCategoryChange?.(2), description: 'Danh mục 3' },
        { key: 'F4', action: () => callbacks.onCategoryChange?.(3), description: 'Danh mục 4' },
        { key: 'F5', action: () => callbacks.onCategoryChange?.(4), description: 'Danh mục 5' },
        { key: 'F6', action: () => callbacks.onCategoryChange?.(5), description: 'Danh mục 6' },

        // F7: Search
        { key: 'F7', action: () => callbacks.onSearch?.(), description: 'Tìm kiếm' },

        // F8: Checkout
        { key: 'F8', action: () => callbacks.onCheckout?.(), description: 'Thanh toán' },

        // F9: Print
        { key: 'F9', action: () => callbacks.onPrint?.(), description: 'In hóa đơn' },

        // F10: Cancel
        { key: 'F10', action: () => callbacks.onCancel?.(), description: 'Hủy đơn' },

        // Escape: Close modal
        { key: 'Escape', action: () => callbacks.onEscape?.(), description: 'Đóng' },

        // +/-: Quantity adjustment
        { key: '+', action: () => callbacks.onIncreaseQty?.(), description: 'Tăng SL' },
        { key: '=', action: () => callbacks.onIncreaseQty?.(), description: 'Tăng SL' },
        { key: '-', action: () => callbacks.onDecreaseQty?.(), description: 'Giảm SL' },

        // 1-9: Quick product selection
        { key: '1', action: () => callbacks.onProductSelect?.(0), description: 'Sản phẩm 1' },
        { key: '2', action: () => callbacks.onProductSelect?.(1), description: 'Sản phẩm 2' },
        { key: '3', action: () => callbacks.onProductSelect?.(2), description: 'Sản phẩm 3' },
        { key: '4', action: () => callbacks.onProductSelect?.(3), description: 'Sản phẩm 4' },
        { key: '5', action: () => callbacks.onProductSelect?.(4), description: 'Sản phẩm 5' },
        { key: '6', action: () => callbacks.onProductSelect?.(5), description: 'Sản phẩm 6' },
        { key: '7', action: () => callbacks.onProductSelect?.(6), description: 'Sản phẩm 7' },
        { key: '8', action: () => callbacks.onProductSelect?.(7), description: 'Sản phẩm 8' },
        { key: '9', action: () => callbacks.onProductSelect?.(8), description: 'Sản phẩm 9' },
    ];

    useKeyboardShortcuts(shortcuts);

    return shortcuts;
}

// Get shortcut list for help modal
export function getShortcutsList(): { key: string; description: string }[] {
    return [
        { key: 'F1-F6', description: 'Chọn danh mục 1-6' },
        { key: 'F7', description: 'Tìm kiếm sản phẩm' },
        { key: 'F8', description: 'Thanh toán' },
        { key: 'F9', description: 'In hóa đơn' },
        { key: 'F10', description: 'Hủy đơn' },
        { key: 'Esc', description: 'Đóng modal/panel' },
        { key: '1-9', description: 'Chọn sản phẩm nhanh' },
        { key: '+/-', description: 'Tăng/giảm số lượng' },
        { key: '?', description: 'Hiển thị trợ giúp' },
    ];
}
