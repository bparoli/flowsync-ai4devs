import Task, { DEFAULT_LIST_STATUSES, TASK_STATUSES } from '#models/task'
import {
  createTaskValidator,
  listTasksValidator,
  taskReferenceDayValidator,
  toCalendarDay,
} from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import TaskDetailTransformer from '#transformers/task_detail_transformer'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@foadonis/openapi/decorators'
import { ref, wrapData } from '#openapi/schemas'

export default class TasksController {
  /**
   * La lista del espacio: una sola, la misma para todo el mundo, sin filtrar
   * por quién la pide. El responsable va precargado en la misma consulta —
   * es el 100 % de los accesos y resolverlo tarea a tarea sería el error caro
   * y evidente aquí.
   *
   * Admite acotarse por estado, y aquí hay tres caminos que no se cruzan:
   * un estado válido devuelve solo el suyo (aunque no haya ninguna, y eso es
   * una lista vacía legítima, no un error); no pedir nada devuelve lo que
   * sigue abierto; y un estado que no existe ni siquiera llega, porque el
   * validador lo corta antes con un 422. Devolverlo vacío sería el fallo
   * silencioso que esta lista no se puede permitir.
   *
   * Acotar es solo lectura: ninguna tarea cambia por consultarla.
   */
  @ApiOperation({
    summary: 'Lista compartida del espacio',
    description:
      'Devuelve las tareas del espacio, las mismas para cualquier cuenta que pida el mismo alcance, de la más reciente a la más antigua. Llega entera: no se pagina ni se recorta. Es de solo lectura.',
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Acota la lista a un único estado. Su ausencia NO significa «todas»: significa la vista por defecto, que son las pendientes y las que están en curso, dejando fuera las hechas. Para ver las hechas hay que pedirlas explícitamente.',
    schema: { type: 'string', enum: [...TASK_STATUSES] },
  })
  @ApiResponse({
    status: 200,
    description:
      'La lista del alcance pedido. Un estado válido en el que ahora mismo no hay ninguna tarea devuelve una lista vacía, con la misma forma que cualquier otra: eso no es un error.',
    schema: wrapData({ type: 'array', items: ref('Task') }),
  })
  @ApiResponse({
    status: 401,
    description:
      'Falta la cabecera Authorization o el token no es válido. No se devuelve ninguna tarea.',
    schema: ref('ApiError'),
  })
  @ApiResponse({
    status: 422,
    description:
      'El `status` pedido no es ninguno de los tres del dominio. Se responde con un error sobre ese campo y NUNCA con una lista vacía: pedir algo que no existe y no encontrar nada tienen que ser distinguibles desde fuera.',
    schema: ref('ValidationError'),
  })
  async index({ request, serialize }: HttpContext) {
    const { status } = await request.validateUsing(listTasksValidator)

    const query = Task.query().preload('assignee')

    if (status) {
      query.where('status', status)
    } else {
      // Sin filtro no es «todas»: lo hecho se queda fuera.
      query.whereIn('status', [...DEFAULT_LIST_STATUSES])
    }

    const tasks = await query
      .orderBy('createdAt', 'desc')
      // Desempate estable: dos tareas creadas en el mismo milisegundo tienen
      // la misma marca de tiempo, y sin esto su orden relativo sería el que
      // quisiera la base de datos.
      .orderBy('id', 'desc')

    return serialize(TaskTransformer.transform(tasks))
  }

  /**
   * Una tarea suelta, con todo lo que tiene: es la única lectura que informa
   * del vencimiento, y por eso es la única que exige el día de quien mira.
   */
  @ApiOperation({
    summary: 'Consulta de una tarea suelta',
    description:
      'Devuelve una tarea con su fecha de vencimiento y su condición de vencida. No comprueba quién es el responsable: una tarea ajena llega entera igual que una propia. Mirarla no la cambia.',
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'today',
    required: true,
    description:
      'El día de referencia de quien consulta, en formato AAAA-MM-DD. Es obligatorio y no tiene valor por defecto a propósito: sustituirlo por el día del servidor daría la lectura equivocada a quien mire desde otro huso, y ese fallo solo aparecería lejos. Un 422 ruidoso vale más.',
    schema: { type: 'string', format: 'date', example: '2026-08-31' },
  })
  @ApiResponse({
    status: 200,
    description:
      'La tarea, incluidos su fecha de vencimiento —o la ausencia de ella— y su condición de vencida.',
    schema: wrapData(ref('TaskDetail')),
  })
  @ApiResponse({
    status: 401,
    description:
      'Falta la cabecera Authorization o el token no es válido. No se devuelve ninguna tarea.',
    schema: ref('ApiError'),
  })
  @ApiResponse({
    status: 404,
    description: 'No existe ninguna tarea con ese identificador.',
    schema: ref('ApiError'),
  })
  @ApiResponse({
    status: 422,
    description:
      'Falta `today` o no es una fecha válida. No se devuelve ninguna tarea y no se responde usando el día del servidor.',
    schema: ref('ValidationError'),
  })
  async show({ params, request, serialize }: HttpContext) {
    const { today } = await request.validateUsing(taskReferenceDayValidator)
    const task = await Task.findOrFail(params.id)
    await task.load('assignee')

    return serialize(TaskDetailTransformer.transform(task, toCalendarDay(today)))
  }

  /**
   * Crear cuesta un título. El responsable y el estado no se leen de la
   * petición ni aunque vengan: los pone el sistema.
   */
  @ApiOperation({
    summary: 'Creación de una tarea',
    description:
      'Crea una tarea a partir únicamente de su título. El responsable es la cuenta dueña del token y el estado es `pending`: los pone el sistema, no la petición.',
  })
  @ApiBearerAuth()
  @ApiBody({
    required: true,
    description:
      'El título es el único dato que se lee. Un cuerpo que además traiga `status`, un identificador de responsable o una fecha de vencimiento no se rechaza: esos valores simplemente se ignoran, y la tarea se crea igual a nombre de quien la envía, pendiente y sin fecha.',
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description:
            'Se recortan los espacios de los extremos antes de validar, así que un título de solo espacios se rechaza igual que uno vacío. El máximo se comprueba sobre el título ya recortado, y superarlo es un error: nunca se guarda una versión recortada.',
          example: 'Revisar el informe',
        },
      },
      required: ['title'],
    },
  })
  @ApiResponse({ status: 201, description: 'La tarea ya creada.', schema: wrapData(ref('Task')) })
  @ApiResponse({
    status: 401,
    description:
      'Falta la cabecera Authorization o el token no es válido. No se crea ninguna tarea.',
    schema: ref('ApiError'),
  })
  @ApiResponse({
    status: 422,
    description:
      'El título falta, está vacío, es solo espacios o supera los 200 caracteres. No se crea ninguna tarea ni se guarda ninguna versión recortada del título.',
    schema: ref('ValidationError'),
  })
  async store({ request, response, auth, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)
    const user = auth.getUserOrFail()

    // El estado va explícito y no se deja al valor por defecto de la columna:
    // el modelo recién creado no vuelve a leerse de la base de datos, así que
    // ese defecto no llegaría a la respuesta.
    const task = await Task.create({ title, status: 'pending', assigneeId: user.id })
    await task.load('assignee')

    // El estado se marca aparte y el cuerpo se devuelve: `serialize()` entrega
    // una promesa que resuelve el pipeline al devolverla, y pasársela a
    // `response.created()` deja la respuesta con el cuerpo vacío.
    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }
}
