import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ExerciseCard } from "./exercises/ExerciseCard";
import { ExerciseDetailsDialog } from "./exercises/ExerciseDetailsDialog";
import { CatalogFilters } from "./exercises/CatalogFilters";
import "./exercises/catalog.css";
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
  const searchRef = useRef<HTMLInputElement>(null);
  const tagRef = useRef<HTMLSelectElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

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

  const handleClearFilters = () => {
    setSelectedGroup("Todos");
    setSelectedTag("Todas");
    setSearchQuery("");
    searchRef.current?.focus();
  };

  const handleTagClick = (tag: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const activator = event.currentTarget;
    setSelectedTag(selectedTag === tag ? "Todas" : tag);
    requestAnimationFrame(() => {
      if (!activator.isConnected) tagRef.current?.focus();
    });
  };

  return <>
    <main id="page-content" className="page-content catalog-page" tabIndex={-1}>
      <div className="catalog-heading">
        <h1>Catálogo de Ejercicios</h1>
        <p>Explora y filtra nuestro catálogo por grupo muscular o etiquetas para encontrar el entrenamiento ideal.</p>
      </div>
      {state.status === "ready" && <>
        <CatalogFilters groups={availableGroups} tags={availableTags}
          selectedGroup={selectedGroup} selectedTag={selectedTag} searchQuery={searchQuery}
          active={hasActiveFilters} searchRef={searchRef} tagRef={tagRef}
          onSearch={setSearchQuery} onTag={setSelectedTag}
          onGroup={group => setSelectedGroup(selectedGroup === group && group !== "Todos" ? "Todos" : group)}
          onClearSearch={() => { setSearchQuery(""); searchRef.current?.focus(); }}
          onClear={handleClearFilters} />
        <p className="count catalog-result-count" role="status" aria-live="polite" aria-atomic="true">
          Mostrando <strong>{filteredExercises.length}</strong> de {state.exercises.length} ejercicios disponibles
          {hasActiveFilters && <span className="filtered-hint"> (filtros aplicados)</span>}
        </p>
      </>}
      <section aria-label="Ejercicios disponibles" aria-busy={state.status === "loading"}>
        {state.status === "loading" && <p className="catalog-state" role="status">Cargando ejercicios…</p>}
        {state.status === "error" && <div className="catalog-state" role="alert">
          <h2>No hemos podido cargar los ejercicios.</h2>
          <p>Comprueba tu conexión y vuelve a intentarlo.</p>
          <button type="button" className="catalog-primary-action" onClick={() => setAttempt(value => value + 1)}>Volver a intentar</button>
        </div>}
        {state.status === "ready" && (state.exercises.length === 0
          ? <div className="catalog-state"><h2>Catálogo vacío</h2><p>Todavía no hay ejercicios disponibles en el catálogo.</p></div>
          : filteredExercises.length === 0
            ? <div className="no-results-panel catalog-state" role="region" aria-label="Sin resultados">
              <h2>No se encontraron ejercicios para este filtro</h2>
              <p>No hay ejercicios en el catálogo que coincidan con la combinación de filtros y criterios de búsqueda actuales.</p>
              <div className="no-results-active-filters">
                {selectedGroup !== "Todos" && <span className="active-pill">Grupo: {selectedGroup}</span>}
                {selectedTag !== "Todas" && <span className="active-pill">Etiqueta: {selectedTag}</span>}
                {searchQuery.trim() !== "" && <span className="active-pill">Búsqueda: “{searchQuery.trim()}”</span>}
              </div>
              <button type="button" className="catalog-primary-action" onClick={handleClearFilters}>Limpiar filtros y ver todos</button>
            </div>
            : <ul className="catalog">
              {filteredExercises.map((exercise, index) => <ExerciseCard key={exercise.id}
                exercise={exercise} index={index} selectedTag={selectedTag} onTagClick={handleTagClick}
                onOpen={(exercise, opener) => { openerRef.current = opener; setSelectedExercise(exercise); }} />)}
            </ul>)}
      </section>
    </main>
    {selectedExercise && <ExerciseDetailsDialog exercise={selectedExercise} returnFocusTo={openerRef.current}
      onClose={() => setSelectedExercise(null)} />}
  </>;
}
