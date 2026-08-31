import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea enseña de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: que se le pueda identificar, que no se filtre
 * nada más de su cuenta, y que sin nombre siga habiendo con qué representarlo.
 *
 * El aislamiento es una transacción global y no un truncate a propósito: la
 * suite functional pega contra el mismo fichero SQLite que el servidor de
 * desarrollo (`config/database.ts` no tiene override por entorno), y vaciarlo
 * se llevaría por delante los datos con los que se está trabajando.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /**
   * El día de referencia que exige la consulta de una tarea suelta. Es un valor
   * cualquiera: aquí no se mira el vencimiento, pero sin él la ruta responde 422.
   */
  const HOY = '2026-08-30'

  /**
   * Quien mira nunca es el responsable de la tarea: la lista es compartida, y
   * un dato que se filtra es más grave cuando la cuenta es de otra persona.
   */
  async function espacio(fullName: string | null, email: string) {
    const responsable = await User.create({ fullName, email, password: 'secreto123' })
    const quienMira = await User.create({
      fullName: 'Alan Turing',
      email: 'alan@example.com',
      password: 'secreto123',
    })

    const tarea = await Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })

    return { responsable, quienMira, tarea }
  }

  /**
   * El responsable de la primera tarea de la lista. `GET /api/v1/tasks` viene
   * tipado como «una tarea o varias» —su transformer sirve a los dos casos— y
   * con el responsable opcional —la relación podría no estar precargada—. Para
   * este requisito cualquiera de las dos cosas ya sería un fallo, así que se
   * descartan aquí en vez de repetirlo en cada test.
   */
  function responsableEnLaLista<T>(data: { assignee?: T } | { assignee?: T }[]): T {
    if (!Array.isArray(data)) {
      throw new Error('la lista no devolvió un array de tareas')
    }

    const [tarea] = data
    if (!tarea?.assignee) {
      throw new Error('la primera tarea de la lista llegó sin responsable')
    }

    return tarea.assignee
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const { quienMira, tarea } = await espacio('Ada Lovelace', 'ada@example.com')

    const lista = await client.get('/api/v1/tasks').loginAs(quienMira)

    lista.assertStatus(200)
    const enLaLista = responsableEnLaLista(lista.body().data)
    assert.equal(enLaLista.fullName, 'Ada Lovelace')
    assert.equal(enLaLista.initials, 'AL')

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .loginAs(quienMira)

    suelta.assertStatus(200)
    assert.equal(suelta.body().data.assignee.fullName, 'Ada Lovelace')
    assert.equal(suelta.body().data.assignee.initials, 'AL')
  })

  test('la tarea no filtra datos de cuenta', async ({ client, assert }) => {
    const { quienMira, tarea } = await espacio('Ada Lovelace', 'ada@example.com')

    const lista = await client.get('/api/v1/tasks').loginAs(quienMira)
    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .loginAs(quienMira)

    lista.assertStatus(200)
    suelta.assertStatus(200)

    // El scenario dice «suelta o dentro de la lista»: las dos formas de obtener
    // una tarea tienen que callar lo mismo, y basta con que una hable para
    // incumplirlo.
    for (const [donde, assignee] of [
      ['la lista', responsableEnLaLista(lista.body().data)],
      ['la tarea suelta', suelta.body().data.assignee],
    ] as const) {
      assert.notProperty(assignee, 'email', `${donde} expone el email del responsable`)
      assert.notProperty(assignee, 'password', `${donde} expone datos de acceso del responsable`)
      assert.notInclude(JSON.stringify(assignee), 'ada@example.com', `${donde} filtra el email`)
    }
  })

  test('un responsable sin nombre sigue teniendo iniciales', async ({ client, assert }) => {
    const { quienMira } = await espacio(null, 'sin-nombre@example.com')

    const lista = await client.get('/api/v1/tasks').loginAs(quienMira)

    lista.assertStatus(200)

    const assignee = responsableEnLaLista(lista.body().data)
    assert.isNull(assignee.fullName)
    // Las iniciales son lo que le queda a la interfaz para representarlo, así
    // que aquí no pueden faltar ni llegar vacías. Que no se filtre el email es
    // otro scenario y se comprueba en su propio test.
    assert.isString(assignee.initials)
    assert.isNotEmpty(assignee.initials)
  })
})
