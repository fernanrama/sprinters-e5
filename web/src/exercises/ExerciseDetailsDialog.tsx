import { useEffect, useId, useRef } from "react";
import type { Exercise } from "../../../shared/exercises";
import { ExerciseImage } from "./ExerciseImage";

type Props = {
  exercise: Exercise;
  returnFocusTo: HTMLElement | null;
  onClose: () => void;
};

export function ExerciseDetailsDialog({ exercise, returnFocusTo, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
    };
  }, [returnFocusTo]);

  return <dialog ref={dialogRef} className="modal-window exercise-details-dialog" aria-labelledby={titleId}
    onKeyDown={event => {
      // Closing is the only interactive control in this read-only detail.
      if (event.key === "Tab") { event.preventDefault(); closeRef.current?.focus(); }
    }}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <section aria-label="Ficha del ejercicio">
      <header className="exercise-details-heading">
        <h2 id={titleId}>{exercise.name}</h2>
        <button ref={closeRef} type="button" className="exercise-details-close" onClick={onClose}>Cerrar</button>
      </header>
      <div className="exercise-details-content">
        <div className="exercise-details-media">
          <ExerciseImage exercise={exercise} variant="detail" loading="eager" />
        </div>
        <div className="exercise-details-description">
          <p className="exercise-details-group">{exercise.muscleGroup}</p>
          <p>{exercise.description}</p>
          <p><strong>Equipamiento:</strong> {exercise.equipment}</p>
          {!!exercise.tags?.length && <div className="exercise-detail-tags" aria-label="Etiquetas del ejercicio">
            {exercise.tags.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}
          </div>}
          <h3>Instrucciones de ejecución:</h3>
          <p>{exercise.instructions}</p>
        </div>
      </div>
    </section>
  </dialog>;
}
