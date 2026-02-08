// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTranslatedField = (entity: any, field: string, lang: string): string => {
    if (!entity) return '';

    // 1. Try specific language field (e.g., name_en, name_ja)
    // Legacy support for columns like name_en, name_ja
    if (lang === 'en' && entity[`${field}_en`]) return entity[`${field}_en`];
    if (lang === 'jp' && entity[`${field}_ja`]) return entity[`${field}_ja`];

    // 2. Try JSONB translations (e.g., name_translations: { "ko": "..." })
    const translations = entity[`${field}_translations`];
    if (translations && translations[lang]) {
        return translations[lang];
    }

    // 3. Fallback to default field (usually Vietnamese)
    // e.g., name_vi or just name
    return entity[`${field}_vi`] || entity[field] || '';
};
