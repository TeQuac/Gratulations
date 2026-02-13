const STORAGE_KEY = "birthday-entries-v1";
const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const state = {
  viewMode: "month",
  cursorDate: new Date(),
  selectedDate: null,
  editId: null,
  entries: loadEntries(),
};

const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");
const weekdayRow = document.getElementById("weekdayRow");
const monthViewBtn = document.getElementById("monthViewBtn");
const weekViewBtn = document.getElementById("weekViewBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const dayModal = document.getElementById("dayModal");
const modalDateTitle = document.getElementById("modalDateTitle");
const entriesList = document.getElementById("entriesList");

const birthDateInput = document.getElementById("birthDate");
const personNameInput = document.getElementById("personName");
const relationshipInput = document.getElementById("relationship");
const bondStrengthInput = document.getElementById("bondStrength");
const descriptionInput = document.getElementById("description");
const communicationStyleInput = document.getElementById("communicationStyle");
const saveEntryBtn = document.getElementById("saveEntryBtn");
const clearFormBtn = document.getElementById("clearFormBtn");

const wishModal = document.getElementById("wishModal");
const wishText = document.getElementById("wishText");
const copyWishBtn = document.getElementById("copyWishBtn");

init();

function init() {
  weekdays.forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "weekday";
    cell.textContent = label;
    weekdayRow.append(cell);
  });

  monthViewBtn.addEventListener("click", () => setViewMode("month"));
  weekViewBtn.addEventListener("click", () => setViewMode("week"));
  prevBtn.addEventListener("click", () => moveCursor(-1));
  nextBtn.addEventListener("click", () => moveCursor(1));

  saveEntryBtn.addEventListener("click", saveEntry);
  clearFormBtn.addEventListener("click", resetForm);
  copyWishBtn.addEventListener("click", copyWish);

  attachSwipeNavigation();
  disableLongPressSelection();
  render();
}

function setViewMode(mode) {
  state.viewMode = mode;
  monthViewBtn.classList.toggle("active", mode === "month");
  weekViewBtn.classList.toggle("active", mode === "week");
  monthViewBtn.setAttribute("aria-selected", String(mode === "month"));
  weekViewBtn.setAttribute("aria-selected", String(mode === "week"));
  render();
}

function moveCursor(direction) {
  const d = new Date(state.cursorDate);
  if (state.viewMode === "month") {
    d.setMonth(d.getMonth() + direction);
  } else {
    d.setDate(d.getDate() + 7 * direction);
  }
  state.cursorDate = d;
  render();
}

function render() {
  const cells = state.viewMode === "month" ? monthCells(state.cursorDate) : weekCells(state.cursorDate);
  calendarGrid.innerHTML = "";
  const current = new Date();

  calendarTitle.textContent =
    state.viewMode === "month"
      ? state.cursorDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
      : weekTitle(cells[0].date, cells[cells.length - 1].date);

  cells.forEach(({ date, muted }) => {
    const iso = toISO(date);
    const dayEntries = entriesForDate(iso);
    const cell = document.createElement("button");
    cell.className = `day-cell ${muted ? "muted" : ""} ${sameDay(date, current) ? "today" : ""}`;
    cell.type = "button";

    const dayNum = document.createElement("div");
    dayNum.className = "day-number";
    dayNum.textContent = String(date.getDate());
    cell.append(dayNum);

    dayEntries.slice(0, 2).forEach((entry) => {
      const chip = document.createElement("div");
      chip.className = "birthday-chip";
      chip.textContent = `${entry.personName} • ${new Date(entry.birthDate).getFullYear()}`;
      cell.append(chip);
    });

    if (dayEntries.length > 2) {
      const more = document.createElement("div");
      more.className = "birthday-chip";
      more.textContent = `+${dayEntries.length - 2} weitere`;
      cell.append(more);
    }

    cell.addEventListener("click", () => openDayModal(iso));
    calendarGrid.append(cell);
  });
}

function monthCells(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const lead = (first.getDay() + 6) % 7;
  const trailing = 6 - ((last.getDay() + 6) % 7);
  const cells = [];

  for (let i = lead; i > 0; i--) {
    const d = new Date(first);
    d.setDate(first.getDate() - i);
    cells.push({ date: d, muted: true });
  }
  for (let i = 1; i <= last.getDate(); i++) {
    cells.push({ date: new Date(date.getFullYear(), date.getMonth(), i), muted: false });
  }
  for (let i = 1; i <= trailing; i++) {
    cells.push({ date: new Date(date.getFullYear(), date.getMonth() + 1, i), muted: true });
  }
  return cells;
}

