import * as DOM from './dom.js';
import * as UI from './ui.js';
import * as API from './api.js';
import * as FirebaseService from './firebaseService.js';
import * as I18n from './i18n.js';
import { initTheme } from './theme.js';
import { allBooks, BIBLE_VERSIONS } from './data.js';

// --- State ---
const state = {
    db: null,
    auth: null,
    userId: null,
    selectedBook: null,
    selectedVersion: null,
    editingPlanId: null, // ID do plano sendo editado
    draggedPlan: null, // Objeto do plano sendo arrastado
    userPlans: [], // Cache dos planos do usuário
    readChapters: {}, // Mapa de capítulos lidos, ex: {'gn-1': true}
};

// --- Handlers ---

const handleAuthChange = async (user) => {
    // state.userPlans = []; // Armazena os planos para evitar dependência de ordem de listeners

    if (user) {
        state.userId = user.uid;
        DOM.userIdDisplay.textContent = `ID do Usuário: ${state.userId}`;
        console.log("Usuário autenticado:", state.userId);
        
        try {
            // Ouve as mudanças nos planos do usuário
            FirebaseService.listenToPlans(state.userId, (plans) => {
                state.userPlans = plans;
                refreshUIComponents();
            });

            // Ouve as mudanças no progresso de leitura
            FirebaseService.listenToReadStatus(state.userId, (readChapters) => {
                state.readChapters = readChapters;
                refreshUIComponents();
                // Atualiza o estado do checkbox do capítulo atual
                updateMarkAsReadCheckbox();
            });
        } catch (error) {
            UI.showMessage(error.message);
        }

        UI.enablePlanCreation();
    } else {
        try {
            await FirebaseService.signIn();
        } catch (error) {
            UI.showMessage(error.message);
        }
    }
    UI.updateSaveButtonState(state.userId);
};

const handleVersionChange = (event) => {
    state.selectedVersion = event.target.value;
    if (state.selectedVersion) {
        DOM.bookSelect.disabled = false;
        DOM.chapterSelect.disabled = true;
        DOM.versesArea.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${I18n.t('selectToRead')}</p>`;
    } else {
        DOM.bookSelect.disabled = true;
        DOM.chapterSelect.disabled = true;
        DOM.versesArea.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${I18n.t('selectToRead')}</p>`;
    }
};

const handleBookChange = (event) => {
    const selectedAbbrev = event.target.value;
    if (selectedAbbrev) {
        state.selectedBook = allBooks.find(book => book.abbrev.pt === selectedAbbrev);
        UI.populateChapterSelect(state.selectedBook.chapters);
        updateMarkAsReadCheckbox();
        DOM.versesArea.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${I18n.t('selectChapter')}</p>`;
        DOM.chapterSelect.value = '';
    } else {
        DOM.chapterSelect.innerHTML = `<option value="">${I18n.t('selectChapter')}</option>`;
        updateMarkAsReadCheckbox();
        DOM.chapterSelect.disabled = true;
        DOM.versesArea.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${I18n.t('selectToRead')}</p>`;
    }
    UI.showMessage('');
};

const handleChapterChange = (event) => {
    const chapterNumber = event.target.value;
    if (chapterNumber && state.selectedBook) {
        API.fetchChapter(state.selectedBook.abbrev.pt, chapterNumber, state.selectedVersion, state.selectedBook);
        updateMarkAsReadCheckbox();
    } else {
        updateMarkAsReadCheckbox();
    }
};

const handleMarkAsReadChange = async (event) => {
    const isRead = event.target.checked;
    const chapterId = `${state.selectedBook.abbrev.pt}-${DOM.chapterSelect.value}`;

    if (!state.userId || !chapterId) return;

    try {
        await FirebaseService.updateReadChapterStatus(state.userId, chapterId, isRead);
    } catch (error) {
        UI.showMessage(I18n.t('errorSavingProgress'));
        event.target.checked = !isRead; // Reverte em caso de erro
    }
};

