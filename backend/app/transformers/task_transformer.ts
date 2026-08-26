import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import type { DateTime } from 'luxon'

export default class TaskTransformer extends BaseTransformer<Task> {
  constructor(
    resource: Task,
    private referenceDate: DateTime
  ) {
    super(resource)
  }

  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'createdAt', 'updatedAt']),
      assigneeName: this.resource.assignee?.fullName ?? null,
      dueDate: this.resource.dueDate?.toISODate() ?? null,
      isOverdue: this.resource.isOverdueOn(this.referenceDate),
    }
  }
}
