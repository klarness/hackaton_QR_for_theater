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
            introOverlay: document.getElementById('intro-overlay'),
            startBtn: document.getElementById('start-btn'),
            trackingHint: document.getElementById('tracking-hint'),
            arScene: document.getElementById('ar-scene')
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
            // Hide intro
            this.ui.introOverlay.style.opacity = '0';
            setTimeout(() => {
                this.ui.introOverlay.style.display = 'none';
            }, 500);

            // Robust MindAR start
            const startAR = () => {
                try {
                    this.ui.arScene.systems["mindar-image-system"].start();
                    this.bindAREvents();
                    this.renderDevControls();
                    
                    if (this.progress.completed.length === 0) {
                        this.showToast("Наведите камеру на банковскую карту (маркер).");
                    } else {
                        this.showToast("Ищите следующий маркер!");
                    }
                } catch (e) {
                    alert("Ошибка запуска AR: " + e.message);
                }
            };

            if (this.ui.arScene.hasLoaded) {
                startAR();
            } else {
                this.ui.arScene.addEventListener('loaded', startAR);
            }

        } catch (err) {
            alert("General Error: " + err.message);
        }
    }

    bindAREvents() {
        const targetEl = document.querySelector('#target');
        
        targetEl.addEventListener("targetFound", event => {
            console.log("Target found!");
            // Automatically trigger marker 1 for testing purposes
            if (!this.progress.currentMarker) {
                this.scanMarker('marker1');
            }
        });

        targetEl.addEventListener("targetLost", event => {
            console.log("Target lost!");
            this.showToast("Цель потеряна, наведите камеру обратно", true);
        });
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
        this.ui.trackingHint.style.display = 'flex';
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
        this.ui.trackingHint.style.display = 'none';
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
    setupModelTuner();
});

// ===== DEV: live tweak the AR model with keyboard =====
// Keys:
//   + / -          scale up / down
//   Arrow keys     move on marker plane (X / Y)
//   PageUp / Down  move along Z (toward / away from camera)
//   Q / E          rotate around Y (turn)
//   W / S          rotate around X (tilt)
//   R              reset
//   H              show / hide HUD
function setupModelTuner() {
    const model = document.getElementById('ar-model');
    if (!model) return;

    const hud = document.createElement('div');
    hud.id = 'model-tuner-hud';
    hud.style.cssText = 'position:fixed;top:8px;left:8px;z-index:9999;background:rgba(0,0,0,0.7);color:#0f0;font:12px/1.3 monospace;padding:8px 10px;border-radius:6px;pointer-events:none;white-space:pre;';
    document.body.appendChild(hud);

    const state = {
        pos: { x: 0, y: 0, z: 0.1 },
        rot: { x: 0, y: 0, z: 0 },
        scale: 0.05
    };

    const STEP_POS = 0.05;
    const STEP_ROT = 5;
    const SCALE_MUL = 1.15;

    function apply() {
        model.setAttribute('position', `${state.pos.x.toFixed(3)} ${state.pos.y.toFixed(3)} ${state.pos.z.toFixed(3)}`);
        model.setAttribute('rotation', `${state.rot.x} ${state.rot.y} ${state.rot.z}`);
        model.setAttribute('scale', `${state.scale.toFixed(4)} ${state.scale.toFixed(4)} ${state.scale.toFixed(4)}`);
        hud.textContent =
            `pos:   ${state.pos.x.toFixed(2)} ${state.pos.y.toFixed(2)} ${state.pos.z.toFixed(2)}\n` +
            `rot:   ${state.rot.x} ${state.rot.y} ${state.rot.z}\n` +
            `scale: ${state.scale.toFixed(4)}\n` +
            `\n+/- scale  arrows X/Y\nPgUp/PgDn Z  Q/E yaw  W/S pitch\nR reset  H hide`;
    }

    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case '+': case '=': state.scale *= SCALE_MUL; break;
            case '-': case '_': state.scale /= SCALE_MUL; break;
            case 'ArrowLeft':  state.pos.x -= STEP_POS; break;
            case 'ArrowRight': state.pos.x += STEP_POS; break;
            case 'ArrowUp':    state.pos.y += STEP_POS; break;
            case 'ArrowDown':  state.pos.y -= STEP_POS; break;
            case 'PageUp':     state.pos.z += STEP_POS; break;
            case 'PageDown':   state.pos.z -= STEP_POS; break;
            case 'q': case 'Q': state.rot.y -= STEP_ROT; break;
            case 'e': case 'E': state.rot.y += STEP_ROT; break;
            case 'w': case 'W': state.rot.x -= STEP_ROT; break;
            case 's': case 'S': state.rot.x += STEP_ROT; break;
            case 'r': case 'R':
                state.pos = { x: 0, y: 0, z: 0.1 };
                state.rot = { x: 0, y: 0, z: 0 };
                state.scale = 0.05;
                break;
            case 'h': case 'H':
                hud.style.display = hud.style.display === 'none' ? 'block' : 'none';
                return;
            default: return;
        }
        e.preventDefault();
        apply();
    });

    apply();
}

window.onerror = function(msg, url, lineNo, columnNo, error) {
    alert("JS Error: " + msg + " line: " + lineNo);
    return false;
};
