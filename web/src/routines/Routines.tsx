import { useEffect, useRef, useState } from "react";
import type { Routine } from "../../../shared/routines";
import type { Exercise } from "../../../shared/exercises";
import { listRoutines, loadCatalog, request } from "./api";
import { RoutineForm } from "./RoutineForm";
import { RoutineDialog } from "./RoutineDialog";
import "./routine-workspace.css";

type Props = { route: string; onDirty: (dirty: boolean) => void; onSaving: (saving: boolean) => void };
type Data = { status: "loading" } | { status: "error" } | { status: "ready"; routines: Routine[]; exercises: Exercise[] };

export function Routines({ route, onDirty, onSaving }: Props) {
  const [data, setData] = useState<Data>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [creating, setCreating] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const deletingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const createRef = useRef<HTMLButtonElement>(null);
  const editRefs = useRef(new Map<string, HTMLButtonElement>());
  const returnTo = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData({ status: "loading" });
    void Promise.all([listRoutines(controller.signal), loadCatalog(controller.signal)]).then(([routines, exercises]) => {
      if (!controller.signal.aborted) setData({ status: "ready", routines, exercises });
    }).catch(() => {
      if (!controller.signal.aborted) setData({ status: "error" });
    });
    return () => controller.abort();
  }, [route, attempt]);

  useEffect(() => {
    if (creating || editing || data.status !== "ready" || !returnTo.current) return;
    const target = returnTo.current === "create" ? createRef.current : editRefs.current.get(returnTo.current);
    (target ?? headingRef.current)?.focus();
    returnTo.current = null;
  }, [creating, editing, data]);

  const leaveEditor = () => { setEditing(null); setCreating(false); onDirty(false); };
  const saved = () => {
    setNotice(editing ? "Cambios guardados en la rutina." : "Rutina creada correctamente.");
    leaveEditor();
    setData({ status: "loading" });
    setAttempt(value => value + 1);
  };
  const confirmDelete = async () => {
    if (!routineToDelete || deletingRef.current) return;
    deletingRef.current = true; setDeleting(true); onSaving(true); setDeleteError(null);
    try {
      await request(`/routines/${encodeURIComponent(routineToDelete.id)}`, { method: "DELETE" });
      setNotice(`Rutina «${routineToDelete.name}» eliminada.`);
      const deletedId = routineToDelete.id;
      setData(current => current.status === "ready" ? { ...current, routines: current.routines.filter(routine => routine.id !== deletedId) } : current);
      setRoutineToDelete(null);
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch (reason) {
      setDeleteError(reason instanceof TypeError
        ? "No se puede conectar con el servidor. No se ha confirmado el borrado. Comprueba la conexión y vuelve a intentarlo."
        : `${reason instanceof Error ? reason.message : "No se pudo eliminar la rutina."} No se ha confirmado el borrado; puedes volver a intentarlo o cancelar.`);
    } finally {
      deletingRef.current = false; setDeleting(false); onSaving(false);
    }
  };

  if ((creating || editing) && data.status === "ready") return <main id="page-content" className="page-content routines-workspace" tabIndex={-1}>
    <RoutineForm initialRoutine={editing} exercises={data.exercises} onSave={saved} onCancel={leaveEditor} onDirty={onDirty} onSaving={onSaving} />
  </main>;

  return <main id="page-content" className="page-content routines-workspace" tabIndex={-1}>
    <header className="routine-page-heading routine-list-heading">
      <div><h1 ref={headingRef} tabIndex={-1}>Mis Rutinas</h1><p>Crea y organiza tus rutinas de entrenamiento.</p></div>
      <button ref={createRef} type="button" className="routine-primary" disabled={data.status !== "ready"}
        onClick={() => { returnTo.current = "create"; setNotice(""); setCreating(true); }}>+ Crear Nueva Rutina</button>
    </header>
    {notice && <p role="status" className="routine-feedback">{notice}</p>}
    <section aria-label="Rutinas guardadas" aria-busy={data.status === "loading"}>
      {data.status === "loading" && <p className="routine-state" role="status">Cargando rutinas…</p>}
      {data.status === "error" && <div className="routine-state" role="alert">
        <h2>No hemos podido cargar tus rutinas.</h2>
        <p>La lista no está disponible. Comprueba la conexión y vuelve a intentarlo.</p>
        <button type="button" className="routine-primary" onClick={() => setAttempt(value => value + 1)}>Volver a intentar</button>
      </div>}
      {data.status === "ready" && (data.routines.length === 0 ? <div className="routine-state">
        <h2>Tu primera rutina empieza aquí</h2><p>No tienes rutinas creadas. Pulsa Crear Nueva Rutina para elegir ejercicios y organizar su orden.</p>
      </div> : <ul className="routine-saved-list" aria-label="Mis rutinas guardadas">
        {data.routines.map(routine => <li key={routine.id} className="routine-saved-row">
          <div className="routine-saved-description"><h2>{routine.name}</h2><p>{routine.items.length} {routine.items.length === 1 ? "ejercicio" : "ejercicios"} <span>Versión {routine.version}</span></p></div>
          <div className="routine-saved-actions">
            <button type="button" className="routine-secondary" aria-label={`Editar ${routine.name}`}
              ref={element => { if (element) editRefs.current.set(routine.id, element); else editRefs.current.delete(routine.id); }}
              onClick={() => { returnTo.current = routine.id; setNotice(""); setEditing(routine); }}>Editar</button>
            <button type="button" className="routine-danger" aria-label={`Borrar ${routine.name}`}
              onClick={event => { event.currentTarget.focus(); setDeleteError(null); setRoutineToDelete(routine); }}>Borrar</button>
          </div>
        </li>)}
      </ul>)}
    </section>
    {routineToDelete && <RoutineDialog title="¿Eliminar rutina completa?" cancelLabel="Cancelar"
      fallbackFocusRef={headingRef}
      confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar rutina"} pending={deleting} error={deleteError}
      description={<>Eliminarás permanentemente la rutina <strong>{routineToDelete.name}</strong> y todos sus ejercicios. Esta acción no se puede deshacer.</>}
      onClose={() => { if (!deletingRef.current) setRoutineToDelete(null); }} onConfirm={() => { void confirmDelete(); }} />}
  </main>;
}
