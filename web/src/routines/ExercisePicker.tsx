import { useEffect, useRef, useState } from "react";
import { matchesExerciseName } from "../../../shared/routineEdits";
import type { Exercise } from "./api";

export function ExercisePicker({ catalog, capacity, onAdd, onCancel }: {
  catalog: Exercise[];
  capacity: number;
  onAdd: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => { search.current?.focus(); }, []);
  const visible = catalog.filter((exercise) => matchesExerciseName(exercise.name, query));
  return <section className="exercise-picker" aria-label="Seleccionar ejercicios">
    <h3>Añadir a tu sesión</h3>
    <label htmlFor="exercise-search">Buscar por nombre</label>
    <input ref={search} id="exercise-search" type="search" value={query}
      placeholder="Por ejemplo, sentadilla" onChange={(event) => setQuery(event.target.value)} />
    <p className="picker-count" role="status">{visible.length} resultados · {selected.length} seleccionados</p>
    {catalog.length === 0 ? <p>No hay ejercicios disponibles en el catálogo.</p>
      : visible.length === 0 ? <p>No hay ejercicios que coincidan con tu búsqueda.</p>
      : <fieldset className="picker-results"><legend>Ejercicios disponibles</legend>
        {visible.map((exercise) => {
          const checked = selected.includes(exercise.id);
          return <label key={exercise.id} className="picker-option">
            <input type="checkbox" checked={checked} disabled={!checked && selected.length >= capacity}
              onChange={(event) => setSelected((ids) => event.target.checked
                ? [...ids, exercise.id] : ids.filter((id) => id !== exercise.id))} />
            <span><strong>{exercise.name}</strong><small>{exercise.muscleGroup} · {exercise.equipment}</small></span>
          </label>;
        })}
      </fieldset>}
    {selected.length >= capacity && <p role="status">Has alcanzado el límite de 500 ejercicios de la rutina.</p>}
    <p className="picker-hint">Se añadirán con 3 series y 10 repeticiones. Después, guarda la rutina para conservarlos.</p>
    <div className="picker-actions">
      <button type="button" className="secondary" onClick={onCancel}>Cerrar selector</button>
      <button type="button" disabled={selected.length === 0} onClick={() => onAdd(selected)}>Añadir seleccionados ({selected.length})</button>
    </div>
  </section>;
}
