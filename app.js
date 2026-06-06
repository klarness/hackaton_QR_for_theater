// СТИ AR Quest — model-viewer edition (no marker tracking, native ARKit/ARCore)
const QUEST_STATE_KEY = 'sti_quest_progress';

// ---- Content: marker → character + dialog tree ----
// Add per-marker `modelUrl` to swap glb per character.
const questData = {
    marker1: {
        id: 1,
        character: "Антон Чехов",
        modelUrl: "./cube.glb", // TODO: replace with chekhov.glb
        dialogue: "Добро пожаловать в наш дворик. Вы готовы начать путешествие? Я приготовил для вас нечто особенное.",
        audioUrl: "/mock-audio-1.mp3",
        options: [
            { text: "Да, готов!", nextAction: "talk_next" },
            { text: "Что мне нужно делать?", nextAction: "explain_rules" }
        ],
        requiredPrevious: null
    },
    marker2: {
        id: 2,
        character: "Всеволод Мейерхольд",
        modelUrl: "./cube.glb", // TODO: replace with meyerhold.glb
        dialogue: "Вы нашли вторую точку! Форма — это всё, не так ли? Как вам наша архитектура?",
        audioUrl: "/mock-audio-2.mp3",
        options: [
            { text: "Впечатляет", nextAction: "show_promo" },
            { text: "Иду дальше", nextAction: "show_promo" }
        ],
        requiredPrevious: 1
    }
};

// Map ?m=1 URL → markerN key
const URL_TO_MARKER = { '1': 'marker1', '2': 'marker2' };

class QuestManager {
    constructor() {
        this.progress = this.loadProgress();
        this.ui = {
            overlay: document.getElementById('ui-overlay'),
            dialogueBox: document.getElementById('dialogue-box'),
            characterName: document.getElementById('character-name'),
            dialogueText: document.getElementById('dialogue-text'),
            optionsContainer: document.getElementById('options-container'),
            devControls: document.getElementById('dev-controls'),
            introOverlay: document.getElementById('intro-overlay'),
            startBtn: document.getElementById('start-btn'),
            model: document.getElementById('ar-model')
        };

        // Which marker did the QR redirect us to?
        const m = new URLSearchParams(window.location.search).get('m');
        this.initialMarker = URL_TO_MARKER[m] || 'marker1';

        this.init();
    }

    init() {
        console.log("Quest Manager init. Progress:", this.progress, "initial marker:", this.initialMarker);
        this.ui.startBtn.onclick = () => this.startApp();
        this.renderDevControls();
    }

    startApp() {
        // Hide intro
        this.ui.introOverlay.style.opacity = '0';
        setTimeout(() => { this.ui.introOverlay.style.display = 'none'; }, 500);

        // Auto-trigger the scene for the marker encoded in the URL
        this.scanMarker(this.initialMarker);
    }

    // ---- Model swap + animation control ----
    setModel(url) {
        if (this.ui.model.getAttribute('src') !== url) {
            this.ui.model.setAttribute('src', url);
        }
    }

    playAnimation(name) {
        // model-viewer auto-picks the first animation if none specified.
        // Setting animation-name switches between clips, e.g. 'idle' / 'talk'.
        if (!name) return;
        try {
            this.ui.model.setAttribute('animation-name', name);
            // restart the clip
            this.ui.model.currentTime = 0;
        } catch (e) {
            console.warn("Animation switch failed:", e);
        }
    }

    // ---- Quest state ----
    loadProgress() {
        const data = localStorage.getItem(QUEST_STATE_KEY);
        return data ? JSON.parse(data) : { currentMarker: null, completed: [] };
    }

    saveProgress() {
        localStorage.setItem(QUEST_STATE_KEY, JSON.stringify(this.progress));
    }

    resetProgress() {
        localStorage.removeItem(QUEST_STATE_KEY);
        this.progress = { currentMarker: null, completed: [] };
        this.hideUI();
        this.showToast("Прогресс сброшен.");
    }

    scanMarker(markerId) {
        const scene = questData[markerId];
        if (!scene) {
            this.showToast("Неизвестный маркер.", true);
            return;
        }
        if (scene.requiredPrevious && !this.progress.completed.includes(scene.requiredPrevious)) {
            this.showToast("Сначала пройдите предыдущую точку квеста!", true);
            return;
        }
        this.progress.currentMarker = scene.id;
        this.saveProgress();
        this.startScene(scene);
    }

    startScene(scene) {
        console.log(`[SCENE] ${scene.character}, model=${scene.modelUrl}`);
        this.setModel(scene.modelUrl);
        this.playAnimation('idle');
        // TODO: hook real audio when files are ready
        // new Audio(scene.audioUrl).play().catch(()=>{});

        this.ui.overlay.style.display = 'flex';
        this.ui.characterName.textContent = scene.character;
        this.ui.dialogueText.textContent = scene.dialogue;
        this.renderOptions(scene.options, scene);
    }

    renderOptions(options, scene) {
        this.ui.optionsContainer.innerHTML = '';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.textContent = opt.text;
            btn.onclick = () => this.handleOptionClick(opt, scene);
            this.ui.optionsContainer.appendChild(btn);
        });
    }

    handleOptionClick(option, scene) {
        console.log(`[USER] ${option.text} → ${option.nextAction}`);
        this.playAnimation('talk');

        if (!this.progress.completed.includes(scene.id)) {
            this.progress.completed.push(scene.id);
            this.saveProgress();
        }

        if (option.nextAction === 'show_promo') {
            this.showFinalScreen();
        } else if (option.nextAction === 'explain_rules') {
            this.ui.dialogueText.textContent = "Правила просты: ищите маркеры, слушайте нас, делайте выбор.";
            this.renderOptions([{ text: "Понятно!", nextAction: "talk_next" }], scene);
        } else {
            // After a beat, return to idle and close UI
            setTimeout(() => this.playAnimation('idle'), 800);
            this.hideUI();
            this.showToast("Отлично! Ищите следующую точку.");
        }
    }

    showFinalScreen() {
        this.ui.characterName.textContent = "Квест пройден!";
        this.ui.dialogueText.textContent = "Поздравляем! Ваш промокод: ZUMER_STI_2024.";
        this.ui.optionsContainer.innerHTML = '';

        const buyBtn = document.createElement('button');
        buyBtn.className = 'btn-buy';
        buyBtn.textContent = 'Купить билет со скидкой';
        buyBtn.onclick = () => window.open('https://sti.ru', '_blank');
        this.ui.optionsContainer.appendChild(buyBtn);
    }

    hideUI() {
        this.ui.overlay.style.display = 'none';
    }

    showToast(msg, isError = false) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.background = isError ? '#ff6b6b' : 'rgba(255,255,255,0.95)';
        toast.style.color = isError ? '#fff' : 'var(--dark-bg)';
        toast.classList.remove('show');
        void toast.offsetWidth;
        toast.classList.add('show');
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    renderDevControls() {
        Object.keys(questData).forEach(key => {
            const btn = document.createElement('button');
            btn.textContent = `[Dev] ${key}`;
            btn.className = 'dev-btn';
            btn.onclick = () => this.scanMarker(key);
            this.ui.devControls.appendChild(btn);
        });
        const resetBtn = document.createElement('button');
        resetBtn.textContent = "[Dev] Сброс";
        resetBtn.className = 'dev-btn reset';
        resetBtn.onclick = () => this.resetProgress();
        this.ui.devControls.appendChild(resetBtn);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.questApp = new QuestManager();
});

window.onerror = function(msg, url, lineNo) {
    console.error("JS Error:", msg, "line:", lineNo);
    return false;
};
