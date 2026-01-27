import { useState, useEffect } from "react";
export default function App() {
  const [form, setForm] = useState({
    title: "",
    duration: "",
    days: ""
  });

  // 🔹 Charger les tâches depuis le localStorage
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("taskPrioritizer_tasks");
    return saved ? JSON.parse(saved) : [];
  });

  // 🔹 Sauvegarder à chaque changement
  useEffect(() => {
    localStorage.setItem(
      "taskPrioritizer_tasks",
      JSON.stringify(tasks)
    );
  }, [tasks]);

  // 🔹 Rafraîchir l’UI toutes les heures
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(t => [...t]);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
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

  function deleteTask(id) {
    setTasks(prev => prev.filter(task => task.id !== id));
  }

  function getRemainingDays(task) {
    const elapsedMs = Date.now() - task.createdAt;
    const elapsedDays = Math.floor(
      elapsedMs / (1000 * 60 * 60 * 24)
    );
    return Math.max(task.days - elapsedDays, 0);
  }
  
  return (
  <div className="app">
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

        <button>Ajouter</button>
      </form>

      <ul className="task-list">
        {tasks.map(task => {
          const remainingDays = getRemainingDays(task);

          const urgency =
            remainingDays <= 1
              ? "urgent"
              : remainingDays <= 3
              ? "medium"
              : "low";

          return (
            <li key={task.id} className={`task ${urgency}`}>
              <div className="task-info">
                <strong>{task.title}</strong>
              <small>
              {task.duration} min •{" "}
               {remainingDays === 0
        ? "En retard"
        : `${remainingDays} jour(s)`}
    </small>
  </div>

  <button onClick={() => deleteTask(task.id)}>
    Supprimer
  </button>
</li>

          );
        })}
      </ul>
    </div>

  );
  
}
