# Capability `tasks`

La lista de trabajo del equipo: **una sola lista compartida** con las tareas del
espacio, donde apuntar algo cuesta escribir un título y donde el responsable y
el estado de cada tarea se leen sin abrir nada.

> **Las reglas no viven aquí.** La fuente de verdad es
> [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md) — 32
> requirements y 124 scenarios—, y este README **no las repite**: dice dónde
> está cada cosa en el código y enlaza al requisito que la manda. Si algo de
> aquí contradice a la spec, manda la spec (ver
> [ADR 0001](../../adr/0001-openspec-como-fuente-de-verdad.md)).

## Qué hace

Una tarea tiene título, responsable, estado y —opcionalmente— fecha de
vencimiento. Se crea escribiendo solo el título; el responsable y el estado los
pone el sistema. Cualquiera con sesión ve la lista entera y puede cambiar el
estado o la fecha de cualquier tarea, sea suya o no: **no hay permisos por
responsable**.

Los tres estados son `pending`, `in_progress` y `done`, y son fijos.

## Endpoints

Todos cuelgan de `/api/v1` y **todos exigen token** (`Authorization: Bearer`);
el grupo lleva `.use(middleware.auth())` en
[`backend/start/routes.ts`](../../../backend/start/routes.ts).

| Método | Ruta | Controlador | Validador | Transformer | Requisito que lo manda |
|---|---|---|---|---|---|
| `GET` | `/tasks` | `TasksController.index` | `listTasksValidator` | `TaskTransformer` | [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio) · [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado) |
| `POST` | `/tasks` | `TasksController.store` | `createTaskValidator` | `TaskTransformer` (201) | [Creación de una tarea con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título) |
| `GET` | `/tasks/:id` | `TasksController.show` | `taskReferenceDayValidator` | `TaskDetailTransformer` | [Consulta de una tarea suelta](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta) |
| `PATCH` | `/tasks/:id/status` | `TaskStatusesController.update` | `updateTaskStatusValidator` | `TaskTransformer` | [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) |
| `PUT` | `/tasks/:id/due-date` | `TaskDueDatesController.update` | `setTaskDueDateValidator` | `TaskDetailTransformer` | [Fijar, cambiar y retirar la fecha de vencimiento](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento) |

Parámetros y cuerpos:

- `GET /tasks` acepta `?status=` con **uno** de los tres estados. Sin él no
  devuelve «todas»: devuelve la vista por defecto.
- `GET /tasks/:id` **exige** `?today=AAAA-MM-DD`.
- `POST /tasks` lee `{"title": "..."}` y nada más.
- `PATCH .../status` lee `{"status": "..."}`.
- `PUT .../due-date` lee `{"dueDate": "AAAA-MM-DD" | null, "today": "AAAA-MM-DD"}`.

El contrato completo —con sus códigos de respuesta y la forma de cada objeto—
está en el documento OpenAPI que sirve el propio backend: **`/api.json`** y la
interfaz en **`/api`** (por defecto `http://localhost:3333/api`). Los esquemas
salen de [`backend/app/openapi/schemas.ts`](../../../backend/app/openapi/schemas.ts).

## Dónde vive cada regla

La spec dice **qué** debe pasar; esta tabla dice **dónde** está implementado,
para poder ir del requisito al código sin buscar.

| Regla | Implementación | Requisito |
|---|---|---|
| Los tres estados | `TASK_STATUSES` en [`app/models/task.ts`](../../../backend/app/models/task.ts) | [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos) |
| El alcance por defecto de la lista | `DEFAULT_LIST_STATUSES` en `app/models/task.ts`, aplicado en `TasksController.index` | [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio) |
| Cuándo una tarea está vencida | `Task.isOverdueOn(referenceDay)` — **única definición del sistema** | [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida) |
| El día de referencia lo pone quien mira | `taskReferenceDayValidator` y `setTaskDueDateValidator`, sin valor por defecto | [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira) |
| Título recortado, obligatorio y de 200 como mucho | `createTaskValidator` en [`app/validators/task.ts`](../../../backend/app/validators/task.ts) | [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título) · [Aviso ante un título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo) |
| Un estado inventado es `422`, nunca una lista vacía | `listTasksValidator` (opcional) + rama del controlador | [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío) |
| Lo que se enseña del responsable | `TaskAssigneeTransformer` — **no** reutiliza `UserTransformer`, que traería el email | [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) |
| La lista no enseña el vencimiento | Dos transformers separados: `TaskTransformer` (lista) y `TaskDetailTransformer` (detalle) | [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento) |
| Sin permisos por responsable | Ausencia deliberada de comprobación en los tres controladores de escritura | [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) |

