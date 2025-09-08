import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as UI from './ui.js';

// Mock do módulo DOM para apontar para os elementos do nosso JSDOM
vi.mock('./dom.js', () => ({
    messageArea: { textContent: '' },
    loadingSpinner: { classList: { toggle: vi.fn() } },
    versionSelect: { innerHTML: '', disabled: false, appendChild: vi.fn() },
    bookSelect: { innerHTML: '', disabled: false },
    chapterSelect: { innerHTML: '', disabled: false, appendChild: vi.fn() },
    startBookSelect: { innerHTML: '', disabled: false },
    endBookSelect: { innerHTML: '', disabled: false },
    planNameInput: { value: '', disabled: false },
    savePlanButton: { disabled: true },
    versesArea: { innerHTML: '' },
    plansList: { innerHTML: '', appendChild: vi.fn() },
}));

import * as DOM from './dom.js';

const setupDOM = () => {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <body>
            <p id="message-area"></p>
            <div id="loading-spinner"></div>
            <select id="version-select"></select>
            <select id="book-select"></select>
            <select id="chapter-select"></select>
            <select id="start-book-select"></select>
            <select id="end-book-select"></select>
            <input id="plan-name-input" />
            <button id="save-plan-button"></button>
            <div id="verses-area"></div>
            <div id="plans-list"></div>
        </body>
        </html>
    `);

    global.document = dom.window.document;

    // Reatribui os elementos do DOM mockado para os elementos reais do JSDOM
    DOM.messageArea = document.getElementById('message-area');
    DOM.loadingSpinner = document.getElementById('loading-spinner');
    DOM.versionSelect = document.getElementById('version-select');
    DOM.bookSelect = document.getElementById('book-select');
    DOM.chapterSelect = document.getElementById('chapter-select');
    DOM.startBookSelect = document.getElementById('start-book-select');
    DOM.endBookSelect = document.getElementById('end-book-select');
    DOM.planNameInput = document.getElementById('plan-name-input');
    DOM.savePlanButton = document.getElementById('save-plan-button');
    DOM.versesArea = document.getElementById('verses-area');
    DOM.plansList = document.getElementById('plans-list');
};


describe('UI Functions', () => {
    beforeEach(() => {
        setupDOM();
        // Limpa mocks antes de cada teste
        vi.clearAllMocks();
    });

    it('showMessage should update message area text', () => {
        const message = 'Test message';
        UI.showMessage(message);
        expect(DOM.messageArea.textContent).toBe(message);
    });

    it('showLoading should toggle hidden class on spinner', () => {
        UI.showLoading(true);
        expect(DOM.loadingSpinner.classList.toggle).toHaveBeenCalledWith('hidden', false);

        UI.showLoading(false);
        expect(DOM.loadingSpinner.classList.toggle).toHaveBeenCalledWith('hidden', true);
    });

    it('handleError should log error and show a user-friendly message', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const errorMessage = 'API is down';
        
        UI.handleError(errorMessage);

        expect(consoleSpy).toHaveBeenCalledWith(errorMessage);
        expect(DOM.messageArea.textContent).toContain('Não foi possível carregar os dados.');

        consoleSpy.mockRestore();
    });

    it('setControlsLoading should disable/enable chapter select', () => {
        UI.setControlsLoading(true, 'chapter');
        expect(DOM.chapterSelect.disabled).toBe(true);

        UI.setControlsLoading(false, 'chapter');
        expect(DOM.chapterSelect.disabled).toBe(false);
    });

    it('populateVersionSelect should create version options', () => {
        const versions = [{ abbrev: 'nvi', version: 'Nova Versão Internacional' }];
        UI.populateVersionSelect(versions);

        const options = DOM.versionSelect.querySelectorAll('option');
        expect(options.length).toBe(2); // Placeholder + 1 version
        expect(options[0].textContent).toBe('Selecione uma Versão');
        expect(options[1].value).toBe('nvi');
        expect(options[1].textContent).toBe('Nova Versão Internacional');
    });

    it('populateBookSelects should fill all book dropdowns', () => {
        const books = [{ abbrev: { pt: 'gn' }, name: 'Gênesis' }];
        UI.populateBookSelects(books);

        expect(DOM.bookSelect.innerHTML).toContain('<option value="gn">Gênesis</option>');
        expect(DOM.startBookSelect.innerHTML).toContain('<option value="gn">Gênesis</option>');
        expect(DOM.endBookSelect.innerHTML).toContain('<option value="gn">Gênesis</option>');
    });

    it('populateChapterSelect should create chapter options', () => {
        UI.populateChapterSelect(3);
        const options = DOM.chapterSelect.querySelectorAll('option');
        expect(options.length).toBe(4); // Placeholder + 3 chapters
        expect(options[1].value).toBe('1');
        expect(options[1].textContent).toBe('Capítulo 1');
        expect(options[3].textContent).toBe('Capítulo 3');
    });

    it('displayVerses should render verses correctly', () => {
        const verses = [{ verse: 1, text: 'No princípio...' }];
        UI.displayVerses(verses);
        expect(DOM.versesArea.innerHTML).toContain('<strong>1</strong> No princípio...');
    });

    it('displayVerses should show a message if no verses are provided', () => {
        UI.displayVerses([]);
        expect(DOM.versesArea.innerHTML).toContain('Nenhum versículo encontrado');
    });

    describe('updateSaveButtonState', () => {
        it('should disable button if fields are incomplete', () => {
            DOM.planNameInput.value = 'My Plan';
            DOM.startBookSelect.value = 'gn';
            DOM.endBookSelect.value = ''; // Incomplete
            
            UI.updateSaveButtonState('user123');
            expect(DOM.savePlanButton.disabled).toBe(true);
        });

        it('should disable button if user is not logged in', () => {
            DOM.planNameInput.value = 'My Plan';
            DOM.startBookSelect.value = 'gn';
            DOM.endBookSelect.value = 'ap';

            UI.updateSaveButtonState(null); // No user
            expect(DOM.savePlanButton.disabled).toBe(true);
        });

        it('should enable button if all fields are complete and user is logged in', () => {
            DOM.planNameInput.value = 'My Plan';
            DOM.startBookSelect.value = 'gn';
            DOM.endBookSelect.value = 'ap';

            UI.updateSaveButtonState('user123');
            expect(DOM.savePlanButton.disabled).toBe(false);
        });
    });

    describe('displayPlans', () => {
        it('should show a message if there are no plans', () => {
            UI.displayPlans([], vi.fn(), vi.fn());
            expect(DOM.plansList.innerHTML).toContain('Nenhum plano salvo');
        });

        it('should render plans and attach handlers', () => {
            const plans = [{ id: 'p1', name: 'Plano A', firstBookName: 'Gênesis', lastBookName: 'Êxodo' }];
            const readHandler = vi.fn();
            const deleteHandler = vi.fn();

            UI.displayPlans(plans, readHandler, deleteHandler);

            expect(DOM.plansList.innerHTML).toContain('Plano A');
            
            const readButton = DOM.plansList.querySelector('.read-button');
            const deleteButton = DOM.plansList.querySelector('.delete-button');

            readButton.click();
            expect(readHandler).toHaveBeenCalledWith(plans[0]);

            deleteButton.click();
            expect(deleteHandler).toHaveBeenCalledWith('p1');
        });
    });
});