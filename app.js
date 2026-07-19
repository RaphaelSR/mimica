const WORDS_STORAGE_KEY = "mimica-words-v2";
const INDEX_STORAGE_KEY = "mimica-index-v2";
const TIMER_LIMIT_STORAGE_KEY = "mimica-timer-limit-v1";
const DEFAULT_TIMER_LIMIT = 60;
const MIN_TIMER_LIMIT = 5;
const MAX_TIMER_LIMIT = 3600;

const elements = {
  stage: document.querySelector(".stage"),
  word: document.querySelector("#word"),
  eyebrow: document.querySelector("#eyebrow"),
  hiddenHint: document.querySelector("#hiddenHint"),
  progress: document.querySelector("#progress"),
  previousButton: document.querySelector("#previousButton"),
  nextButton: document.querySelector("#nextButton"),
  hideButton: document.querySelector("#hideButton"),
  hideLabel: document.querySelector("#hideLabel"),
  openEditor: document.querySelector("#openEditor"),
  closeEditor: document.querySelector("#closeEditor"),
  editor: document.querySelector("#editor"),
  scrim: document.querySelector("#scrim"),
  addForm: document.querySelector("#addForm"),
  newWord: document.querySelector("#newWord"),
  wordList: document.querySelector("#wordList"),
  itemCount: document.querySelector("#itemCount"),
  clearButton: document.querySelector("#clearButton"),
  timer: document.querySelector("#timer"),
  timerStatus: document.querySelector("#timerStatus"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerRange: document.querySelector("#timerRange"),
  timerPlay: document.querySelector("#timerPlay"),
  timerPlayIcon: document.querySelector("#timerPlayIcon"),
  timerReset: document.querySelector("#timerReset"),
  timerMinus: document.querySelector("#timerMinus"),
  timerPlus: document.querySelector("#timerPlus"),
  openTimerSettings: document.querySelector("#openTimerSettings"),
  timerSettings: document.querySelector("#timerSettings"),
  closeTimerSettings: document.querySelector("#closeTimerSettings"),
  customLimitForm: document.querySelector("#customLimitForm"),
  customLimit: document.querySelector("#customLimit"),
  timerPresets: document.querySelector(".timer-presets"),
  toast: document.querySelector("#toast"),
};

let words = loadWords();
let currentIndex = loadIndex();
let isHidden = false;
let timerLimitSeconds = loadTimerLimit();
let remainingMilliseconds = timerLimitSeconds * 1000;
let timerEndTime = 0;
let timerInterval;
let timerStarted = false;
let timerRunning = false;
let toastTimer;

function loadWords() {
  try {
    const stored = JSON.parse(localStorage.getItem(WORDS_STORAGE_KEY));
    if (Array.isArray(stored) && stored.every((item) => typeof item === "string")) return stored;
  } catch {}
  return [];
}

function loadIndex() {
  try {
    const storedIndex = Number.parseInt(localStorage.getItem(INDEX_STORAGE_KEY), 10);
    if (Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < words.length) return storedIndex;
  } catch {}
  return 0;
}

function loadTimerLimit() {
  try {
    const storedLimit = Number.parseInt(localStorage.getItem(TIMER_LIMIT_STORAGE_KEY), 10);
    if (storedLimit >= MIN_TIMER_LIMIT && storedLimit <= MAX_TIMER_LIMIT) return storedLimit;
  } catch {}
  return DEFAULT_TIMER_LIMIT;
}

function saveGame() {
  try {
    localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(words));
    localStorage.setItem(INDEX_STORAGE_KEY, String(currentIndex));
  } catch {}
}

function saveTimerLimit() {
  try {
    localStorage.setItem(TIMER_LIMIT_STORAGE_KEY, String(timerLimitSeconds));
  } catch {}
}

