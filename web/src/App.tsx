import { useEffect, useState } from "react";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
};

type CatalogState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; exercises: Exercise[] };

export default function App() {
  const [state, setState] = useState<CatalogState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

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

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">Healthy Life<span>Entrenamiento</span></a>
        <span className="section-label">Ejercicios</span>
      </header>
      <main>
        <p className="eyebrow">Tu entrenamiento empieza aquí</p>
        <h1>Catálogo de ejercicios</h1>
        <p className="intro">Conoce los ejercicios con los que podrás preparar tu rutina.</p>
        <section aria-label="Ejercicios disponibles" aria-live="polite" aria-busy={state.status === "loading"}>
          {state.status === "loading" && <p className="message" role="status">Cargando ejercicios…</p>}
          {state.status === "error" && (
            <div className="message" role="alert">
              <p>No hemos podido cargar los ejercicios.</p>
              <button onClick={() => setAttempt((value) => value + 1)}>Volver a intentar</button>
            </div>
          )}
          {state.status === "ready" && (
            state.exercises.length === 0
              ? <p className="message">Todavía no hay ejercicios disponibles.</p>
              : <>
                  <p className="count">{state.exercises.length} ejercicios disponibles</p>
                  <ul className="catalog">
                    {state.exercises.map((exercise) => (
                      <li className="exercise" key={exercise.id}>
                        <span className="tag">{exercise.muscleGroup}</span>
                        <h2>{exercise.name}</h2>
                        <p>{exercise.equipment}</p>
                      </li>
                    ))}
                  </ul>
                </>
          )}
        </section>
      </main>
      <footer>Sprinters · Equipo 5 · Healthy Life</footer>
    </>
  );
}
