import { motion } from 'framer-motion';
import { type Language as ApiLanguage } from '../services/api';

interface LanguageSwitcherProps {
    currentLang: string;
    languages: ApiLanguage[];
    onSelect: (lang: string) => void;
}

export default function LanguageSwitcher({ currentLang, languages, onSelect }: LanguageSwitcherProps) {
    if (!languages || languages.length === 0) return null;

    return (
        <div className="flex bg-black/20 backdrop-blur-md rounded-full p-1 border border-white/10">
            {languages.map((lang) => {
                const isActive = currentLang === lang.code;
                return (
                    <motion.button
                        key={lang.code}
                        onClick={() => onSelect(lang.code)}
                        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${isActive ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                        whileTap={{ scale: 0.9 }}
                    >
                        <span className="text-xl">{lang.flag_icon}</span>
                        {isActive && (
                            <motion.div
                                layoutId="active-lang-indicator"
                                className="absolute inset-0 rounded-full border-2 border-white/20"
                                transition={{ duration: 0.2 }}
                            />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
