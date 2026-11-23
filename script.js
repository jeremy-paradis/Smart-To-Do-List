const calendar = document.getElementById("calendar");
const weekLabel = document.getElementById("weekLabel");
const saveStatus = document.getElementById("saveStatus");
const themeToggle = document.getElementById("themeToggle");

const START_HOUR = 8;
const END_HOUR = 23;
const HOUR_HEIGHT = 64;
const SNAP_MINUTES = 15;
const STORAGE_KEY = "weeklyPlannerTasks";
const CLEANUP_KEY = "lastPlannerCleanup";
const THEME_STORAGE_KEY = "weeklyPlannerTheme";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const colors = ["#C9D5FA", "#BDE1D8", "#DFC9EB", "#E9CBAA", "#E7C0CE", "#C3DCF0"];

let currentWeek = getMonday(new Date());
let tasks = loadTasks();
let interaction = null;

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function softenColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  return "#" + channels.map(channel =>
    Math.round(channel * 0.38 + 255 * 0.62).toString(16).padStart(2, "0")
  ).join("");
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeToggle.textContent = isDark ? "☀️ Mode clair" : "🌙 Mode sombre";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  document.querySelector('meta[name="theme-color"]').content = isDark ? "#171e2a" : "#f4f7fb";
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
}

function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(data)) return [];
    return data.filter(t =>
      t && typeof t.id === "string" &&
      typeof t.date === "string" &&
      Number.isFinite(t.start) && Number.isFinite(t.end) &&
      t.start >= START_HOUR * 60 && t.end <= END_HOUR * 60 && t.end > t.start
    );
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  saveStatus.textContent = "Toutes les modifications sont sauvegardées automatiquement.";
}

function cleanupOldTasks() {
  const now = new Date();
  if (now.getDay() !== 0 || now.getHours() < 8) return;

  const sunday = dateKey(now);
  if (localStorage.getItem(CLEANUP_KEY) === sunday) return;

  const nextMonday = dateKey(addDays(now, 1));
  tasks = tasks.filter(task => task.date >= nextMonday);
  saveTasks();
  localStorage.setItem(CLEANUP_KEY, sunday);
}

function renderCalendar() {
  calendar.innerHTML = "";

  const weekEnd = addDays(currentWeek, 6);
  weekLabel.textContent =
    `${currentWeek.toLocaleDateString("fr-FR")} – ${weekEnd.toLocaleDateString("fr-FR")}`;

  days.forEach((day, index) => {
    const date = addDays(currentWeek, index);
    const key = dateKey(date);

    const column = document.createElement("section");
    column.className = "day-column";
    if (key === dateKey(new Date())) column.classList.add("is-today");

    const header = document.createElement("div");
    header.className = "day-header";

    const name = document.createElement("div");
    name.className = "day-name";
    name.textContent = day;

    const dateText = document.createElement("div");
    dateText.className = "day-date";
    dateText.textContent = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

    header.append(name, dateText);

    const track = document.createElement("div");
    track.className = "day-track";
    track.dataset.date = key;

    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      const label = document.createElement("span");
      label.className = "hour-label";
      label.style.top = `${(hour - START_HOUR) * HOUR_HEIGHT + 4}px`;
      label.textContent = `${String(hour).padStart(2, "0")}:00`;
      track.appendChild(label);
    }

    tasks.filter(task => task.date === key).forEach(task => {
      track.appendChild(createTaskElement(task));
    });

    track.addEventListener("pointerdown", startDrawing);
    column.append(header, track);
    calendar.appendChild(column);
  });
}

