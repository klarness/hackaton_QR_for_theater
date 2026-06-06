// Mocking AR interactions and endpoints for the MVP
const QUEST_STATE_KEY = 'sti_quest_progress';

// Mock dialog tree and flow
const questData = {
    marker1: {
        id: 1,
        character: "Антон Чехов",
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
        dialogue: "Вы нашли вторую точку! Форма — это всё, не так ли? Как вам наша архитектура?",
        audioUrl: "/mock-audio-2.mp3",
        options: [
            { text: "Впечатляет", nextAction: "show_promo" },
            { text: "Иду дальше", nextAction: "show_promo" }
        ],
        requiredPrevious: 1
    }
};

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
            cameraContainer: document.getElementById('camera-container'),
            cameraFeed: document.getElementById('camera-feed'),
            introOverlay: document.getElementById('intro-overlay'),
            startBtn: document.getElementById('start-btn')
        };
        
        this.init();
    }

    init() {
        console.log("Quest Manager Initialized. Progress:", this.progress);
        
        // Setup Start button
        this.ui.startBtn.onclick = () => this.startApp();
    }

    async startApp() {
        try {
            // Request camera
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            this.ui.cameraFeed.srcObject = stream;
            
            // Hide intro, show dev controls
            this.ui.introOverlay.style.opacity = '0';
            setTimeout(() => {
                this.ui.introOverlay.style.display = 'none';
            }, 500);

            this.renderDevControls();
            
            // Show initial hint
            if (this.progress.completed.length === 0) {
                this.showToast("Найдите первый маркер во дворе и отсканируйте его.");
            } else {
                this.showToast("Ищите следующий маркер!");
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            this.showToast("Ошибка: Доступ к камере запрещен или устройство не поддерживается.", true);
        }
    }

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
        this.showToast("Прогресс сброшен. Можно начать заново.");
    }

    // Simulate scanning a QR marker via AR Engine
    scanMarker(markerId) {
        console.log(`[AR ENGINE] Scanned marker: ${markerId}`);
        const scene = questData[markerId];

        if (!scene) {
            this.showToast("Неизвестный маркер.", true);
            return;
        }

        // Check state machine: can we activate this marker?
        if (scene.requiredPrevious && !this.progress.completed.includes(scene.requiredPrevious)) {
            this.showToast("Вы пропустили предыдущую точку квеста! Вернитесь назад.", true);
            return;
        }

        // Proceed to show AR scene
        this.progress.currentMarker = scene.id;
        this.saveProgress();
        this.startScene(scene);
    }

    startScene(scene) {
        // Mocking 3D Model initialization
        console.log(`[AR MOCK] Render 3D Model: ${scene.character} (.glb file)`);
        console.log(`[AR MOCK] Play Animation: idle`);
        console.log(`[AUDIO MOCK] Play: ${scene.audioUrl}`);
        
        this.ui.overlay.style.display = 'flex';
        this.ui.characterName.textContent = scene.character;
        
        // Setup dialogue text
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
        console.log(`[USER ACTION] Chose: ${option.text} -> Triggering: ${option.nextAction}`);
        
        // Mock changing 3D animation
        console.log(`[AR MOCK] Play Animation: talk`);

        // Mark current scene as completed
        if (!this.progress.completed.includes(scene.id)) {
            this.progress.completed.push(scene.id);
            this.saveProgress();
        }

        // Handle routing based on option action
        if (option.nextAction === 'show_promo') {
            this.showFinalScreen();
        } else if (option.nextAction === 'explain_rules') {
            this.ui.dialogueText.textContent = "Правила просты: ищите маркеры, слушайте нас, делайте выбор.";
            this.renderOptions([{ text: "Понятно!", nextAction: "talk_next" }], scene);
        } else {
            // Advance the interaction or close
            this.hideUI();
            this.showToast("Отлично! Ищите следующую точку.");
        }
    }

    showFinalScreen() {
        this.ui.characterName.textContent = "Квест пройден!";
        this.ui.dialogueText.textContent = "Поздравляем! Вы прошли квест. Ваш промокод на скидку: ZUMER_STI_2024.";
        this.ui.optionsContainer.innerHTML = '';
        
        const buyBtn = document.createElement('button');
        buyBtn.className = 'btn-buy';
        buyBtn.textContent = 'Купить билет со скидкой';
        buyBtn.onclick = () => {
            console.log("[REDIRECT] Redirecting to https://sti.ru");
            window.open('https://sti.ru', '_blank'); 
        };
        
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
        
        if (isError) {
            toast.style.background = '#ff6b6b';
            toast.style.color = '#fff';
        } else {
            toast.style.background = 'rgba(255, 255, 255, 0.95)';
            toast.style.color = 'var(--dark-bg)';
        }
        
        // Reset animation
        toast.classList.remove('show');
        void toast.offsetWidth; // trigger reflow
        toast.classList.add('show');
        
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Dev utility to trigger markers without actual AR
    renderDevControls() {
        Object.keys(questData).forEach(key => {
            const btn = document.createElement('button');
            btn.textContent = `[Dev] Скан ${key}`;
            btn.className = 'dev-btn';
            btn.onclick = () => this.scanMarker(key);
            this.ui.devControls.appendChild(btn);
        });

        const resetBtn = document.createElement('button');
        resetBtn.textContent = "[Dev] Сбросить прогресс";
        resetBtn.className = 'dev-btn reset';
        resetBtn.onclick = () => this.resetProgress();
        this.ui.devControls.appendChild(resetBtn);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.questApp = new QuestManager();
});
