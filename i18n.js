import * as DOM from './dom.js';

const translations = {};
let currentLang = 'pt-BR';

async function fetchTranslations(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Could not load ${lang}.json`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        // Fallback to default language if fetch fails
        if (lang !== 'pt-BR') {
            return await fetchTranslations('pt-BR');
        }
        return {};
    }
}

function translateElement(element) {
    const key = element.dataset.i18n;
    const translation = translations[currentLang]?.[key];
    if (translation) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
        } else {
            element.textContent = translation;
        }
    }
}

export const t = (key) => translations[currentLang]?.[key] || key;

export const updateUI = () => document.querySelectorAll('[data-i18n]').forEach(translateElement);

export const setLanguage = async (lang) => {
    translations[lang] = await fetchTranslations(lang);
    currentLang = lang;
    document.documentElement.lang = lang;
    localStorage.setItem('language', lang);
    document.dispatchEvent(new CustomEvent('languageChange', { detail: { lang } }));
};

export const getCurrentLanguage = () => currentLang;

export const initI18n = async () => {
    const savedLang = localStorage.getItem('language');
    const browserLang = navigator.language.startsWith('en') ? 'en' : 'pt-BR';
    const lang = savedLang || browserLang;
    await setLanguage(lang);
    DOM.langSwitcher.value = lang;
    DOM.langSwitcher.addEventListener('change', (e) => setLanguage(e.target.value));
};