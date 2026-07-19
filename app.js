const DEFAULT_WORDS = [
  "Emborcadura",
  "Anjo",
  "Barco",
  "Cortar cebola",
  "Mula",
  "Caminhonete",
  "Policial",
  "Detetive",
  "Agricultor",
  "Prancha",
  "Enforcamento",
  "Sexo",
  "Cocaína",
  "Chef de cozinha",
  "Milionário",
  "Peixeiro",
  "Cego",
  "Médico",
  "Abajur",
  "Estátua",
  "Paixão",
  "Escrever uma carta",
  "Carruagem",
  "Fantasma",
  "Chicote",
  "Pinguim",
  "Surfar",
  "Cortar lenha",
  "Tiro ao alvo",
  "Restaurante",
  "Lobisomem",
  "Navio encalhado",
  "Pedir comida para viagem",
  "Construir uma prancha",
  "Recepcionista",
];

const STORAGE_KEY = "mimica-words-v1";
const INDEX_KEY = "mimica-index-v1";

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
  resetButton: document.querySelector("#resetButton"),
  toast: document.querySelector("#toast"),
};

let words = loadWords();
let currentIndex = loadIndex();
let isHidden = false;
let toastTimer;

function loadWords() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored) && stored.length && stored.every((item) => typeof item === "string")) {
      return stored;
    }
  } catch {}

  return [...DEFAULT_WORDS];
}

function loadIndex() {
  const storedIndex = Number.parseInt(localStorage.getItem(INDEX_KEY), 10);
  if (Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < words.length) {
    return storedIndex;
  }
  return 0;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  localStorage.setItem(INDEX_KEY, String(currentIndex));
}

function renderGame() {
  elements.word.textContent = words[currentIndex];
  elements.progress.textContent = `${currentIndex + 1} de ${words.length}`;
  elements.eyebrow.textContent = isHidden ? "Mímica oculta" : "Sua mímica é";
  elements.hiddenHint.hidden = !isHidden;
  elements.stage.classList.toggle("is-hidden", isHidden);
  elements.hideButton.setAttribute("aria-pressed", String(isHidden));
  elements.hideLabel.textContent = isHidden ? "Mostrar" : "Ocultar";
  document.title = `Mímica · ${currentIndex + 1} de ${words.length}`;
  saveState();
}

function changeWord(direction) {
  currentIndex = (currentIndex + direction + words.length) % words.length;
  isHidden = false;
  renderGame();
}

function toggleHidden() {
  isHidden = !isHidden;
  renderGame();
}

function openEditor() {
  renderList();
  elements.scrim.hidden = false;
  elements.editor.setAttribute("aria-hidden", "false");
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
  document.body.classList.remove("editor-open");

  window.setTimeout(() => {
    elements.scrim.hidden = true;
  }, 260);

  elements.openEditor.focus();
}

function renderList() {
  const fragment = document.createDocumentFragment();

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
      createActionButton("×", "delete", `Excluir ${item}`, words.length === 1, true),
    );

    row.append(number, text, actions);
    fragment.append(row);
  });

  elements.wordList.replaceChildren(fragment);
  elements.itemCount.textContent = String(words.length);

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

  words.push(newWord);
  elements.addForm.reset();
  saveState();
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
    if (removedCurrent) isHidden = false;
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

function resetWords() {
  if (!window.confirm("Restaurar as 35 mímicas originais e apagar suas alterações?")) return;
  words = [...DEFAULT_WORDS];
  currentIndex = 0;
  isHidden = false;
  renderGame();
  renderList();
  showToast("Lista original restaurada");
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
elements.resetButton.addEventListener("click", resetWords);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.editor.classList.contains("is-open")) {
    closeEditor();
    return;
  }

  if (elements.editor.classList.contains("is-open") || event.target.matches("input")) return;
  if (event.key === "ArrowRight") changeWord(1);
  if (event.key === "ArrowLeft") changeWord(-1);
  if (event.key === " " || event.key.toLowerCase() === "h") {
    event.preventDefault();
    toggleHidden();
  }
});

renderGame();
