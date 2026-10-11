# Cómo trabajamos

1. Elegir una tarjeta de Jira y actualizar su estado al empezar.
2. Partir de `main` actualizado y crear una rama:
   `git switch -c feature/SCRUM-44-catalogo`.
3. Implementar un cambio acotado y ejecutar `npm run check`.
4. Subir la rama y abrir un pull request hacia `main`. Usar la clave de Jira en el título.
5. Enlazar el PR en Jira y mover la tarjeta a revisión.
6. Pedir revisión a un Developer distinto del autor. Resolver sus observaciones antes de integrar.
7. Cuando se complete una historia, Irene verifica los criterios de aceptación.
8. Integrar tras la revisión y actualizar Jira según el resultado real.

Los puntos de historia, prioridades y contratos con E1/E2 requieren acuerdo del equipo.
No marcar una historia como terminada solo porque existan el código o sus subtareas.

## Trabajo con la preparación inicial

El PR de SCRUM-81 prepara la estructura y un catálogo mínimo conectado a la API.
Debe revisarlo otro Developer antes de integrarlo. Para probarlo mientras está abierto,
consultar la sección de clonación del README.
