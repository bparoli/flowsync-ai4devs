## 1. Backend — datos y dominio

- [x] 1.1 Crear la migración que añade `due_date` (fecha, nullable) a `tasks`; ejecutar `node ace migration:run` y confirmar que `database/schema.ts` regenera `TaskSchema` con la nueva columna.
- [x] 1.2 Añadir `dueDate: DateTime | null` al modelo `Task` (`@column.date()`) y el método de instancia `isOverdueOn(referenceDate: DateTime): boolean` (vencida ⟺ tiene `dueDate`, `dueDate < referenceDate`, y `status !== 'done'`).

## 2. Backend — validación y transformación

- [x] 2.1 Actualizar `app/validators/task.ts`: `updateTaskValidator` gana `dueDate: vine.date().nullable().optional()`, y `status` pasa a `vine.enum([...]).optional()`. `createTaskValidator` no cambia (sigue sin aceptar fecha).
- [x] 2.2 Actualizar `app/transformers/task_transformer.ts`: constructor recibe también el día de referencia (`DateTime`); `toObject()` añade `dueDate` (`YYYY-MM-DD` o `null`) e `isOverdue` (a partir de `resource.isOverdueOn(referenceDate)`).

## 3. Backend — rutas y controlador

- [x] 3.1 Añadir en `app/controllers/tasks_controller.ts` la acción `show` (busca la tarea por id, 404 si no existe) y actualizar `index`/`store`/`update` para leer `referenceDate` de la query string (parsearlo con Luxon; si falta o es inválido, usar el día actual del servidor) y pasarlo al transformer.
- [x] 3.2 Actualizar `update` para aplicar `status` y/o `dueDate` solo si esa clave está presente en el payload validado (una actualización puede tocar uno, otro, o ambos).
- [x] 3.3 Registrar `GET tasks/:id` → `show` en `start/routes.ts`, mismo grupo autenticado que el resto de `/tasks`.
- [x] 3.4 Arrancar el servidor una vez para que se regeneren `.adonisjs/server/controllers.ts` y el registro Tuyau, y commitear ese diff generado.

## 4. Frontend — componente de diálogo

- [x] 4.1 Traer el componente `dialog` de shadcn (`npx shadcn@latest add dialog`) a `frontend/src/components/ui/`. Si el entorno no tiene acceso de red al registry, construirlo a mano sobre el primitivo `Dialog` de `radix-ui` (ya es dependencia del proyecto), con el mismo resultado.

## 5. Frontend — tipos y cliente API

- [x] 5.1 Ampliar `lib/types.ts`: `Task` gana `dueDate: string | null` e `isOverdue: boolean`; nuevo `UpdateTaskPayload` con `status` y `dueDate` opcionales (`dueDate?: string | null`).
- [x] 5.2 Añadir a `lib/api.ts`: una función que calcule la fecha local de hoy (`YYYY-MM-DD`) a partir de `new Date()`, añadida como `referenceDate` en la query string de `listTasks`, `createTask` y de las nuevas `getTask(token, id)` y `updateTask(token, id, payload)` (esta última sustituye o convive con `updateTaskStatus`, decidido al implementar según lo que quede más simple sin duplicar lógica de petición).

## 6. Frontend — modal de edición de fecha

- [x] 6.1 Crear el modal de edición de fecha: al abrirse, llama a `getTask` y muestra el título de la tarea, un `<input type="date">` con la fecha actual (o vacío si no tiene), y una señal de "Vencida" con icono y texto cuando `isOverdue` es `true` (nunca solo color).
- [x] 6.2 Cambiar el campo de fecha dispara de inmediato `updateTask` con el nuevo valor (o `null` si se vacía el campo); sin botón de guardar. La tarea actualizada que devuelve la API reemplaza el estado interno del modal (fecha e `isOverdue` se refrescan con la respuesta, sin volver a llamar a `getTask`).
- [x] 6.3 Una fecha inválida rechazada por el backend (422) se muestra junto al campo con el mecanismo de error por campo ya existente (`FieldError`), y el campo vuelve a mostrar la fecha que la tarea tenía antes del intento.
- [x] 6.4 Quitar la fecha (vaciar el campo) no abre ningún diálogo de confirmación aparte del propio modal ya abierto.

## 7. Frontend — integración en la lista

- [x] 7.1 Añadir a cada fila de `TaskListPage` un botón/icono dedicado (no la fila completa) que abre el modal de edición de fecha de esa tarea, con `aria-label` describiendo la tarea. Sin fecha ni marca de vencida visibles en la fila misma.
- [x] 7.2 Al cerrar el modal tras un cambio, reflejar la tarea actualizada (si cambia su `status` a través del modal en el futuro no aplica aquí; solo `dueDate`/`isOverdue`) en el estado local de `TaskListPage`, sin volver a pedir el listado completo — mismo patrón ya usado para el cambio de estado.
