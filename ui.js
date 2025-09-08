import * as DOM from './dom.js';
import { t } from './i18n.js';
import { allBooks } from './data.js';

/**
 * Exibe uma mensagem na área de status.
 * @param {string} message - A mensagem a ser exibida.
 */
export const showMessage = (message) => {
    DOM.messageArea.textContent = message;
};

/**
 * Exibe ou esconde o spinner de carregamento.
 * @param {boolean} isVisible - Se o spinner deve ser visível (true) ou não.
 */
export const showLoading = (isVisible) => {
    DOM.loadingSpinner.classList.toggle('hidden', !isVisible);
};

/**
 * Exibe uma mensagem de erro no console e na área de status.
 * @param {string} error - A mensagem de erro.
 */
export const handleError = (error) => {
    console.error(error);
    showMessage('Não foi possível carregar os dados. Verifique sua conexão ou tente mais tarde.');
};

/**
 * Habilita ou desabilita os controles de seleção.
 * @param {boolean} isLoading - Se os controles devem ser desabilitados (true) ou habilitados (false).
 * @param {string} selector - Qual seletor controlar ('version', 'book', 'chapter').
 */
export const setControlsLoading = (isLoading, selector) => {
    if (selector === 'version') {
        DOM.versionSelect.disabled = isLoading;
    } else if (selector === 'book') {
        DOM.bookSelect.disabled = isLoading;
        DOM.chapterSelect.disabled = isLoading;
    } else if (selector === 'chapter') {
        DOM.chapterSelect.disabled = isLoading;
    }
};

/**
 * Habilita a seção de criação de planos.
 */
export const enablePlanCreation = () => {
    DOM.startBookSelect.disabled = false;
    DOM.endBookSelect.disabled = false;
    DOM.planNameInput.disabled = false;
    updateSaveButtonState();
};

/**
 * Preenche o dropdown de seleção de versões.
 * @param {Array} versions - Um array de objetos de versões.
 */
export const populateVersionSelect = (versions, lang) => {
    DOM.versionSelect.innerHTML = `<option value="">${t('selectVersion')}</option>`;
    versions.forEach(version => {
        const option = document.createElement('option');
        option.value = version.abbrev;
        option.textContent = version.name[lang];
        DOM.versionSelect.appendChild(option);
    });
};

/**
 * Preenche os dropdowns de seleção de livros (leitura e planos).
 * @param {Array} books - A lista de todos os livros.
 */
export const populateBookSelects = (books, lang) => {
    const htmlOptions = books.map(book => `<option value="${book.abbrev.pt}">${book.name[lang]}</option>`).join('');
    
    DOM.bookSelect.innerHTML = `<option value="">${t('selectBook')}</option>` + htmlOptions;
    DOM.bookSelect.disabled = false;

    DOM.startBookSelect.innerHTML = `<option value="">${t('startBook')}</option>` + htmlOptions;
    DOM.endBookSelect.innerHTML = `<option value="">${t('endBook')}</option>` + htmlOptions;
};

/**
 * Preenche os dropdowns de seleção de livros no modal de edição.
 * @param {Array} books - A lista de todos os livros.
 */
export const populateEditModalBookSelects = (books, lang) => {
    const htmlOptions = books.map(book => `<option value="${book.abbrev.pt}">${book.name[lang]}</option>`).join('');
    DOM.editStartBookSelect.innerHTML = `<option value="">${t('startBook')}</option>` + htmlOptions;
    DOM.editEndBookSelect.innerHTML = `<option value="">${t('endBook')}</option>` + htmlOptions;
};

/**
 * Abre ou fecha o modal de edição.
 * @param {boolean} show - Se o modal deve ser exibido.
 */
export const toggleEditModal = (show) => {
    DOM.editPlanModal.classList.toggle('hidden', !show);
};
/**
 * Preenche o dropdown de seleção de capítulos.
 * @param {number} chaptersCount - O número total de capítulos.
 */
export const populateChapterSelect = (chaptersCount) => {
    DOM.chapterSelect.innerHTML = `<option value="">${t('selectChapter')}</option>`;
    DOM.chapterSelect.disabled = false;
    for (let i = 1; i <= chaptersCount; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${t('selectChapter').split(' ')[0]} ${i}`;
        DOM.chapterSelect.appendChild(option);
    }
};

/**
 * Exibe os versículos na área de exibição.
 * @param {Array} verses - Um array de objetos de versículos.
 */
export const displayVerses = (verses) => {
    if (verses && verses.length > 0) {
        const versesHtml = verses.map(verse => `
            <p class="text-gray-800 dark:text-gray-200 text-lg leading-relaxed mb-4">
                <strong class="text-blue-600 dark:text-blue-400 font-semibold">${verse.verse}</strong> ${verse.text}
            </p>
        `).join('');
        DOM.versesArea.innerHTML = versesHtml;
    } else {
        DOM.versesArea.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${t('noVersesFound')}</p>`;
    }
};

