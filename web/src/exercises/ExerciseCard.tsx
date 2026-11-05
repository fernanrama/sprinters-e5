import type { MouseEvent } from "react";
import type { Exercise } from "../../../shared/exercises";
import { ExerciseImage } from "./ExerciseImage";

type Props = {
  exercise: Exercise;
  index: number;
  selectedTag: string;
  onOpen: (exercise: Exercise, opener: HTMLButtonElement) => void;
  onTagClick: (tag: string, event: MouseEvent<HTMLButtonElement>) => void;
};

export function ExerciseCard({ exercise, index, selectedTag, onOpen, onTagClick }: Props) {
  return <li>
    <article className="exercise-card">
      <ExerciseImage exercise={exercise} variant="card" loading={index < 3 ? "eager" : "lazy"} decorative />
      <div className="exercise-card-body">
        <p className="exercise-card-group">{exercise.muscleGroup}</p>
        <h2 aria-label={exercise.name}>
          <button type="button" className="exercise-card-open" aria-label={`Ver ficha de ${exercise.name}`}
            onClick={event => onOpen(exercise, event.currentTarget)}>{exercise.name}</button>
        </h2>
        <p className="exercise-card-equipment">{exercise.equipment}</p>
        <span className="exercise-card-action" aria-hidden="true">Ver ejercicio <span>→</span></span>
        {exercise.tags && exercise.tags.length > 0 && <div className="card-tags" aria-label={`Etiquetas de ${exercise.name}`}>
          {exercise.tags.map(tag => <button key={tag} type="button"
            className={`tag-chip ${selectedTag === tag ? "active" : ""}`}
            aria-pressed={selectedTag === tag} title={`Filtrar catálogo por la etiqueta ${tag}`}
            onClick={event => onTagClick(tag, event)}>{tag}</button>)}
        </div>}
      </div>
    </article>
  </li>;
}
