import { useEffect, useRef, useState } from "react";
import type { Routine } from "../../../shared/routines";
import { ApiError, listRoutines, loadCatalog, loadRoutine, saveRoutine, type Exercise } from "./api";

type Props = { route: string; onDirty: (dirty: boolean) => void; onSaving: (saving: boolean) => void };
export function Routines({ route, onDirty, onSaving }: Props) {
  const match = /^#\/rutinas\/([^/]+)\/editar$/.exec(route);
  if (match) {
    let id: string;
    try { id = decodeURIComponent(match[1]); } catch { return <main><p role="alert">La dirección no es válida.</p><a href="#/rutinas">Volver a mis rutinas</a></main>; }
    return <RoutineEditor id={id} onDirty={onDirty} onSaving={onSaving} />;
  }
  if (route !== "#/rutinas") return <main><h1>Página no encontrada</h1><a href="#/rutinas">Volver a mis rutinas</a></main>;
  return <RoutineList />;
}
function RoutineList() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(""); setRoutines(null);
    void listRoutines(controller.signal).then((result) => { if (!controller.signal.aborted) setRoutines(result); }).catch((e: Error) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [attempt]);
  return <main className="routines-page">
    <p className="eyebrow">Tu plan de entrenamiento</p><h1>Mis rutinas</h1>
    <p className="intro">Revisa tus ejercicios y adapta cada sesión a tu próximo objetivo.</p>
    <p className="demo-note">Espacio de demostración con rutinas ficticias.</p>
    {error ? <div className="message" role="alert"><p>{error}</p><button onClick={() => setAttempt((a) => a + 1)}>Volver a intentar</button></div>
      : routines === null ? <p role="status">Cargando rutinas…</p>
      : routines.length === 0 ? <p className="message">Todavía no tienes rutinas guardadas.</p>
      : <ul className="routine-grid">{routines.map((r) => <li key={r.id} className="routine-card">
        <span className="routine-category">Rutina guardada</span><h2>{r.name}</h2>
        <p>{r.items.length} {r.items.length === 1 ? "ejercicio" : "ejercicios"}</p>
        <a className="button-link" href={`#/rutinas/${encodeURIComponent(r.id)}/editar`} aria-label={`Editar ${r.name}`}>Editar rutina <span aria-hidden="true">→</span></a>
      </li>)}</ul>}
  </main>;
}

export function RoutineEditor({ id, onDirty, onSaving }: Omit<Props, "route"> & { id: string }) {
  const [original, setOriginal] = useState<Routine | null>(null);
  const [draft, setDraft] = useState<Routine | null>(null);
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const savingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = original !== null && draft !== null && JSON.stringify(original) !== JSON.stringify(draft);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(""); setNotice(""); setSaveError(""); setConflict(false);
    void Promise.all([loadRoutine(id, controller.signal), loadCatalog(controller.signal)])
      .then(([routine, exercises]) => {
        if (!controller.signal.aborted) { setOriginal(routine); setDraft(structuredClone(routine)); setCatalog(exercises); }
      }).catch((e: Error) => { if (!controller.signal.aborted) setLoadError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  useEffect(() => { if (!loading) heading.current?.focus(); }, [loading]);
  function reload() {
    if (!dirty || window.confirm("Recargar descartará tus cambios pendientes. ¿Quieres continuar?")) setAttempt((a) => a + 1);
  }
  async function save() {
    if (!draft || savingRef.current) return;
    savingRef.current = true; setSaving(true); onSaving(true); setSaveError(""); setNotice("");
    try {
      const saved = await saveRoutine(draft);
      setOriginal(saved); setDraft(structuredClone(saved)); onDirty(false); setConflict(false);
      setNotice("Cambios guardados. Tu rutina está actualizada.");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "No se pudo guardar la rutina.");
      setConflict(e instanceof ApiError && e.status === 409);
    } finally { savingRef.current = false; setSaving(false); onSaving(false); }
  }
  return <main className="routines-page">
    <nav className="breadcrumbs" aria-label="Ruta de navegación"><a href="#/rutinas">Mis rutinas</a><span aria-hidden="true"> / </span><span>Editar</span></nav>
    <p className="eyebrow">Adapta tu entrenamiento</p><h1 ref={heading} tabIndex={-1}>Editar rutina</h1>
    {loading ? <p role="status">Cargando tu rutina…</p> : loadError ? <div className="message" role="alert"><p>{loadError}</p><button onClick={reload}>Volver a intentar</button></div>
      : draft && <>
        <div className="routine-heading"><div><h2>{draft.name}</h2><p>{draft.items.length} ejercicios · {dirty ? "Cambios sin guardar" : "Todo guardado"}</p></div></div>
        <section className="editor-panel" aria-label="Ejercicios de la rutina" aria-busy={saving}>
          <div className="panel-heading"><h2>Tu sesión</h2></div>
          {draft.items.length === 0 ? <p className="empty-state">Esta rutina todavía no tiene ejercicios.</p>
            : <ol className="routine-items">{draft.items.map((item, index) => {
              const exercise = catalog.find((e) => e.id === item.exerciseId);
              return <li key={item.id} className="routine-item">
                <span className="item-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div className="item-description"><h3>{exercise?.name ?? `Ejercicio no disponible (${item.exerciseId})`}</h3><p>{exercise ? `${exercise.muscleGroup} · ${exercise.equipment}` : "Consulta el catálogo antes de guardar."}</p>
                  {item.parameters && Object.keys(item.parameters).length > 0 && <p className="extra-parameters">{Object.entries(item.parameters).map(([key, value]) => `${key === "restSeconds" ? "Descanso (s)" : key === "rir" ? "RIR" : key}: ${String(value)}`).join(" · ")}</p>}
                </div>
                <dl className="item-stats"><div><dt>Series</dt><dd>{item.sets}</dd></div><div><dt>Repeticiones</dt><dd>{item.repetitions}</dd></div></dl>
              </li>;
            })}</ol>}
        </section>
        {saveError && <div className="message" role="alert"><p>{saveError}</p><p>Tus cambios siguen en pantalla.</p>{conflict && <button className="secondary" onClick={reload}>Recargar rutina</button>}</div>}
        {notice && <p className="save-notice" role="status">✓ {notice}</p>}
        <div className="editor-actions"><p aria-live="polite">{saving ? "Guardando cambios…" : dirty ? "Guarda para conservar los cambios." : "Puedes volver a tus rutinas."}</p>
          <div><a className={`button-link secondary ${saving ? "disabled" : ""}`} href="#/rutinas" aria-disabled={saving} onClick={(event) => { if (saving) event.preventDefault(); }}>Cancelar</a>
            <button onClick={() => void save()} disabled={saving || conflict}>{saving ? "Guardando…" : "Guardar cambios"}</button></div>
        </div>
      </>}
  </main>;
}
