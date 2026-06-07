// Mocking AR interactions and endpoints for the MVP
const QUEST_STATE_KEY = 'sti_quest_progress';
const SHOW_DEV_CONTROLS = false;

// Какой сцене соответствует какой targetIndex в .mind файле.
// В компилере MindAR картинки нумеруются по порядку добавления.
const TARGET_INDEX_TO_MARKER = {
    0: 'marker1', // первая картинка → Маргарита
    1: 'marker2'  // вторая картинка → Бегемот
};

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

// Дерево диалогов: каждая сцена это set из node'ов, options ведут на next или triggers action.
// action: "complete"   — закрыть сцену, отметить пройденной, тост со следующей точкой
// action: "show_promo" — финальный экран с промокодом
const questData = {
    marker1: {
        id: 1,
        character: "Маргарита",
        audioUrl: "/mock-audio-1.mp3",
        requiredPrevious: null,
        startNode: "start",
        model: {
            url: "./space.glb",
            scale: "1 1 1",
            rotation: "90 0 0"
        },
        tree: {
            start: {
                text: "Не смотрите так.\nЯ не всегда была такой.\n\nСкажите...\n\nЕсли любовь требует от вас отказаться от всего, кем вы были, — это всё ещё любовь?",
                options: [
                    { text: "Да. Если это настоящая любовь.", next: "ans1" },
                    { text: "Нет. Если теряешь себя — это уже не любовь.", next: "ans2" },
                    { text: "А если я просто не хочу страдать красиво?", next: "ans7" }
                ]
            },
            ans1: {
                text: "Вы говорите красиво.\n\nТак говорят все, пока любовь ещё не назвала цену.\n\nНо хорошо. Значит, вы из тех, кто готов идти в огонь.",
                options: [
                    { text: "А ты сама знала, какую цену заплатишь?", next: "ans3" },
                    { text: "Знаешь, что ты выдуманный персонаж?", next: "ans4" }
                ]
            },
            ans2: {
                text: "Значит, вы умеете держаться за себя.\n\nЭто редкий дар.\n\nТолько будьте осторожны: иногда люди называют границами то, что на самом деле является страхом.",
                options: [
                    { text: "А ты сама знала, какую цену заплатишь?", next: "ans3" },
                    { text: "Знаешь, что ты выдуманный персонаж?", next: "ans4" }
                ]
            },
            ans3: {
                text: "А я вот не уверена.\n\nЯ думала, что иду к любви.\n\nВы задавали этот вопрос коту?",
                options: [
                    { text: "Знаешь, что ты выдуманный персонаж?", next: "ans4" }
                ]
            },
            ans4: {
                text: "А вы уверены, что вы настоящий?",
                options: [
                    { text: "Нет", next: "ans5" },
                    { text: "Да", next: "ans6" }
                ]
            },
            ans5: {
                text: "Бегемот поможет с ответом.\n\nМожете найти его около дома, где жил часовщик Ганс Кульмс.",
                options: [
                    { text: "Можешь подсказать более точную локацию?", next: "clue" }
                ]
            },
            ans6: {
                text: "Спорить о страдании можно бесконечно.\n\nБегемот наверняка сказал бы, что люди либо героизируют свои чувства, либо героизируют своё благоразумие.\n\nМожете спросить его сами — найдите его около дома, где жил часовщик Ганс Кульмс.",
                options: [
                    { text: "Можешь подсказать более точную локацию?", next: "clue" }
                ]
            },
            ans7: {
                text: "Тогда вы либо очень умны, либо очень устали.\n\nИ то и другое — не приговор.\n\nИдите дальше. Найдите Бегемота около дома, где жил часовщик Ганс Кульмс.",
                options: [
                    { text: "Можешь подсказать более точную локацию?", next: "clue" }
                ]
            },
            clue: {
                text: "Вот эта табличка. Найдёте её — найдёте и Бегемота.",
                imageUrl: "./hans_kulms_plate.jpg",
                options: [
                    { text: "Спасибо, иду искать", action: "complete" }
                ]
            }
        }
    },
    marker2: {
        id: 2,
        character: "Кот Бегемот",
        audioUrl: "/mock-audio-2.mp3",
        requiredPrevious: 1,
        startNode: "start",
        // Куб как заглушка пока нет модели кота
        model: {
            url: "./cube.glb",
            scale: "0.3 0.3 0.3",
            rotation: "0 0 0"
        },
        tree: {
            start: {
                text: "Ну наконец-то.\n\nЯ уже начал думать, что вы тоже решили пожертвовать собой ради любви и по дороге забыли, куда шли.\n\nХорошее место, кстати. Дом часовщика.",
                options: [
                    { text: "Ради кого Маргарита жертвует собой?", next: "sacrifice" },
                    { text: "А кто такой этот часовщик?", next: "watchmaker" }
                ]
            },
            sacrifice: {
                text: "Люди вообще любят думать, что жертвуют собой ради кого-то. Так звучит благороднее.\n\nА потом оказывается, что они жертвуют ради той версии себя, которая наконец-то способна на большой поступок.\n\nТы готов на такие поступки?",
                options: [
                    { text: "Да", next: "yes_lead" },
                    { text: "Нет", next: "no_reward" }
                ]
            },
            watchmaker: {
                text: "Человек, который жил здесь и считал время.\n\nЗвучит просто, да? Часовщики вообще делают вид, что время можно починить. Подкрутить.\n\nУ вас ещё много времени?",
                options: [
                    { text: "Да", next: "yes_lead" },
                    { text: "Нет", next: "no_reward" }
                ]
            },
            yes_lead: {
                text: "Так обычно говорят люди, которые ещё не поняли, что согласились не на вопрос, а на последствия.\n\nЕсть одно подозрительное место.\nТуда люди входят бодро, с видом знатоков, тоже не думая о последствиях.",
                options: [
                    { text: "Хочу рискнуть. Что это за место?", next: "yes_reward" }
                ]
            },
            yes_reward: {
                text: "Я готов вознаградить тебя за смелость.\n\nОставь свою почту — отправлю туда локацию и ещё что-то интересное.",
                input: {
                    type: "email",
                    placeholder: "your@email.ru",
                    buttonText: "Получить подарок от Кота",
                    next: "end"
                }
            },
            no_reward: {
                text: "Вот и прекрасно. Честное «нет» иногда стоит дороже красивого «да».\n\nМаргарита выбрала долгий путь. А вам повезло больше.\n\nЯ готов вознаградить тебя — оставь свою почту, отправлю туда что-то интересное.",
                input: {
                    type: "email",
                    placeholder: "your@email.ru",
                    buttonText: "Получить подарок от Кота",
                    next: "end"
                }
            },
            end: {
                text: "Готово.\n\nПодарок ушёл к вам на почту.\nЕсли не найдёте его — проверьте «Спам».\n\nЛюди часто прячут туда всё самое интересное.\n\nДо встречи в театре.",
                options: [
                    { text: "Завершить", action: "show_promo" }
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
            arScene: document.getElementById('ar-scene')
        };

        this.init();
    }

    init() {
        console.log("Quest Manager Initialized. Progress:", this.progress);

        this.bindModelEvents();
        this.ui.devControls.style.display = SHOW_DEV_CONTROLS ? 'flex' : 'none';

        // Setup Start button
        this.ui.startBtn.onclick = () => this.startApp();
    }

    bindModelEvents() {
        // Слушаем загрузку/ошибки на всех gltf-моделях внутри обоих таргетов
        document.querySelectorAll('a-gltf-model').forEach(el => {
            el.addEventListener('model-loaded', event => {
                console.log('[model] loaded:', el.getAttribute('src'), event.detail?.format);
            });
            // el.addEventListener('model-error', event => {
            //     console.error('[model] error:', el.getAttribute('src'), event.detail);
            //     this.showToast(`Ошибка загрузки модели ${el.getAttribute('src')}`, true);
            // });
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
                    this.bindAREvents();
                    this.renderDevControls();

                    // Доп. подкрутка камеры после того как MindAR её открыл
                    setTimeout(() => this.tuneActiveCamera(), 1000);

                    if (this.progress.completed.length === 0) {
                        this.showToast("Наведите камеру на маркер.");
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
        // Слушаем оба таргета независимо: каждый запускает свою сцену.
        for (const [idx, markerId] of Object.entries(TARGET_INDEX_TO_MARKER)) {
            const sel = markerId === 'marker1' ? '#target-margarita' : '#target-behemoth';
            const el = document.querySelector(sel);
            if (!el) {
                console.warn(`[AR] не найдена сущность ${sel} для targetIndex ${idx}`);
                continue;
            }

            el.addEventListener('targetFound', () => {
                console.log(`[AR] targetIndex ${idx} found → scanMarker('${markerId}')`);
                // Не перезапускаем сцену если диалог уже открыт
                if (this.ui.overlay.style.display === 'flex') return;
                this.scanMarker(markerId);
            });

            el.addEventListener('targetLost', () => {
                console.log(`[AR] targetIndex ${idx} lost`);
            });
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
        console.log(`[SCENE] ${scene.character} (marker ${scene.id})`);
        console.log(`[AR MOCK] Play Animation: idle`);
        console.log(`[AUDIO MOCK] Play: ${scene.audioUrl}`);

        this.currentScene = scene;
        this.ui.overlay.style.display = 'flex';
        this.ui.trackingHint.style.display = 'flex';
        this.ui.characterName.textContent = scene.character;

        this.showNode(scene.startNode || 'start');
    }

    showNode(nodeId) {
        const tree = this.currentScene?.tree;
        if (!tree) {
            console.warn('[dialogue] нет дерева в текущей сцене');
            return;
        }
        const node = tree[nodeId];
        if (!node) {
            console.warn('[dialogue] неизвестная нода:', nodeId);
            return;
        }

        this.currentNode = nodeId;
        this.updateDialogueImage(node.imageUrl);

        // Опции прячем пока реплика печатается — UX задача от юзера
        this.ui.optionsContainer.innerHTML = '';

        this.typewriteText(node.text, () => {
            if (node.input) {
                this.renderInput(node.input);
            } else {
                this.renderOptions(node.options || []);
            }
        });
    }

    renderInput(input) {
        this.ui.optionsContainer.innerHTML = '';

        const inputEl = document.createElement('input');
        inputEl.type = input.type || 'text';
        inputEl.className = 'dialogue-input';
        inputEl.placeholder = input.placeholder || '';
        if (input.type === 'email') {
            inputEl.autocomplete = 'email';
            inputEl.inputMode = 'email';
        }

        const btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.textContent = input.buttonText || 'Отправить';

        const submit = () => {
            const value = inputEl.value.trim();
            if (!value) {
                inputEl.focus();
                this.showToast('Введите почту, чтобы Бегемот отправил подарок', true);
                return;
            }
            // Простейшая валидация email — наличие @ и точки после
            if (input.type === 'email' && !/^.+@.+\..+$/.test(value)) {
                inputEl.focus();
                this.showToast('Похоже, в почте опечатка', true);
                return;
            }

            // Сохраняем — для прода тут будет POST на бэкенд
            this.progress.email = value;
            this.saveProgress();
            console.log('[email] сохранена:', value);

            if (input.next) this.showNode(input.next);
        };

        btn.onclick = submit;
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
        });

        this.ui.optionsContainer.appendChild(inputEl);
        this.ui.optionsContainer.appendChild(btn);
        // На мобильных не фокусим автоматически — клавиатура выскочит и закроет коробку
    }

    // Печатная машинка: слова появляются последовательно с паузами на знаках.
    // Тап по диалог-коробке скипает анимацию до конца.
    typewriteText(fullText, onDone) {
        // Прервать предыдущую анимацию если была
        if (this._typewriterTimeout) {
            clearTimeout(this._typewriterTimeout);
            this._typewriterTimeout = null;
        }

        const tokens = fullText.split(/(\s+)/); // сохраняем пробелы и \n
        const PUNCT_PAUSE = { '.': 220, '!': 220, '?': 220, '…': 220, ',': 120, ':': 120, ';': 120 };
        const WORD_DELAY = 80;

        this.ui.dialogueText.textContent = '';
        let i = 0;

        const finish = () => {
            this.ui.dialogueText.textContent = fullText;
            this._typewriterTimeout = null;
            this.ui.dialogueBox.onclick = null;
            if (onDone) onDone();
        };

        // Тап-скип
        this.ui.dialogueBox.onclick = () => {
            if (this._typewriterTimeout) {
                clearTimeout(this._typewriterTimeout);
                finish();
            }
        };

        const tick = () => {
            if (i >= tokens.length) { finish(); return; }
            const token = tokens[i++];
            this.ui.dialogueText.textContent += token;
            const lastChar = token.trim().slice(-1);
            const delay = PUNCT_PAUSE[lastChar] ?? WORD_DELAY;
            this._typewriterTimeout = setTimeout(tick, delay);
        };
        tick();
    }

    updateDialogueImage(url) {
        let img = document.getElementById('dialogue-image');
        if (url) {
            if (!img) {
                img = document.createElement('img');
                img.id = 'dialogue-image';
                img.className = 'dialogue-image';
                img.alt = 'Подсказка';
                this.ui.dialogueBox.appendChild(img);
            }
            img.src = url;
            img.style.display = 'block';
        } else if (img) {
            img.style.display = 'none';
        }
    }

    renderOptions(options) {
        this.ui.optionsContainer.innerHTML = '';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.textContent = opt.text;
            btn.onclick = () => this.handleOption(opt);
            this.ui.optionsContainer.appendChild(btn);
        });
    }

    handleOption(option) {
        console.log(`[USER] "${option.text}" → ${option.next || option.action}`);
        console.log(`[AR MOCK] Play Animation: talk`);

        if (option.action === 'show_promo') {
            this.markSceneCompleted();
            this.showFinalScreen();
            return;
        }
        if (option.action === 'complete') {
            this.markSceneCompleted();
            this.hideUI();
            this.showToast('Отлично! Ищите следующую точку.');
            return;
        }
        if (option.next) {
            this.showNode(option.next);
            return;
        }
        console.warn('[dialogue] у опции нет ни next, ни action:', option);
    }

    markSceneCompleted() {
        const id = this.currentScene?.id;
        if (id && !this.progress.completed.includes(id)) {
            this.progress.completed.push(id);
            this.saveProgress();
        }
    }

    showFinalScreen() {
        this.ui.characterName.textContent = "Студия театрального искусства";
        this.ui.optionsContainer.innerHTML = '';
        this.updateDialogueImage(null);

        const finalText =
            "Маргарита и Бегемот провели вас от начала и до конца.\n\n" +
            "Теперь увидьте их вживую — на сцене Студии театрального искусства.\n\n" +
            "Покупайте билеты и приходите. Промокод из письма уже работает.";

        this.typewriteText(finalText, () => {
            const buyBtn = document.createElement('button');
            buyBtn.className = 'btn-buy';
            buyBtn.textContent = 'Купить билет в СТИ';
            buyBtn.onclick = () => {
                console.log('[REDIRECT] → https://sti.ru');
                window.open('https://sti.ru', '_blank');
            };
            this.ui.optionsContainer.appendChild(buyBtn);
        });
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
        if (!SHOW_DEV_CONTROLS) return;

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

window.onerror = function (msg, url, lineNo, columnNo, error) {
    alert("JS Error: " + msg + " line: " + lineNo);
    return false;
};
