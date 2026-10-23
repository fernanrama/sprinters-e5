import { useEffect, useState } from "react";

type RoutineItem = {
  id: string;
  exerciseId: string;
  sets: number;
  repetitions: number;
  parameters?: { restSeconds?: number; rir?: number; };
};

type Routine = {
  id: string;
  name: string;
  version: number;
  items: RoutineItem[];
};

type Props = {
  route: string;
  onDirty: (d: boolean) => void;
  onSaving: (s: boolean) => void;
};

function RoutineForm({ initialRoutine, exercises, onSave, onCancel }: {
  initialRoutine: Routine | null;
  exercises: any[];
  onSave: () => void;
  onCancel: () => void;
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
    if (items.length === 0) {
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "20px", border: "2px solid #cb0017", borderRadius: "8px", marginBottom: "20px", background: "#fff" }}>
      <h2>{initialRoutine ? "Editando rutina" : "Crear nueva rutina"}</h2>
      
      {/* Mensaje de error en rojo */}
      {error && (
        <div style={{ padding: "10px", background: "#ffe6e6", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "4px", marginBottom: "15px", fontWeight: "bold" }}>
          {error}
        </div>
      )}

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

      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((item, idx) => {
          const exName = exercises.find(e => e.id === item.exerciseId)?.name || item.exerciseId;
          return (
            <li key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px", borderBottom: "1px solid #eee" }}>
              <span>
                <strong>{exName}</strong> - {item.sets}x{item.repetitions} 
                {item.parameters?.restSeconds !== undefined && ` | ${item.parameters.restSeconds}s`} 
                {item.parameters?.rir !== undefined && ` | RIR ${item.parameters.rir}`}
              </span>
              <button onClick={() => setItems(items.filter(i => i.id !== item.id))} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>Quitar</button>
            </li>
          );
        })}
        {items.length === 0 && <p style={{ color: "#888" }}>No has añadido ejercicios todavía.</p>}
      </ul>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={handleSubmit} style={{ padding: "10px 20px", background: "#cb0017", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          {initialRoutine ? "Guardar Cambios" : "Crear Rutina"}
        </button>
        <button onClick={onCancel} style={{ padding: "10px 20px", background: "#ccc", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cancelar</button>
      </div>
    </div>
  );
}

export function Routines({ route, onDirty, onSaving }: Props) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
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
