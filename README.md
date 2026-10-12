# Sprinters · Equipo 5

Motor de planes y rutinas de entrenamiento de Healthy Life, para Procesos de Software de la Universidad Rey Juan Carlos.

Ayudamos a una persona que entrena a preparar una rutina clara, realizar cada sesión y conservar sus resultados para ajustar su entrenamiento con el tiempo.

## Qué está preparado

- Dos paquetes: `web/` y `api/`.
- React + TypeScript + Vite para la interfaz.
- Node.js + TypeScript + Express para la API.
- Cuatro ejercicios de ejemplo en `api/data/exercises.json`.
- La interfaz consulta la API y muestra un catálogo básico, con estados de carga, catálogo vacío y error con reintento.
- Comprobaciones de tipos, pruebas HTTP y compilación.

Este cambio corresponde a **SCRUM-81: preparar el repositorio**. Es una base para HU01 (catálogo) y HU04 (ficha); su existencia no supone aceptación por la PO. La ficha detallada todavía no está implementada. SQLite se añadirá cuando una historia requiera persistencia. Los contratos con E1 y E2 siguen pendientes de acuerdo.

## Requisitos

- **Node.js 24.x**, con npm incluido. Comprobar con `node --version` y `npm --version`.
- Git.
- Acceso al repositorio privado de GitHub. El propietario debe invitar al equipo.

Descargas oficiales: [Node.js](https://nodejs.org/) y [Git](https://git-scm.com/).
El archivo `.nvmrc` indica la versión principal de Node.

## Clonar y arrancar desde cero

Mientras el PR de preparación esté abierto, clonar su rama:

```sh
git clone --branch chore/SCRUM-81-preparar-repositorio https://github.com/fernanrama/sprinters-e5.git
cd sprinters-e5
npm ci
npm run dev
```

Cuando se integre el PR en `main`, se puede clonar sin `--branch`.
Para una copia ya existente: `git fetch origin` y `git switch chore/SCRUM-81-preparar-repositorio`.

Abrir **http://127.0.0.1:5173**. Deben aparecer los cuatro ejercicios.
El comando arranca la web y la API en la misma terminal; detenerlas con **Ctrl+C**.

En Windows, si PowerShell bloquea `npm.ps1`, usar `npm.cmd` en lugar de `npm`.
No es necesario modificar la política de seguridad.

## Comandos

Ejecutar desde la carpeta raíz del repositorio:

| Comando | Para qué sirve |
| --- | --- |
| `npm ci` | Instalar exactamente las dependencias del archivo de bloqueo. |
| `npm run dev` | Arrancar API (3001) y web (5173) en desarrollo. |
| `npm run dev:api` | Arrancar solo la API. |
| `npm run dev:web` | Arrancar solo la web; necesita la API para cargar datos. |
| `npm run typecheck` | Comprobar los tipos de TypeScript. |
| `npm test` | Probar las respuestas HTTP del catálogo. |
| `npm run build` | Compilar la web y la API. |
| `npm run check` | Comprobar tipos, ejecutar pruebas y compilar. |
| `npm start` | Arrancar la API compilada y servir la web compilada en el puerto 3001. |

Para comprobar el resultado compilado:

```sh
npm run build
npm start
```

Abrir **http://127.0.0.1:3001**. Este modo requiere haber compilado primero.
Es una comprobación local; no configura un despliegue en Internet.

## Cómo comprobar que ambas partes funcionan

1. Ejecutar `npm run check`. Debe terminar sin errores.
2. Ejecutar `npm run dev` y abrir la web en el puerto 5173.
3. Verificar que aparecen Sentadilla, Remo con mancuerna, Press de banca y Plancha.
4. Abrir **http://127.0.0.1:3001/health**. Debe mostrar `"status": "ok"`.
5. Abrir **http://127.0.0.1:3001/exercises**. Debe devolver el catálogo JSON.
6. Para comprobar el catálogo vacío, cambiar temporalmente el archivo de datos por `[]` y recargar la web. Restaurarlo después.
7. Para comprobar el error de conexión, arrancar solo la web, manteniendo la API detenida. Debe mostrar el error y permitir reintentar.

La API lee el archivo en cada petición: cambiar el JSON y recargar basta para comprobar que la interfaz recibe datos de la API.

## API inicial

| Método y ruta | Respuesta |
| --- | --- |
| `GET /health` | Estado de servicio, sin comprobar el contenido del catálogo. |
| `GET /exercises` | Lista de ejercicios; `[]` si el catálogo está vacío. |
|`GET /exercises/:id` | Ejercicio concreto; HTTP 404 con `{"error":"Ejercicio no encontrado."}` si no existe. |
Ejemplo de un elemento:

```json
{
  "id": "sentadilla",
  "name": "Sentadilla",
  "muscleGroup": "Piernas",
  "equipment": "Peso corporal"
}
```

Los cuatro campos son cadenas no vacías. Si el JSON no se puede leer o su estructura es inválida, la API devuelve HTTP 500 con `{"error":"No se pudo cargar el catálogo."}`.

Durante el desarrollo, Vite envía las llamadas de la web a `/api/exercises` a la API local, sin necesidad de configurar CORS. La API también expone el prefijo `/api` para servir la web compilada. Este contrato interno de E5 no sustituye los acuerdos con los otros equipos.

## Estructura

```text
sprinters-e5/
├── web/
│   ├── src/                 Interfaz React
│   └── vite.config.ts       Puerto y conexión con la API
├── api/
│   ├── src/                 Servidor Express y pruebas HTTP
│   └── data/exercises.json  Catálogo inicial
├── .github/                 Plantilla de pull request
├── CONTRIBUTING.md          Ramas, revisión y Jira
├── package.json             Comandos del equipo
└── package-lock.json        Versiones reproducibles
```

## Si algo no arranca

- **Node incorrecto:** usar Node 24.x y volver a ejecutar `npm ci`.
- **Puerto ocupado:** detener la instancia anterior. Los puertos son fijos (3001/5173) para evitar conectar la web a una API distinta por accidente.
- **Error de carga:** comprobar la terminal de la API y `/health`.
- **Error del catálogo:** revisar `api/data/exercises.json`.
- **Repositorio no encontrado:** comprobar la cuenta y la invitación al repositorio privado.
- **No aparece la web en el puerto 3001:** ejecutar primero `npm run build`.

## Organización y revisión

- Scrum Master: Fernán.
- Product Owner delegada: Irene.
- Developers: Nacho, Christopher, Joaquín y Sergio.
- [Jira](https://sprinters-urjc.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog): backlog y seguimiento.
- Miro: decisiones, diseño y acuerdos con otros equipos.

Seguir [CONTRIBUTING.md](CONTRIBUTING.md): rama por cambio, PR hacia `main`, revisión por otro Developer y validación de criterios con Irene para las historias.
Las pruebas HTTP verifican catálogo real, catálogo vacío y datos inválidos. No hay pipeline de CI configurado todavía.