/**
 * Atualiza o estado do botão de salvar plano.
 * @param {string|null} userId - O ID do usuário.
 */
export const updateSaveButtonState = (userId) => {
    const planName = DOM.planNameInput.value.trim();
    const startBook = DOM.startBookSelect.value;
    const endBook = DOM.endBookSelect.value;
    
    DOM.savePlanButton.disabled = !(planName && startBook && endBook && userId);
};

/**
 * Calcula o progresso de um plano de leitura.
 * @param {object} plan - O objeto do plano.
 * @param {object} readChapters - O mapa de capítulos lidos.
 * @returns {{read: number, total: number}}
 */
const calculatePlanProgress = (plan, readChapters) => {
    const startIndex = allBooks.findIndex(b => b.abbrev.pt === plan.firstBookAbbrev);
    const endIndex = allBooks.findIndex(b => b.abbrev.pt === plan.lastBookAbbrev);

    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
        return { read: 0, total: 0 };
    }

    let totalChapters = 0;
    let readCount = 0;

    for (let i = startIndex; i <= endIndex; i++) {
        const book = allBooks[i];
        totalChapters += book.chapters;
        for (let j = 1; j <= book.chapters; j++) {
            const chapterId = `${book.abbrev.pt}-${j}`;
            if (readChapters[chapterId]) {
                readCount++;
            }
        }
    }
    return { read: readCount, total: totalChapters };
};

/**
 * Exibe os planos de leitura na lista.
 * @param {Array} plans - Array de planos de leitura.
 * @param {object} readChapters - Mapa de capítulos lidos.
 * @param {object} handlers - Objeto com as funções de callback para os eventos.
 */
export const displayPlans = (plans, readChapters, handlers, lang) => {
    DOM.plansList.innerHTML = '';
    if (plans.length === 0) {
        DOM.plansList.innerHTML = `<p class="text-gray-500 dark:text-gray-400 italic">${t('noPlansSaved')}</p>`;
        return;
    }

    // Os planos já vêm ordenados do Firebase, não é mais necessário ordenar aqui.
    plans.forEach(plan => {
        const progress = calculatePlanProgress(plan, readChapters);
        const progressPercentage = progress.total > 0 ? (progress.read / progress.total) * 100 : 0;

        const planElement = document.createElement('div');
        planElement.className = 'plan-item bg-slate-100 dark:bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center shadow-sm cursor-grab active:cursor-grabbing';
        planElement.setAttribute('draggable', 'true');
        planElement.dataset.planId = plan.id;

        planElement.innerHTML = `
            <div class="text-left w-full sm:w-auto">
                <p class="font-bold text-gray-800 dark:text-gray-100">${plan.name}</p> <!-- Plan name is user-defined, so not translated -->
                <p class="text-gray-600 dark:text-gray-300 text-sm">${allBooks.find(b => b.abbrev.pt === plan.firstBookAbbrev)?.name[lang]} a ${allBooks.find(b => b.abbrev.pt === plan.lastBookAbbrev)?.name[lang]}</p>
                <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mt-2">
                    <div class="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style="width: ${progressPercentage}%"></div>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1 text-right">${progress.read} ${t('chaptersOf')} ${progress.total} ${t('chapters')}</p>
            </div>
            <div class="flex flex-row gap-2 mt-2 sm:mt-0">
                <button data-i18n="edit" class="edit-button px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-300">Editar</button>
                <button data-i18n="readPlan" class="read-button px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-300">Ler Plano</button>
                <button data-i18n="delete" class="delete-button px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-300">Excluir</button>
            </div>
        `;
        DOM.plansList.appendChild(planElement);

        // Adiciona os eventos
        planElement.querySelector('.read-button').addEventListener('click', () => handlers.read(plan));
        planElement.querySelector('.edit-button').addEventListener('click', () => handlers.edit(plan));
        planElement.querySelector('.delete-button').addEventListener('click', () => handlers.delete(plan.id));

        // Eventos de Drag & Drop
        planElement.addEventListener('dragstart', (e) => handlers.dragStart(e, plan));
        planElement.addEventListener('dragover', (e) => handlers.dragOver(e));
        planElement.addEventListener('dragleave', (e) => handlers.dragLeave(e));
        planElement.addEventListener('drop', (e) => handlers.drop(e, plan));
    });
};