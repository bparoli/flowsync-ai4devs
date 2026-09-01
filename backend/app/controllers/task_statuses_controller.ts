import Task, { TASK_STATUSES } from '#models/task'
import { updateTaskStatusValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { ref, wrapData } from '#openapi/schemas'

export default class TaskStatusesController {
  /**
   * El estado es lo único mutable de una tarea en este momento, y por eso
   * tiene endpoint propio en vez de colgar de un update genérico: por ese
   * update acabarían colándose el título y el responsable, que son historias
   * que todavía no se han especificado.
   *
   * Cualquier persona con sesión puede cambiar el estado de cualquier tarea,
   * en cualquier dirección. No hay permisos por responsable ni transiciones
   * prohibidas: volver de «hecho» a «pendiente» es justamente lo que arregla
   * un clic dado por error.
   */
  @ApiOperation({
    summary: 'Cambio de estado de una tarea',
    description:
      'Cambia el estado de cualquier tarea. Admite cualquier transición entre los tres estados, incluida la vuelta desde `done`, y no exige ser su responsable. No toca ni el título ni el responsable ni la fecha.',
  })
  @ApiBearerAuth()
  @ApiBody({
    required: true,
    description: 'El estado de destino.',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: [...TASK_STATUSES],
          description:
            'Uno de los tres estados del dominio. No hay forma de añadir, renombrar ni eliminar ninguno.',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'La tarea con su nuevo estado. Sin datos de vencimiento: para eso está la consulta de la tarea suelta.',
    schema: wrapData(ref('Task')),
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
      'El estado pedido no es ninguno de los tres. La tarea conserva el que tenía y el estado inventado no pasa a existir.',
    schema: ref('ValidationError'),
  })
  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { status } = await request.validateUsing(updateTaskStatusValidator)

    task.status = status
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