function weekCells(date) {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, muted: false };
  });
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function weekTitle(start, end) {
  const startStr = start.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  const endStr = end.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function openDayModal(isoDate) {
  state.selectedDate = isoDate;
  resetForm();
  birthDateInput.value = isoDate;
  modalDateTitle.textContent = new Date(isoDate).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  renderEntriesList();
  dayModal.showModal();
}

function renderEntriesList() {
  entriesList.innerHTML = "";
  const items = entriesForDate(state.selectedDate);

  if (!items.length) {
    entriesList.textContent = "Noch keine Geburtstage für diesen Tag gespeichert.";
    return;
  }

  items.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "entry-item";
    card.innerHTML = `<strong>${entry.personName}</strong>
      <small>${entry.relationship} • ${entry.bondStrength}</small>
      <small>Stil: ${entry.communicationStyle}</small>
      <small>${entry.description}</small>`;

    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Bearbeiten";
    editBtn.addEventListener("click", () => populateForm(entry));

    const wishBtn = document.createElement("button");
    wishBtn.type = "button";
    wishBtn.textContent = "KI-Wunsch";
    wishBtn.addEventListener("click", () => openWishModal(entry));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Löschen";
    deleteBtn.addEventListener("click", () => deleteEntry(entry.id));

    actions.append(editBtn, wishBtn, deleteBtn);
    card.append(actions);
    entriesList.append(card);
  });
}

function populateForm(entry) {
  state.editId = entry.id;
  birthDateInput.value = entry.birthDate;
  personNameInput.value = entry.personName;
  relationshipInput.value = entry.relationship;
  bondStrengthInput.value = entry.bondStrength;
  descriptionInput.value = entry.description;
  communicationStyleInput.value = entry.communicationStyle;
}

function saveEntry() {
  if (!birthDateInput.value || !personNameInput.value || !relationshipInput.value || !descriptionInput.value) {
    return;
  }

  const payload = {
    id: state.editId ?? crypto.randomUUID(),
    birthDate: birthDateInput.value,
    personName: personNameInput.value.trim(),
    relationship: relationshipInput.value.trim(),
    bondStrength: bondStrengthInput.value,
    description: descriptionInput.value.trim(),
    communicationStyle: communicationStyleInput.value,
  };

  if (state.editId) {
    state.entries = state.entries.map((item) => (item.id === state.editId ? payload : item));
  } else {
    state.entries.push(payload);
  }

  persistEntries();
  state.selectedDate = payload.birthDate;
  resetForm();
  renderEntriesList();
  render();
}

function deleteEntry(id) {
  state.entries = state.entries.filter((entry) => entry.id !== id);
  persistEntries();
  renderEntriesList();
  render();
}

function openWishModal(entry) {
  const wish = generateWish(entry);
  wishText.textContent = wish;
  wishModal.showModal();
}

function generateWish(entry) {
  const toneMap = {
    "herzlich und emotional": `Mein lieber ${entry.personName}, ich wollte dir heute unbedingt schreiben`,
    "locker und humorvoll": `Hey ${entry.personName}, heute ist dein Ehrentag`,
    "respektvoll und formell": `Liebe/r ${entry.personName}, zu Ihrem heutigen Geburtstag gratuliere ich Ihnen herzlich`,
    "kurz und direkt": `${entry.personName}, alles Gute zum Geburtstag!`,
  };

  const closenessLine = {
    "sehr eng": "Du bist ein fester und wichtiger Teil meines Lebens.",
    eng: "Ich schätze unsere Nähe und unsere gemeinsamen Momente sehr.",
    mittel: "Unsere Verbindung bedeutet mir viel und ich freue mich über jeden Austausch.",
    locker: "Ich freue mich immer, von dir zu hören und wünsche dir nur das Beste.",
  };

  return `${toneMap[entry.communicationStyle] || `Alles Gute zum Geburtstag, ${entry.personName}!`}.
Als ${entry.relationship} erlebe ich dich als ${entry.description}.
${closenessLine[entry.bondStrength]}
Ich wünsche dir Gesundheit, Freude und ein neues Lebensjahr voller schöner Erlebnisse.
Liebe Grüße!`;
}

async function copyWish() {
  try {
    await navigator.clipboard.writeText(wishText.textContent || "");
    copyWishBtn.textContent = "Kopiert ✓";
    setTimeout(() => (copyWishBtn.textContent = "Text kopieren"), 1200);
  } catch {
    copyWishBtn.textContent = "Kopieren fehlgeschlagen";
  }
}

function resetForm() {
  state.editId = null;
  personNameInput.value = "";
  relationshipInput.value = "";
  descriptionInput.value = "";
  bondStrengthInput.value = "sehr eng";
  communicationStyleInput.value = "herzlich und emotional";
  birthDateInput.value = state.selectedDate || toISO(new Date());
}

function entriesForDate(isoDate) {
  return state.entries.filter((entry) => entry.birthDate === isoDate);
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function toISO(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function attachSwipeNavigation() {
  const shell = document.getElementById("appShell");
  let startX = 0;
  let active = false;

  shell.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
    active = true;
  });

  shell.addEventListener("touchend", (event) => {
    if (!active) return;
    const delta = event.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 45) {
      moveCursor(delta < 0 ? 1 : -1);
    }
    active = false;
  });
}

function disableLongPressSelection() {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("selectstart", (e) => e.preventDefault());
}
