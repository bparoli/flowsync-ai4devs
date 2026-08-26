## Why

Una tarea sin fecha de vencimiento no permite comprometerse a un plazo, y sin un veredicto de "vencida" calculado por el sistema, saber que algo se ha pasado de plazo depende de que alguien lo recuerde y compare fechas a mano. La historia FS-118 ya tiene los criterios de aceptación cerrados para resolver ambas cosas sobre la capability de tareas que `add-task-list` dejó sentada.

## What Changes

- Las tareas ganan una fecha de vencimiento opcional, de calendario (sin hora), que se puede poner, cambiar y quitar después de creada la tarea — nunca en el momento de crearla.
- El backend calcula, en cada lectura, si una tarea está vencida (tiene fecha, esa fecha es anterior al día de quien mira, y su estado no es "hecho") y lo expone como `isOverdue`. No se persiste ninguna columna de vencimiento: es un cálculo, no un estado guardado, y depende del día que manda cada cliente para respetar su huso horario.
- Nueva lectura individual de una tarea (`GET /api/v1/tasks/:id`) — la superficie mínima que la historia necesita para "abrir la tarea", ya que hoy no existe ninguna. **BREAKING**: no la hay hoy, así que no rompe nada existente.
- El endpoint de actualización de una tarea gana la capacidad de fijar, cambiar o quitar la fecha de vencimiento, con el mismo modelo de permisos ya usado para el estado (cualquiera, sobre cualquier tarea).
- Nuevo diálogo modal en el frontend, abierto desde un control dedicado en cada fila de la lista, para editar la fecha de una tarea y ver su condición de vencida — sin construir una pantalla de detalle completa (fuera de alcance, ver `design.md`).
- La lista principal no cambia: sigue mostrando solo título, responsable y estado; ninguna fecha ni marca de vencida aparece ahí.
- Explícitamente fuera de alcance: fecha de vencimiento en la creación de una tarea, notificaciones, recordatorios, recurrencia, ordenar o filtrar por fecha, la pantalla de detalle completa, volver de "Hecho" a un estado anterior con la fecha pasada, y tests de cualquier tipo.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `tasks`: se añaden requisitos nuevos (fecha de vencimiento, cálculo de vencimiento, lectura individual, edición de fecha) a la capability que `add-task-list` dejó sentada. Ningún requisito ya documentado de `tasks` cambia de comportamiento — la creación de una tarea sigue aceptando únicamente el título, sin fecha.

## Impact

- **Backend** (`backend/`): nueva columna `due_date` en `tasks` (nullable), un servicio/regla de dominio que calcula `isOverdue` a partir de una fecha de referencia que manda el cliente, extensión del validador y el controlador de actualización para aceptar `dueDate` (poner/cambiar/quitar), nueva acción `show` y su ruta, extensión de `TaskTransformer` para incluir `dueDate` e `isOverdue` en toda representación de una tarea.
- **Frontend** (`frontend/`): nuevo componente `dialog` de shadcn (única incorporación a `components/ui/` en este change), nuevo modal de edición de fecha, control nuevo por fila en `TaskListPage` para abrirlo, funciones nuevas en `lib/api.ts` (`getTask`, `updateTaskDueDate` o extensión de `updateTaskStatus` — se decide en `design.md`), tipos nuevos en `lib/types.ts`.
- **Sin tests**: este change no monta base de pruebas ni añade tests, ni en el backend ni en el frontend, aunque la historia de origen los pida en sus tickets.