function renderGame() {
  const hasWords = words.length > 0;

  if (hasWords) {
    elements.word.textContent = words[currentIndex];
    elements.word.classList.remove("word--placeholder");
    elements.progress.textContent = `${currentIndex + 1} de ${words.length}`;
    elements.eyebrow.textContent = isHidden ? "Mímica oculta" : "Sua mímica é";
    elements.hiddenHint.hidden = !isHidden;
    document.title = `Mímica · ${currentIndex + 1} de ${words.length}`;
  } else {
    currentIndex = 0;
    isHidden = false;
    elements.word.textContent = "Adicione sua primeira mímica";
    elements.word.classList.add("word--placeholder");
    elements.progress.textContent = "0 de 0";
    elements.eyebrow.textContent = "Lista vazia";
    elements.hiddenHint.hidden = true;
    document.title = "Mímica · Lista vazia";
  }

  elements.stage.classList.toggle("is-hidden", isHidden);
  elements.hideButton.setAttribute("aria-pressed", String(isHidden));
  elements.hideLabel.textContent = isHidden ? "Mostrar" : "Ocultar";
  elements.previousButton.disabled = !hasWords;
  elements.nextButton.disabled = !hasWords;
  elements.hideButton.disabled = !hasWords;
  elements.timerPlay.disabled = !hasWords;
  elements.timerReset.disabled = !hasWords;
  elements.timerMinus.disabled = !hasWords;
  elements.timerPlus.disabled = !hasWords;
  elements.timerRange.disabled = !hasWords;
  renderTimer();
  saveGame();
}

function changeWord(direction) {
  if (!words.length) return;
  currentIndex = (currentIndex + direction + words.length) % words.length;
  isHidden = false;
  resetTimer(false);
  renderGame();
}

function toggleHidden() {
  if (!words.length) return;
  isHidden = !isHidden;
  renderGame();
}

function openEditor() {
  if (timerRunning) pauseTimer();
  renderList();
  elements.scrim.hidden = false;
  elements.editor.setAttribute("aria-hidden", "false");
  elements.openEditor.setAttribute("aria-expanded", "true");
  document.body.classList.add("editor-open");

  requestAnimationFrame(() => {
    elements.scrim.classList.add("is-open");
    elements.editor.classList.add("is-open");
    elements.closeEditor.focus();
  });
}

function closeEditor() {
  elements.scrim.classList.remove("is-open");
  elements.editor.classList.remove("is-open");
  elements.editor.setAttribute("aria-hidden", "true");
  elements.openEditor.setAttribute("aria-expanded", "false");
  document.body.classList.remove("editor-open");

  window.setTimeout(() => {
    elements.scrim.hidden = true;
  }, 260);

  elements.openEditor.focus();
}

function renderList() {
  const fragment = document.createDocumentFragment();

  if (!words.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-list";

    const emptyTitle = document.createElement("strong");
    emptyTitle.textContent = "Nenhuma mímica ainda";

    const emptyCopy = document.createElement("span");
    emptyCopy.textContent = "Adicione a primeira acima para começar.";

    emptyItem.append(emptyTitle, emptyCopy);
    fragment.append(emptyItem);
  }

  words.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "word-item";
    row.classList.toggle("is-current", index === currentIndex);
    row.dataset.index = String(index);

    const number = document.createElement("span");
    number.className = "item-number";
    number.textContent = String(index + 1);

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = item;

    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(
      createActionButton("↑", "up", `Mover ${item} para cima`, index === 0),
      createActionButton("↓", "down", `Mover ${item} para baixo`, index === words.length - 1),
      createActionButton("×", "delete", `Excluir ${item}`, false, true),
    );

    row.append(number, text, actions);
    fragment.append(row);
  });

  elements.wordList.replaceChildren(fragment);
  elements.itemCount.textContent = String(words.length);
  elements.clearButton.disabled = words.length === 0;

  requestAnimationFrame(() => {
    elements.wordList.querySelector(".is-current")?.scrollIntoView({ block: "nearest" });
  });
}

function createActionButton(label, action, ariaLabel, disabled, isDelete = false) {
  const button = document.createElement("button");
  button.className = `item-action${isDelete ? " item-action--delete" : ""}`;
  button.type = "button";
  button.dataset.action = action;
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  button.disabled = disabled;
  return button;
}

function addWord(event) {
  event.preventDefault();
  const newWord = elements.newWord.value.trim().replace(/\s+/g, " ");
  if (!newWord) return;

  const wasEmpty = words.length === 0;
  words.push(newWord);
  if (wasEmpty) {
    currentIndex = 0;
    isHidden = false;
    resetTimer(false);
  }

  elements.addForm.reset();
  renderGame();
  renderList();
  showToast("Mímica adicionada");
  elements.newWord.focus();
}

function handleListAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const row = button.closest(".word-item");
  const index = Number(row.dataset.index);
  const action = button.dataset.action;

  if (action === "delete") {
    const removedCurrent = index === currentIndex;
    words.splice(index, 1);

    if (index < currentIndex || currentIndex >= words.length) currentIndex -= 1;
    currentIndex = Math.max(0, currentIndex);
    if (removedCurrent || !words.length) {
      isHidden = false;
      resetTimer(false);
    }
    showToast("Mímica removida");
  } else {
    const targetIndex = action === "up" ? index - 1 : index + 1;
    [words[index], words[targetIndex]] = [words[targetIndex], words[index]];

    if (currentIndex === index) currentIndex = targetIndex;
    else if (currentIndex === targetIndex) currentIndex = index;
  }

  renderGame();
  renderList();
}

function clearWords() {
  if (!words.length || !window.confirm("Apagar todas as mímicas desta lista?")) return;
  words = [];
  currentIndex = 0;
  isHidden = false;
  resetTimer(false);
  renderGame();
  renderList();
  showToast("Lista apagada");
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderTimer() {
  const remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
  const hasWords = words.length > 0;
  const progress = timerLimitSeconds ? (remainingMilliseconds / (timerLimitSeconds * 1000)) * 100 : 0;

  elements.timerDisplay.textContent = formatTime(remainingSeconds);
  elements.timerDisplay.dateTime = `PT${remainingSeconds}S`;
  elements.timerRange.max = String(timerLimitSeconds);
  elements.timerRange.value = String(remainingSeconds);
  elements.timerRange.style.setProperty("--timer-progress", `${Math.max(0, Math.min(100, progress))}%`);
  elements.openTimerSettings.textContent = `Limite · ${formatTime(timerLimitSeconds)}`;
  elements.timerPlayIcon.textContent = timerRunning ? "Ⅱ" : "▶";
  elements.timerPlay.setAttribute("aria-label", timerRunning ? "Pausar timer" : "Iniciar timer");

  if (!hasWords) elements.timerStatus.textContent = "Sem mímicas";
  else if (timerRunning) elements.timerStatus.textContent = "Rodando";
  else if (remainingMilliseconds <= 0) elements.timerStatus.textContent = "Tempo esgotado";
  else if (!timerStarted && remainingSeconds === timerLimitSeconds) elements.timerStatus.textContent = "Pronto";
  else elements.timerStatus.textContent = "Pausado";

  elements.timer.classList.toggle("is-running", timerRunning);
  elements.timer.classList.toggle("is-finished", hasWords && remainingMilliseconds <= 0);
}

function toggleTimer() {
  if (!words.length) return;
  if (timerRunning) pauseTimer();
  else startTimer();
}

function startTimer() {
  if (!words.length) return;
  if (remainingMilliseconds <= 0) resetTimer(false);

  timerStarted = true;
  timerRunning = true;
  timerEndTime = Date.now() + remainingMilliseconds;
  window.clearInterval(timerInterval);
  timerInterval = window.setInterval(updateTimer, 200);
  renderTimer();
}

function pauseTimer() {
  if (!timerRunning) return;
  remainingMilliseconds = Math.max(0, timerEndTime - Date.now());
  timerRunning = false;
  window.clearInterval(timerInterval);
  renderTimer();
}

function updateTimer() {
  remainingMilliseconds = Math.max(0, timerEndTime - Date.now());
  if (remainingMilliseconds <= 0) {
    finishTimer();
    return;
  }
  renderTimer();
}

function finishTimer() {
  remainingMilliseconds = 0;
  timerRunning = false;
  timerStarted = true;
  window.clearInterval(timerInterval);
  renderTimer();
  navigator.vibrate?.([140, 90, 140]);
  showToast("Tempo esgotado");
}

function resetTimer(shouldRender = true) {
  window.clearInterval(timerInterval);
  timerRunning = false;
  timerStarted = false;
  remainingMilliseconds = timerLimitSeconds * 1000;
  if (shouldRender) renderTimer();
}

function adjustTimer(seconds) {
  if (!words.length) return;
  remainingMilliseconds = Math.max(0, Math.min(timerLimitSeconds * 1000, remainingMilliseconds + seconds * 1000));
  timerStarted = remainingMilliseconds !== timerLimitSeconds * 1000;
  if (timerRunning) timerEndTime = Date.now() + remainingMilliseconds;
  if (remainingMilliseconds <= 0) finishTimer();
  else renderTimer();
}

function moveTimer(event) {
  remainingMilliseconds = Number(event.target.value) * 1000;
  timerStarted = remainingMilliseconds !== timerLimitSeconds * 1000;
  if (timerRunning) timerEndTime = Date.now() + remainingMilliseconds;
  if (remainingMilliseconds <= 0) finishTimer();
  else renderTimer();
}

function openTimerSettings() {
  if (timerRunning) pauseTimer();
  elements.customLimit.value = String(timerLimitSeconds);
  updateTimerPresets();
  elements.timerSettings.showModal();
}

function closeTimerSettings() {
  elements.timerSettings.close();
}

function updateTimerPresets() {
  elements.timerPresets.querySelectorAll("button[data-limit]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.limit) === timerLimitSeconds));
  });
}

