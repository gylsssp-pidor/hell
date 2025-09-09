"use strict";

// Simple text adventure engine

/** @typedef {{ id: string, text: string, choices: Array<{ text: string, to: string, if?: (state: GameState) => boolean, set?: (state: GameState) => void }>, onEnter?: (state: GameState) => void, end?: boolean }} Scene */

/** @typedef {{ flags: Record<string, boolean>, inventory: string[], visited: Record<string, number>, currentSceneId: string }} GameState */

/** @type {GameState} */
let gameState = {
	flags: {},
	inventory: [],
	visited: {},
	currentSceneId: "intro"
};

/** @type {Record<string, Scene>} */
const scenes = {
	intro: {
		id: "intro",
		text: "Просыпаясь в сумерках, вы находите себя у входа в старую башню. Ветер шепчет сквозь трещины камня. Что вы сделаете?",
		choices: [
			{ text: "Войти в башню", to: "hall" },
			{ text: "Осмотреть окрестности", to: "yard" }
		]
	},
	hall: {
		id: "hall",
		text: "Полутёмный зал встречает вас эхо шагов. На стене мерцает факел, а в конце виднеется закрытая дверь.",
		choices: [
			{ text: "Взять факел", to: "hall_taken_torch", set: (s) => { s.flags.torch = true; } },
			{ text: "Попробовать открыть дверь", to: "door", },
			{ text: "Вернуться назад", to: "intro" }
		]
	},
	hall_taken_torch: {
		id: "hall_taken_torch",
		text: "Вы берёте факел. Тепло огня придаёт уверенности.",
		choices: [
			{ text: "К двери", to: "door" },
			{ text: "Вернуться во двор", to: "intro" }
		],
		onEnter: (s) => { s.flags.torch = true; }
	},
	door: {
		id: "door",
		text: "Дверь заперта на старый ржавый замок. В темноте еле видно механику.",
		choices: [
			{ text: "Подсветить факелом", to: "lock", if: (s) => !!s.flags.torch },
			{ text: "Прощупать в темноте", to: "hurt" },
			{ text: "Назад в зал", to: "hall" }
		]
	},
	lock: {
		id: "lock",
		text: "При свете факела вы замечаете рядом с замком скрытую плиту. Нажав на неё, вы слышите щелчок — механизм отступил.",
		choices: [
			{ text: "Открыть дверь", to: "library" }
		]
	},
	hurt: {
		id: "hurt",
		text: "В темноте вы порезали руку о ржавчину. Боль отрезвляет. Лучше бы вам был источник света.",
		choices: [
			{ text: "Вернуться к двери", to: "door" },
			{ text: "Назад в зал", to: "hall" }
		]
	},
	library: {
		id: "library",
		text: "Зал библиотеки полон пыли и древних книг. На пьедестале лежит кристалл.",
		choices: [
			{ text: "Взять кристалл", to: "got_crystal", set: (s) => { s.flags.crystal = true; } },
			{ text: "Читать книгу о башне", to: "lore" },
			{ text: "Дальше в глубину", to: "depths", if: (s) => !!s.flags.crystal }
		]
	},
	got_crystal: {
		id: "got_crystal",
		text: "Кристалл начинает мерцание в такт вашему дыханию.",
		choices: [
			{ text: "Дальше в глубину", to: "depths" },
			{ text: "Оглядеться ещё", to: "library" }
		]
	},
	lore: {
		id: "lore",
		text: "Вы узнаёте: кристалл — ключ к запечатанной комнате внизу. Без него вход не откроется.",
		choices: [
			{ text: "Вернуться", to: "library" }
		]
	},
	depths: {
		id: "depths",
		text: "Вы спускаетесь по спиральной лестнице. Внизу — дверь с круглым углублением.",
		choices: [
			{ text: "Вставить кристалл", to: "final", if: (s) => !!s.flags.crystal },
			{ text: "Вернуться наверх", to: "library" }
		]
	},
	final: {
		id: "final",
		text: "Дверь раскрывается, и свет наполняет вас. Вы нашли сердце башни и обрели знание. Конец... или начало?",
		choices: [
			{ text: "Начать заново", to: "intro", set: (s) => { resetState(s); } }
		],
		end: true
	}
};

// DOM references
const storyEl = document.getElementById("story");
const choicesEl = document.getElementById("choices");
const statusEl = document.getElementById("status");
const btnSave = document.getElementById("btn-save");
const btnLoad = document.getElementById("btn-load");
const btnRestart = document.getElementById("btn-restart");

function resetState(state) {
	state.flags = {};
	state.inventory = [];
	state.visited = {};
	state.currentSceneId = "intro";
}

function render() {
	const scene = scenes[gameState.currentSceneId];
	if (!scene) return;
	gameState.visited[scene.id] = (gameState.visited[scene.id] || 0) + 1;
	if (typeof scene.onEnter === "function") scene.onEnter(gameState);

	storyEl.textContent = scene.text;
	choicesEl.innerHTML = "";

	const availableChoices = scene.choices.filter(c => !c.if || c.if(gameState));
	for (const choice of availableChoices) {
		const li = document.createElement("li");
		const btn = document.createElement("button");
		btn.className = "choice";
		btn.textContent = choice.text;
		btn.addEventListener("click", () => {
			if (choice.set) choice.set(gameState);
			transitionTo(choice.to);
		});
		li.appendChild(btn);
		choicesEl.appendChild(li);
	}

	statusEl.textContent = buildStatusText();
}

function transitionTo(sceneId) {
	gameState.currentSceneId = sceneId;
	render();
}

function buildStatusText() {
	const flags = Object.keys(gameState.flags).filter(k => gameState.flags[k]);
	const visitedCount = Object.keys(gameState.visited).length;
	const parts = [];
	if (flags.length) parts.push(`Флаги: ${flags.join(", ")}`);
	parts.push(`Локаций посещено: ${visitedCount}`);
	return parts.join(" • ");
}

// Persistence
const SAVE_KEY = "text_adventure_save_v1";

function saveGame() {
	try {
		localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
		toast("Сохранено.");
	} catch (e) {
		toast("Не удалось сохранить.");
	}
}

function loadGame() {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) { toast("Сохранение не найдено."); return; }
		const data = JSON.parse(raw);
		if (data && typeof data === "object") {
			gameState = Object.assign({ flags: {}, inventory: [], visited: {}, currentSceneId: "intro" }, data);
			render();
			toast("Загружено.");
		}
	} catch (e) {
		toast("Не удалось загрузить.");
	}
}

function restartGame() {
	resetState(gameState);
	render();
	toast("Игра перезапущена.");
}

function toast(message) {
	statusEl.textContent = message;
	setTimeout(() => { statusEl.textContent = buildStatusText(); }, 1200);
}

btnSave.addEventListener("click", saveGame);
btnLoad.addEventListener("click", loadGame);
btnRestart.addEventListener("click", restartGame);

// Initial render
render();

