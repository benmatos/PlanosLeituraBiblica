import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, addDoc, deleteDoc, onSnapshot, collection, setDoc, updateDoc, deleteField, query, where, orderBy, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';

let db;
let auth;

/**
 * Inicializa o Firebase e retorna as instâncias de db e auth.
 */
export const initializeFirebase = () => {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        return { db, auth };
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
        throw new Error("Erro ao inicializar Firebase. Verifique a configuração.");
    }
};

/**
 * Configura um listener para o estado de autenticação.
 * @param {Function} callback - Função a ser chamada quando o estado de autenticação muda.
 */
export const onAuth = (callback) => {
    onAuthStateChanged(auth, callback);
};

/**
 * Realiza o login anônimo.
 */
export const signIn = async () => {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Erro ao autenticar anonimamente:", error);
        throw new Error("Erro ao autenticar. Funcionalidades de plano de leitura desabilitadas.");
    }
};

/**
 * Configura um listener em tempo real para a coleção de planos de leitura.
 * @param {string} userId - O ID do usuário para filtrar os planos.
 * @param {Function} callback - Função para processar os planos recebidos.
 */
export const listenToPlans = (userId, callback) => {
    const plansCollectionRef = collection(db, 'reading_plans');
    const q = query(plansCollectionRef, where("userId", "==", userId), orderBy("order"));
    onSnapshot(q, (querySnapshot) => {
        const plans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(plans);
    }, (error) => {
        console.error("Erro ao escutar mudanças no Firestore:", error);
        throw new Error("Erro ao carregar planos de leitura.");
    });
};

/**
 * Salva um novo plano de leitura no Firestore.
 * @param {object} planData - Os dados do plano a serem salvos.
 */
export const savePlan = async (planData) => {
    await addDoc(collection(db, 'reading_plans'), planData);
};

/**
 * Deleta um plano de leitura do Firestore.
 * @param {string} planId - O ID do documento do plano a ser deletado.
 */
export const deletePlan = async (planId) => {
    try {
        await deleteDoc(doc(db, 'reading_plans', planId));
    } catch (e) {
        console.error("Erro ao deletar documento:", e);
        throw new Error("Erro ao deletar o plano. Tente novamente.");
    }
};

/**
 * Atualiza um plano de leitura existente no Firestore.
 * @param {string} planId - O ID do plano a ser atualizado.
 * @param {object} dataToUpdate - Os dados a serem atualizados.
 */
export const updatePlan = async (planId, dataToUpdate) => {
    const planRef = doc(db, 'reading_plans', planId);
    await updateDoc(planRef, dataToUpdate);
};

/**
 * Atualiza a ordem de múltiplos planos usando um batch write.
 * @param {Array<object>} plans - Array de objetos de plano, cada um com `id`.
 */
export const updatePlansOrder = async (plans) => {
    const batch = writeBatch(db);
    plans.forEach((plan, index) => {
        const planRef = doc(db, 'reading_plans', plan.id);
        batch.update(planRef, { order: index });
    });
    await batch.commit();
};

/**
 * Atualiza o status de leitura de um capítulo no Firestore.
 * @param {string} userId - O ID do usuário.
 * @param {string} chapterId - O identificador do capítulo (ex: 'gn-1').
 * @param {boolean} isRead - Se o capítulo foi lido.
 */
export const updateReadChapterStatus = async (userId, chapterId, isRead) => {
    const userStatusRef = doc(db, 'read_status', userId);
    const chapterKey = `readChapters.${chapterId}`;

    if (isRead) {
        // Adiciona ou atualiza o capítulo no mapa de capítulos lidos.
        // `setDoc` com `merge: true` é seguro e cria o documento se ele não existir.
        await setDoc(userStatusRef, { readChapters: { [chapterId]: true } }, { merge: true });
    } else {
        // Remove o capítulo do mapa. `updateDoc` é usado para remover um campo.
        try {
            await updateDoc(userStatusRef, {
                [chapterKey]: deleteField()
            });
        } catch (error) {
            // Ignora o erro se o documento ou campo não existir, pois o estado final é o desejado.
            console.log("Não foi possível desmarcar o capítulo (pode já estar desmarcado):", error.message);
        }
    }
};

/**
 * Configura um listener em tempo real para o progresso de leitura do usuário.
 * @param {string} userId - O ID do usuário.
 * @param {Function} callback - Função para processar o mapa de capítulos lidos.
 */
export const listenToReadStatus = (userId, callback) => {
    const userStatusRef = doc(db, 'read_status', userId);
    onSnapshot(userStatusRef, (docSnap) => {
        callback(docSnap.exists() ? docSnap.data().readChapters || {} : {});
    }, (error) => {
        console.error("Erro ao escutar progresso de leitura:", error);
        throw new Error("Erro ao carregar progresso de leitura.");
    });
};