function createTaskElement(task) {
  const element = document.createElement("div");
  element.className = "task";
  element.dataset.id = task.id;

  const top = ((task.start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = ((task.end - task.start) / 60) * HOUR_HEIGHT;
  element.style.top = `${top}px`;
  element.style.height = `${height}px`;
  element.style.background = softenColor(task.color || colors[0]);

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.title || "";
  title.setAttribute("aria-label", "Titre de la tâche");

  const time = document.createElement("span");
  time.className = "task-time";
  time.textContent = `${formatTime(task.start)} – ${formatTime(task.end)}`;

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-delete";
  deleteButton.type = "button";
  deleteButton.textContent = "×";
  deleteButton.title = "Supprimer la tâche";
  deleteButton.setAttribute("aria-label", "Supprimer la tâche");
  deleteButton.addEventListener("pointerdown", e => e.stopPropagation());
  deleteButton.addEventListener("click", e => {
    e.stopPropagation();
    tasks = tasks.filter(item => item.id !== task.id);
    saveTasks();
    renderCalendar();
  });

  const resizeHandle = document.createElement("div");
  resizeHandle.className = "task-resize";
  resizeHandle.title = "Tirer pour modifier la durée";

  element.append(title, time, deleteButton, resizeHandle);

  element.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (event.target === deleteButton || event.target === title) return;
    if (event.target === resizeHandle) startResizing(event, task);
    else startMoving(event, task, element);
  });

  title.addEventListener("dblclick", event => {
    event.stopPropagation();
    title.contentEditable = "true";
    title.focus();
    const range = document.createRange();
    range.selectNodeContents(title);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });

  title.addEventListener("keydown", event => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      title.blur();
    }
    if (event.key === "Escape") {
      title.textContent = task.title || "";
      title.blur();
    }
  });

  title.addEventListener("blur", () => {
    if (title.contentEditable !== "true") return;
    task.title = title.textContent.trim();
    title.contentEditable = "false";
    saveTasks();
    renderCalendar();
  });

  return element;
}

function snapMinutes(minutes) {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function getMinutesFromPointer(event, track) {
  const rect = track.getBoundingClientRect();
  const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
  const raw = START_HOUR * 60 + (y / HOUR_HEIGHT) * 60;
  return Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, snapMinutes(raw)));
}

function getTrackAtPointer(event) {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  return target?.closest(".day-track") || null;
}

function startDrawing(event) {
  if (event.button !== 0 || event.target.closest(".task")) return;

  const track = event.currentTarget;
  const start = getMinutesFromPointer(event, track);
  const preview = document.createElement("div");
  preview.className = "task-preview";
  track.appendChild(preview);
  track.classList.add("is-drawing");

  interaction = {
    type: "create",
    pointerId: event.pointerId,
    track,
    date: track.dataset.date,
    start,
    current: start,
    preview,
    moved: false
  };

  updatePreview();
  event.preventDefault();
}

function updatePreview() {
  if (!interaction || interaction.type !== "create") return;
  const start = Math.min(interaction.start, interaction.current);
  const end = Math.max(interaction.start, interaction.current);
  const finalEnd = Math.max(end, start + SNAP_MINUTES);

  interaction.preview.style.top =
    `${((start - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`;
  interaction.preview.style.height =
    `${((finalEnd - start) / 60) * HOUR_HEIGHT}px`;
}

function startMoving(event, task, element) {
  event.preventDefault();
  const track = element.closest(".day-track");
  const pointerMinutes = getMinutesFromPointer(event, track);

  interaction = {
    type: "move",
    pointerId: event.pointerId,
    task,
    element,
    duration: task.end - task.start,
    offset: pointerMinutes - task.start,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  };
}

function startResizing(event, task) {
  event.preventDefault();
  event.stopPropagation();
  interaction = {
    type: "resize",
    pointerId: event.pointerId,
    task,
    startY: event.clientY,
    originalEnd: task.end,
    moved: false
  };
}

