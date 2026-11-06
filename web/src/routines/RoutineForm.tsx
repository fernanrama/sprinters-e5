import { useEffect, useId, useRef, useState } from "react";
import type { Routine, RoutineItem } from "../../../shared/routines";
import type { Exercise } from "../../../shared/exercises";
import { request } from "./api";
import { removeRoutineItem } from "./routineDraft";
import { ExerciseImage } from "../exercises/ExerciseImage";
import { RoutineItemRow } from "./RoutineItemRow";
import { RoutineDialog } from "./RoutineDialog";

type Props = {
  initialRoutine: Routine | null;
  exercises: Exercise[];
  onSave: () => void;
  onCancel: () => void;
  onDirty: (dirty: boolean) => void;
  onSaving: (saving: boolean) => void;
};
type Field = "name" | "exercise" | "sets" | "reps" | "rest" | "rir";

export function RoutineForm({ initialRoutine, exercises, onSave, onCancel, onDirty, onSaving }: Props) {
  const [name, setName] = useState(initialRoutine?.name ?? "");
  const [items, setItems] = useState<RoutineItem[]>(initialRoutine?.items ?? []);
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState(0);
  const [reps, setReps] = useState(0);
  const [rest, setRest] = useState(0);
  const [rir, setRir] = useState<number | "">(0);
  const [error, setError] = useState<{ message: string; field?: Field } | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const draftHeadingRef = useRef<HTMLHeadingElement>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const id = useId();
  const dirty = name !== (initialRoutine?.name ?? "") || JSON.stringify(items) !== JSON.stringify(initialRoutine?.items ?? []);
  const selectedExercise = exercises.find(exercise => exercise.id === exerciseId);
  const exerciseById = new Map(exercises.map(exercise => [exercise.id, exercise]));

  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => { headingRef.current?.focus(); }, []);

  const focusField = (field: Field) => (formRef.current?.elements.namedItem(field) as HTMLElement | null)?.focus();
  const reportError = (message: string, field?: Field) => {
    setError({ message, field });
    if (field) requestAnimationFrame(() => focusField(field));
  };
  const fieldError = (field: Field) => ({
    "aria-invalid": error?.field === field || undefined,
    "aria-describedby": error?.field === field ? `${id}-error` : undefined,
  });
  const selectExercise = (value: string) => {
    setExerciseId(value); setSets(0); setReps(0); setRest(0); setRir(0); setError(null);
  };
  const cancel = () => {
    if (savingRef.current) return;
    if (dirty) setConfirmCancel(true); else onCancel();
  };
  const removeItem = (itemId: string, exerciseName: string) => {
    if (savingRef.current) return;
    const index = items.findIndex(item => item.id === itemId);
    const neighbor = items[index + 1] ?? items[index - 1];
    setItems(current => removeRoutineItem(current, itemId));
    setError(null);
    setNotice(`${exerciseName} se ha quitado del borrador. Guarda los cambios para conservar la eliminación.`);
    requestAnimationFrame(() => {
      const control = neighbor && rows.current.get(neighbor.id)?.querySelector<HTMLButtonElement>(".remove-exercise");
      if (control) control.focus(); else focusField("exercise");
    });
  };
  const moveItem = (index: number, direction: "up" | "down") => {
    if (savingRef.current) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const moved = items[index];
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setNotice(`${exerciseById.get(moved.exerciseId)?.name ?? moved.exerciseId} movido a la posición ${target + 1} de ${items.length}.`);
    requestAnimationFrame(() => {
      const row = rows.current.get(moved.id);
      const same = row?.querySelector<HTMLButtonElement>(`button[data-direction="${direction}"]:not(:disabled)`);
      (same ?? row?.querySelector<HTMLButtonElement>(".order-btn:not(:disabled)"))?.focus();
    });
  };
  const updateItem = (itemId: string, field: "sets" | "repetitions", value: number) => {
    if (!savingRef.current) setItems(current => current.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };
  const addItem = () => {
    if (savingRef.current) return;
    if (!exerciseId) return reportError("Por favor, selecciona un ejercicio de la lista.", "exercise");
    if (items.some(item => item.exerciseId === exerciseId)) return reportError("Este ejercicio ya está en tu rutina. Modifica su entrada o elige otro ejercicio.", "exercise");
    if (!Number.isSafeInteger(sets) || sets <= 0) return reportError("Las series deben ser un número entero mayor que 0.", "sets");
    if (!Number.isSafeInteger(reps) || reps <= 0) return reportError("Las repeticiones deben ser un número entero mayor que 0.", "reps");
    if (!Number.isFinite(rest) || rest < 0) return reportError("El descanso debe ser un número mayor o igual que 0.", "rest");
    if (typeof rir === "number" && (!Number.isFinite(rir) || rir < 0)) return reportError("El RIR debe ser un número mayor o igual que 0.", "rir");
    setItems(current => [...current, {
      id: crypto.randomUUID(), exerciseId, sets, repetitions: reps,
      parameters: { restSeconds: rest, ...(rir !== "" ? { rir } : {}) },
    }]);
    setNotice(`${selectedExercise?.name ?? exerciseId} añadido a la posición ${items.length + 1}.`);
    selectExercise("");
    requestAnimationFrame(() => focusField("exercise"));
  };
  const submit = async () => {
    if (savingRef.current) return;
    if (!name.trim()) return reportError("El nombre de la rutina es obligatorio.", "name");
    if (!initialRoutine && items.length === 0) return reportError("Añade al menos un ejercicio a la rutina antes de guardar.", "exercise");
    if (new Set(items.map(item => item.exerciseId)).size !== items.length) return reportError("Hay ejercicios repetidos en esta rutina antigua. Quita las entradas repetidas antes de guardar.");
    if (items.some(item => !Number.isSafeInteger(item.sets) || item.sets <= 0 || !Number.isSafeInteger(item.repetitions) || item.repetitions <= 0)) {
      reportError("Revisa las series y repeticiones de tu rutina: deben ser números enteros mayores que 0.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('.routine-form-item input[aria-invalid="true"]')?.focus());
      return;
    }
    savingRef.current = true;
    setSaving(true); onSaving(true); setError(null);
    try {
      await request(initialRoutine ? `/routines/${encodeURIComponent(initialRoutine.id)}` : "/routines", {
        method: initialRoutine ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialRoutine ? { name, version: initialRoutine.version, items } : { name, items }),
      });
      onSave();
    } catch (reason) {
      reportError(reason instanceof TypeError
        ? "No se puede conectar con el servidor. Los cambios siguen en el borrador; vuelve a guardar cuando se restablezca la conexión."
        : `${reason instanceof Error ? reason.message : "No se pudo guardar la rutina."} Los cambios siguen en el borrador.`);
    } finally {
      savingRef.current = false; setSaving(false); onSaving(false);
    }
  };

  return <>
    <header className="routine-page-heading">
      <button type="button" className="routine-back" disabled={saving} onClick={event => { event.currentTarget.focus(); cancel(); }}>Volver a Mis rutinas</button>
      <h1 ref={headingRef} tabIndex={-1}>{initialRoutine ? "Editar rutina" : "Crear nueva rutina"}</h1>
      <p>{initialRoutine ? `Edita «${initialRoutine.name}». Los cambios se aplican al guardar.` : "Elige tus ejercicios y organiza el orden de tu entrenamiento."}</p>
    </header>
    <form ref={formRef} className="routine-form" noValidate autoComplete="off" onSubmit={event => { event.preventDefault(); void submit(); }}>
      {error && <p id={`${id}-error`} role="alert" className="routine-feedback routine-feedback--error">{error.message}</p>}
      <p role="status" aria-live="polite" aria-atomic="true" className="routine-status">{saving ? "Guardando rutina…" : notice}</p>
      <fieldset disabled={saving} className="routine-form-fields" aria-busy={saving}>
        <legend className="sr-only">Datos de la rutina</legend>
        <div className="routine-name-field">
          <label htmlFor={`${id}-name`}>Nombre de la rutina <span>(obligatorio)</span></label>
          <input id={`${id}-name`} name="name" value={name} required {...fieldError("name")}
            onChange={event => setName(event.target.value)} placeholder="Ej: Día de Pierna" autoComplete="off" />
        </div>
        <div className="routine-composer">
          <section className="routine-picker-panel" aria-labelledby={`${id}-picker-title`}
            onKeyDown={event => {
              if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); addItem(); }
            }}>
            <h2 id={`${id}-picker-title`}>Añadir ejercicio</h2>
            <div className="routine-exercise-picker">
              <label htmlFor={`${id}-exercise`}>Ejercicio</label>
              <select id={`${id}-exercise`} name="exercise" value={exerciseId} {...fieldError("exercise")}
                onChange={event => selectExercise(event.target.value)} disabled={exercises.length === 0}>
                <option value="">Selecciona un ejercicio</option>
                {exercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name} ({exercise.muscleGroup})</option>)}
              </select>
              {selectedExercise ? <figure className="exercise-selection-preview">
                <ExerciseImage exercise={selectedExercise} variant="preview" loading="eager" decorative />
                <figcaption><strong>{selectedExercise.name}</strong><p>{selectedExercise.equipment}</p></figcaption>
              </figure> : <p className="routine-picker-hint">{exercises.length ? "Selecciona un ejercicio para ver su imagen antes de añadirlo." : "El catálogo está vacío. Puedes editar o quitar los ejercicios que ya tienes."}</p>}
            </div>
            <div className="routine-add-parameters">
              <label htmlFor={`${id}-sets`}>Series
                <input id={`${id}-sets`} name="sets" type="number" min="1" step="1" value={sets || ""} {...fieldError("sets")}
                  onChange={event => setSets(Number(event.target.value))} />
              </label>
              <label htmlFor={`${id}-reps`}>Repeticiones
                <input id={`${id}-reps`} name="reps" type="number" min="1" step="1" value={reps || ""} {...fieldError("reps")}
                  onChange={event => setReps(Number(event.target.value))} />
              </label>
              <label htmlFor={`${id}-rest`}>Descanso (s)
                <input id={`${id}-rest`} name="rest" type="number" min="0" step="any" value={rest} {...fieldError("rest")}
                  onChange={event => setRest(Number(event.target.value))} />
              </label>
              <label htmlFor={`${id}-rir`}>RIR <span>(opcional)</span>
                <input id={`${id}-rir`} name="rir" type="number" min="0" step="any" value={rir} {...fieldError("rir")}
                  onChange={event => setRir(event.target.value === "" ? "" : Number(event.target.value))} />
              </label>
            </div>
            <p className="routine-field-hint">Descanso en segundos. RIR: repeticiones en reserva; 0 es un valor válido.</p>
            <button type="button" className="routine-primary routine-add-button" disabled={!exercises.length} onClick={addItem}>+ Añadir</button>
            {!!items.length && <button type="button" className="routine-mobile-shortcut routine-secondary"
              onClick={() => draftHeadingRef.current?.focus()}>Ver ejercicios añadidos</button>}
          </section>
          <section className="routine-draft-panel" aria-labelledby={`${id}-draft-title`}>
            <div className="routine-draft-heading"><h2 ref={draftHeadingRef} tabIndex={-1} id={`${id}-draft-title`}>Tu rutina</h2><p>{items.length} {items.length === 1 ? "ejercicio" : "ejercicios"}</p>
              <button type="button" className="routine-mobile-shortcut routine-secondary" onClick={() => focusField("exercise")}>Añadir ejercicio</button>
            </div>
            <ol aria-label="Ejercicios de la rutina" className="routine-form-items">
              {items.map((item, index) => <RoutineItemRow key={item.id} item={item} exercise={exerciseById.get(item.exerciseId)}
                index={index} count={items.length} onMove={moveItem} onRemove={removeItem} onUpdate={updateItem}
                onElement={element => { if (element) rows.current.set(item.id, element); else rows.current.delete(item.id); }} />)}
            </ol>
            {items.length === 0 && <p className="routine-empty-notice">{initialRoutine?.items.length
              ? "Esta rutina se ha quedado sin ejercicios. Guarda los cambios para conservarla vacía o cancela para recuperar lo guardado."
              : initialRoutine ? "Esta rutina no tiene ejercicios." : "No has añadido ejercicios todavía. Selecciona un ejercicio, indica sus series y repeticiones y pulsa Añadir."}</p>}
          </section>
        </div>
        <div className="routine-editor-actions">
          <button type="submit" className="routine-primary">{saving ? "Guardando…" : initialRoutine ? "Guardar Cambios" : "Crear Rutina"}</button>
          <button type="button" className="routine-secondary" onClick={event => { event.currentTarget.focus(); cancel(); }}>Cancelar</button>
        </div>
      </fieldset>
    </form>
    {confirmCancel && <RoutineDialog title="¿Descartar los cambios?" cancelLabel="Seguir editando" confirmLabel="Descartar cambios"
      description="Los cambios del borrador todavía no se han guardado. Si los descartas, recuperarás la rutina guardada."
      onClose={() => setConfirmCancel(false)} onConfirm={onCancel} />}
  </>;
}
