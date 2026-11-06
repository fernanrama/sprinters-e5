import { useEffect, useRef, useState } from "react";
import Catalog from "./Catalog";
import { Routines } from "./routines/Routines";
import "./routines/routines.css";

export default function App() {
  const [route, setRoute] = useState(window.location.hash || "#/catalogo");
  const current = useRef(route);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    function change() {
      const next = window.location.hash || "#/catalogo";
      if (next === current.current) return;
      if (saving || (dirty && !window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos?"))) {
        window.history.replaceState(null, "", current.current); return;
      }
      current.current = next; setDirty(false); setRoute(next); window.scrollTo(0, 0);
    }
    function unload(event: BeforeUnloadEvent) {
      if (dirty || saving) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("hashchange", change);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("beforeunload", unload);
    };
  }, [dirty, saving]);
  const routines = route.startsWith("#/rutinas");
  return <>
    <a className="skip-link" href="#page-content" tabIndex={0} onClick={(event) => {
      event.preventDefault();
      document.getElementById("page-content")?.focus();
    }}>Saltar al contenido</a>
    <header className="topbar">
      <a className="brand" href="#/catalogo" tabIndex={0} aria-label="Healthy Life, catálogo">
        <img src="/brand/urjc.webp" alt="Universidad Rey Juan Carlos" className="university-logo" />
        <span className="brand-title">Healthy Life<small>Entrenamiento · Equipo 5</small></span>
      </a>
      <nav className="primary-nav" aria-label="Navegación principal">
        <a href="#/catalogo" tabIndex={0} aria-current={!routines ? "page" : undefined}>Catálogo</a>
        <a href="#/rutinas" tabIndex={0} aria-current={routines ? "page" : undefined}>Mis rutinas</a>
      </nav>
    </header>
    <div className="page-shell">
      {routines ? <Routines key={route} route={route} onDirty={setDirty} onSaving={setSaving} /> : <Catalog />}
    </div>
    <footer>Universidad Rey Juan Carlos · Healthy Life · Sprinters E5 <a className="media-credits-link" href="/media-credits.html" tabIndex={0}>Créditos de imágenes</a></footer>
  </>;
}
