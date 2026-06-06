// Mocking AR interactions and endpoints for the MVP
const QUEST_STATE_KEY = 'sti_quest_progress';

// ============================================================
// Принудительный апгрейд камеры для MindAR.
// MindAR не пробрасывает constraints через A-Frame атрибуты,
// поэтому перехватываем getUserMedia и подменяем настройки до того,
// как MindAR его дернёт. Эффект: дистанция распознавания маркера
// вырастает в 2-3 раза за счёт высокого разрешения + автофокуса.
// ============================================================
(function patchGetUserMediaForAR() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = function (constraints) {
        if (!constraints?.video) {
            return original(constraints);
        }

        const userVideo = typeof constraints.video === 'object' ? constraints.video : {};
        const advanced = [
            ...(userVideo.advanced || []),
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
            { whiteBalanceMode: 'continuous' }
        ];

        const upgraded = {
            ...constraints,
            video: {
                ...userVideo,
                facingMode: userVideo.facingMode || { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 },
                advanced
            }
        };

        console.log('[camera] override constraints →', upgraded.video);

        return original(upgraded)
            .catch(err => {
                // Если 1920x1080 не вытягивает — фолбэк на 1280x720
                console.warn('[camera] HD не дали, фолбэк на 720p:', err.name);
                upgraded.video.width = { ideal: 1280 };
                upgraded.video.height = { ideal: 720 };
                return original(upgraded);
            })
            .then(stream => {
                const track = stream.getVideoTracks()[0];
                if (track) {
                    const caps = track.getCapabilities?.() || {};
                    const settings = track.getSettings?.() || {};
                    console.log('[camera] capabilities:', caps);
                    console.log('[camera] actual settings:', settings);
                }
                return stream;
            });
    };
})();

