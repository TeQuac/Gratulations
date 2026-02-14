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
const salutationInput = document.getElementById("salutation");
const genderInput = document.getElementById("gender");
const bondStrengthInput = document.getElementById("bondStrength");
const descriptionInput = document.getElementById("description");
const communicationStyleInput = document.getElementById("communicationStyle");
const emojiPreferenceInput = document.getElementById("emojiPreference");
const writerTypeInput = document.getElementById("writerType");
const emailInput = document.getElementById("email");
const whatsappInput = document.getElementById("whatsapp");
const saveEntryBtn = document.getElementById("saveEntryBtn");
const clearFormBtn = document.getElementById("clearFormBtn");

const wishModal = document.getElementById("wishModal");
const wishText = document.getElementById("wishText");
const copyWishBtn = document.getElementById("copyWishBtn");
const sendMailBtn = document.getElementById("sendMailBtn");
const sendWhatsAppBtn = document.getElementById("sendWhatsAppBtn");
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
  sendMailBtn.addEventListener("click", sendWishByEmail);
  sendWhatsAppBtn.addEventListener("click", sendWishByWhatsApp);
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
    card.innerHTML = `<strong>${entry.personName}</strong>`;

    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Bearbeiten";
    editBtn.addEventListener("click", () => populateForm(entry));

    const wishBtn = document.createElement("button");
    wishBtn.type = "button";
    wishBtn.textContent = "Gratulieren!";
    wishBtn.className = "copy-style-btn";
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
  salutationInput.value = entry.salutation || "Herr";
  genderInput.value = entry.gender || "divers";
  bondStrengthInput.value = entry.bondStrength;
  descriptionInput.value = entry.description;
  communicationStyleInput.value = entry.communicationStyle;
  emojiPreferenceInput.value = entry.emojiPreference || "ja";
  writerTypeInput.value = entry.writerType || "ja";
  emailInput.value = entry.email || "";
  whatsappInput.value = entry.whatsapp || "";
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
    relationship: relationshipInput.value,
    salutation: salutationInput.value,
    gender: genderInput.value,
    bondStrength: bondStrengthInput.value,
    description: descriptionInput.value.trim(),
    communicationStyle: communicationStyleInput.value,
    emojiPreference: emojiPreferenceInput.value,
    writerType: writerTypeInput.value,
    email: emailInput.value.trim(),
    whatsapp: whatsappInput.value.trim(),
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
  state.currentWishEntry = entry;
  wishText.textContent = wish;
  updateDirectSendButtons(entry);
  wishModal.showModal();
}

