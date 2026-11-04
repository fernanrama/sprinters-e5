import { useEffect, useMemo, useState } from "react";
import { ExerciseImage } from "./exercises/ExerciseImage";
import type { Exercise } from "../../shared/exercises";
export type { Exercise } from "../../shared/exercises";

type CatalogState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; exercises: Exercise[] };

export default function Catalog() {
  const [state, setState] = useState<CatalogState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Estados locales para los filtros (HU07 - Subtareas 2 y 3)
  const [selectedGroup, setSelectedGroup] = useState<string>("Todos");
  const [selectedTag, setSelectedTag] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Lista dinámica de grupos musculares disponibles
  const availableGroups = useMemo(() => {
    if (state.status !== "ready") return ["Todos"];
    const groups = new Set<string>();
    for (const ex of state.exercises) {
      if (ex.muscleGroup.includes(" y ")) {
        ex.muscleGroup.split(" y ").forEach((g) => groups.add(g.trim()));
      } else {
        groups.add(ex.muscleGroup.trim());
      }
    }
    return ["Todos", ...Array.from(groups).sort((a, b) => a.localeCompare(b))];
  }, [state]);

  // Lista dinámica de etiquetas disponibles
  const availableTags = useMemo(() => {
    if (state.status !== "ready") return ["Todas"];
    const tags = new Set<string>();
    for (const ex of state.exercises) {
      if (ex.tags) {
        for (const tag of ex.tags) {
          tags.add(tag.trim());
        }
      }
    }
    return ["Todas", ...Array.from(tags).sort((a, b) => a.localeCompare(b))];
  }, [state]);

  // Filtrado reactivo en el estado local
  const filteredExercises = useMemo(() => {
    if (state.status !== "ready") return [];

    return state.exercises.filter((exercise) => {
      // 1. Filtro por grupo muscular
      if (selectedGroup !== "Todos") {
        const matchMuscleGroup = exercise.muscleGroup.toLowerCase().includes(selectedGroup.toLowerCase());
        const matchTags = exercise.tags?.some((t) => t.toLowerCase() === selectedGroup.toLowerCase());
        if (!matchMuscleGroup && !matchTags) return false;
      }

      // 2. Filtro por etiqueta
      if (selectedTag !== "Todas") {
        const matchTag = exercise.tags?.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
        const matchMuscleGroup = exercise.muscleGroup.toLowerCase().includes(selectedTag.toLowerCase());
        if (!matchTag && !matchMuscleGroup) return false;
      }

      // 3. Filtro por texto de búsqueda
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const matchName = exercise.name.toLowerCase().includes(query);
        const matchGroup = exercise.muscleGroup.toLowerCase().includes(query);
        const matchEquipment = exercise.equipment.toLowerCase().includes(query);
        const matchDescription = exercise.description.toLowerCase().includes(query);
        const matchTags = exercise.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchName && !matchGroup && !matchEquipment && !matchDescription && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [state, selectedGroup, selectedTag, searchQuery]);

  // Indicador de si existen filtros activos
  const hasActiveFilters = selectedGroup !== "Todos" || selectedTag !== "Todas" || searchQuery.trim() !== "";

  // Acción para restablecer / limpiar todos los filtros
  const handleClearFilters = () => {
    setSelectedGroup("Todos");
    setSelectedTag("Todas");
    setSearchQuery("");
  };

  // Clic directo en un tag de tarjeta
  const handleTagClick = (tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (selectedTag === tag) {
      setSelectedTag("Todas");
    } else {
      setSelectedTag(tag);
    }
  };

  // Función para cerrar el modal con animación
  const handleCloseModal = () => {
    if (!selectedExercise) return;
    setIsClosing(true);
    setTimeout(() => {
      setSelectedExercise(null);
      setIsClosing(false);
    }, 300);
  };

  return (
    <>
      <main id="page-content" className="page-content" tabIndex={-1}>
        <div style={{ marginBottom: "26px" }}>
          <p className="eyebrow">Tu entrenamiento empieza aquí</p>
          <h1>Catálogo de Ejercicios</h1>
          <p className="intro">
            Explora y filtra nuestro catálogo por grupo muscular o etiquetas para encontrar el entrenamiento ideal.
          </p>
        </div>

        {/* Panel de Filtros Interactivos (HU07 - Subtarea 2) */}
        {state.status === "ready" && (
          <section className="filter-controls" aria-label="Controles de filtrado de ejercicios">
            <div className="filter-row search-row">
              <div className="search-field">
                <label htmlFor="catalog-search" className="filter-label">Buscar ejercicio</label>
                <div className="search-input-wrapper">
                  <span className="search-icon" aria-hidden="true">🔍</span>
                  <input
                    id="catalog-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, grupo, etiqueta o equipamiento..."
                    className="search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-inline"
                      onClick={() => setSearchQuery("")}
                      aria-label="Borrar término de búsqueda"
                      title="Borrar término de búsqueda"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {hasActiveFilters && (
                <div className="clear-action">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="btn-clear-filters"
                    title="Restablecer todos los filtros aplicados"
                  >
                    ✕ Limpiar filtros
                  </button>
                </div>
              )}
            </div>

            <div className="filter-row selectors-row">
              {/* Filtro por Grupo Muscular */}
              <div className="filter-block">
                <span className="filter-label">Grupo muscular:</span>
                <div className="filter-pills" role="radiogroup" aria-label="Filtro por grupo muscular">
                  {availableGroups.map((group) => {
                    const isActive = selectedGroup === group;
                    return (
                      <button
                        key={group}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        className={`pill-btn ${isActive ? "active" : ""}`}
                        onClick={() => setSelectedGroup(isActive && group !== "Todos" ? "Todos" : group)}
                        title={`Filtrar por grupo: ${group}`}
                      >
                        {group}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtro por Etiqueta */}
              <div className="filter-block">
                <label htmlFor="tag-select" className="filter-label">Etiqueta adicional:</label>
                <select
                  id="tag-select"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="filter-select"
                  aria-label="Seleccionar etiqueta"
                >
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag === "Todas" ? "Todas las etiquetas" : tag}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="catalog-meta">
              <p className="count" style={{ margin: 0 }}>
                Mostrando <strong>{filteredExercises.length}</strong> de {state.exercises.length} ejercicios disponibles
                {hasActiveFilters && <span className="filtered-hint"> (filtros aplicados)</span>}
              </p>
            </div>
          </section>
        )}

        <section aria-label="Ejercicios disponibles" aria-live="polite" aria-busy={state.status === "loading"}>
          {state.status === "loading" && <p className="message" role="status">Cargando ejercicios...</p>}
          
          {state.status === "error" && (
            <div className="message" role="alert">
              <p>No hemos podido cargar los ejercicios.</p>
              <button onClick={() => setAttempt((value) => value + 1)}>Volver a intentar</button>
            </div>
          )}
          
          {state.status === "ready" && (
            state.exercises.length === 0 ? (
              <p className="message">Todavía no hay ejercicios disponibles en el catálogo.</p>
            ) : filteredExercises.length === 0 ? (
              /* Componente Visual de "Sin Resultados" (HU07 - Subtarea 3) */
              <div className="no-results-panel" role="status">
                <div className="no-results-icon" aria-hidden="true">🔍</div>
                <h2>No se encontraron ejercicios para este filtro</h2>
                <p>
                  No hay ejercicios en el catálogo que coincidan con la combinación de filtros y criterios de búsqueda actuales.
                </p>
                <div className="no-results-active-filters">
                  {selectedGroup !== "Todos" && (
                    <span className="active-pill">Grupo: {selectedGroup}</span>
                  )}
                  {selectedTag !== "Todas" && (
                    <span className="active-pill">Etiqueta: {selectedTag}</span>
                  )}
                  {searchQuery.trim() !== "" && (
                    <span className="active-pill">Búsqueda: "{searchQuery.trim()}"</span>
                  )}
                </div>
                <button
                  type="button"
                  className="clear-filters-btn"
                  onClick={handleClearFilters}
                >
                  Limpiar filtros y ver todos
                </button>
              </div>
            ) : (
              /* Listado de tarjetas de ejercicios con etiquetas (HU07 - Subtarea 1) */
              <ul
                className="catalog"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "20px",
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {filteredExercises.map((exercise, index) => (
                  <li
                    key={exercise.id}
                    onClick={() => setSelectedExercise(exercise)}
                    style={{
                      background: "#d6d6d6",
                      border: "1px solid #c9c7c2",
                      borderRadius: "6px",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.06)";
                    }}
                  >
                    <ExerciseImage exercise={exercise} variant="card" loading={index < 4 ? "eager" : "lazy"} decorative />
                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1 }}>
                      <div>
                        <span className="tag">{exercise.muscleGroup}</span>
                        <h2 style={{ fontSize: "1.15rem", margin: "10px 0 6px 0", color: "#cb0017" }}>
                          {exercise.name}
                        </h2>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#444" }}>
                          {exercise.equipment}
                        </p>
                      </div>

                      {/* Etiquetas visibles en las tarjetas (Subtarea 1) */}
                      {exercise.tags && exercise.tags.length > 0 && (
                        <div
                          className="card-tags"
                          aria-label={`Etiquetas de ${exercise.name}`}
                          style={{ marginTop: "auto", paddingTop: "12px" }}
                        >
                          {exercise.tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              className={`tag-chip ${selectedTag === tag ? "active" : ""}`}
                              onClick={(e) => handleTagClick(tag, e)}
                              title={`Filtrar catálogo por la etiqueta ${tag}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </section>
      </main>

      {/* MODAL DETALLADO CON ETIQUETAS */}
      {selectedExercise && (
        <div
          className={`modal-backdrop ${isClosing ? "closing" : ""}`}
          onClick={handleCloseModal}
        >
          <div
            className={`modal-window ${isClosing ? "closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <section aria-label="Ficha del ejercicio">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
                  gap: "30px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    <span className="tag">{selectedExercise.muscleGroup}</span>
                    {selectedExercise.tags?.map((t) => (
                      <span
                        key={t}
                        className="tag-chip active"
                        style={{ cursor: "default" }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <h1 style={{ marginTop: "0", fontSize: "2.2rem" }}>{selectedExercise.name}</h1>

                  <p style={{ fontSize: "1rem", color: "#4b5563", lineHeight: "1.6" }}>
                    {selectedExercise.description}
                  </p>
                  <p style={{ fontSize: "0.95rem", color: "#333", marginTop: "10px" }}>
                    <strong>Equipamiento:</strong> {selectedExercise.equipment}
                  </p>
                  <div className="message" style={{ marginTop: "20px" }}>
                    <p style={{ margin: 0, fontWeight: "600", color: "#cb0017" }}>
                      Instrucciones de ejecución:
                    </p>
                    <p style={{ margin: "8px 0 0 0", fontSize: "0.95rem", lineHeight: "1.5" }}>
                      {selectedExercise.instructions}
                    </p>
                  </div>
                </div>
                <div>
                  <ExerciseImage exercise={selectedExercise} variant="detail" loading="eager" />
                </div>
              </div>

              {/* Botón de cerrar situado abajo a la derecha */}
              <div style={{ marginTop: "30px", display: "flex", justifyContent: "flex-end" }}>
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
