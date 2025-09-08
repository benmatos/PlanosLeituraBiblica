import * as DOM from './dom.js';

const updateIcons = (isDarkMode) => {
    DOM.themeToggleDarkIcon.classList.toggle('hidden', isDarkMode);
    DOM.themeToggleLightIcon.classList.toggle('hidden', !isDarkMode);
};

export const initTheme = () => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    updateIcons(isDarkMode);

    DOM.themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateIcons(isDark);
    });
};