const handleSavePlan = async () => {
    const planName = DOM.planNameInput.value.trim();
    const startBookAbbrev = DOM.startBookSelect.value;
    const endBookAbbrev = DOM.endBookSelect.value;

    if (!planName || !startBookAbbrev || !endBookAbbrev) {
        UI.showMessage(I18n.t('errorFillAllFields'));
        return;
    }

    const startBook = allBooks.find(book => book.abbrev.pt === startBookAbbrev);
    const endBook = allBooks.find(book => book.abbrev.pt === endBookAbbrev);

    const planData = {
        userId: state.userId,
        name: planName,
        order: state.userPlans.length, // Adiciona o campo de ordem
        firstBookAbbrev: startBook.abbrev.pt,
        firstBookName: startBook.name,
        lastBookAbbrev: endBook.abbrev.pt,
        lastBookName: endBook.name
    };

    try {
        await FirebaseService.savePlan(planData);
        UI.showMessage(I18n.t('successPlanSaved'));
        DOM.planNameInput.value = '';
        DOM.startBookSelect.value = '';
        DOM.endBookSelect.value = '';
        UI.updateSaveButtonState(state.userId);
    } catch (e) {
        console.error("Erro ao adicionar documento:", e);
        UI.showMessage(I18n.t('errorPlanSaved'));
    }
};

const handleReadPlan = (plan) => {
    const firstBook = allBooks.find(book => book.abbrev.pt === plan.firstBookAbbrev);
    if (firstBook) {
        // Seleciona a primeira versão disponível para ler
        DOM.versionSelect.value = DOM.versionSelect.options[1]?.value || '';
        DOM.versionSelect.dispatchEvent(new Event('change'));
        
        DOM.bookSelect.value = firstBook.abbrev.pt;
        DOM.bookSelect.dispatchEvent(new Event('change'));
        
        // Seleciona o primeiro capítulo do livro e dispara o evento
        if (firstBook.chapters > 0) {
            setTimeout(() => { // Garante que o select de capítulo foi populado
                DOM.chapterSelect.value = 1;
                DOM.chapterSelect.dispatchEvent(new Event('change'));
            }, 0);
        }
    }
};

const handleDeletePlan = async (planId) => {
    try {
        await FirebaseService.deletePlan(planId);
        UI.showMessage(I18n.t('successPlanDeleted'));
    } catch (error) {
        UI.showMessage(I18n.t('errorPlanDeleted'));
    }
};

const handleEditPlan = (plan) => {
    state.editingPlanId = plan.id;
    DOM.editPlanIdInput.value = plan.id;
    DOM.editPlanNameInput.value = plan.name;
    DOM.editStartBookSelect.value = plan.firstBookAbbrev;
    DOM.editEndBookSelect.value = plan.lastBookAbbrev;
    UI.toggleEditModal(true);
};

const handleUpdatePlan = async () => {
    const planId = state.editingPlanId;
    if (!planId) return;

    const startBook = allBooks.find(b => b.abbrev.pt === DOM.editStartBookSelect.value);
    const endBook = allBooks.find(b => b.abbrev.pt === DOM.editEndBookSelect.value);

    const updatedData = {
        name: DOM.editPlanNameInput.value.trim(),
        firstBookAbbrev: startBook.abbrev.pt,
        firstBookName: startBook.name,
        lastBookAbbrev: endBook.abbrev.pt,
        lastBookName: endBook.name,
    };

    try {
        await FirebaseService.updatePlan(planId, updatedData);
        UI.showMessage(I18n.t('successPlanUpdated'));
    } catch (error) {
        UI.showMessage(I18n.t('errorPlanUpdated'));
        console.error(error);
    } finally {
        UI.toggleEditModal(false);
        state.editingPlanId = null;
    }
};

// --- Drag & Drop Handlers ---

const handleDragStart = (e, plan) => {
    state.draggedPlan = plan;
    e.target.classList.add('opacity-50');
};

const handleDragOver = (e) => {
    e.preventDefault();
    const targetElement = e.target.closest('.plan-item');
    if (targetElement) {
        targetElement.classList.add('border-t-4', 'border-blue-500');
    }
};

