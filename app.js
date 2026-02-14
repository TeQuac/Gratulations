const STORAGE_KEY = "birthday-entries-v1";
const NOTIFY_PREF_KEY = "birthday-notify-enabled-v1";
const LAST_NOTIFY_KEY = "birthday-last-notified-v1";
const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const state = {
  viewMode: "month",
  cursorDate: new Date(),
  selectedDate: null,
  editId: null,
  entries: loadEntries(),
  dailyWishPayloads: [],
  reminderTimer: null,
};

const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");
const weekdayRow = document.getElementById("weekdayRow");
const appShell = document.getElementById("appShell");
const monthViewBtn = document.getElementById("monthViewBtn");
const weekViewBtn = document.getElementById("weekViewBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const todayBirthdaysSection = document.getElementById("todayBirthdays");
const todayBirthdaysList = document.getElementById("todayBirthdaysList");

const dayModal = document.getElementById("dayModal");
const modalDateTitle = document.getElementById("modalDateTitle");
const entriesList = document.getElementById("entriesList");
const closeDayModalBtn = document.getElementById("closeDayModalBtn");

const birthDateInput = document.getElementById("birthDate");
const personNameInput = document.getElementById("personName");
const nicknameInput = document.getElementById("nickname");
const relationshipInput = document.getElementById("relationship");
const bondStrengthInput = document.getElementById("bondStrength");
const descriptionInput = document.getElementById("description");
const communicationStyleInput = document.getElementById("communicationStyle");
const emojiPreferenceInput = document.getElementById("emojiPreference");
const writerTypeInput = document.getElementById("writerType");
const saveEntryBtn = document.getElementById("saveEntryBtn");
const clearFormBtn = document.getElementById("clearFormBtn");

const wishModal = document.getElementById("wishModal");
const wishText = document.getElementById("wishText");
const copyWishBtn = document.getElementById("copyWishBtn");
const closeWishModalBtn = document.getElementById("closeWishModalBtn");

const notificationStatus = document.getElementById("notificationStatus");
const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");

const dailyWishModal = document.getElementById("dailyWishModal");
const closeDailyWishModalBtn = document.getElementById("closeDailyWishModalBtn");
const dailyWishList = document.getElementById("dailyWishList");

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
  closeDayModalBtn.addEventListener("click", () => dayModal.close());
  closeWishModalBtn.addEventListener("click", () => wishModal.close());
  closeDailyWishModalBtn.addEventListener("click", () => dailyWishModal.close());
  enableNotificationsBtn.addEventListener("click", enableBirthdayNotifications);

  attachSwipeNavigation();
  disableLongPressSelection();
  render();
  hydrateNotificationState();
}

function hydrateNotificationState() {
  updateNotificationStatus();
  if (isNotificationEnabled()) {
    scheduleReminderCheck();
    maybeSendDailyBirthdayNotifications();
  }
}

function setViewMode(mode) {
  state.viewMode = mode;
  monthViewBtn.classList.toggle("active", mode === "month");
  weekViewBtn.classList.toggle("active", mode === "week");
  monthViewBtn.setAttribute("aria-selected", String(mode === "month"));
  weekViewBtn.setAttribute("aria-selected", String(mode === "week"));
  appShell.classList.toggle("week-mode", mode === "week");
  document.body.classList.toggle("week-mode", mode === "week");
  weekdayRow.hidden = mode === "week";
  render();
}

function birthdaysForToday() {
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();

  return state.entries
    .filter((entry) => {
      const birthDate = new Date(entry.birthDate);
      return birthDate.getMonth() === month && birthDate.getDate() === day;
    })
    .map((entry) => ({
      ...entry,
      age: today.getFullYear() - new Date(entry.birthDate).getFullYear(),
    }));
}

