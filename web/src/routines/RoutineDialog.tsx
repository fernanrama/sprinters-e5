import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

type Props = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

export function RoutineDialog({ title, description, confirmLabel, cancelLabel, pending, error, onConfirm, onClose, fallbackFocusRef }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current!;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus(); else fallbackFocusRef?.current?.focus();
      });
    };
  }, []);

  return <dialog ref={ref} tabIndex={-1} className="routine-cancel-dialog routine-dialog"
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={pending || undefined}
    onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); ref.current?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
    <h2 id={`${id}-title`}>{title}</h2>
    <p id={`${id}-description`}>{description}</p>
    {error && <p role="alert" className="routine-feedback routine-feedback--error">{error}</p>}
    {pending && <p role="status">Eliminando rutina…</p>}
    <div className="routine-cancel-actions">
      <button ref={cancelRef} type="button" className="routine-secondary" disabled={pending} onClick={onClose}>{cancelLabel}</button>
      <button type="button" className="routine-primary" disabled={pending} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </dialog>;
}
