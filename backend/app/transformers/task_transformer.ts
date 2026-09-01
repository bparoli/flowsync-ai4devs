import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import TaskAssigneeTransformer from '#transformers/task_assignee_transformer'

/**
 * La tarea tal y como la devuelve la lista.
 *
 * El responsable pasa por `TaskAssigneeTransformer` y no por `UserTransformer`:
 * el requisito «Lo que cada tarea muestra de su responsable» dice que junto a
 * una tarea van su nombre y sus iniciales y ningún otro dato de la cuenta, y
 * `UserTransformer` incluye el email y las fechas. Ver el porqué largo en el
 * propio `TaskAssigneeTransformer`.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'createdAt', 'updatedAt']),
      assignee: TaskAssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
