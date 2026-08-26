## Context

`add-task-list` dejó una capability `tasks` con tres operaciones (listar, crear, actualizar estado) y ninguna noción de fecha. FS-118 pide fecha de vencimiento, un veredicto de "vencida" calculado por día del calendario (sin hora), y una forma de "abrir la tarea" que hoy no existe. Con la decisión ya tomada con el usuario: creación sigue sin fecha (`POST /tasks` no cambia), y "abrir la tarea" se resuelve con un diálogo modal, no con una pantalla de detalle.

## Goals / Non-Goals

**Goals:**
- Persistir una fecha de vencimiento opcional por tarea, editable después de creada.
- Calcular `isOverdue` en cada lectura, según el día que indica quien consulta — nunca persistido, nunca fijado por el estado en un momento dado.
- Exponer la lectura individual mínima que la historia necesita, y un modal de edición en el frontend que la consume.

**Non-Goals (deliberado, no placeholders):**
- Pantalla de detalle completa de una tarea (PA-6 del PRD, sigue sin resolver).
- Fecha de vencimiento en la creación de una tarea.
- Notificaciones, recordatorios, recurrencia, ordenar o filtrar por fecha.
- Volver de "Hecho" a un estado anterior con la fecha pasada (PA-7, sin decidir).
- Tests de cualquier tipo, aunque la historia de origen los pida en sus tickets.

## Decisions

- **Columna `due_date`, tipo fecha sin hora.** `table.date('due_date').nullable()` en la migración, `@column.date()` en el modelo (`declare dueDate: DateTime | null`) — Lucid distingue `column.date()` de `column.dateTime()`, y este proyecto ya tiene configurado un transform global de VineJS que convierte `vine.date()` a Luxon `DateTime` (`start/validator.ts`), así que el validador y el modelo hablan el mismo tipo sin conversión manual.
- **La regla de vencimiento vive en el modelo `Task`**, como un método de instancia `isOverdueOn(referenceDate: DateTime): boolean` que compara `dueDate` (fecha de calendario) contra `referenceDate` y el `status` actual — mismo sitio donde `User` ya guarda su propia lógica de dominio (`initials`). No se reimplementa en el transformer ni en el frontend.
- **Mecanismo del día de referencia: un parámetro de query `referenceDate` (fecha simple, `YYYY-MM-DD`), aceptado por los cuatro endpoints de tareas** (`GET /tasks`, `GET /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id`). Si falta o no es una fecha válida, el servidor usa su propio día (UTC, coherente con `TZ=UTC` del `.env`) como fallback razonable — un cliente que no lo mande obtiene un veredicto calculado con el día del servidor, no el suyo; el frontend de este change siempre lo manda, así que en la práctica no ocurre. Query string y no body porque así el mismo mecanismo sirve igual para lecturas (`GET`) y escrituras (`POST`/`PATCH`), sin duplicar la forma de mandarlo según el verbo.
- **`TaskTransformer` recibe el día de referencia como segundo argumento del constructor** (`TaskTransformer.transform(task, referenceDate)` / `TaskTransformer.transform(tasks, referenceDate)`), aprovechando que `BaseTransformer` ya soporta argumentos extra en `transform()` que se reenvían al constructor. Un único transformer, usado en los cuatro endpoints, mantiene una sola forma del recurso "tarea" con `dueDate` (`YYYY-MM-DD` o `null`) e `isOverdue` (booleano) siempre presentes — incluida la respuesta de `GET /tasks`, aunque `TaskListPage` no los pinte.
- **`isOverdue` nunca se lee del payload de entrada.** `createTaskValidator` y `updateTaskValidator` no declaran ningún campo `isOverdue`; VineJS ya descarta en este proyecto cualquier campo no declarado (comprobado en `add-task-list`: enviar `status`/`assigneeId` al crear se ignora sin error), así que si un cliente lo manda, desaparece sin más.
- **`updateTaskValidator` gana `dueDate` opcional y anulable** (`vine.date().nullable().optional()`), y `status` pasa a opcional también (antes era obligatorio) para que una actualización pueda tocar solo la fecha, solo el estado, o ambos en la misma petición. La distinción "no enviar el campo" (no tocar la fecha) frente a "enviarlo como `null`" (quitarla) se resuelve mirando si la clave `dueDate` está presente en el payload validado, no solo su valor.
- **Nuevo `GET /api/v1/tasks/:id`** (acción `show`), mismo grupo autenticado que el resto de `/tasks`, sin comprobar responsable — igual que `update` hoy. Es la única superficie de lectura individual que este change añade; no hay ruta ni componente de "pantalla de tarea".
- **Frontend: diálogo modal (`components/ui/dialog`, shadcn) en vez de una ruta nueva.** Se abre desde un botón/icono dedicado en cada fila de `TaskListPage` (no la fila completa, para no interferir con el `<select>` de estado ya presente). Al abrirse hace `GET /tasks/:id?referenceDate=...` para traer fecha y veredicto frescos — no reutiliza los datos ya cargados en la lista, porque el propósito de añadir la lectura individual es precisamente que "abrir" dispare una lectura propia. Cambiar el campo de fecha dispara de inmediato un `PATCH /tasks/:id` (autoguardado, sin botón "Guardar"); quitar la fecha es el mismo `PATCH` con `dueDate: null`, sin diálogo de confirmación.
- **Campo de fecha: `<input type="date">` nativo.** El proyecto no tiene ningún componente de fecha propio; la propia historia (ticket FS-118.4) señala que decidir esto es un prerrequisito. Resolución: campo nativo, cero dependencias nuevas, teclado y accesibilidad ya resueltos por el navegador.
- **Señal de vencida: texto explícito ("Vencida"), no solo color.** Un badge con icono (`lucide-react`, ya es dependencia) más la palabra en texto — cumple "no depende solo del color" sin necesitar ningún componente de badge nuevo.
- **`Task` (tipo de frontend) se amplía con `dueDate: string | null` e `isOverdue: boolean`,** presentes en todas las respuestas por el transformer compartido, aunque `TaskListPage` siga sin leerlos — evita tener dos formas distintas del mismo recurso según el endpoint.