function generateWish(entry) {
  const salutationName = entry.nickname || entry.personName;
  const hasFormalSalutation = entry.salutation === "Herr" || entry.salutation === "Frau";
  const isFormal = hasFormalSalutation || entry.communicationStyle === "respektvoll und formell";
  const isShortWriter = entry.writerType === "nein";
  const descriptionSignals = analyzeDescriptionSignals(entry.description);
  const variationSeed = `${entry.id}-${entry.birthDate}-${currentLocalDateKey(new Date())}`;

  const personGender = entry.gender || "divers";
  const formalAddressee = `${entry.salutation || ""} ${entry.personName}`.trim();
  const heartfeltAddressMap = {
    "männlich": `Lieber ${salutationName}`,
    "weiblich": `Liebe ${salutationName}`,
    divers: `Hallo ${salutationName}`,
  };

  const introMap = {
    "herzlich und emotional": [
      `${heartfeltAddressMap[personGender] || heartfeltAddressMap.divers}, heute ist ein besonderer Tag für dich`,
      `${heartfeltAddressMap[personGender] || heartfeltAddressMap.divers}, heute denke ich mit großer Freude an dich`,
    ],
    "locker und humorvoll": [
      `Hey ${salutationName}, heute gehört die Bühne ganz dir`,
      `Hi ${salutationName}, heute wird gefeiert – und zwar ordentlich`,
    ],
    "respektvoll und formell": [
      `${formalAddressee || salutationName}, zu Ihrem Geburtstag übermittle ich Ihnen meine herzlichen Glückwünsche`,
      `${formalAddressee || salutationName}, zu Ihrem heutigen Geburtstag wünsche ich Ihnen von Herzen alles Gute`,
    ],
    "kurz und direkt": [`${salutationName}, alles Gute zum Geburtstag`, `Happy Birthday, ${salutationName}`],
  };

  const coreWishMap = {
    informal: [
      "Ich wünsche dir Gesundheit, Freude und viele schöne Momente im neuen Lebensjahr.",
      "Für dein neues Lebensjahr wünsche ich dir Glück, Energie und ganz viel Grund zum Lächeln.",
    ],
    formal: [
      "Ich wünsche Ihnen Gesundheit, Freude und ein erfülltes neues Lebensjahr.",
      "Für Ihr neues Lebensjahr wünsche ich Ihnen Glück, Erfolg und viele schöne Augenblicke.",
    ],
  };

  const relationshipLineMap = {
    informal: {
      Mutter: ["Danke, dass du immer für mich da bist."],
      Vater: ["Danke für deinen Rat und deinen Rückhalt."],
      Tochter: ["Ich bin stolz auf dich und freue mich, dich auf deinem Weg zu begleiten."],
      Sohn: ["Es ist schön zu sehen, wie du deinen Weg gehst."],
      Schwester: ["Es ist schön, dich als Schwester an meiner Seite zu haben."],
      Bruder: ["Es ist schön, dich als Bruder an meiner Seite zu haben."],
      Oma: ["Deine warmherzige Art macht jeden Moment besonders."],
      Opa: ["Deine Lebenserfahrung und Ruhe bedeuten mir viel."],
      Tante: ["Du bringst immer gute Stimmung mit."],
      Onkel: ["Deine Art macht gemeinsame Zeit besonders angenehm."],
      Cousine: ["Mit dir fühlt sich Familie immer vertraut und leicht an."],
      Cousin: ["Mit dir fühlt sich Familie immer vertraut und leicht an."],
      Enkelin: ["Dein Lachen macht jeden Tag heller."],
      Enkel: ["Mit dir wird es nie langweilig."],
      "Entfernter Verwandter": ["Ich freue mich immer über unsere Begegnungen."],
      "Guter Freund": ["Unsere Freundschaft ist mir sehr wichtig."],
      "Sehr guter Freund": ["Auf unsere Freundschaft kann ich mich immer verlassen."],
      "Bester Freund": ["Es ist großartig, dich als besten Freund zu haben."],
      "Entfernter Bekannter": ["Ich wünsche dir von Herzen nur das Beste."],
      "Guter Bekannter": ["Ich freue mich immer, von dir zu hören."],
      Arbeitskollege: ["Die Zusammenarbeit mit dir macht viel Freude."],
      Chef: ["Danke für dein Vertrauen und die gute Zusammenarbeit."],
      Sportsfreund: ["Gemeinsame sportliche Momente mit dir sind immer ein Highlight."],
      Nachbar: ["Es ist schön, dich in der Nachbarschaft zu haben."],
      Vereinskollege: ["Unsere gemeinsame Zeit im Verein macht immer Spaß."],
    },
    formal: {
      Mutter: ["Ich danke Ihnen für Ihre Fürsorge und Unterstützung."],
      Vater: ["Ich danke Ihnen für Ihren Rat und Ihre Unterstützung."],
      Tochter: ["Ich wünsche Ihnen auf Ihrem Weg weiterhin viel Freude und Erfolg."],
      Sohn: ["Ich wünsche Ihnen für Ihren Weg weiterhin alles Gute."],
      Schwester: ["Ich schätze unseren familiären Zusammenhalt sehr."],
      Bruder: ["Ich schätze unseren familiären Zusammenhalt sehr."],
      Oma: ["Ihre warmherzige Art ist etwas ganz Besonderes."],
      Opa: ["Ihre Erfahrung und ruhige Art schätze ich sehr."],
      Tante: ["Ich wünsche Ihnen weiterhin viele schöne Momente."],
      Onkel: ["Ich wünsche Ihnen weiterhin viele schöne Momente."],
      Cousine: ["Ich freue mich über unseren wertschätzenden Kontakt."],
      Cousin: ["Ich freue mich über unseren wertschätzenden Kontakt."],
      Enkelin: ["Ich wünsche Ihnen einen wundervollen Geburtstag."],
      Enkel: ["Ich wünsche Ihnen einen wundervollen Geburtstag."],
      "Entfernter Verwandter": ["Ich freue mich über unseren Kontakt und wünsche Ihnen alles Gute."],
      "Guter Freund": ["Unsere Verbundenheit ist mir wichtig."],
      "Sehr guter Freund": ["Unsere langjährige Verbundenheit bedeutet mir viel."],
      "Bester Freund": ["Ihre Freundschaft bedeutet mir sehr viel."],
      "Entfernter Bekannter": ["Ich wünsche Ihnen für das neue Lebensjahr nur das Beste."],
      "Guter Bekannter": ["Ich schätze den angenehmen Austausch mit Ihnen."],
      Arbeitskollege: ["Ich schätze die Zusammenarbeit mit Ihnen sehr."],
      Chef: ["Vielen Dank für Ihr Vertrauen und die wertschätzende Zusammenarbeit."],
      Sportsfreund: ["Ich schätze die gemeinsamen sportlichen Aktivitäten mit Ihnen."],
      Nachbar: ["Ich wünsche Ihnen als geschätztem Nachbarn alles Gute."],
      Vereinskollege: ["Ich freue mich auf viele weitere gemeinsame Vereinsmomente."],
    },
  };

  const closenessLine = {
    informal: {
      "sehr eng": ["Du bist ein besonders wichtiger Mensch in meinem Leben."],
      eng: ["Unsere Verbindung bedeutet mir sehr viel."],
      mittel: ["Ich schätze unsere Gespräche und die gemeinsame Zeit sehr."],
      locker: ["Ich denke gerne an unsere Begegnungen zurück."],
    },
    formal: {
      "sehr eng": ["Unsere enge Verbindung bedeutet mir sehr viel."],
      eng: ["Unsere Verbindung schätze ich sehr."],
      mittel: ["Ich schätze den Austausch mit Ihnen sehr."],
      locker: ["Ich wünsche Ihnen weiterhin alles Gute."],
    },
  };

  const introLine = isFormal
    ? pickVariant(introMap["respektvoll und formell"], `${variationSeed}-intro-formal`)
    : pickVariant(introMap[entry.communicationStyle] || introMap["kurz und direkt"], `${variationSeed}-intro`);
  const coreLine = pickVariant(
    isFormal ? coreWishMap.formal : coreWishMap.informal,
    `${variationSeed}-core-${descriptionSignals.vibe}`,
  );
  const closenessRelationshipLine = pickVariant(
    (isFormal ? closenessLine.formal : closenessLine.informal)[entry.bondStrength] ||
      (isFormal ? closenessLine.formal : closenessLine.informal).mittel,
    `${variationSeed}-bond`,
  );
  const relationshipSpecificLine = pickVariant(
    (isFormal ? relationshipLineMap.formal : relationshipLineMap.informal)[entry.relationship] || [],
    `${variationSeed}-relationship`,
  );
  const relationshipLine = relationshipSpecificLine || closenessRelationshipLine;
  const styleAccent = buildStyleAccent({ isFormal, isShortWriter, descriptionSignals, variationSeed });
  const shortLine = isFormal ? "Genießen Sie Ihren besonderen Tag." : "Genieß deinen Tag in vollen Zügen.";
  const emojiSuffix = entry.emojiPreference === "ja" ? " 🎉🥳" : "";

  return `${introMap[entry.communicationStyle] || `Alles Gute zum Geburtstag, ${salutationName}`}.\n${signalWordHints}\n${closenessLine[entry.bondStrength]}\n${bodyLine}\nLiebe Grüße${emojiSuffix}!`;
}