function renderTodayBirthdays() {
  if (!todayBirthdaysSection || !todayBirthdaysList) return;

  if (state.viewMode !== "month") {
    todayBirthdaysSection.hidden = true;
    return;
  }

  todayBirthdaysSection.hidden = false;
  todayBirthdaysList.innerHTML = "";

  const todaysEntries = birthdaysForToday();
  if (!todaysEntries.length) {
    const item = document.createElement("li");
    item.textContent = "Heute hat niemand Geburtstag.";
    todayBirthdaysList.append(item);
    return;
  }

  todaysEntries
    .sort((a, b) => a.personName.localeCompare(b.personName, "de"))
    .forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = `${entry.personName} wird ${entry.age} Jahre`;
      todayBirthdaysList.append(item);
    });
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
    if (state.viewMode === "week") {
      dayNum.textContent = date.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      });
    } else {
      dayNum.textContent = String(date.getDate());
    }
    cell.append(dayNum);

    const entryLimit = state.viewMode === "week" ? 5 : 2;
    dayEntries.slice(0, entryLimit).forEach((entry) => {
      const chip = document.createElement("div");
      chip.className = "birthday-chip";
      chip.textContent = `${entry.personName} • ${new Date(entry.birthDate).getFullYear()}`;
      cell.append(chip);
    });

    if (dayEntries.length > entryLimit) {
      const more = document.createElement("div");
      more.className = "birthday-chip";
      more.textContent = `+${dayEntries.length - entryLimit} weitere`;
      cell.append(more);
    }

    cell.addEventListener("click", () => openDayModal(iso));
    calendarGrid.append(cell);
  });

  renderTodayBirthdays();
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
    const displayName = entry.nickname || entry.personName;
    const emojiInfo = entry.emojiPreference === "ja" ? "mit Smileys" : "ohne Smileys";
    const writerInfo = entry.writerType === "ja" ? "Vielschreiber" : "Kurzschreiber";
    card.innerHTML = `<strong>${entry.personName}</strong>
      <small>Anrede: ${displayName}</small>
      <small>${entry.relationship} • ${entry.bondStrength}</small>
      <small>Stil: ${entry.communicationStyle}</small>
      <small>${emojiInfo} • ${writerInfo}</small>
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
  nicknameInput.value = entry.nickname || "";
  relationshipInput.value = entry.relationship;
  bondStrengthInput.value = entry.bondStrength;
  descriptionInput.value = entry.description;
  communicationStyleInput.value = entry.communicationStyle;
  emojiPreferenceInput.value = entry.emojiPreference || "ja";
  writerTypeInput.value = entry.writerType || "ja";
}

function saveEntry() {
  if (!birthDateInput.value || !personNameInput.value || !relationshipInput.value || !descriptionInput.value) {
    return;
  }

  const payload = {
    id: state.editId ?? crypto.randomUUID(),
    birthDate: birthDateInput.value,
    personName: personNameInput.value.trim(),
    nickname: nicknameInput.value.trim(),
    relationship: relationshipInput.value.trim(),
    bondStrength: bondStrengthInput.value,
    description: descriptionInput.value.trim(),
    communicationStyle: communicationStyleInput.value,
    emojiPreference: emojiPreferenceInput.value,
    writerType: writerTypeInput.value,
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
  const salutationName = entry.nickname || entry.personName;
  const introMap = {
    "herzlich und emotional": `Mein lieber ${salutationName}, heute denke ich mit ganz viel Wärme an dich`,
    "locker und humorvoll": `Hey ${salutationName}, heute wird gefeiert – ganz klar dein Tag`,
    "respektvoll und formell": `Liebe/r ${salutationName}, zu Ihrem heutigen Geburtstag übermittle ich Ihnen meine besten Wünsche`,
    "kurz und direkt": `${salutationName}, alles Gute zum Geburtstag`,
  };

  const closenessLine = {
    "sehr eng": "Du bist ein fester und besonders wichtiger Teil meines Lebens.",
    eng: "Unsere Verbindung ist mir sehr wichtig und ich schätze sie jeden Tag.",
    mittel: "Unsere Verbindung bedeutet mir viel und ich freue mich über unsere Gespräche.",
    locker: "Ich denke gerne an unsere Begegnungen und wünsche dir nur das Beste.",
  };

  const signalWordHints = buildSignalHints(entry.description);
  const bodyLine =
    entry.writerType === "nein"
      ? "Hab einen großartigen Tag und lass dich feiern."
      : "Ich wünsche dir Gesundheit, Freude und ein neues Lebensjahr mit vielen schönen Momenten.";
  const emojiSuffix = entry.emojiPreference === "ja" ? " 🎉🥳" : "";

  return `${introMap[entry.communicationStyle] || `Alles Gute zum Geburtstag, ${salutationName}`}.\n${signalWordHints}\n${closenessLine[entry.bondStrength]}\n${bodyLine}\nLiebe Grüße${emojiSuffix}!`;
}

function buildSignalHints(description) {
  const text = (description || "").toLowerCase();
  const signalMap = [
    { keys: ["humor", "lustig", "lachen", "witz"], phrase: "Dein Humor bringt Leichtigkeit und gute Stimmung in jeden Moment." },
    { keys: ["kreativ", "idee", "kunst", "musik"], phrase: "Deine kreative Art und deine Ideen inspirieren mich immer wieder." },
    { keys: ["hilfsbereit", "zuverlässig", "ehrlich", "treu"], phrase: "Deine verlässliche und hilfsbereite Art ist etwas ganz Besonderes." },
    { keys: ["stark", "mutig", "kämpfer", "durchhalte"], phrase: "Deine Stärke und dein Mut beeindrucken mich sehr." },
    { keys: ["ruhig", "gelassen", "entspannt"], phrase: "Deine ruhige Art tut unglaublich gut und gibt Sicherheit." },
    { keys: ["herzlich", "warm", "lieb", "empath"], phrase: "Deine herzliche Ausstrahlung macht Begegnungen mit dir besonders wertvoll." },
  ];

  const matched = signalMap.filter((item) => item.keys.some((key) => text.includes(key))).map((item) => item.phrase);

  if (!matched.length) {
    return "Ich schätze an dir besonders deine Art, wie du mit Menschen umgehst und positive Impulse setzt.";
  }

  return matched.slice(0, 2).join(" ");
}

async function copyWish() {
  await copyTextWithFeedback(copyWishBtn, wishText.textContent || "");
}

function resetForm() {
  state.editId = null;
  personNameInput.value = "";
  nicknameInput.value = "";
  relationshipInput.value = "";
  descriptionInput.value = "";
  bondStrengthInput.value = "sehr eng";
  communicationStyleInput.value = "herzlich und emotional";
  emojiPreferenceInput.value = "ja";
  writerTypeInput.value = "ja";
  birthDateInput.value = state.selectedDate || toISO(new Date());
}

function entriesForDate(isoDate) {
  const selectedMonthDay = monthDayKey(isoDate);
  return state.entries.filter((entry) => monthDayKey(entry.birthDate) === selectedMonthDay);
}

function monthDayKey(isoDate) {
  const [, month, day] = isoDate.split("-");
  return `${month}-${day}`;
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

async function enableBirthdayNotifications() {
  if (!("Notification" in window)) {
    notificationStatus.textContent = "Dieser Browser unterstützt keine Push-Benachrichtigungen.";
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    notificationStatus.textContent = "Benachrichtigungen wurden nicht freigegeben.";
    return;
  }

  localStorage.setItem(NOTIFY_PREF_KEY, "enabled");
  updateNotificationStatus();
  maybeSendDailyBirthdayNotifications();
  scheduleReminderCheck();
}

function isNotificationEnabled() {
  return localStorage.getItem(NOTIFY_PREF_KEY) === "enabled" && Notification.permission === "granted";
}

function updateNotificationStatus() {
  if (!("Notification" in window)) {
    notificationStatus.textContent = "Dieser Browser unterstützt keine System-Benachrichtigungen.";
    enableNotificationsBtn.disabled = true;
    return;
  }

  enableNotificationsBtn.disabled = Notification.permission === "granted" && isNotificationEnabled();
  if (isNotificationEnabled()) {
    notificationStatus.textContent =
      "Aktiv: Geburtstags-Erinnerungen werden täglich um 07:00 UTC ausgelöst (solange die App geöffnet oder als aktive PWA im Hintergrund läuft).";
  } else {
    notificationStatus.textContent = "Benachrichtigungen für Geburtstage sind deaktiviert.";
  }
}

function scheduleReminderCheck() {
  if (!isNotificationEnabled()) return;

  if (state.reminderTimer) {
    clearTimeout(state.reminderTimer);
  }

  const now = new Date();
  const nextTrigger = new Date(now);
  nextTrigger.setUTCHours(7, 0, 0, 0);
  if (now >= nextTrigger) {
    nextTrigger.setUTCDate(nextTrigger.getUTCDate() + 1);
  }

  const delay = Math.max(nextTrigger.getTime() - now.getTime(), 500);
  state.reminderTimer = setTimeout(() => {
    maybeSendDailyBirthdayNotifications();
    scheduleReminderCheck();
  }, delay);
}

function maybeSendDailyBirthdayNotifications() {
  if (!isNotificationEnabled()) return;

  const now = new Date();
  const alreadySentToday = localStorage.getItem(LAST_NOTIFY_KEY) === currentUtcDateKey(now);
  const afterTrigger = now.getUTCHours() > 7 || (now.getUTCHours() === 7 && now.getUTCMinutes() >= 0);
  if (alreadySentToday || !afterTrigger) return;

  const todaysEntries = entriesForTodayUTC(now);
  if (!todaysEntries.length) {
    localStorage.setItem(LAST_NOTIFY_KEY, currentUtcDateKey(now));
    return;
  }

  state.dailyWishPayloads = todaysEntries.map((entry) => ({ entry, wish: generateWish(entry) }));
  showDailyNotifications(state.dailyWishPayloads);
  renderDailyWishList();
  dailyWishModal.showModal();
  localStorage.setItem(LAST_NOTIFY_KEY, currentUtcDateKey(now));
}

function entriesForTodayUTC(now) {
  const utcMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
  const utcDay = String(now.getUTCDate()).padStart(2, "0");

  return state.entries.filter((entry) => {
    const [, month, day] = entry.birthDate.split("-");
    return month === utcMonth && day === utcDay;
  });
}

function currentUtcDateKey(now) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function showDailyNotifications(payloads) {
  payloads.forEach(({ entry, wish }) => {
    const shortWish = wish.replace(/\s+/g, " ").slice(0, 120);
    const notice = new Notification(`🎂 ${entry.personName} hat heute Geburtstag`, {
      body: `${shortWish}${wish.length > 120 ? "…" : ""}`,
      tag: `birthday-${entry.id}-${currentUtcDateKey(new Date())}`,
      renotify: false,
    });

    notice.onclick = () => {
      window.focus();
      renderDailyWishList();
      dailyWishModal.showModal();
    };
  });
}

function renderDailyWishList() {
  dailyWishList.innerHTML = "";

  state.dailyWishPayloads.forEach(({ entry, wish }) => {
    const card = document.createElement("article");
    card.className = "entry-item";
    card.innerHTML = `<strong>${entry.personName}</strong><small>${wish.replace(/\n/g, "<br> ")}</small>`;

    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Text kopieren";
    copyBtn.addEventListener("click", () => copyTextWithFeedback(copyBtn, wish));

    actions.append(copyBtn);
    card.append(actions);
    dailyWishList.append(card);
  });
}

async function copyTextWithFeedback(button, text) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Kopiert ✓";
    setTimeout(() => (button.textContent = "Text kopieren"), 1200);
  } catch {
    button.textContent = "Kopieren fehlgeschlagen";
  }
}
