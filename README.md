# Sprinters · Equipo 5

Motor de planes y rutinas de entrenamiento de Healthy Life.
Proyecto de la asignatura Procesos de Software de la Universidad Rey Juan Carlos.

## Propósito

Ayudamos a una persona que entrena a preparar una rutina clara, realizar cada sesión y conservar sus resultados para ajustar el entrenamiento con el tiempo.

## Primer incremento

El objetivo del Sprint 1 es que una persona pueda consultar el catálogo de ejercicios y abrir una ficha con instrucciones para elegir qué incorporar a su rutina.

Historias prioritarias:
- HU01: consultar el catálogo de ejercicios.
- HU04: consultar la ficha de un ejercicio.

## Stack acordado

- Interfaz: React + TypeScript + Vite.
- API: Node.js + TypeScript + Express.
- Catálogo inicial: JSON leído por la API.
- Persistencia posterior: SQLite cuando una historia la requiera.

## Estado del repositorio

Repositorio inicializado. La aplicación todavía no está implementada.
Las instrucciones de instalación, arranque y comprobación se incorporarán al preparar la estructura de desarrollo.

## Organización

- Scrum Master: Fernán.
- Product Owner delegada: Irene.
- Developers: Nacho, Christopher, Joaquín y Sergio.
- Miro recoge las decisiones y el diseño del producto.
- [Jira](https://sprinters-urjc.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog) contiene el backlog y el seguimiento del sprint.

## Forma de trabajo

1. Partir de una historia o tarea de Jira.
2. Crear una rama para el cambio, por ejemplo `feature/hu01-catalogo`.
3. Abrir un pull request hacia `main` y enlazarlo en Jira.
4. Pedir revisión a otro Developer.
5. Comprobar los criterios de aceptación con la Product Owner y actualizar la documentación antes de marcar la historia como terminada.

No incluir secretos ni credenciales en el repositorio. Los contratos con los equipos 1 y 2 deben acordarse y documentarse antes de implementar las integraciones.
