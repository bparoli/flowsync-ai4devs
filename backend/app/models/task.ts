import { TaskSchema } from '#database/schema'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'

export default class Task extends TaskSchema {
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  isOverdueOn(referenceDate: DateTime): boolean {
    if (!this.dueDate || this.status === 'done') return false
    return this.dueDate.toISODate()! < referenceDate.toISODate()!
  }
}
