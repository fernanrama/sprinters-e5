# Cómo trabajamos

1. Elegir una tarjeta de Jira y actualizar su estado al empezar.
2. Partir de `main` actualizado y crear una rama:
   `git switch -c feature/SCRUM-44-catalogo`.
3. Implementar un cambio acotado y ejecutar `npm run check`.
4. Subir la rama y abrir un pull request hacia `main`. Usar la clave de Jira en el título.
5. Enlazar el PR en Jira y mover la tarjeta a revisión.
6. Pedir revisión a un Developer distinto del autor. Resolver sus observaciones antes de integrar.
7. Integrar el cambio en `main` tras la revisión.
8. Para una historia de usuario, Irene verifica los criterios de aceptación sobre la versión integrada; registrar en Jira el resultado, la fecha y el PR o commit comprobado.
9. Actualizar Jira según el resultado real. Finalizar una historia cuando cumpla sus criterios de aceptación y la Definition of Done.

Los puntos de historia, prioridades y contratos con E1/E2 requieren acuerdo del equipo.
No marcar una historia como terminada solo porque existan el código o sus subtareas.

## Preparación inicial completada

La preparación de SCRUM-81 está integrada en `main`. Nacho ha revisado el arranque y Fernán ha registrado su confirmación en Jira. Para clonar o actualizar la versión integrada, seguir el README.

HU01 permite consultar el catálogo y HU04 abrir sus fichas con descripción e instrucciones específicas. Las revisiones técnicas y la aceptación de producto son evidencias distintas: enlazar ambas en la historia correspondiente.
