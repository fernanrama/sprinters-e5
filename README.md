# Sprinters · Equipo 5

Motor de planes y rutinas de entrenamiento de **Healthy Life**, desarrollado para la asignatura **Procesos de Software de la Universidad Rey Juan Carlos**.

> Ayudamos a una persona que entrena a preparar una rutina clara, realizar cada sesión y conservar sus resultados para ajustar su entrenamiento con el tiempo.

## Estado actual

La rama `main` incluye:

- Catálogo de 22 ejercicios obtenido desde la API, con fotografías locales, créditos y variantes WebP.
- Información de nombre, grupo muscular, equipamiento e imagen.
- Apertura de una ficha desde cada tarjeta.
- Descripción e instrucciones específicas para cada ejercicio.
- Búsqueda, filtros combinados por grupo y etiqueta, contador y limpieza.
- Creación, edición, ordenación y eliminación de rutinas con persistencia JSON.
- Imágenes antes de añadir y junto a los ejercicios de la rutina.
- Seis rutinas completas de demostración, con almacenamiento local independiente.
- Estados de carga, catálogo vacío y error con reintento.
- Comprobación de tipos, pruebas HTTP y compilación.

### Alcance y límites

- La navegación con teclado, los diálogos, el foco, la adaptación móvil y el zoom al 200 % cuentan con pruebas. Esto no equivale a una certificación de accesibilidad.

La creación y edición están integradas en `main`. Autenticación, programación de sesiones e intercambio entre equipos no forman parte de estas pantallas. El prototipo usa datos ficticios y no es un sistema multiusuario desplegado.

El estado de una historia se determina mediante sus criterios de aceptación y la Definition of Done; la existencia de código en una rama no implica que esté entregada.

## Stack

| Capa | Tecnología |
| --- | --- |
| Interfaz | React + TypeScript + Vite |
| API | Node.js + TypeScript + Express |
| Catálogo actual | Archivo JSON leído por la API |
| Persistencia de rutinas | Archivo JSON local |
| Gestión de dependencias | npm workspaces |

## Requisitos

- **Node.js 24.x**, con npm incluido.
- Git.
- Acceso al repositorio de GitHub.

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
| `npm run demo` | Compilar y servir la demo con seis rutinas independientes. |
| `npm run test:e2e` | Compilar y comprobar los recorridos en Chromium. |
| `npm run test:cross-browser` | Comprobar los recorridos en Chromium y WebKit. |
| `npm run test:zoom` | Comprobar catálogo, creación y edición con zoom real al 200 %. |
| `npm run measure:media` | Medir imágenes con datos temporales aislados. |

La web necesita la API para cargar el catálogo.

### Demo con seis rutinas completas

Desde la raíz del repositorio:

```powershell
npm.cmd run demo
```

Abrir **http://127.0.0.1:3108/#/rutinas**. Mantener la terminal abierta; **Ctrl+C** detiene el servidor.

La demo incluye cuerpo completo (8 ejercicios), torso (6), piernas y glúteos (7), empuje (5), tracción (5) y una sesión sin material (5). Todas tienen series, repeticiones, descanso y RIR.

En el primer arranque, `api/data/routines.demo.json` y `api/data/schedules.demo.json` se copian a sus respectivos archivos locales, ignorados por Git. Las modificaciones sobreviven a recargas y reinicios; no se vuelve a aplicar la semilla si existe el archivo local. Las programaciones de demostración apuntan a rutinas disponibles en la demo. La demo no modifica los archivos personales `routines.local.json` ni `schedules.local.json`. El arranque habitual sigue utilizando el puerto 3001 y sus datos habituales.

### Pruebas de navegador

Si faltan los ejecutables de pruebas:

```powershell
npx.cmd playwright install chromium webkit
```

Después, ejecutar `npm.cmd run check`, `npm.cmd run test:cross-browser` y `npm.cmd run test:zoom`. Las pruebas usan archivos temporales separados de los datos personales.

