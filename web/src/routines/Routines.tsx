import { useEffect, useRef, useState } from "react";
import type { Routine, RoutineItem } from "../../../shared/routines";
import type { Exercise } from "./api";
import { removeRoutineItem } from "./routineDraft";

type Props = {
  route: string;
  onDirty: (d: boolean) => void;
  onSaving: (s: boolean) => void;
};

function RoutineForm({ initialRoutine, exercises, onSave, onCancel, onDirty, onSaving }: {
  initialRoutine: Routine | null;
  exercises: Exercise[];
  onSave: () => void;
  onCancel: () => void;
  onDirty: (dirty: boolean) => void;
  onSaving: (saving: boolean) => void;
}) {
  const [name, setName] = useState(initialRoutine?.name || "");
  const [items, setItems] = useState<RoutineItem[]>(initialRoutine?.items || []);
  
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState(0);
  const [reps, setReps] = useState(0);
  const [rest, setRest] = useState(0);
  const [rir, setRir] = useState<number | "">(0);
  
  // Estado para mostrar errores amigables en pantalla
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const cancelDialog = useRef<HTMLDialogElement>(null);
  const dirty = name !== (initialRoutine?.name ?? "") ||
    JSON.stringify(items) !== JSON.stringify(initialRoutine?.items ?? []);

  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);

  const handleRemoveItem = (id: string, exerciseName: string) => {
    if (savingRef.current) return;
    setItems((current) => removeRoutineItem(current, id));
    setError(null);
    setNotice(`${exerciseName} se ha quitado del borrador. Guarda los cambios para conservar la eliminación.`);
  };

  const handleCancel = () => {
    if (savingRef.current) return;
    if (dirty) cancelDialog.current?.showModal();
    else onCancel();
  };

  useEffect(() => {
    if (exerciseId !== "") {
      setSets(0);
      setReps(0);
      setRest(0);
      setRir(0);
      setError(null); // Limpiamos errores al cambiar de ejercicio
    }
  }, [exerciseId]);

  const handleAddItem = () => {
    if (!exerciseId) {
      setError("Por favor, selecciona un ejercicio de la lista.");
      return;
    }
    if (sets <= 0 || reps <= 0) {
      setError("Las series y las repeticiones deben ser mayores que 0.");
      return;
    }
    if (rest < 0 || (typeof rir === "number" && rir < 0)) {
      setError("El descanso y el RIR no pueden ser números negativos.");
      return;
    }

    setError(null); // Todo correcto, limpiamos error
    setItems([...items, {
      id: crypto.randomUUID(),
      exerciseId,
      sets,
      repetitions: reps,
      parameters: { 
        restSeconds: rest, 
        ...(rir !== "" ? { rir: Number(rir) } : {}) 
      }
    }]);
    
    // Reiniciamos a 0
    setExerciseId("");
    setSets(0);
    setReps(0);
    setRest(0);
    setRir(0);
  };

  const handleSubmit = async () => {
    if (savingRef.current) return;
    if (!initialRoutine && items.length === 0) {
      setError("Añade al menos un ejercicio a la rutina antes de guardar.");
      return;
    }
    if (!name.trim()) {
      setError("El nombre de la rutina es obligatorio.");
      return;
    }

    const isEditing = !!initialRoutine;
    const url = isEditing ? `/api/routines/${initialRoutine.id}` : "/api/routines";
    const method = isEditing ? "PUT" : "POST";
    
    const body = isEditing 
      ? { name, version: initialRoutine.version, items }
      : { name, items };

    savingRef.current = true;
    setSaving(true);
    onSaving(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar la rutina");
      }
      onSave();
    } catch (err: unknown) {
      setError(err instanceof TypeError
        ? "No se puede conectar con el servidor. Los cambios siguen en el borrador; vuelve a guardar cuando se restablezca la conexión."
        : err instanceof Error ? err.message : "No se pudo guardar la rutina. Los cambios siguen en el borrador.");
    } finally {
      savingRef.current = false;
      setSaving(false);
      onSaving(false);
    }
  };

  return (
    <div className="routine-form" style={{ padding: "20px", border: "2px solid #cb0017", borderRadius: "8px", marginBottom: "20px", background: "#fff" }}>
      <h2>{initialRoutine ? "Editando rutina" : "Crear nueva rutina"}</h2>
      
      {/* Mensaje de error en rojo */}
      {error && (
        <div role="alert" style={{ padding: "10px", background: "#ffe6e6", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "4px", marginBottom: "15px", fontWeight: "bold" }}>
          {error}
        </div>
      )}

      {notice && <p role="status" className="routine-remove-notice">{notice}</p>}
      <fieldset disabled={saving} className="routine-form-fields" aria-busy={saving}>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", fontWeight: "bold" }}>Nombre de la rutina</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Día de Pierna" style={{ width: "100%", padding: "8px", marginTop: "5px" }} />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap", alignItems: "flex-end", background: "#f0f0f0", padding: "10px", borderRadius: "4px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Ejercicio</label>
          <select value={exerciseId} onChange={e => setExerciseId(e.target.value)} style={{ padding: "8px" }}>
            <option value="">-- Selecciona --</option>
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.muscleGroup})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Series</label>
          <input 
            type="number" 
            min="1" 
            value={sets || ""} 
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              setSets(isNaN(val) ? 0 : Math.max(0, val));
            }} 
            style={{ width: "60px", padding: "8px" }} 
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Reps</label>
          <input 
            type="number" 
            min="1" 
            value={reps || ""} 
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              setReps(isNaN(val) ? 0 : Math.max(0, val));
            }} 
            style={{ width: "60px", padding: "8px" }} 
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Descanso (s)</label>
          <input 
            type="number" 
            min="0" 
            value={rest || ""} 
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              setRest(isNaN(val) ? 0 : Math.max(0, val));
            }} 
            style={{ width: "70px", padding: "8px" }} 
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>RIR</label>
          <input 
            type="number" 
            min="0" 
            value={rir === "" ? "" : (rir || "")} 
            onChange={e => {
              if (e.target.value === "") {
                setRir(""); 
                return;
              }
              const val = parseInt(e.target.value, 10);
              setRir(isNaN(val) ? 0 : Math.max(0, val));
            }} 
            style={{ width: "60px", padding: "8px" }} 
          />
        </div>
        
        <button type="button" onClick={handleAddItem} style={{ padding: "8px 16px", cursor: "pointer" }}>+ Añadir</button>
      </div>

      <ul aria-label="Ejercicios de la rutina" className="routine-form-items" style={{ listStyle: "none", padding: 0 }}>
        {items.map((item, idx) => {
          const exName = exercises.find(e => e.id === item.exerciseId)?.name || item.exerciseId;
          return (
            <li key={item.id} className="routine-form-item" style={{ display: "flex", justifyContent: "space-between", padding: "8px", borderBottom: "1px solid #eee" }}>
              <span>
                <strong>{exName}</strong> - {item.sets}x{item.repetitions} 
                {item.parameters?.restSeconds !== undefined && ` | ${item.parameters.restSeconds}s`} 
                {item.parameters?.rir !== undefined && ` | RIR ${item.parameters.rir}`}
              </span>
              <button type="button" className="remove-exercise" aria-label={`Quitar ${exName}, ejercicio ${idx + 1}`}
                onClick={() => handleRemoveItem(item.id, exName)}>Quitar</button>
            </li>
          );
        })}
      </ul>
      {items.length === 0 && <p className="routine-empty-notice">{initialRoutine?.items.length
        ? "Esta rutina se ha quedado sin ejercicios. Guarda los cambios para conservarla vacía o cancela para recuperar lo guardado."
        : initialRoutine ? "Esta rutina no tiene ejercicios." : "No has añadido ejercicios todavía."}</p>}

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button type="button" onClick={handleSubmit} style={{ padding: "10px 20px", background: "#cb0017", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          {saving ? "Guardando…" : initialRoutine ? "Guardar Cambios" : "Crear Rutina"}
        </button>
        <button type="button" onClick={handleCancel} style={{ padding: "10px 20px", background: "#ccc", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cancelar</button>
      </div>
      </fieldset>
      <dialog ref={cancelDialog} className="routine-cancel-dialog" aria-labelledby="routine-cancel-title"
        aria-describedby="routine-cancel-description">
        <h2 id="routine-cancel-title">¿Descartar los cambios?</h2>
        <p id="routine-cancel-description">Los cambios del borrador todavía no se han guardado. Si los descartas, recuperarás la rutina guardada.</p>
        <div className="routine-cancel-actions">
          <button type="button" autoFocus onClick={() => cancelDialog.current?.close()}>Seguir editando</button>
          <button type="button" className="secondary" onClick={() => { cancelDialog.current?.close(); onCancel(); }}>Descartar cambios</button>
        </div>
      </dialog>
    </div>
  );
}

export function Routines({ route, onDirty, onSaving }: Props) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadData = () => {
    fetch("/api/routines").then(r => r.json()).then(setRoutines);
    fetch("/api/exercises").then(r => r.json()).then(setExercises);
  };

  useEffect(() => { loadData(); }, [route]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres borrar esta rutina?")) return;
    await fetch(`/api/routines/${id}`, { method: "DELETE" });
    loadData();
  };

  const handleSave = () => {
    setEditing(null);
    setIsCreating(false);
    onDirty(false);
    loadData();
  };

  if (isCreating || editing) {
    return (
      <div style={{ padding: "20px" }}>
        <RoutineForm 
          initialRoutine={editing} 
          exercises={exercises} 
          onSave={handleSave} 
          onDirty={onDirty}
          onSaving={onSaving}
          onCancel={() => { setEditing(null); setIsCreating(false); onDirty(false); }} 
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1>Mis Rutinas</h1>
        <button 
          onClick={() => { setIsCreating(true); onDirty(true); }}
          style={{ padding: "10px 20px", background: "#cb0017", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          + Crear Nueva Rutina
        </button>
      </div>

      {routines.length === 0 ? (
        <p>No tienes rutinas creadas. ¡Crea la primera!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {routines.map(r => (
            <li key={r.id} style={{ border: "1px solid #ddd", padding: "15px", marginBottom: "10px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: "1.1rem" }}>{r.name}</strong> <span style={{ color: "#888", fontSize: "0.9rem" }}>(v{r.version})</span>
                <div style={{ fontSize: "0.9rem", color: "#666", marginTop: "5px" }}>{r.items.length} ejercicios</div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => { setEditing(r); onDirty(true); }} style={{ padding: "5px 15px", cursor: "pointer" }}>Editar</button>
                <button onClick={() => handleDelete(r.id)} style={{ padding: "5px 15px", color: "red", border: "1px solid red", background: "none", borderRadius: "4px", cursor: "pointer" }}>Borrar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
