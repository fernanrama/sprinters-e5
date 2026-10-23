import { useState } from "react";
import type { Routine, RoutineItem } from "../../../shared/routines";

type Props = {
  initialRoutine: Routine;
  exercises: any[];
  onSave: (updated: Routine) => void;
  onCancel: () => void;
};

export function RoutineEditor({ initialRoutine, exercises, onSave, onCancel }: Props) {
  const [name, setName] = useState(initialRoutine.name);
  const [items, setItems] = useState<RoutineItem[]>(initialRoutine.items);
  
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(60);
  const [rir, setRir] = useState<number | "">("");

  const handleAddItem = () => {
    if (!exerciseId) return;
    const newItem: RoutineItem = {
      id: crypto.randomUUID(),
      exerciseId,
      sets,
      repetitions: reps,
      parameters: { 
        restSeconds: rest, 
        ...(rir !== "" ? { rir: Number(rir) } : {}) 
      }
    };
    setItems([...items, newItem]);
    setExerciseId("");
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSubmit = () => {
    fetch(`/api/routines/${initialRoutine.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        version: initialRoutine.version,
        items
      })
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }
      return res.json();
    })
    .then(onSave)
    .catch(err => alert(err.message));
  };

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", borderRadius: "8px", marginBottom: "20px" }}>
      <h2>Editando: {initialRoutine.name}</h2>
      
      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Nombre de la rutina</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "8px" }} />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Ejercicio</label>
          <select value={exerciseId} onChange={e => setExerciseId(e.target.value)} style={{ padding: "8px" }}>
            <option value="">Selecciona</option>
            {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Series</label>
          <input type="number" value={sets} onChange={e => setSets(Number(e.target.value))} style={{ width: "60px", padding: "8px" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Reps</label>
          <input type="number" value={reps} onChange={e => setReps(Number(e.target.value))} style={{ width: "60px", padding: "8px" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>Descanso (s)</label>
          <input type="number" value={rest} onChange={e => setRest(Number(e.target.value))} style={{ width: "70px", padding: "8px" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px" }}>RIR</label>
          <input type="number" value={rir} onChange={e => setRir(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: "60px", padding: "8px" }} />
        </div>
        <button type="button" onClick={handleAddItem} style={{ padding: "8px 16px" }}>Añadir Ejercicio</button>
      </div>

      <ul style={{ background: "#f9f9f9", padding: "15px", borderRadius: "4px" }}>
        {items.map(item => {
          const exName = exercises.find(e => e.id === item.exerciseId)?.name || item.exerciseId;
          return (
            <li key={item.id} style={{ marginBottom: "8px" }}>
              <strong>{exName}</strong>: {item.sets}x{item.repetitions} 
              {item.parameters?.restSeconds && ` | Descanso: ${item.parameters.restSeconds}s`}
              {item.parameters?.rir && ` | RIR: ${item.parameters.rir}`}
              <button onClick={() => handleRemoveItem(item.id)} style={{ marginLeft: "10px", color: "red" }}>Quitar</button>
            </li>
          );
        })}
      </ul>

      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <button onClick={onCancel} style={{ padding: "8px 16px" }}>Cancelar</button>
        <button onClick={handleSubmit} style={{ padding: "8px 16px", background: "green", color: "white" }}>Guardar Cambios</button>
      </div>
    </div>
  );
}
