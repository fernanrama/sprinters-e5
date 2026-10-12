# Sprinters · Equipo 5

Motor de planes y rutinas de entrenamiento de **Healthy Life**, desarrollado para la asignatura **Procesos de Software de la Universidad Rey Juan Carlos**.

> Ayudamos a una persona que entrena a preparar una rutina clara, realizar cada sesión y conservar sus resultados para ajustar su entrenamiento con el tiempo.

## Estado actual

La rama `main` incluye:

- Catálogo de 14 ejercicios obtenido desde la API.
- Información de nombre, grupo muscular, equipamiento e imagen.
- Apertura de una ficha desde cada tarjeta.
- Estados de carga, catálogo vacío y error con reintento.
- Comprobación de tipos, pruebas HTTP y compilación.

### Pendientes conocidos

- Incorporar instrucciones específicas para cada ejercicio: la ficha actual utiliza un texto genérico.
- Incorporar la consulta individual `GET /exercises/:id`.
- Corregir la ruta del logo URJC.
- Mejorar la navegación mediante teclado y la accesibilidad del modal.

La creación de rutinas, SQLite, la autenticación y las consultas entre equipos todavía no están integradas en `main`.

El estado de una historia se determina mediante sus criterios de aceptación y la Definition of Done; la existencia de código en una rama no implica que esté entregada.

## Stack

| Capa | Tecnología |
| --- | --- |
| Interfaz | React + TypeScript + Vite |
| API | Node.js + TypeScript + Express |
| Catálogo actual | Archivo JSON leído por la API |
| Persistencia prevista | SQLite |
| Gestión de dependencias | npm workspaces |

## Requisitos

- **Node.js 24.x**, con npm incluido.
- Git.
- Acceso al repositorio privado de GitHub.

Comprobar las versiones:

```sh
node --version
npm --version
git --version
```

El archivo `.nvmrc` indica la versión principal de Node.js.

## Instalación y arranque

Ejecutar desde una terminal:

```sh
git clone --branch main https://github.com/fernanrama/sprinters-e5.git
cd sprinters-e5
npm ci
npm run dev
```

Abrir:

- **Aplicación:** http://127.0.0.1:5173
- **Estado de la API:** http://127.0.0.1:3001/health
- **Catálogo JSON:** http://127.0.0.1:3001/exercises

`npm run dev` arranca la web y la API en la misma terminal. Para detenerlas, pulsar **Ctrl+C**.

### Windows y PowerShell

Si PowerShell bloquea `npm.ps1`, sustituir `npm` por `npm.cmd`:

```powershell
npm.cmd ci
npm.cmd run dev
```

No es necesario cambiar la política de ejecución de PowerShell.

### Actualizar una copia existente

Con los cambios propios guardados o confirmados, ejecutar:

```sh
git switch main
git pull --ff-only origin main
npm ci
npm run dev
```

Si Git avisa de cambios locales o de una divergencia, detenerse y resolverla antes de continuar. No utilizar comandos de borrado o reinicio para descartar trabajo de compañeros.

## Comandos

Ejecutar desde la raíz del repositorio:

| Comando | Función |
| --- | --- |
| `npm ci` | Instalar las dependencias según `package-lock.json`. |
| `npm run dev` | Arrancar API y web en desarrollo. |
| `npm run dev:api` | Arrancar únicamente la API. |
| `npm run dev:web` | Arrancar únicamente la web. |
| `npm run typecheck` | Comprobar los tipos de TypeScript. |
| `npm test` | Ejecutar las pruebas HTTP. |
| `npm run build` | Compilar la web y la API. |
| `npm run check` | Comprobar tipos, ejecutar pruebas y compilar. |
| `npm start` | Servir la aplicación compilada desde la API. |

La web necesita la API para cargar el catálogo.

### Comprobar la versión compilada

```sh
npm run build
npm start
```

Abrir **http://127.0.0.1:3001**.

Este procedimiento permite ejecutar la aplicación compilada en el ordenador local; no configura un despliegue en Internet.

## Comprobación del funcionamiento

Antes de abrir un pull request:

1. Ejecutar `npm run check` y comprobar que termina sin errores.
2. Arrancar la aplicación con `npm run dev`.
3. Comprobar que aparecen los 14 ejercicios del catálogo.
4. Abrir varias fichas y verificar los datos de cada ejercicio.
5. Comprobar que `/health` devuelve `"status": "ok"`.
6. Comprobar que `/exercises` devuelve una lista JSON.

Las pruebas automatizadas cubren las respuestas del catálogo, incluido el catálogo vacío y distintos errores de los datos. No sustituyen la comprobación visual ni la validación de los criterios de aceptación.

### Comprobar el estado de error

1. Detener la aplicación.
2. Ejecutar solo `npm run dev:web`, manteniendo la API detenida.
3. Abrir la web y comprobar el mensaje de error.
4. Arrancar la API en otra terminal con `npm run dev:api`.
5. Pulsar el botón de reintento y comprobar que se carga el catálogo.

### Comprobar el catálogo vacío

En una copia local de prueba:

1. Guardar una copia del contenido de `api/data/exercises.json`.
2. Sustituir temporalmente su contenido por `[]`.
3. Recargar la web y comprobar el mensaje de catálogo vacío.
4. Restaurar inmediatamente el contenido original.

