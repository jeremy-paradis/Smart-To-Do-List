import { useState, useEffect, useRef } from "react";

export default function App() {
  const [form, setForm] = useState({
    title: "",
    duration: "",
    days: ""
  });

  const [checkForm, setCheckForm] = useState({ title: "" });

  const [timerMinutes, setTimerMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const alarmAudioRef = useRef(null);

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("taskPrioritizer_tasks");
    return saved ? JSON.parse(saved) : [];
  });

  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem("taskPrioritizer_checklist");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("taskPrioritizer_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("taskPrioritizer_checklist", JSON.stringify(checklist));
  }, [checklist]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(t => [...t]);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isRunning && !isAlarmActive) {
      const minutes = Number(timerMinutes) || 0;
      setRemainingSeconds(minutes * 60);
    }
  }, [timerMinutes, isRunning, isAlarmActive]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsAlarmActive(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isAlarmActive) {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }
      return;
    }

    if (!alarmAudioRef.current) {
      alarmAudioRef.current = new Audio("/son.mp3");
      alarmAudioRef.current.loop = true;
    }

    alarmAudioRef.current.play().catch(() => {});

    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }
    };
  }, [isAlarmActive]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleChecklistChange(e) {
    setCheckForm({ ...checkForm, [e.target.name]: e.target.value });
  }

  function handleTimerChange(e) {
    const value = Number(e.target.value);
    setTimerMinutes(Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
  }

  function startTimer() {
    const minutes = Number(timerMinutes);
    if (!minutes || minutes <= 0) return;

    setRemainingSeconds(minutes * 60);
    setIsAlarmActive(false);
    setIsRunning(true);
  }

  function pauseTimer() {
    setIsRunning(false);
    setIsAlarmActive(false);

    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
  }

  function resetTimer() {
    const minutes = Number(timerMinutes) || 0;
    setIsRunning(false);
    setIsAlarmActive(false);
    setRemainingSeconds(minutes * 60);

    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function addTask(e) {
    e.preventDefault();

    const duration = Number(form.duration);
    const days = Number(form.days);

    const priority = days * 1440 * 0.7 + duration * 0.3;

    const newTask = {
      id: Date.now(),
      title: form.title,
      duration,
      days,
      createdAt: Date.now(),
      priority
    };

    setTasks(prev =>
      [...prev, newTask].sort((a, b) => a.priority - b.priority)
    );

    setForm({ title: "", duration: "", days: "" });
  }

  function addChecklistTask(e) {
    e.preventDefault();

    const title = checkForm.title.trim();
    if (!title) return;

    setChecklist(prev => [...prev, { id: Date.now(), title, completed: false }]);
    setCheckForm({ title: "" });
  }

  function toggleChecklistTask(id) {
    setChecklist(prev =>
      prev.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(task => task.id !== id));
  }

  function deleteChecklistTask(id) {
    setChecklist(prev => prev.filter(task => task.id !== id));
  }

  function getRemainingDays(task) {
    const elapsedMs = Date.now() - task.createdAt;
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    return Math.max(task.days - elapsedDays, 0);
  }

  return (
    <div className="app-shell">
      <aside className="timer-panel">
        <h2>Minuteur</h2>

        <label htmlFor="timerMinutes" className="timer-label">
          Temps en minutes
        </label>
        <input
          id="timerMinutes"
          type="number"
          min="1"
          value={timerMinutes}
          onChange={handleTimerChange}
          className="timer-input"
        />

        <div className="timer-display">{formatTime(remainingSeconds)}</div>

        <div className="timer-actions">
          {!isRunning && !isAlarmActive && (
            <button type="button" onClick={startTimer}>
              Démarrer
            </button>
          )}

          {(isRunning || isAlarmActive) && (
            <button type="button" className="pause-btn" onClick={pauseTimer}>
              Pause
            </button>
          )}

          <button type="button" className="secondary-btn" onClick={resetTimer}>
            Réinitialiser
          </button>
        </div>

        {!isRunning && !isAlarmActive && <p className="timer-status">Prêt à démarrer</p>}
        {isRunning && <p className="timer-status active">En cours...</p>}
        {isAlarmActive && <p className="timer-status alarm">Sonnerie en cours — clique sur Pause</p>}
      </aside>

      <main className="main-layout">
        <section className="app original-panel">
          <h1>Smart To Do List</h1>
          <h4>by Jérémy Paradis</h4>

          <form className="task-form" onSubmit={addTask}>
            <input
              name="title"
              placeholder="Nom de la tâche"
              value={form.title}
              onChange={handleChange}
              required
            />

            <input
              type="number"
              name="duration"
              placeholder="Durée (min)"
              value={form.duration}
              onChange={handleChange}
              min="1"
              required
            />

            <input
              type="number"
              name="days"
              placeholder="Deadline (jours)"
              value={form.days}
              onChange={handleChange}
              min="0"
              required
            />

            <button type="submit">Ajouter</button>
          </form>

          <ul className="task-list">
            {tasks.map(task => {
              const remainingDays = getRemainingDays(task);
              const urgency =
                remainingDays <= 1 ? "urgent" : remainingDays <= 3 ? "medium" : "low";

              return (
                <li key={task.id} className={`task ${urgency}`}>
                  <div className="task-info">
                    <strong>{task.title}</strong>
                    <small>
                      {task.duration} min • {" "}
                      {remainingDays === 0 ? "En retard" : `${remainingDays} jour(s)`}
                    </small>
                  </div>

                  <button type="button" onClick={() => deleteTask(task.id)}>
                    Supprimer
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="checklist-panel">
          <h2>Checklist</h2>

          <form className="check-form" onSubmit={addChecklistTask}>
            <input
              name="title"
              placeholder="Nom de la tâche"
              value={checkForm.title}
              onChange={handleChecklistChange}
              required
            />

            <button type="submit">Ajouter</button>
          </form>

          <ul className="checklist-list">
            {checklist.length === 0 ? (
              <li className="empty-state">Aucune tâche</li>
            ) : (
              checklist.map(task => (
                <li key={task.id} className={`check-item ${task.completed ? "done" : ""}`}>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleChecklistTask(task.id)}
                    />
                    <span>{task.title}</span>
                  </label>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => deleteChecklistTask(task.id)}
                  >
                    Supprimer
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>
      </main>
    </div>
  );
}
