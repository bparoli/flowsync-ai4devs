import Task from '#models/task'
import { setTaskDueDateValidator, toCalendarDay } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskDetailTransformer from '#transformers/task_detail_transformer'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { ref, wrapData } from '#openapi/schemas'

export default class TaskDueDatesController {
  /**
   * Fijar, cambiar y retirar la fecha de vencimiento son la misma operación, y
   * por eso comparten endpoint: quitar la fecha no es borrar un recurso, es
   * poner el valor «sin fecha», que es un valor legítimo del campo.
   *
   * Endpoint propio en vez de un update genérico de la tarea, por el mismo
   * motivo que el estado: por ahí se colarían el título y el responsable, que
   * este change no permite tocar.
   *
   * Cualquiera con sesión puede cambiar la fecha de cualquier tarea, igual que
   * el estado. No se comprueba quién es el responsable.
   */
  @ApiOperation({
    summary: 'Fijar, cambiar o retirar la fecha de vencimiento',
    description:
      'Las tres son la misma operación. Retirar la fecha es un uso admitido y no un error: no hay endpoint aparte para borrarla. No exige ser el responsable de la tarea, y no toca ni su título ni su responsable ni su estado.',
  })
  @ApiBearerAuth()
  @ApiBody({
    required: true,
    description: 'La fecha de destino y el día de referencia de quien la cambia.',
    schema: {
      type: 'object',
      properties: {
        dueDate: {
          type: 'string',
          format: 'date',
          nullable: true,
          description:
            'Un día del calendario en AAAA-MM-DD, o `null` para retirar la fecha. Una fecha ya pasada se acepta sin advertencia: la tarea pasa simplemente a estar vencida.',
          example: '2026-09-30',
        },
        today: {
          type: 'string',
          format: 'date',
          description:
            'El día de referencia de quien hace el cambio. Se exige porque la respuesta devuelve la tarea con su condición de vencida ya resuelta: aplazar una tarea vencida tiene que dejar de mostrarla vencida en esta misma respuesta.',
          example: '2026-08-31',
        },
      },
      required: ['dueDate', 'today'],
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'La tarea ya actualizada, con su condición de vencida resuelta contra el `today` recibido.',
    schema: wrapData(ref('TaskDetail')),
  })
  @ApiResponse({
    status: 401,
    description:
      'Falta la cabecera Authorization o el token no es válido. Nada cambia en el espacio.',
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
      'La fecha es imposible o está mal formada, o falta `today`. La tarea conserva intacta la fecha que tuviera antes.',
    schema: ref('ValidationError'),
  })
  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { today, dueDate } = await request.validateUsing(setTaskDueDateValidator)

    // El `DateTime` del validador se queda aquí: hacia dentro, una fecha de
    // vencimiento es un día en texto y nunca un instante.
    task.dueDate = dueDate === null ? null : toCalendarDay(dueDate)
    await task.save()
    await task.load('assignee')

    // Se devuelve ya resuelta contra el día de quien pide, para que aplazar una
    // tarea vencida deje de mostrarla vencida en esta misma respuesta.
    return serialize(TaskDetailTransformer.transform(task, toCalendarDay(today)))
  }
}