La API lee el archivo en cada petición. No subir al repositorio las modificaciones temporales utilizadas para estas comprobaciones.

## API disponible

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/health` | Estado del servicio. |
| GET | `/exercises` | Lista de ejercicios; `[]` si está vacía. |

Estas rutas también están disponibles bajo el prefijo `/api`.

Ejemplo de un ejercicio:

```json
{
  "id": "sentadilla",
  "name": "Sentadilla",
  "muscleGroup": "Piernas",
  "equipment": "Peso corporal",
  "imageUrl": "https://i.blogs.es/76cc7d/1366_2000/450_1000.jpeg"
}
```

La API comprueba que `id`, `name`, `muscleGroup` y `equipment` sean cadenas no vacías. Actualmente no valida `imageUrl`.

Si el archivo no se puede leer o los datos son inválidos, devuelve HTTP 500:

```json
{
  "error": "No se pudo cargar el catálogo."
}
```

Las rutas inexistentes devuelven HTTP 404:

```json
{
  "error": "Recurso no encontrado."
}
```

En desarrollo, Vite redirige las peticiones de la web a `/api` hacia la API local. No hace falta configurar CORS para este arranque.

## Acuerdos con otros equipos

Los contratos compartidos se registran en el Miro común y se siguen mediante **SCRUM-82**.

### Equipo 1 · Identidad

- El identificador proporcionado por el login se llama `id_user`.
- E1 ha confirmado que es único.
- El login actual no proporciona un token.
- E5 utilizará ese identificador sin generar otro para el mismo usuario.

Este acuerdo describe el prototipo actual. La comprobación de permisos deberá concretarse antes de integrar datos personales reales.

### Equipo 2 · Hábitos

Se ha propuesto la consulta:

```http
GET /users/{id_user}/routines
```

Su respuesta contendrá las rutinas planificadas del usuario, con:

- Identificador y nombre de la rutina.
- Ejercicios con identificador, nombre, series y repeticiones.
- Fechas concretas en formato `AAAA-MM-DD`.
- Una lista vacía cuando el usuario no tenga rutinas.

E2 ha confirmado que para Sprint 1 no necesita la consulta implementada. El acuerdo y el ejemplo JSON quedan documentados en Miro; cualquier ajuste del formato se registrará allí.

Los datos planificados y los entrenamientos realmente realizados son conceptos distintos. El intercambio de resultados requerirá un contrato específico.

## Estructura del repositorio

```text
sprinters-e5/
├── web/
│   ├── src/                 Interfaz React y estilos
│   └── vite.config.ts       Configuración de Vite y proxy
├── api/
│   ├── src/                 API Express y pruebas HTTP
│   └── data/
│       └── exercises.json   Catálogo de ejercicios
├── .github/                 Plantilla de pull request
├── .nvmrc                   Versión principal de Node.js
├── CONTRIBUTING.md          Procedimiento de colaboración
├── package.json             Workspaces y comandos comunes
└── package-lock.json        Dependencias reproducibles
```

## Cómo trabajamos

1. Elegir una incidencia de Jira y actualizar su estado.
2. Partir de `main` actualizado.
3. Crear una rama para un cambio acotado, por ejemplo:

   ```sh
   git switch -c feature/SCRUM-45-ficha-ejercicio
   ```

4. Implementar el cambio y ejecutar `npm run check`.
5. Subir la rama y abrir un pull request hacia `main`.
6. Incluir la clave de Jira en el título y enlazar el PR en la incidencia.
7. Obtener la revisión de un Developer distinto del autor.
8. Integrar el cambio tras resolver las observaciones.
9. Validar con Irene los criterios sobre la versión integrada y registrar las evidencias.
10. Actualizar Jira según el resultado real.

Si se añaden o cambian dependencias, incluir también la actualización de `package-lock.json`.

Consultar [CONTRIBUTING.md](CONTRIBUTING.md) para el procedimiento de colaboración.

## Organización del equipo

| Rol | Personas |
| --- | --- |
| Scrum Master | Fernán |
| Product Owner delegada | Irene |
| Developers | Nacho, Christopher, Joaquín y Sergio |

- **Jira:** historias, tareas, prioridades, estimaciones, estados y evidencias.
- **Miro:** objetivos, diseño, mapa de historias y acuerdos entre equipos.
- **GitHub:** código, ramas, pull requests y revisiones.

[Jira del equipo](https://sprinters-urjc.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog)

## Resolución de problemas

| Problema | Qué comprobar |
| --- | --- |
| No se puede clonar | Cuenta de GitHub y acceso al repositorio privado. |
| PowerShell bloquea npm | Utilizar `npm.cmd`. |
| Versión de Node incompatible | Instalar Node.js 24.x y repetir `npm ci`. |
| Puerto ocupado | Detener la instancia anterior; se utilizan 3001 y 5173. |
| La web no carga el catálogo | Comprobar la terminal de la API y `/health`. |
| La API devuelve 500 | Revisar el formato y contenido de `api/data/exercises.json`. |
| No aparece la web en el puerto 3001 | Ejecutar `npm run build` antes de `npm start`. |
| `npm ci` indica discrepancias | Revisar que el cambio incluya un `package-lock.json` actualizado. |

Actualmente no hay un pipeline de integración continua configurado. Las comprobaciones se ejecutan localmente mediante `npm run check`.