function analyzeDescriptionSignals(description) {
  const text = (description || "").toLowerCase();
  const signalMap = [
    { keys: ["humor", "lustig", "lachen", "witz"], trait: "humorvoll", vibe: "locker" },
    { keys: ["kreativ", "idee", "kunst", "musik"], trait: "kreativ", vibe: "lebendig" },
    { keys: ["hilfsbereit", "zuverlässig", "ehrlich", "treu"], trait: "verlässlich", vibe: "warm" },
    { keys: ["stark", "mutig", "kämpfer", "durchhalte"], trait: "stark", vibe: "wertschätzend" },
    { keys: ["ruhig", "gelassen", "entspannt"], trait: "ruhig", vibe: "ruhig" },
    { keys: ["herzlich", "warm", "lieb", "empath"], trait: "herzlich", vibe: "nah" },
  ];

  const matches = signalMap.filter((item) => item.keys.some((key) => text.includes(key)));
  const traits = matches.map((item) => item.trait);
  const vibe = matches[0]?.vibe || "neutral";

  return { traits, vibe };
}

function buildStyleAccent({ isFormal, isShortWriter, descriptionSignals, variationSeed }) {
  if (isShortWriter || !descriptionSignals.traits.length) {
    return "";
  }

  const accentMap = {
    humorvoll: {
      informal: ["Mit dir wird es einfach nie langweilig."],
      formal: ["Ihr Humor sorgt stets für eine angenehme Atmosphäre."],
    },
    kreativ: {
      informal: ["Deine Ideen bringen immer frischen Wind hinein."],
      formal: ["Ihre Kreativität beeindruckt mich immer wieder."],
    },
    verlässlich: {
      informal: ["Auf dich ist immer Verlass, und das ist etwas Besonderes."],
      formal: ["Ihre verlässliche Art schätze ich sehr."],
    },
    stark: {
      informal: ["Deine Stärke motiviert mich immer wieder."],
      formal: ["Ihre Stärke verdient großen Respekt."],
    },
    ruhig: {
      informal: ["Deine ruhige Art tut richtig gut."],
      formal: ["Ihre ruhige Art wirkt sehr wohltuend."],
    },
    herzlich: {
      informal: ["Deine herzliche Art macht jeden Moment schöner."],
      formal: ["Ihre herzliche Art macht den Austausch besonders angenehm."],
    },
  };

  const trait = descriptionSignals.traits[0];
  const options = accentMap[trait]?.[isFormal ? "formal" : "informal"] || [];
  return pickVariant(options, `${variationSeed}-accent-${trait}`);
}

async function copyWish() {
  await copyTextWithFeedback(copyWishBtn, wishText.textContent || "");
}

function resetForm() {
  state.editId = null;
  personNameInput.value = "";
  nicknameInput.value = "";
  relationshipInput.value = "Mutter";
  salutationInput.value = "Herr";
  genderInput.value = "divers";
  descriptionInput.value = "";
  bondStrengthInput.value = "sehr eng";
  communicationStyleInput.value = "herzlich und emotional";
  emojiPreferenceInput.value = "ja";
  writerTypeInput.value = "ja";
  emailInput.value = "";
  whatsappInput.value = "";
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
  let startY = 0;
  let active = false;

  shell.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    active = true;
  });

  shell.addEventListener("touchend", (event) => {
    if (!active) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    active = false;

    const isHorizontalSwipe = Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3;
    if (!isHorizontalSwipe) return;

    moveCursor(deltaX < 0 ? 1 : -1);
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
      dailyWishModal.close();
      openWishModal(entry);
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