// Mock dialog tree and flow
const questData = {
    marker1: {
        id: 1,
        markerId: "marker1",
        character: "Антон Чехов",
        audioUrl: "/mock-audio-1.mp3",
        requiredPrevious: null,
        startNode: "intro",
        nodes: {
            intro: {
                dialogue: "Добро пожаловать в наш дворик. Вы готовы начать путешествие? Я приготовил для вас нечто особенное.",
                options: [
                    { text: "Да, готов!", nextNodeId: "ready" },
                    { text: "Что мне нужно делать?", nextNodeId: "rules" }
                ]
            },
            rules: {
                dialogue: "Правила просты: ищите маркеры, слушайте нас и делайте выбор. Каждая встреча открывает следующую.",
                options: [
                    { text: "Понятно!", nextNodeId: "ready" }
                ]
            },
            ready: {
                dialogue: "Тогда начнем. Найдите следующего персонажа и узнайте, что он для вас приготовил.",
                completeMarker: true,
                options: [
                    { text: "Иду дальше", closeScene: true, toast: "Отлично! Ищите следующую точку." }
                ]
            }
        }
    },
    marker2: {
        id: 2,
        markerId: "marker2",
        character: "Бегемот",
        audioUrl: "/mock-audio-2.mp3",
        requiredPrevious: 1,
        startNode: "intro",
        nodes: {
            intro: {
                dialogue: "Ну что, дошли и до меня. Я Бегемот, и просто так дальше не пропускаю. Готовы продолжать игру?",
                options: [
                    { text: "Готов", nextNodeId: "reflection" },
                    { text: "Сначала подсказку", nextNodeId: "details" }
                ]
            },
            details: {
                dialogue: "Подсказка проста: в этом квесте внимательность важнее скорости. Смотрите по сторонам и не пропускайте детали.",
                options: [
                    { text: "Теперь понял", nextNodeId: "reflection" }
                ]
            },
            reflection: {
                dialogue: "Тогда вы готовы к финалу. Забирайте награду за прохождение квеста.",
                completeMarker: true,
                options: [
                    { text: "Получить промокод", showPromo: true }
                ]
            }
        }
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
            arScene: document.getElementById('ar-scene'),
            characterModels: document.querySelectorAll('.character-model')
        };
        
        this.init();
    }

    init() {
        console.log("Quest Manager Initialized. Progress:", this.progress);

        this.bindModelEvents();
        this.bindAREvents();
        
        // Setup Start button
        this.ui.startBtn.onclick = () => this.startApp();
    }

    bindModelEvents() {
        if (!this.ui.characterModels.length) return;

        this.ui.characterModels.forEach(modelEl => {
            modelEl.addEventListener('model-loaded', event => {
                console.log('[model] loaded:', event.detail?.format, modelEl.getObject3D('mesh'));
            });

            modelEl.addEventListener('model-error', event => {
                console.error('[model] error:', event.detail);
                this.showToast('Ошибка загрузки 3D-модели. Смотрите консоль браузера.', true);
            });
        });
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
                    this.renderDevControls();

                    // Доп. подкрутка камеры после того как MindAR её открыл
                    setTimeout(() => this.tuneActiveCamera(), 1000);

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

    // Досылаем настройки которые можно применить только после открытия потока
    async tuneActiveCamera() {
        const videos = document.querySelectorAll('video');
        let track = null;
        for (const v of videos) {
            if (v.srcObject?.getVideoTracks) {
                const t = v.srcObject.getVideoTracks()[0];
                if (t && t.readyState === 'live') { track = t; break; }
            }
        }
        if (!track) {
            console.warn('[camera] активный video-трек не найден');
            return;
        }

        const caps = track.getCapabilities?.() || {};
        const settings = track.getSettings?.() || {};
        console.log('[camera] post-start caps:', caps, 'settings:', settings);

        const advanced = [];

        // Непрерывный автофокус — главный буст для распознавания
        if (caps.focusMode?.includes('continuous')) {
            advanced.push({ focusMode: 'continuous' });
        }
        if (caps.exposureMode?.includes('continuous')) {
            advanced.push({ exposureMode: 'continuous' });
        }
        if (caps.whiteBalanceMode?.includes('continuous')) {
            advanced.push({ whiteBalanceMode: 'continuous' });
        }

        // Мягкий цифровой зум 1.5x — увеличивает «угловой размер» маркера
        // в кадре, MindAR проще ловит фичи. Только если девайс умеет.
        if (caps.zoom) {
            const targetZoom = Math.min(1.5, caps.zoom.max);
            if (targetZoom > (caps.zoom.min || 1)) {
                advanced.push({ zoom: targetZoom });
            }
        }

        if (advanced.length === 0) {
            console.log('[camera] нечего подкручивать (девайс не поддерживает)');
            return;
        }

        try {
            await track.applyConstraints({ advanced });
            console.log('[camera] подкручено:', advanced);
        } catch (e) {
            console.warn('[camera] applyConstraints не сработал:', e);
        }
    }

    bindAREvents() {
        const targets = document.querySelectorAll('[mindar-image-target]');

        targets.forEach(targetEl => {
            const markerId = targetEl.dataset.markerId;
            if (!markerId) return;

            targetEl.addEventListener("targetFound", () => {
                console.log(`[AR] Target found for ${markerId}`);
                if (this.progress.currentMarker === questData[markerId]?.id && this.ui.overlay.style.display === 'flex') {
                    return;
                }
                this.scanMarker(markerId);
            });

            targetEl.addEventListener("targetLost", () => {
                console.log(`[AR] Target lost for ${markerId}`);
                this.showToast("Цель потеряна, наведите камеру обратно", true);
            });
        });
    }

    loadProgress() {
        const data = localStorage.getItem(QUEST_STATE_KEY);
        if (!data) return { currentMarker: null, currentNode: null, completed: [] };

        const parsed = JSON.parse(data);
        return {
            currentMarker: parsed.currentMarker || null,
            currentNode: parsed.currentNode || null,
            completed: Array.isArray(parsed.completed) ? parsed.completed : []
        };
    }

    saveProgress() {
        localStorage.setItem(QUEST_STATE_KEY, JSON.stringify(this.progress));
    }

    resetProgress() {
        localStorage.removeItem(QUEST_STATE_KEY);
        this.progress = { currentMarker: null, currentNode: null, completed: [] };
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
        this.progress.currentNode = scene.startNode;
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

        this.renderNode(scene, scene.startNode);
    }

    renderNode(scene, nodeId) {
        const node = scene.nodes[nodeId];
        if (!node) {
            console.error('[dialogue] unknown node:', scene.markerId, nodeId);
            this.showToast('Ошибка диалога. Узел не найден.', true);
            return;
        }

        this.progress.currentNode = nodeId;
        this.saveProgress();
        this.ui.dialogueText.textContent = node.dialogue;
        this.renderOptions(node.options || [], scene, node);
    }

    renderOptions(options, scene, node) {
        this.ui.optionsContainer.innerHTML = '';
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.textContent = opt.text;
            btn.onclick = () => this.handleOptionClick(opt, scene, node);
            this.ui.optionsContainer.appendChild(btn);
        });
    }

    handleOptionClick(option, scene, node) {
        console.log(`[USER ACTION] Chose: ${option.text}`);
        
        // Mock changing 3D animation
        console.log(`[AR MOCK] Play Animation: talk`);

        if (node.completeMarker && !this.progress.completed.includes(scene.id)) {
            this.progress.completed.push(scene.id);
            this.saveProgress();
        }

        if (option.showPromo) {
            this.showFinalScreen();
            return;
        }

        if (option.nextNodeId) {
            this.renderNode(scene, option.nextNodeId);
            return;
        }

        if (option.closeScene) {
            this.hideUI();
            this.progress.currentMarker = null;
            this.progress.currentNode = null;
            this.saveProgress();
            this.showToast(option.toast || "Отлично! Ищите следующую точку.");
        }
    }

    showFinalScreen() {
        this.progress.currentMarker = null;
        this.progress.currentNode = null;
        this.saveProgress();

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
        this.ui.devControls.innerHTML = '';

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

window.onerror = function(msg, url, lineNo, columnNo, error) {
    alert("JS Error: " + msg + " line: " + lineNo);
    return false;
};
