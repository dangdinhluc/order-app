import { useCallback, useRef } from 'react';

type SoundType = 'add' | 'success' | 'error' | 'notification' | 'click';

const SOUND_PATHS: Record<SoundType, string> = {
    add: '/sounds/ding.mp3',
    success: '/sounds/notification.mp3',
    error: '/sounds/error.mp3',
    notification: '/sounds/notification.mp3',
    click: '/sounds/ding.mp3',
};

// Check if sounds are enabled from localStorage
function isSoundEnabled(): boolean {
    const setting = localStorage.getItem('pos-sound-enabled');
    return setting !== 'false'; // Default to true
}

export function useSoundFeedback() {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playSound = useCallback((type: SoundType, volume = 0.5) => {
        if (!isSoundEnabled()) return;

        try {
            // Reuse audio element for better performance
            if (!audioRef.current) {
                audioRef.current = new Audio();
            }

            const audio = audioRef.current;
            audio.src = SOUND_PATHS[type];
            audio.volume = Math.min(1, Math.max(0, volume));
            audio.currentTime = 0;

            audio.play().catch(() => {
                // Silently fail - user hasn't interacted yet
            });
        } catch (error) {
            // Audio not supported
        }
    }, []);

    const playAdd = useCallback(() => playSound('add', 0.3), [playSound]);
    const playSuccess = useCallback(() => playSound('success', 0.5), [playSound]);
    const playError = useCallback(() => playSound('error', 0.4), [playSound]);
    const playNotification = useCallback(() => playSound('notification', 0.5), [playSound]);
    const playClick = useCallback(() => playSound('click', 0.2), [playSound]);

    // Toggle sound setting
    const toggleSound = useCallback(() => {
        const current = isSoundEnabled();
        localStorage.setItem('pos-sound-enabled', String(!current));
        return !current;
    }, []);

    return {
        playSound,
        playAdd,
        playSuccess,
        playError,
        playNotification,
        playClick,
        toggleSound,
        isSoundEnabled,
    };
}

// Haptic feedback for mobile
export function useHapticFeedback() {
    const vibrate = useCallback((pattern: number | number[] = 50) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }, []);

    const lightTap = useCallback(() => vibrate(10), [vibrate]);
    const mediumTap = useCallback(() => vibrate(25), [vibrate]);
    const heavyTap = useCallback(() => vibrate(50), [vibrate]);
    const success = useCallback(() => vibrate([50, 50, 50]), [vibrate]);
    const error = useCallback(() => vibrate([100, 50, 100]), [vibrate]);

    return {
        vibrate,
        lightTap,
        mediumTap,
        heavyTap,
        success,
        error,
    };
}
