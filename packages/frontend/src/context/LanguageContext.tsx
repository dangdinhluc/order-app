import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, type Language } from '../services/api';

interface LanguageContextType {
    currentLanguage: string;
    setLanguage: (code: string) => void;
    availableLanguages: Language[];
    isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [currentLanguage, setCurrentLanguage] = useState<string>(localStorage.getItem('preferredLanguage') || 'vi');
    const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const res = await api.getLanguages();
                if (res.data) {
                    // Filter only active languages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const activeLangs = (res as any).languages || []; // Backend might return { languages: [] }
                    const langs = Array.isArray(activeLangs) ? activeLangs.filter((l: Language) => l.is_active) : [];
                    setAvailableLanguages(langs);
                }
            } catch (error) {
                console.error('Failed to fetch languages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLanguages();
    }, []);

    const setLanguage = (code: string) => {
        setCurrentLanguage(code);
        localStorage.setItem('preferredLanguage', code);
    };

    return (
        <LanguageContext.Provider value={{ currentLanguage, setLanguage, availableLanguages, isLoading }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
