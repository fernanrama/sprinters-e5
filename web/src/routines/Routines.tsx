import { useEffect, useRef, useState } from "react";
import type { Routine, RoutineSchedule } from "../../../shared/routines";
import type { Exercise } from "../../../shared/exercises";
import { listRoutines, loadCatalog, request, loadSchedules, scheduleRoutine, updateSchedule, deleteSchedule } from "./api";
import { RoutineForm } from "./RoutineForm";
import { RoutineDialog } from "./RoutineDialog";
import "./routine-workspace.css";

type Props = { route: string; onDirty: (dirty: boolean) => void; onSaving: (saving: boolean) => void };
type Data = { status: "loading" } | { status: "error" } | { status: "ready"; routines: Routine[]; exercises: Exercise[]; schedules: RoutineSchedule[] };

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

  // Estados para programar (HU05)
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  
  // Estados para reprogramar (HU06)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setData({ status: "loading" });
    void Promise.all([
      listRoutines(controller.signal),
      loadCatalog(controller.signal),
      loadSchedules(controller.signal)
    ]).then(([routines, exercises, schedules]) => {
      if (!controller.signal.aborted) setData({ status: "ready", routines, exercises, schedules });
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

  const handleSchedule = async (routineId: string) => {
    if (!scheduleDate) { setNotice("Por favor, selecciona una fecha válida."); return; }
    try {
      const newSchedule = await scheduleRoutine(routineId, scheduleDate);
      setNotice("Rutina programada con éxito.");
      setData(current => current.status === "ready" ? { ...current, schedules: [...current.schedules, newSchedule] } : current);
      setSchedulingId(null); setScheduleDate("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Error al programar la rutina.");
    }
  };

  const handleReschedule = async (scheduleId: string) => {
    if (!newDate) { setNotice("Por favor, selecciona una fecha válida."); return; }
    try {
      const updated = await updateSchedule(scheduleId, newDate);
      setNotice("Sesión reprogramada con éxito.");
      setData(current => current.status === "ready" ? { 
        ...current, schedules: current.schedules.map(s => s.id === scheduleId ? updated : s) 
      } : current);
      setReschedulingId(null); setNewDate("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Error al reprogramar.");
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    if (!window.confirm("¿Seguro que quieres cancelar esta sesión programada? La rutina volverá a estar disponible en la lista.")) return;
    try {
      await deleteSchedule(scheduleId);
      setNotice("Sesión cancelada. La rutina vuelve a estar en tu lista principal.");
      setData(current => current.status === "ready" ? { 
        ...current, schedules: current.schedules.filter(s => s.id !== scheduleId) 
      } : current);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Error al cancelar la sesión.");
    }
  };

  if ((creating || editing) && data.status === "ready") return <main id="page-content" className="page-content routines-workspace" tabIndex={-1}>
    <RoutineForm initialRoutine={editing} exercises={data.exercises} onSave={saved} onCancel={leaveEditor} onDirty={onDirty} onSaving={onSaving} />
  </main>;

  const upcomingSchedules = data.status === "ready" ? data.schedules
    .filter(s => s.date >= new Date().toISOString().split("T")[0])
    .sort((a, b) => a.date.localeCompare(b.date)) : [];

  const scheduledRoutineIds = new Set(upcomingSchedules.map(s => s.routineId));
  const unscheduledRoutines = data.status === "ready" ? data.routines.filter(r => !scheduledRoutineIds.has(r.id)) : [];

  return <main id="page-content" className="page-content routines-workspace" tabIndex={-1}>
    <header className="routine-page-heading routine-list-heading">
      <div><h1 ref={headingRef} tabIndex={-1}>Mis Rutinas</h1><p>Crea y organiza tus rutinas de entrenamiento.</p></div>
      <button ref={createRef} type="button" className="routine-primary" disabled={data.status !== "ready"}
        onClick={() => { returnTo.current = "create"; setNotice(""); setCreating(true); }}>+ Crear Nueva Rutina</button>
    </header>

    {notice && <p role="status" className="routine-feedback">{notice}</p>}
    
    {/* Panel de Próximas Sesiones (HU05 + HU06) */}
    {data.status === "ready" && upcomingSchedules.length > 0 && (
      <section style={{ marginBottom: "40px", padding: "20px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2 style={{ marginTop: 0, color: "#cb0017", fontSize: "20px" }}>Próximas sesiones programadas</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {upcomingSchedules.map(sched => {
            const routine = data.routines.find(r => r.id === sched.routineId);
            if (!routine) return null; 
            return (
              <li key={sched.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                
                <div style={{ flex: 1, minWidth: "200px" }}>
                  {reschedulingId === sched.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ padding: "4px", border: "1px solid #ccc", borderRadius: "4px" }} />
                      <button type="button" className="routine-primary" onClick={() => handleReschedule(sched.id)} style={{ padding: "4px 8px", fontSize: "12px" }}>Guardar</button>
                      <button type="button" className="routine-secondary" onClick={() => setReschedulingId(null)} style={{ padding: "4px 8px", fontSize: "12px" }}>Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <strong>{sched.date}</strong> — {routine.name}
                      <span style={{ color: "#666", fontSize: "14px", marginLeft: "10px" }}>({routine.items.length} ejercicios)</span>
                    </>
                  )}
                </div>

                {reschedulingId !== sched.id && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" className="routine-secondary" onClick={() => { setReschedulingId(sched.id); setNewDate(sched.date); }} style={{ padding: "4px 8px", fontSize: "13px" }}>
                      Reprogramar
                    </button>
                    <button type="button" className="routine-danger" onClick={() => handleCancelSchedule(sched.id)} style={{ padding: "4px 8px", fontSize: "13px" }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    )}

    <section aria-label="Rutinas guardadas" aria-busy={data.status === "loading"}>
      {data.status === "loading" && <p className="routine-state" role="status">Cargando rutinas…</p>}
      {data.status === "error" && <div className="routine-state" role="alert">
        <h2>No hemos podido cargar tus rutinas.</h2>
        <p>La lista no está disponible. Comprueba la conexión y vuelve a intentarlo.</p>
        <button type="button" className="routine-primary" onClick={() => setAttempt(value => value + 1)}>Volver a intentar</button>
      </div>}
      
      {data.status === "ready" && (
        data.routines.length === 0 ? (
          <div className="routine-state">
            <h2>Tu primera rutina empieza aquí</h2>
            <p>No tienes rutinas creadas. Pulsa Crear Nueva Rutina para elegir ejercicios y organizar su orden.</p>
          </div>
        ) : unscheduledRoutines.length === 0 ? (
          <div className="routine-state">
            <h2>No hay rutinas pendientes</h2>
            <p>Todas tus rutinas ya tienen una fecha asignada. Puedes verlas en el panel superior.</p>
          </div>
        ) : (
          <ul className="routine-saved-list" aria-label="Mis rutinas guardadas">
            {unscheduledRoutines.map(routine => <li key={routine.id} className="routine-saved-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="routine-saved-description"><h2>{routine.name}</h2><p>{routine.items.length} {routine.items.length === 1 ? "ejercicio" : "ejercicios"} <span>Versión {routine.version}</span></p></div>
                <div className="routine-saved-actions">
                  <button type="button" className="routine-secondary" style={{ borderColor: "#cb0017", color: "#cb0017" }} onClick={() => setSchedulingId(schedulingId === routine.id ? null : routine.id)}>
                    Programar
                  </button>
                  <button type="button" className="routine-secondary" aria-label={`Editar ${routine.name}`}
                    ref={element => { if (element) editRefs.current.set(routine.id, element); else editRefs.current.delete(routine.id); }}
                    onClick={() => { returnTo.current = routine.id; setNotice(""); setEditing(routine); }}>Editar</button>
                  <button type="button" className="routine-danger" aria-label={`Borrar ${routine.name}`}
                    onClick={event => { event.currentTarget.focus(); setDeleteError(null); setRoutineToDelete(routine); }}>Borrar</button>
                </div>
              </div>
              
              {schedulingId === routine.id && (
                <div style={{ marginTop: "16px", padding: "16px", background: "#fdfdfd", border: "1px dashed #ccc", borderRadius: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <label htmlFor={`date-${routine.id}`} style={{ fontWeight: "bold" }}>Selecciona la fecha:</label>
                  <input id={`date-${routine.id}`} type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }} />
                  <button type="button" className="routine-primary" onClick={() => handleSchedule(routine.id)} style={{ padding: "6px 12px" }}>Guardar fecha</button>
                  <button type="button" className="routine-secondary" onClick={() => setSchedulingId(null)} style={{ padding: "6px 12px" }}>Cancelar</button>
                </div>
              )}
            </li>)}
          </ul>
        )
      )}
    </section>
    {routineToDelete && <RoutineDialog title="¿Eliminar rutina completa?" cancelLabel="Cancelar"
      fallbackFocusRef={headingRef}
      confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar rutina"} pending={deleting} error={deleteError}
      description={<>Eliminarás permanentemente la rutina <strong>{routineToDelete.name}</strong> y todos sus ejercicios. Esta acción no se puede deshacer.</>}
      onClose={() => { if (!deletingRef.current) setRoutineToDelete(null); }} onConfirm={() => { void confirmDelete(); }} />}
  </main>;
}