window.addEventListener("pointermove", event => {
  if (!interaction || event.pointerId !== interaction.pointerId) return;

  const state = interaction;

  if (state.type === "create") {
    const minutes = getMinutesFromPointer(event, state.track);
    if (minutes !== state.current) state.moved = true;
    state.current = minutes;
    updatePreview();
    return;
  }

  if (state.type === "move") {
    if (Math.abs(event.clientX - state.startX) + Math.abs(event.clientY - state.startY) > 4) {
      state.moved = true;
    }
    if (!state.moved) return;

    const targetTrack = getTrackAtPointer(event);
    if (!targetTrack) return;

    const pointerMinutes = getMinutesFromPointer(event, targetTrack);
    let newStart = snapMinutes(pointerMinutes - state.offset);
    newStart = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - state.duration, newStart));

    state.task.date = targetTrack.dataset.date;
    state.task.start = newStart;
    state.task.end = newStart + state.duration;

    // Render live preview in the destination day.
    const oldElement = state.element;
    const destination = targetTrack;
    const top = ((newStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    oldElement.style.top = `${top}px`;
    oldElement.style.height = `${(state.duration / 60) * HOUR_HEIGHT}px`;

    if (oldElement.parentElement !== destination) {
      destination.appendChild(oldElement);
    }
    const time = oldElement.querySelector(".task-time");
    if (time) time.textContent = `${formatTime(state.task.start)} – ${formatTime(state.task.end)}`;
    return;
  }

  if (state.type === "resize") {
    const deltaPixels = event.clientY - state.startY;
    const deltaMinutes = snapMinutes((deltaPixels / HOUR_HEIGHT) * 60);
    const newEnd = Math.max(
      state.task.start + SNAP_MINUTES,
      Math.min(END_HOUR * 60, state.originalEnd + deltaMinutes)
    );
    state.task.end = newEnd;
    state.moved = true;

    const element = calendar.querySelector(`[data-id="${CSS.escape(state.task.id)}"]`);
    if (element) {
      element.style.height = `${((newEnd - state.task.start) / 60) * HOUR_HEIGHT}px`;
      const time = element.querySelector(".task-time");
      if (time) time.textContent = `${formatTime(state.task.start)} – ${formatTime(state.task.end)}`;
    }
  }
});

window.addEventListener("pointerup", event => {
  if (!interaction || event.pointerId !== interaction.pointerId) return;

  const state = interaction;
  interaction = null;

  if (state.type === "create") {
    state.preview.remove();
    state.track.classList.remove("is-drawing");

    const start = Math.min(state.start, state.current);
    const end = Math.max(state.start, state.current);
    const finalEnd = Math.max(end, start + SNAP_MINUTES);

    const task = {
      id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      title: "",
      date: state.date,
      start,
      end: Math.min(finalEnd, END_HOUR * 60),
      color: colors[Math.floor(Math.random() * colors.length)]
    };

    tasks.push(task);
    saveTasks();
    renderCalendar();

    // Put the cursor directly in the new task title.
    const title = calendar.querySelector(`[data-id="${CSS.escape(task.id)}"] .task-title`);
    if (title) {
      title.contentEditable = "true";
      title.focus();
    }
    return;
  }

  if (state.type === "move" || state.type === "resize") {
    state.element?.classList.remove("is-moving");
    saveTasks();
    renderCalendar();
  }
});

window.addEventListener("pointercancel", () => {
  if (!interaction) return;
  if (interaction.type === "create") {
    interaction.preview.remove();
    interaction.track.classList.remove("is-drawing");
  } else if (interaction.type === "move") {
    interaction.element.classList.remove("is-moving");
  }
  interaction = null;
  renderCalendar();
});

document.getElementById("prevWeek").addEventListener("click", () => {
  currentWeek = addDays(currentWeek, -7);
  renderCalendar();
});

document.getElementById("nextWeek").addEventListener("click", () => {
  currentWeek = addDays(currentWeek, 7);
  renderCalendar();
});

document.getElementById("today").addEventListener("click", () => {
  currentWeek = getMonday(new Date());
  renderCalendar();
});

themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

// Cleanup when the page opens, becomes visible, and periodically while open.
applyTheme(localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light");
cleanupOldTasks();
renderCalendar();

setInterval(() => {
  cleanupOldTasks();
}, 60 * 1000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    cleanupOldTasks();
    renderCalendar();
  }
});
