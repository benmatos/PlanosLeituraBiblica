import { API_URL } from './config.js';
import * as UI from './ui.js';

/**
 * Busca os versículos de um capítulo específico.
 * @param {string} bookAbbrev - A abreviação do livro.
 * @param {number} chapterNumber - O número do capítulo.
 * @param {string} selectedVersion - A versão da Bíblia selecionada.
 * @param {object} selectedBook - O objeto do livro selecionado.
 */
export const fetchChapter = async (bookAbbrev, chapterNumber, selectedVersion, selectedBook) => {
    if (!selectedVersion) {
        UI.showMessage('Por favor, selecione uma versão da Bíblia.');
        return;
    }
    UI.setControlsLoading(true, 'chapter');
    UI.showLoading(true);
    UI.showMessage(`Carregando ${selectedBook.name}, Capítulo ${chapterNumber}...`);
    try {
        const response = await fetch(`${API_URL}${bookAbbrev}+${chapterNumber}?translation=${selectedVersion}`);
        if (!response.ok) {
            throw new Error('Falha ao carregar os versículos do capítulo.');
        }
        const data = await response.json();
        UI.displayVerses(data.verses);
        UI.showMessage('');
    } catch (error) {
        UI.handleError(error.message);
    } finally {
        UI.setControlsLoading(false, 'chapter');
        UI.showLoading(false);
    }
};