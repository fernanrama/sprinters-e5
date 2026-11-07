# Cómo trabajamos

1. Elegir una tarjeta de Jira y actualizar su estado al empezar.
2. Partir de `main` actualizado y crear una rama:
   `git switch -c feature/SCRUM-44-catalogo`.
3. Implementar un cambio acotado y ejecutar `npm run check`.
4. Subir la rama y abrir un pull request hacia `main`. Usar la clave de Jira en el título.
5. Enlazar el PR en Jira y mover la tarjeta a revisión.
6. Pedir revisión a un Developer distinto del autor. Resolver sus observaciones antes de integrar.
7. Cuando se complete una historia, Ignacio (Nacho), PO del Sprint 2, verifica los criterios de aceptación.
8. Integrar tras la revisión y actualizar Jira según el resultado real.

Los puntos de historia, prioridades y contratos con E1/E2 requieren acuerdo del equipo.
No marcar una historia como terminada solo porque existan el código o sus subtareas.

## Mantenimiento y comprobaciones

- Los cambios de documentación y mantenimiento sin tarjeta asociada pueden indicar «No aplica: mantenimiento sin Jira», sin inventar claves. Mantener revisión mediante PR.
- Antes de publicar, ejecutar `npm run check`; para cambios funcionales o de interfaz, ejecutar también `npm run test:cross-browser`. En Windows se puede usar `npm.cmd`.
- CI verifica cada PR y los cambios integrados en `main`. Revisar los resultados reales y los artefactos de fallos en Actions. Las comprobaciones automáticas no sustituyen la revisión de otro miembro ni la aceptación de producto.
- Actualizar la rama con `main` antes de la aprobación final si hay cambios de base; después de publicar cambios adicionales, comprobar si la revisión ha quedado invalidada.
- Las ramas de PR integradas se eliminan automáticamente. Usar `git fetch origin --prune` para retirar referencias locales obsoletas. No borrar una rama con trabajo exclusivo sin revisión o referencia de archivo.
- Las pruebas trabajan con datos temporales; no versionar `routines.local.json`, `routines.demo.local.json`, informes ni trazas de navegador.

## Preparación inicial completada

La preparación de SCRUM-81 está integrada en `main`. Nacho ha revisado el arranque y Fernán ha registrado su confirmación en Jira. Para clonar o actualizar la versión integrada, seguir el README.

HU01 permite consultar el catálogo y HU04 abrir sus fichas con descripción e instrucciones específicas. Las revisiones técnicas y la aceptación de producto son evidencias distintas: enlazar ambas en la historia correspondiente.
