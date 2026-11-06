import type { RoutineItem } from "../../../shared/routines";
import type { Exercise } from "../../../shared/exercises";
import { ExerciseImage } from "../exercises/ExerciseImage";

type Props = {
  item: RoutineItem;
  exercise?: Exercise;
  index: number;
  count: number;
  onElement: (element: HTMLLIElement | null) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onRemove: (id: string, name: string) => void;
  onUpdate: (id: string, field: "sets" | "repetitions", value: number) => void;
};

export function RoutineItemRow({ item, exercise, index, count, onElement, onMove, onRemove, onUpdate }: Props) {
  const name = exercise?.name ?? item.exerciseId;
  const identity = `${name}, posición ${index + 1}`;
  return <li ref={onElement} className="routine-form-item">
    <ExerciseImage exercise={exercise ?? { id: item.exerciseId, name }} variant="row" decorative />
    <div className="routine-exercise-description">
      <h3 className="routine-exercise-name"><span>{index + 1}.</span> {name}</h3>
      {exercise && <p className="routine-item-equipment">{exercise.equipment}</p>}
      {!!exercise?.tags?.length && <ul className="routine-item-tags" aria-label={`Etiquetas de ${identity}`}>
        {exercise.tags.map(tag => <li key={tag}>{tag}</li>)}
      </ul>}
      <div className="routine-inline-parameters">
        <label>Series
          <input name={`${item.id}-sets`} type="number" min="1" step="1" value={item.sets} aria-label={`Series de ${identity}`}
            onChange={event => onUpdate(item.id, "sets", parseInt(event.target.value, 10) || 1)} className="inline-param-input" />
        </label>
        <label>Repeticiones
          <input name={`${item.id}-repetitions`} type="number" min="1" step="1" value={item.repetitions} aria-label={`Repeticiones de ${identity}`}
            onChange={event => onUpdate(item.id, "repetitions", parseInt(event.target.value, 10) || 1)} className="inline-param-input" />
        </label>
      </div>
      <p className="routine-item-parameters">
        Descanso: {item.parameters?.restSeconds === undefined ? "sin especificar" : `${item.parameters.restSeconds} s`}
        <span>RIR: {item.parameters?.rir ?? "sin especificar"}</span>
      </p>
    </div>
    <div className="routine-item-controls">
      {(["up", "down"] as const).map(direction => <button key={direction} type="button" className="order-btn"
        data-direction={direction} onClick={() => onMove(index, direction)}
        disabled={direction === "up" ? index === 0 : index === count - 1}
        aria-label={`Mover ${direction === "up" ? "arriba" : "abajo"} ${identity}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d={direction === "up" ? "M12 20V4m-7 7 7-7 7 7" : "M12 4v16m-7-7 7 7 7-7"} />
        </svg>
      </button>)}
      <button type="button" className="remove-exercise" aria-label={`Quitar ${identity}`} onClick={() => onRemove(item.id, name)}>Quitar</button>
    </div>
  </li>;
}