Dos cosas que se rompen con facilidad y que la spec protege explícitamente:

- **La comparación de vencimiento es `<` y no `<=`.** Vencer hoy todavía no es
  estar vencida. Un `<=` incumple el requisito sin que nada falle ruidosamente.
- **`DEFAULT_LIST_STATUSES` está escrito dos veces**, en `app/models/task.ts` y
  en [`frontend/src/lib/types.ts`](../../../frontend/src/lib/types.ts), y tiene
  que seguir siendo el mismo conjunto: de esa coincidencia depende que marcar
  algo como hecho lo saque de la vista al instante. **Nada lo comprueba
  automáticamente.**

## Frontend

| Pieza | Fichero |
|---|---|
| Lista, filtro y creación | `frontend/src/pages/tasks-page.tsx` |
| Detalle de una tarea y su fecha | `frontend/src/pages/task-page.tsx` |
| Fila y control de filtro | `frontend/src/components/task-item.tsx`, `task-filter.tsx` |
| Llamadas a la API | `frontend/src/lib/api.ts` (`listTasks`, `createTask`, `getTask`, `updateTaskStatus`, `setTaskDueDate`) |
| Tipos espejo del backend | `frontend/src/lib/types.ts` |

El día de referencia lo calcula `localToday()` en `lib/api.ts` con métodos
locales de `Date` y **nunca** con `toISOString()`, que daría el día en UTC.
Ninguna pantalla compara fechas: `isOverdue` llega resuelto del servidor.

## Cómo se prueba en local

### Levantar el entorno

```bash
cd backend
npm install
cp .env.example .env && node ace generate:key   # solo la primera vez
node ace migration:run                          # crea tmp/db.sqlite3
npm run dev                                     # http://localhost:3333
```

```bash
cd frontend
npm install
npm run dev                                     # http://localhost:5173
```

### Tests automatizados

```bash
cd backend
npm test                        # las dos suites
node ace test --files=assignee  # solo los tests de tasks
```

**Estado real de la cobertura:** la capability tiene **un solo fichero de
tests**, `backend/tests/functional/tasks/assignee.spec.ts`, con **3 tests** que
cubren los tres scenarios de
[Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable).
Los otros 31 requirements **no tienen ni un test**: los tres changes que
construyeron esta capability renunciaron a ellos de forma explícita. El resto de
la verificación es manual.

En el frontend **no hay runner de tests instalado**, así que las 15 requirements
de interfaz solo se comprueban a mano.

> **Cuidado con la base de datos.** `config/database.ts` define una única
> conexión SQLite sin override por entorno, así que la suite functional pega
> contra **el mismo fichero** que el servidor de desarrollo. Por eso
> `assignee.spec.ts` se aísla con `testUtils.db().withGlobalTransaction()` y no
> con un truncate: vaciar la tabla se llevaría por delante tus datos. Si añades
> tests que escriben, haz lo mismo.

### Probar los endpoints a mano

Lo más rápido es la interfaz de Scalar en **<http://localhost:3333/api>**, que
lista las operaciones con sus cuerpos y permite lanzarlas.

Con `curl`, sacando primero un token:

```bash
TOKEN=$(curl -s -X POST http://localhost:3333/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"tu@email.com","password":"tucontraseña"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

HOY=$(date +%F)

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3333/api/v1/tasks"                       # vista por defecto
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3333/api/v1/tasks?status=done"           # solo las hechas
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3333/api/v1/tasks/1?today=$HOY"          # una suelta

curl -s -X POST "http://localhost:3333/api/v1/tasks" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Revisar el informe"}'

curl -s -X PATCH "http://localhost:3333/api/v1/tasks/1/status" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}'

curl -s -X PUT "http://localhost:3333/api/v1/tasks/1/due-date" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"dueDate\":\"2026-09-30\",\"today\":\"$HOY\"}"
```

Los cuatro caminos que conviene comprobar a mano, porque ningún test los cubre y
son los que la spec señala como frágiles:

1. `?status=archivado` → `422` sobre el campo `status`, **no** una lista vacía.
2. `?status=in_progress` sin ninguna tarea en ese estado → `200` con lista vacía.
3. `GET /tasks/:id` **sin** `today` → `422`, no el día del servidor.
4. Una tarea que vence **hoy** → `isOverdue: false`; con `today` un día después
   → `true`, sin haber tocado la tarea.

### Antes de dar algo por bueno

```bash
cd backend  && npm run lint && npm run typecheck && npm test
cd frontend && npm run lint && npm run build   # el typecheck vive en build
```

Si tocas controladores o rutas, arranca el servidor o corre los tests para
regenerar `backend/.adonisjs/` y commitea el diff.