## Risks / Trade-offs

- [`<input type="date">` nativo] → el selector visual cambia según navegador/SO. Mitigación: aceptable, es la resolución más simple posible y ya decidida; el contrato (`YYYY-MM-DD`) es el mismo para todos.
- [Día de referencia en la query string, repetido en cuatro llamadas] → fácil de olvidar en una llamada nueva. Mitigación: se centraliza en `lib/api.ts`, único punto de contacto con el backend; añadirlo ahí una vez basta.
- [Fallback al día del servidor si el cliente no manda `referenceDate`] → un consumidor de la API que no sea este frontend vería el vencimiento según el día del servidor, no el suyo. Mitigación: comportamiento explícito y documentado, no un descuido; el frontend de este change siempre lo manda.
- [Diálogo modal nuevo requiere `npx shadcn@latest add dialog`] → si el entorno de implementación no tiene acceso de red al registry de shadcn, el comando falla. Mitigación: `radix-ui` (el primitivo sobre el que se construyen los componentes de `ui/`) ya es una dependencia del proyecto; si el CLI no funciona, se construye el `Dialog` a mano sobre ese primitivo, mismo resultado final, sin depender de red.

## Migration Plan

- Nueva migración: añade `due_date` (fecha, nullable) a `tasks`. Las tareas existentes quedan con `due_date` en `NULL` — comportamiento ya cubierto por la regla de vencimiento (sin fecha, nunca vencida), no hace falta ningún backfill.
- `node ace migration:run` regenera `database/schema.ts`.
- Rollback: `node ace migration:rollback` sobre esa migración, elimina la columna sin pérdida de ningún otro dato.

## Open Questions

- Pantalla de detalle completa de una tarea (PA-6 del PRD) — el modal de este change es una solución provisional; cuando exista esa pantalla, decidir si el modal se retira o convive con ella.
- Volver de "Hecho" a un estado anterior con la fecha pasada (PA-7) — sin resolver, fuera de alcance de este change.
- Qué ve un consumidor de la API que no manda `referenceDate` — hoy recibe el veredicto según el día del servidor; si en el futuro hay más clientes que este frontend, revisar si ese fallback sigue siendo el correcto.