Firefox es opcional mediante `HEALTHY_LIFE_TEST_FIREFOX=1`; no forma parte de la validación predeterminada porque su ejecutable local ha presentado fallos de arranque en Windows.

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
3. Comprobar que aparecen los 22 ejercicios del catálogo y que búsqueda, grupo y etiqueta se combinan correctamente.
4. Abrir varias fichas, verificar su descripción e instrucciones específicas y comprobar que se puede volver al catálogo.
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
  "imageUrl": "/images/exercises/sentadilla-detail.webp",
  "description": "Ejercicio fundamental para desarrollar la fuerza y volumen del tren inferior.",
  "instructions": "Mantén la espalda recta, baja la cadera hacia atrás hasta romper el paralelo de las rodillas y empuja con fuerza desde los talones para subir."
}
```

La API comprueba los campos obligatorios, etiquetas opcionales, metadatos de imágenes y enlaces de demostración. Los tipos y validadores están en `shared/exercises.ts`. La interfaz muestra una alternativa local si falta una imagen o falla su carga. Procedencia, licencias, dimensiones y hashes están en `web/public/images/exercises/manifest.json`; los créditos se pueden abrir desde el pie de página o `/media-credits.html`.

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

Se ha acordado el contrato documental de la consulta:

```http
GET /users/{id_user}/routines
```

Su respuesta contendrá las rutinas planificadas del usuario, con:

- `id_user`: cadena con el identificador único proporcionado por E1.
- `routines`: lista de rutinas con `routine_id` estable y `name`.
- `exercises`: lista de ejercicios con `exercise_id`, `name`, `sets` y `reps` (series y repeticiones como enteros positivos).
- `programmed_dates`: lista de fechas concretas en formato `AAAA-MM-DD`.
- `routines: []` cuando el usuario no tenga rutinas.

Fernán confirma que E2 aceptó el formato final con `id_user` el **10/10/2026**. E2 ha confirmado que para Sprint 1 no necesita la consulta implementada. El acuerdo y el ejemplo JSON quedan documentados en Miro y enlazados desde [SCRUM-82](https://sprinters-urjc.atlassian.net/browse/SCRUM-82). Esta ruta todavía no está implementada. La URL base, la fecha de integración y el mecanismo de acceso se concretarán al planificar su desarrollo.

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
9. Validar con Ignacio (PO del Sprint 2) los criterios sobre la versión integrada y registrar las evidencias.
10. Actualizar Jira según el resultado real.

Si se añaden o cambian dependencias, incluir también la actualización de `package-lock.json`.

Consultar [CONTRIBUTING.md](CONTRIBUTING.md) para el procedimiento de colaboración.

## Organización del equipo

| Rol | Personas |
| --- | --- |
| Scrum Master | Pendiente de confirmar para Sprint 2 |
| Product Owner delegado | Ignacio (Nacho) |
| Developers | Fernán, Joaquín, Sergio e Irene según tareas del Sprint 2; resto pendiente de confirmar |

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

El workflow [CI](.github/workflows/ci.yml) ejecuta instalación reproducible, tipos, pruebas de API, compilación y regresión en Chromium y WebKit sobre Node 24 y Ubuntu 24.04. Se activa para PR hacia `main`, cambios integrados en `main` y ejecución manual. Los informes y trazas de fallos se conservan durante siete días en los artefactos de Actions. El zoom real y las mediciones comparativas siguen siendo comprobaciones locales explícitas.

### Ramas y archivo histórico

`main` contiene la versión integrada. Cada cambio nuevo usa una rama temporal y una PR revisada; GitHub elimina automáticamente la rama después del merge. Antes de aprobar, actualizar la rama si es necesario y esperar a que CI termine correctamente. Un cambio posterior puede invalidar la aprobación anterior.

Las implementaciones antiguas de SCRUM-83 y SCRUM-89 se conservan en las etiquetas `archive/scrum-83-selector-2026-10-22` y `archive/scrum-89-editor-2026-10-22`. Permiten consultar el selector anterior con búsqueda/multiselección sin reintroducir en el formulario actual su política de ejercicios repetidos. Son referencias históricas, no versiones alternativas que deban integrarse a ciegas.

## Edición de rutinas · Sprint 2

Abrir **/#/rutinas** desde Mis rutinas. Las rutas con `#` funcionan en desarrollo y en la versión compilada.

La API copia `api/data/routines.seed.json` al archivo ignorado `api/data/routines.local.json` solo cuando falta este último. Guardar escribe el JSON local; Cancelar conserva lo guardado. No hay base de datos. Usar únicamente datos ficticios. No ejecutar varios servidores escritores sobre el mismo archivo.

API de rutinas: `GET /api/routines`, `GET /api/routines/:id`, `POST /api/routines`, `PUT /api/routines/:id` y `DELETE /api/routines/:id`. POST recibe nombre e items y devuelve 201; DELETE devuelve 204. PUT recibe nombre, versión e items y devuelve la versión incrementada; responde 409 ante una versión desactualizada. Las rutas tienen también alias sin `/api`.

Cada ejercicio puede aparecer una única vez en una rutina. Series y repeticiones son enteros positivos; los parámetros opcionales `restSeconds` y `rir` son números finitos no negativos. Cero se conserva como valor distinto de ausencia. POST y PUT comparten validación; POST, PUT y DELETE se serializan por archivo dentro de un proceso Node y guardan mediante sustitución atómica. La API admite listas vacías; la interfaz exige al menos un ejercicio al crear. Las rutinas antiguas con duplicados se pueden abrir para corregirlas.

Crear y editar comparten `RoutineForm`. El select permite añadir un ejercicio cada vez con preview; no incorpora la búsqueda y selección múltiple del antiguo selector. Recargar vuelve al listado y requiere abrir de nuevo la rutina: no se ofrecen enlaces directos estables al editor.

El contrato vigente es el descrito arriba y en `shared/routines.ts`. [docs/HU08.md](docs/HU08.md) conserva el diseño y las evidencias históricas del 22/10: sus referencias a ejercicios repetidos, 500 entradas, enlaces directos al editor y tareas pendientes no representan la implementación actual.

### Quitar ejercicios de una rutina guardada (SCRUM-84)

En **Mis Rutinas**, pulsar **Editar** y después **Quitar** junto al ejercicio.
La eliminación solo afecta al borrador hasta pulsar **Guardar Cambios**. Al guardar,
se conserva en el JSON y se comprueba recargando y volviendo a abrir la rutina.
Se puede quitar la última entrada y guardar la rutina vacía; no se borra la rutina
ni el ejercicio del catálogo. La creación de una rutina nueva sigue requiriendo
al menos un ejercicio, como en el formulario existente.

**Cancelar** con cambios permite seguir editando o descartarlos para recuperar la
versión guardada. Durante el guardado se bloquea el formulario; si falla, el borrador
se mantiene para poder reintentar. Orden y parámetros de las entradas restantes
se conservan. La eliminación individual y las mejoras UX posteriores están integradas en `main`; su aceptación y estado Jira deben consultarse en las evidencias del equipo.
