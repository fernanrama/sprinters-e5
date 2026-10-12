import { useEffect, useState } from "react";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  imageUrl: string;
  instructions: string;
};

type RoutineItem = {
  exerciseId: string;
  series: number;
  reps: number;
};

type Routine = {
  id: string;
  name: string;
  createdAt: string;
  items?: RoutineItem[];
};

type CatalogState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; exercises: Exercise[] };

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80";

export default function App() {
  // --- Catálogo ---
  const [state, setState] = useState<CatalogState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // --- Rutinas (HU02) ---
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routinesAttempt, setRoutinesAttempt] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const [routineItems, setRoutineItems] = useState<RoutineItem[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [seriesInput, setSeriesInput] = useState<number>(3);
  const [repsInput, setRepsInput] = useState<number>(10);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedExercise(null);
      setIsClosing(false);
    }, 300);
  };

  // Cargar catálogo
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    async function load() {
      try {
        const response = await fetch("/api/exercises", { signal: controller.signal });
        if (!response.ok) throw new Error("Catalog unavailable");
        const exercises: Exercise[] = await response.json();
        if (!Array.isArray(exercises)) throw new Error("Invalid catalog");

        if (!controller.signal.aborted) setState({ status: "ready", exercises });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  // Cargar rutinas
  useEffect(() => {
    const controller = new AbortController();
    async function loadRoutines() {
      try {
        const response = await fetch("/api/routines", { signal: controller.signal });
        if (!response.ok) throw new Error("Routines unavailable");
        const data: Routine[] = await response.json();
        if (!controller.signal.aborted) setRoutines(data);
      } catch {
        // Silencioso: si falla, simplemente no mostramos rutinas
      }
    }
    void loadRoutines();
    return () => controller.abort();
  }, [routinesAttempt]);

  // Añadir ejercicio a la rutina en construcción
  const handleAddItem = () => {
    if (!selectedExerciseId) {
      setFormError("Selecciona un ejercicio.");
      return;
    }
    if (seriesInput <= 0 || repsInput <= 0) {
      setFormError("Series y repeticiones deben ser mayores que 0.");
      return;
    }
    setRoutineItems((prev) => [
      ...prev,
      { exerciseId: selectedExerciseId, series: seriesInput, reps: repsInput },
    ]);
    setSelectedExerciseId("");
    setSeriesInput(3);
    setRepsInput(10);
    setFormError(null);
  };

  const handleRemoveItem = (index: number) => {
    setRoutineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRoutine = async () => {
    setFormError(null);
    if (routineName.trim().length === 0) {
      setFormError("El nombre de la rutina es obligatorio.");
      return;
    }
    if (routineItems.length === 0) {
      setFormError("Añade al menos un ejercicio.");
      return;
    }
    setFormSaving(true);
    try {
      const response = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: routineName.trim(), items: routineItems }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormError(data.error ?? "No se pudo guardar la rutina.");
        return;
      }
      setRoutineName("");
      setRoutineItems([]);
      setShowForm(false);
      setRoutinesAttempt((v) => v + 1);
    } catch {
      setFormError("Error de red al guardar la rutina.");
    } finally {
      setFormSaving(false);
    }
  };

  // Abrir una rutina guardada (pide el detalle con items)
  const handleOpenRoutine = async (id: string) => {
    try {
      const response = await fetch(`/api/routines/${id}`);
      if (!response.ok) return;
      const data: Routine = await response.json();
      setSelectedRoutine(data);
    } catch {
      // Silencioso
    }
  };

  // Helper para mostrar nombre de ejercicio a partir del id
  const exerciseNameById = (id: string): string => {
    if (state.status !== "ready") return id;
    return state.exercises.find((e) => e.id === id)?.name ?? id;
  };

  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setSelectedExercise(null);
          }}
        >
          <img
            src="/data/URJC-Emblem-700x394.webp"
            alt="Logo URJC"
            style={{ height: "32px", objectFit: "contain" }}
          />
          Healthy Life<span>Entrenamiento</span>
        </a>
        <span className="section-label">Subsistema E5</span>
      </header>

      <main>
        <div style={{ marginBottom: "30px" }}>
          <p className="eyebrow">Tu entrenamiento empieza aquí</p>
          <h1>Catálogo de Ejercicios</h1>
          <p className="intro">
            Selecciona cualquier ejercicio para consultar su ficha técnica detallada y sus pautas de entrenamiento.
          </p>
        </div>

        {/* --- Sección de rutinas (HU02) --- */}
        <section
          aria-label="Rutinas"
          style={{
            marginBottom: "40px",
            padding: "20px",
            border: "1px solid #e4e2de",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <h2 style={{ margin: 0, color: "#cb0017" }}>Mis rutinas</h2>
            <button onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancelar" : "Crear rutina"}
            </button>
          </div>

          {showForm && (
            <div
              style={{
                padding: "16px",
                background: "#fff",
                border: "1px solid #e4e2de",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="routine-name" style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                  Nombre de la rutina
                </label>
                <input
                  id="routine-name"
                  type="text"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  placeholder="Ej: Pierna lunes"
                  style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr auto",
                  gap: "8px",
                  alignItems: "end",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <label htmlFor="routine-exercise" style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Ejercicio
                  </label>
                  <select
                    id="routine-exercise"
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    style={{ width: "100%", padding: "8px" }}
                    disabled={state.status !== "ready"}
                  >
                    <option value="">-- Selecciona --</option>
                    {state.status === "ready" &&
                      state.exercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} ({ex.muscleGroup})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="routine-series" style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Series
                  </label>
                  <input
                    id="routine-series"
                    type="number"
                    min={1}
                    value={seriesInput}
                    onChange={(e) => setSeriesInput(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label htmlFor="routine-reps" style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Reps
                  </label>
                  <input
                    id="routine-reps"
                    type="number"
                    min={1}
                    value={repsInput}
                    onChange={(e) => setRepsInput(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                  />
                </div>
                <button onClick={handleAddItem} type="button">
                  Añadir
                </button>
              </div>

              {routineItems.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: "12px 0" }}>
                  {routineItems.map((item, index) => (
                    <li
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <span>
                        <strong>{exerciseNameById(item.exerciseId)}</strong> — {item.series} × {item.reps}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        type="button"
                        style={{ background: "transparent", border: "none", color: "#cb0017", cursor: "pointer" }}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {formError && (
                <p style={{ color: "#cb0017", margin: "8px 0" }} role="alert">
                  {formError}
                </p>
              )}

              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button onClick={handleSaveRoutine} disabled={formSaving}>
                  {formSaving ? "Guardando..." : "Guardar rutina"}
                </button>
              </div>
            </div>
          )}

          {routines.length === 0 ? (
            <p className="message">Todavía no tienes rutinas guardadas.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {routines.map((routine) => (
                <li
                  key={routine.id}
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{routine.name}</strong>
                    <span style={{ marginLeft: "8px", color: "#777", fontSize: "0.85rem" }}>
                      {new Date(routine.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button onClick={() => handleOpenRoutine(routine.id)}>Abrir</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* --- Catálogo original (sin cambios de comportamiento) --- */}
        <section
          aria-label="Ejercicios disponibles"
          aria-live="polite"
          aria-busy={state.status === "loading"}
        >
          {state.status === "loading" && (
            <p className="message" role="status">
              Cargando ejercicios...
            </p>
          )}

          {state.status === "error" && (
            <div className="message" role="alert">
              <p>No hemos podido cargar los ejercicios.</p>
              <button onClick={() => setAttempt((value) => value + 1)}>
                Volver a intentar
              </button>
            </div>
          )}

          {state.status === "ready" &&
            (state.exercises.length === 0 ? (
              <p className="message">Todavía no hay ejercicios disponibles.</p>
            ) : (
              <>
                <p className="count">{state.exercises.length} ejercicios disponibles</p>
                <ul
                  className="catalog"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "20px",
                    listStyle: "none",
                    padding: 0,
                  }}
                >
                  {state.exercises.map((exercise) => (
                    <li
                      key={exercise.id}
                      onClick={() => setSelectedExercise(exercise)}
                      style={{
                        background: "#d6d6d6",
                        border: "1px solid #d6d6d6",
                        borderRadius: "6px",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "transform 0.2s",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                      <div style={{ height: "140px", overflow: "hidden", background: "#eee" }}>
                        <img
                          src={exercise.imageUrl}
                          alt={exercise.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                      </div>
                      <div style={{ padding: "16px" }}>
                        <span className="tag">{exercise.muscleGroup}</span>
                        <h2
                          style={{
                            fontSize: "1.1rem",
                            margin: "10px 0 6px 0",
                            color: "#cb0017",
                          }}
                        >
                          {exercise.name}
                        </h2>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#555" }}>
                          {exercise.equipment}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ))}
        </section>
      </main>

      <footer>Sprinters — Equipo 5 — Healthy Life</footer>

      {/* Modal del ejercicio */}
      {selectedExercise && (
        <div
          className={`modal-backdrop ${isClosing ? "closing" : ""}`}
          onClick={handleCloseModal}
        >
          <div
            className={`modal-window ${isClosing ? "closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <section aria-label="Ficha del ejercicio">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "30px",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    className="tag"
                    style={{ marginBottom: "12px", display: "inline-block" }}
                  >
                    {selectedExercise.muscleGroup}
                  </span>
                  <h1 style={{ marginTop: "0", fontSize: "2.2rem" }}>
                    {selectedExercise.name}
                  </h1>
                  <p style={{ fontSize: "1rem", color: "#4b5563", lineHeight: "1.6" }}>
                    Ficha técnica oficial para la ejecución de{" "}
                    <strong>{selectedExercise.name}</strong>. Requiere el siguiente
                    equipamiento: <strong>{selectedExercise.equipment}</strong>.
                  </p>
                  <div className="message" style={{ marginTop: "20px" }}>
                    <p style={{ margin: 0, fontWeight: "600", color: "#cb0017" }}>
                      Instrucciones de ejecución:
                    </p>
                    <p
                      style={{
                        margin: "8px 0 0 0",
                        fontSize: "0.95rem",
                        lineHeight: "1.5",
                      }}
                    >
                      {selectedExercise.instructions}
                    </p>
                  </div>
                </div>
                <div>
                  <img
                    src={selectedExercise.imageUrl}
                    alt={selectedExercise.name}
                    style={{
                      width: "100%",
                      height: "320px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #e4e2de",
                    }}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  marginTop: "30px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button onClick={handleCloseModal}>Cerrar</button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Modal de rutina guardada */}
      {selectedRoutine && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedRoutine(null)}
        >
          <div
            className="modal-window"
            onClick={(e) => e.stopPropagation()}
          >
            <section aria-label="Detalle de rutina">
              <h1 style={{ marginTop: 0 }}>{selectedRoutine.name}</h1>
              <p style={{ color: "#777", fontSize: "0.9rem" }}>
                Creada el {new Date(selectedRoutine.createdAt).toLocaleString()}
              </p>
              <ul style={{ paddingLeft: "20px" }}>
                {(selectedRoutine.items ?? []).map((item, index) => (
                  <li key={index} style={{ marginBottom: "6px" }}>
                    <strong>{exerciseNameById(item.exerciseId)}</strong> — {item.series} × {item.reps}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setSelectedRoutine(null)}>Cerrar</button>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
