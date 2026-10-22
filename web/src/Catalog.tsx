import { useEffect, useState } from "react";

// 1. Tipo actualizado con description e instructions
type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  imageUrl: string;
  description: string;
  instructions: string;
};

type CatalogState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; exercises: Exercise[] };

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80";

export default function Catalog() {
  const [state, setState] = useState<CatalogState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  // Estado para la animación de cierre del modal
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    async function load() {
      try {
        const response = await fetch("/api/exercises", { signal: controller.signal });
        if (!response.ok) throw new Error("Catalog unavailable");
        const exercises: Exercise[] = await response.json();
        if (!Array.isArray(exercises)) throw new Error("Invalid catalog");
        
        if (!controller.signal.aborted) setState({ status: "ready", exercises });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }

    void load();
    return () => controller.abort();
  }, [attempt]);

  // Función para cerrar el modal con retraso para que se vea la animación
  const handleCloseModal = () => {
    if (!selectedExercise) return;
    setIsClosing(true);
    setTimeout(() => {
      setSelectedExercise(null);
      setIsClosing(false);
    }, 300); // 300ms es lo que dura la animación en el CSS
  };

  return (
    <>
      <main>
        <div style={{ marginBottom: '30px' }}>
          <p className="eyebrow">Tu entrenamiento empieza aquí</p>
          <h1>Catálogo de Ejercicios</h1>
          <p className="intro">Selecciona cualquier ejercicio para consultar su ficha técnica detallada y sus pautas de entrenamiento.</p>
        </div>

        <section aria-label="Ejercicios disponibles" aria-live="polite" aria-busy={state.status === "loading"}>
          {state.status === "loading" && <p className="message" role="status">Cargando ejercicios...</p>}
          
          {state.status === "error" && (
            <div className="message" role="alert">
              <p>No hemos podido cargar los ejercicios.</p>
              <button onClick={() => setAttempt((value) => value + 1)}>Volver a intentar</button>
            </div>
          )}
          
          {state.status === "ready" && (
            state.exercises.length === 0
              ? <p className="message">Todavía no hay ejercicios disponibles.</p>
              : <>
                  <p className="count">{state.exercises.length} ejercicios disponibles</p>
                  <ul className="catalog" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', listStyle: 'none', padding: 0 }}>
                    {state.exercises.map((exercise) => (
                      <li 
                        key={exercise.id} 
                        onClick={() => setSelectedExercise(exercise)}
                        style={{ background: '#d6d6d6', border: '1px solid #d6d6d6', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ height: '140px', overflow: 'hidden', background: '#dcdcdc' }}>
                          <img 
                            src={exercise.imageUrl} 
                            alt={exercise.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                          />
                        </div>
                        <div style={{ padding: '16px' }}>
                          <span className="tag">{exercise.muscleGroup}</span>
                          <h2 style={{ fontSize: '1.1rem', margin: '10px 0 6px 0', color: '#cb0017' }}>{exercise.name}</h2>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#555' }}>{exercise.equipment}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
          )}
        </section>
      </main>



      {/* MODAL SUPERPUESTO CON ANIMACIONES */}
      {selectedExercise && (
        <div 
          className={`modal-backdrop ${isClosing ? 'closing' : ''}`} 
          onClick={handleCloseModal}
        >
          <div 
            className={`modal-window ${isClosing ? 'closing' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <section aria-label="Ficha del ejercicio">
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', alignItems: 'center' }}>
                <div>
                  <span className="tag" style={{ marginBottom: '12px', display: 'inline-block' }}>{selectedExercise.muscleGroup}</span>
                  <h1 style={{ marginTop: '0', fontSize: '2.2rem' }}>{selectedExercise.name}</h1>
                  
                  {/* Textos dinámicos sacados del JSON */}
                  <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: '1.6' }}>
                    {selectedExercise.description}
                  </p>
                  <div className="message" style={{ marginTop: '20px' }}>
                    <p style={{ margin: 0, fontWeight: '600', color: '#cb0017' }}>Instrucciones de ejecución:</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.95rem', lineHeight: '1.5' }}>
                      {selectedExercise.instructions}
                    </p>
                  </div>
                </div>
                <div>
                  <img 
                    src={selectedExercise.imageUrl} 
                    alt={selectedExercise.name} 
                    style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e4e2de' }} 
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                </div>
              </div>

              {/* Botón de cerrar situado abajo a la derecha */}
              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleCloseModal}>
                  Cerrar
                </button>
              </div>

            </section>
          </div>
        </div>
      )}
    </>
  );
}