const handleDragLeave = (e) => {
    const targetElement = e.target.closest('.plan-item');
    if (targetElement) {
        targetElement.classList.remove('border-t-4', 'border-blue-500');
    }
};

const handleDrop = async (e, targetPlan) => {
    e.preventDefault();
    document.querySelectorAll('.plan-item').forEach(el => {
        el.classList.remove('opacity-50', 'border-t-4', 'border-blue-500');
    });

    if (state.draggedPlan.id === targetPlan.id) return;

    const reorderedPlans = [...state.userPlans];
    const fromIndex = reorderedPlans.findIndex(p => p.id === state.draggedPlan.id);
    const toIndex = reorderedPlans.findIndex(p => p.id === targetPlan.id);

    const [movedItem] = reorderedPlans.splice(fromIndex, 1);
    reorderedPlans.splice(toIndex, 0, movedItem);

    try {
        await FirebaseService.updatePlansOrder(reorderedPlans);
        UI.showMessage(I18n.t('successOrderUpdated'));
    } catch (error) {
        UI.showMessage(I18n.t('errorOrderUpdated'));
        console.error(error);
    }
};

// --- Helpers ---

/**
 * Atualiza o estado do checkbox "Marcar como lido" com base no estado atual.
 */
const updateMarkAsReadCheckbox = () => {
    if (state.selectedBook && DOM.chapterSelect.value) {
        DOM.markAsReadCheckbox.disabled = false;
        const chapterId = `${state.selectedBook.abbrev.pt}-${DOM.chapterSelect.value}`;
        DOM.markAsReadCheckbox.checked = !!state.readChapters[chapterId];
    } else {
        DOM.markAsReadCheckbox.disabled = true;
        DOM.markAsReadCheckbox.checked = false;
    }
};

// --- Initialization ---

const refreshUIComponents = () => {
    const lang = I18n.getCurrentLanguage();
    I18n.updateUI();
    UI.populateVersionSelect(BIBLE_VERSIONS, lang);
    UI.populateBookSelects(allBooks, lang);
    UI.populateEditModalBookSelects(allBooks, lang);
    // Re-render plans to update names and progress
    UI.displayPlans(state.userPlans, state.readChapters, {
        read: handleReadPlan,
        edit: handleEditPlan,
        delete: handleDeletePlan,
        dragStart: handleDragStart,
        dragOver: handleDragOver,
        dragLeave: handleDragLeave,
        drop: handleDrop,
    }, lang);
};

const initialize = async () => {
    // Inicializa Firebase
    try {
        const { db, auth } = FirebaseService.initializeFirebase();
        state.db = db;
        state.auth = auth;
        FirebaseService.onAuth(handleAuthChange);
    } catch (error) {
        UI.showMessage(error.message);
        console.error(error);
    }

    // Inicializa i18n
    await I18n.initI18n();

    // Inicializa o tema
    initTheme();

    refreshUIComponents();

    // Configura Event Listeners
    DOM.versionSelect.addEventListener('change', handleVersionChange);
    DOM.bookSelect.addEventListener('change', handleBookChange);
    DOM.chapterSelect.addEventListener('change', handleChapterChange);
    DOM.markAsReadCheckbox.addEventListener('change', handleMarkAsReadChange);

    // Listeners do Modal
    DOM.updatePlanButton.addEventListener('click', handleUpdatePlan);
    DOM.cancelEditButton.addEventListener('click', () => UI.toggleEditModal(false));
    
    DOM.planNameInput.addEventListener('input', () => UI.updateSaveButtonState(state.userId));
    DOM.startBookSelect.addEventListener('change', () => UI.updateSaveButtonState(state.userId));
    DOM.endBookSelect.addEventListener('change', () => UI.updateSaveButtonState(state.userId));
    DOM.savePlanButton.addEventListener('click', handleSavePlan);

    // Listener para mudança de idioma
    document.addEventListener('languageChange', refreshUIComponents);
};

window.addEventListener('load', initialize);