function setTimerLimit(seconds) {
  const parsedLimit = Math.round(Number(seconds));
  if (!Number.isFinite(parsedLimit) || parsedLimit < MIN_TIMER_LIMIT || parsedLimit > MAX_TIMER_LIMIT) {
    elements.customLimit.setCustomValidity(`Use um valor entre ${MIN_TIMER_LIMIT} e ${MAX_TIMER_LIMIT} segundos.`);
    elements.customLimit.reportValidity();
    return;
  }

  elements.customLimit.setCustomValidity("");
  timerLimitSeconds = parsedLimit;
  saveTimerLimit();
  resetTimer();
  updateTimerPresets();
  closeTimerSettings();
  showToast(`Limite definido em ${formatTime(timerLimitSeconds)}`);
}

function applyCustomLimit(event) {
  event.preventDefault();
  setTimerLimit(elements.customLimit.value);
}

function choosePreset(event) {
  const button = event.target.closest("button[data-limit]");
  if (button) setTimerLimit(button.dataset.limit);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

elements.previousButton.addEventListener("click", () => changeWord(-1));
elements.nextButton.addEventListener("click", () => changeWord(1));
elements.hideButton.addEventListener("click", toggleHidden);
elements.openEditor.addEventListener("click", openEditor);
elements.closeEditor.addEventListener("click", closeEditor);
elements.scrim.addEventListener("click", closeEditor);
elements.addForm.addEventListener("submit", addWord);
elements.wordList.addEventListener("click", handleListAction);
elements.clearButton.addEventListener("click", clearWords);
elements.timerPlay.addEventListener("click", toggleTimer);
elements.timerReset.addEventListener("click", () => resetTimer());
elements.timerMinus.addEventListener("click", () => adjustTimer(-10));
elements.timerPlus.addEventListener("click", () => adjustTimer(10));
elements.timerRange.addEventListener("input", moveTimer);
elements.openTimerSettings.addEventListener("click", openTimerSettings);
elements.closeTimerSettings.addEventListener("click", closeTimerSettings);
elements.timerPresets.addEventListener("click", choosePreset);
elements.customLimitForm.addEventListener("submit", applyCustomLimit);
elements.timerSettings.addEventListener("close", () => elements.openTimerSettings.focus());

document.addEventListener("keydown", (event) => {
  if (elements.timerSettings.open) return;

  if (event.key === "Escape" && elements.editor.classList.contains("is-open")) {
    closeEditor();
    return;
  }

  if (elements.editor.classList.contains("is-open") || event.target instanceof HTMLInputElement) return;
  if (event.key === "ArrowRight") changeWord(1);
  if (event.key === "ArrowLeft") changeWord(-1);
  if (event.key === " ") {
    event.preventDefault();
    toggleTimer();
  }
  if (event.key.toLowerCase() === "h") toggleHidden();
  if (event.key.toLowerCase() === "r") resetTimer();
});

renderGame();
