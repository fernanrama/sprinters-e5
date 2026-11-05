import type { RefObject } from "react";

type Props = {
  groups: string[];
  tags: string[];
  selectedGroup: string;
  selectedTag: string;
  searchQuery: string;
  active: boolean;
  searchRef: RefObject<HTMLInputElement | null>;
  tagRef: RefObject<HTMLSelectElement | null>;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
  onGroup: (value: string) => void;
  onTag: (value: string) => void;
  onClear: () => void;
};

export function CatalogFilters(props: Props) {
  return <section className="filter-controls catalog-filters" aria-label="Controles de filtrado de ejercicios">
    <div className="catalog-filter-fields">
      <div className="search-field">
        <label htmlFor="catalog-search" className="filter-label">Buscar ejercicio</label>
        <div className="search-input-wrapper">
          <svg className="catalog-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          <input ref={props.searchRef} id="catalog-search" type="search" className="search-input"
            value={props.searchQuery} onChange={event => props.onSearch(event.target.value)}
            placeholder="Nombre, grupo, etiqueta o equipamiento…" autoComplete="off" />
          {props.searchQuery && <button type="button" className="search-clear-inline"
            aria-label="Borrar término de búsqueda" onClick={props.onClearSearch}>×</button>}
        </div>
      </div>
      <div className="catalog-tag-field">
        <label htmlFor="tag-select" className="filter-label">Etiqueta adicional</label>
        <select ref={props.tagRef} id="tag-select" className="filter-select" aria-label="Seleccionar etiqueta"
          value={props.selectedTag} onChange={event => props.onTag(event.target.value)}>
          {props.tags.map(tag => <option key={tag} value={tag}>{tag === "Todas" ? "Todas las etiquetas" : tag}</option>)}
        </select>
      </div>
      <button type="button" className="btn-clear-filters" disabled={!props.active} onClick={props.onClear}>
        Limpiar filtros
      </button>
    </div>
    <div className="catalog-group-field">
      <span className="filter-label" id="catalog-group-label">Grupo muscular</span>
      <div className="filter-pills" role="group" aria-labelledby="catalog-group-label">
        {props.groups.map(group => <button key={group} type="button" className={`pill-btn ${props.selectedGroup === group ? "active" : ""}`}
          aria-pressed={props.selectedGroup === group} onClick={() => props.onGroup(group)}>{group}</button>)}
      </div>
    </div>
  </section>;
}
