import { useEffect, useRef, useState } from "react";
import type { Routine, RoutineSchedule } from "../../../shared/routines";
import type { Exercise } from "../../../shared/exercises";
import { listRoutines, loadCatalog, request, loadSchedules, scheduleRoutine } from "./api";
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

  // Estados para la programación (HU05)
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  // Sergio Alejandro - H10
  const [scheduleToDelete, setScheduleToDelete] = useState<RoutineSchedule | null>(null); // <-- AÑADE ESTA LÍNEA AQUÍ

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
    if (!scheduleDate) {
      setNotice("Por favor, selecciona una fecha válida.");
      return;
    }
    try {
      const newSchedule = await scheduleRoutine(routineId, scheduleDate);
      setNotice("Rutina programada con éxito.");
      setData(current => current.status === "ready" ? { ...current, schedules: [...current.schedules, newSchedule] } : current);
      setSchedulingId(null);
      setScheduleDate("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Error al programar la rutina.");
    }
  };

  if ((creating || editing) && data.status === "ready") return <main id="page-content" className="page-content routines-workspace" tabIndex={-1}>
    <RoutineForm initialRoutine={editing} exercises={data.exercises} onSave={saved} onCancel={leaveEditor} onDirty={onDirty} onSaving={onSaving} />
  </main>;

  // Filtrar programaciones para el panel superior
  const upcomingSchedules = data.status === "ready" ? data.schedules
    .filter(s => s.date >= new Date().toISOString().split("T")[0])
    .sort((a, b) => a.date.localeCompare(b.date)) : [];

  // Obtener los IDs de las rutinas que ya están programadas
  const scheduledRoutineIds = new Set(upcomingSchedules.map(s => s.routineId));

  // Filtrar la lista de rutinas para ocultar las que ya tienen fecha asignada
  const unscheduledRoutines = data.status === "ready" ? data.routines.filter(r => !scheduledRoutineIds.has(r.id)) : [];

  return <main id="page-content" className="page-content routines-workspace" tabIndex={-1}>
    <header className="routine-page-heading routine-list-heading">
      <div><h1 ref={headingRef} tabIndex={-1}>Mis Rutinas</h1><p>Crea y organiza tus rutinas de entrenamiento.</p></div>
      <button ref={createRef} type="button" className="routine-primary" disabled={data.status !== "ready"}
        onClick={() => { returnTo.current = "create"; setNotice(""); setCreating(true); }}>+ Crear Nueva Rutina</button>
    </header>

    {notice && <p role="status" className="routine-feedback">{notice}</p>}
    
    {/* Panel de Próximas Sesiones Mejorado (HU10) 
      Sergio Alejandro
    */}
    {data.status === "ready" && (
      <section style={{ marginBottom: "40px", padding: "24px", background: "#ffffff", border: "1px solid var(--color-border)", borderRadius: "8px", borderTop: "4px solid var(--color-brand)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
        <h2 style={{ marginTop: 0, color: "var(--color-text)", fontSize: "20px", marginBottom: "16px" }}>Próximas sesiones programadas</h2>
        {upcomingSchedules.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {upcomingSchedules.map(sched => {
              const routine = data.routines.find(r => r.id === sched.routineId);
              const isEditingDate = schedulingId === `edit-${sched.id}`;

              return (
                <li key={sched.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-block", background: "#fde8e9", color: "var(--color-brand)", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "700" }}>
                      {sched.date}
                    </span>
                    <div>
                      <strong style={{ fontSize: "16px", display: "block", color: "var(--color-text)" }}>
                        {routine ? routine.name : "Rutina no encontrada"}
                      </strong>
                      <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>
                        {routine ? `${routine.items.length} ejercicios · Versión ${routine.version}` : "Sin detalles"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    {isEditingDate ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input 
                          type="date" 
                          defaultValue={sched.date}
                          id={`edit-date-${sched.id}`}
                          style={{ padding: "6px", border: "1px solid #ccc", borderRadius: "4px" }} 
                        />
                        <button 
                          type="button" 
                          className="routine-primary" 
                          style={{ fontSize: "13px", padding: "6px 12px" }}
                          onClick={() => {
                            const inputEl = document.getElementById(`edit-date-${sched.id}`) as HTMLInputElement;
                            const newDate = inputEl?.value;
                            if (!newDate || newDate === sched.date) {
                              setSchedulingId(null);
                              return;
                            }
                            setNotice("Fecha de sesión actualizada.");
                            setSchedulingId(null);
                            setData(current => current.status === "ready" ? {
                              ...current,
                              schedules: current.schedules.map(s => s.id === sched.id ? { ...s, date: newDate } : s)
                            } : current);
                          }}>
                          Guardar
                        </button>
                        <button 
                          type="button" 
                          className="routine-secondary" 
                          style={{ fontSize: "13px", padding: "6px 12px" }}
                          onClick={() => setSchedulingId(null)}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          type="button" 
                          className="routine-secondary" 
                          style={{ fontSize: "13px", padding: "6px 12px" }}
                          onClick={() => setSchedulingId(`edit-${sched.id}`)}>
                          Cambiar fecha
                        </button>
                        {routine && (
                          <button 
                            type="button" 
                            className="routine-secondary" 
                            style={{ fontSize: "13px", padding: "6px 12px" }}
                            onClick={() => {
                              setNotice(""); 
                              setEditing(routine);
                            }}>
                            Editar rutina
                          </button>
                        )}
                        {/* Botón que abre el modal corporativo en pantalla */}
                        <button 
                          type="button" 
                          className="routine-danger" 
                          style={{ fontSize: "13px", padding: "6px 12px" }}
                          onClick={() => setScheduleToDelete(sched)}>
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={{ color: "var(--color-muted)", margin: 0, lineHeight: "1.6" }}>
            No tienes sesiones programadas próximamente. Selecciona una rutina de tu lista y pulsa <strong>Programar</strong> para añadirla a tu agenda.
          </p>
        )}
      </section>
    )}

    {/* Cuadro de diálogo corporativo flotante en pantalla para confirmar el borrado */}
    {scheduleToDelete && (
      <RoutineDialog 
        title="¿Eliminar sesión programada?" 
        cancelLabel="Cancelar"
        confirmLabel="Eliminar" 
        description={`¿Estás seguro de que quieres eliminar la sesión programada para el ${scheduleToDelete.date}? Volverá a estar disponible en tu lista de rutinas.`}
        onClose={() => setScheduleToDelete(null)} 
        onConfirm={() => {
          setNotice("Sesión eliminada de la agenda.");
          setData(current => current.status === "ready" ? {
            ...current,
            schedules: current.schedules.filter(s => s.id !== scheduleToDelete.id)
          } : current);
          setScheduleToDelete(null);
        }} 
      />
    )}

    {/* Lista de rutinas (con la estructura corregida para los tests) */}
    <section aria-label="Rutinas guardadas" aria-busy={data.status === "loading"}>
      {data.status === "loading" && <p className="routine-state" role="status">Cargando rutinas…</p>}
      {data.status === "error" && <div className="routine-state" role="alert">
        <h2>No hemos podido cargar tus rutinas.</h2>
        <p>La lista no está disponible. Comprueba la conexión y vuelve a intentarlo.</p>
        <button type="button" className="routine-primary" onClick={() => setAttempt(value => value + 1)}>Volver a intentar</button>
      </div>}
      
      {data.status === "ready" && (
        data.routines.length === 0 ? (
          /* 1. Estado original para cuando no hay rutinas creadas (arregla el test) */
          <div className="routine-state">
            <h2>Tu primera rutina empieza aquí</h2>
            <p>No tienes rutinas creadas. Pulsa Crear Nueva Rutina para elegir ejercicios y organizar su orden.</p>
          </div>
        ) : unscheduledRoutines.length === 0 ? (
          /* 2. Estado nuevo para cuando hay rutinas, pero ya están todas programadas */
          <div className="routine-state">
            <h2>No hay rutinas pendientes</h2>
            <p>Todas tus rutinas ya tienen una fecha asignada. Puedes verlas en el panel superior.</p>
          </div>
        ) : (
          /* 3. Lista normal con las rutinas no programadas */
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
