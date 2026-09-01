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
 * se llevaría por delante los datos con los que se está trabajando. Ese fichero
 * compartido es también el motivo de que aquí nunca se busque una tarea por su
 * posición en la lista: al lado de las de la prueba hay tareas reales.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /**
   * El día de referencia que exige la consulta de una tarea suelta. Es un día
   * cualquiera y a propósito no es el de hoy: aquí no se mira el vencimiento,
   * pero sin el parámetro la ruta responde 422.
   */
  const HOY = '2019-07-04'

  /**
   * Lo único que el requisito deja viajar del responsable: con qué identificarlo
   * y con qué representarlo.
   *
   * Se comprueba por lista blanca y no campo a campo porque el requisito dice
   * «ningún otro dato de esa cuenta», no «ni el email»: enumerar prohibidos
   * dejaría pasar el siguiente que alguien añada, y arreglar la fuga a medias
   * —quitar el email y dejar las fechas— pondría el test en verde con el
   * requisito todavía incumplido.
   *
   * El `id` entra en la lista aunque el requisito solo nombre el nombre y las
   * iniciales: es el identificador de la propia fila, no un dato de la cuenta,
   * y es lo que hace referenciable al responsable. Va aquí explícito para que
   * quede claro que es una decisión y no un descuido: si algún día se decide
   * que tampoco debe viajar, hay que quitarlo de esta lista o el test lo seguirá
   * dando por bueno.
   */
  const CAMPOS_PERMITIDOS = ['id', 'fullName', 'initials']

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
   * Solo lo que los tests leen del responsable, más el `id` que la lista blanca
   * da por bueno. Que el objeto real traiga más campos que estos no es un
   * desajuste: es justamente lo que comprueba el test de la fuga, y por eso aquí
   * no se describe la respuesta entera.
   */
  type Responsable = { id: number; fullName: string | null; initials: string }
  type ConResponsable = { id: number; assignee?: Responsable }

  /**
   * El responsable de una tarea dentro de una respuesta de la API.
   *
   * Absorbe dos formas de la respuesta porque `TaskTransformer` sirve a las dos
   * y así vienen tipadas: una tarea suelta o una lista, y en la lista se busca
   * **por id** y nunca por posición. El responsable llega opcional en los tipos
   * generados —la relación podría no estar precargada—, pero para este requisito
   * no llegar ya sería un fallo, así que se descarta aquí y no en cada test.
   */
  function responsableDe(data: ConResponsable | ConResponsable[], tareaId?: number): Responsable {
    const tarea = Array.isArray(data) ? data.find(({ id }) => id === tareaId) : data

    if (!tarea) {
      throw new Error(`la tarea ${tareaId} no salió en la respuesta`)
    }

    if (!tarea.assignee) {
      throw new Error(`la tarea ${tarea.id} llegó sin responsable`)
    }

    return tarea.assignee
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const { quienMira, tarea } = await espacio('Ada Lovelace', 'ada@example.com')

    const lista = await client.get('/api/v1/tasks').loginAs(quienMira)
    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .loginAs(quienMira)

    lista.assertStatus(200)
    suelta.assertStatus(200)

    for (const [donde, assignee] of [
      ['la lista', responsableDe(lista.body().data, tarea.id)],
      ['la tarea suelta', responsableDe(suelta.body().data)],
    ] as const) {
      assert.equal(assignee.fullName, 'Ada Lovelace', `${donde} no identifica al responsable`)
      assert.equal(assignee.initials, 'AL', `${donde} no trae las iniciales del responsable`)
    }
  })

  test('la tarea no filtra datos de cuenta', async ({ client, assert }) => {
    const { quienMira, tarea } = await espacio('Ada Lovelace', 'ada@example.com')

    const lista = await client.get('/api/v1/tasks').loginAs(quienMira)
    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .loginAs(quienMira)
    const creada = await client
      .post('/api/v1/tasks')
      .json({ title: 'Apuntar otra cosa' })
      .loginAs(quienMira)
    const cambiada = await client
      .patch(`/api/v1/tasks/${tarea.id}/status`)
      .json({ status: 'in_progress' })
      .loginAs(quienMira)

    lista.assertStatus(200)
    suelta.assertStatus(200)
    creada.assertStatus(201)
    cambiada.assertStatus(200)

    // El scenario dice «cualquier tarea, suelta o dentro de la lista»: se
    // recorren las cuatro respuestas que devuelven una tarea, porque callar en
    // una y hablar en otra incumple el requisito igual. La tarea recién creada
    // es la única cuyo responsable es quien mira.
    const respuestas = [
      ['la lista', responsableDe(lista.body().data, tarea.id), 'ada@example.com'],
      ['la tarea suelta', responsableDe(suelta.body().data), 'ada@example.com'],
      ['la tarea recién creada', responsableDe(creada.body().data), 'alan@example.com'],
      ['la tarea con el estado cambiado', responsableDe(cambiada.body().data), 'ada@example.com'],
    ] as const

    // Se recogen todas las fugas antes de aseverar, en vez de aseverar dentro
    // del bucle: si falla la primera respuesta, un assert por vuelta abortaría
    // el test y dejaría sin mirar las otras tres. Aquí el fallo dice de una vez
    // hasta dónde llega el problema.
    const fugas = respuestas.flatMap(([donde, assignee, emailDeLaCuenta]) => {
      const deMas = Object.keys(assignee).filter((campo) => !CAMPOS_PERMITIDOS.includes(campo))
      const conElEmail = JSON.stringify(assignee).includes(emailDeLaCuenta)

      if (deMas.length === 0 && !conElEmail) return []

      return [`${donde} expone ${deMas.join(', ') || 'el email'} del responsable`]
    })

    assert.deepEqual(fugas, [], fugas.join(' | '))
  })

  test('un responsable sin nombre sigue teniendo iniciales', async ({ client, assert }) => {
    const { quienMira, tarea } = await espacio(null, 'sin-nombre@example.com')

    const lista = await client.get('/api/v1/tasks').loginAs(quienMira)
    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .loginAs(quienMira)

    lista.assertStatus(200)
    suelta.assertStatus(200)

    for (const [donde, assignee] of [
      ['la lista', responsableDe(lista.body().data, tarea.id)],
      ['la tarea suelta', responsableDe(suelta.body().data)],
    ] as const) {
      assert.isNull(assignee.fullName, `${donde} no devuelve el nombre nulo`)
      // Las iniciales son lo que le queda a la interfaz para representarlo, así
      // que no pueden faltar ni llegar vacías. Que no se filtre el email es otro
      // scenario y se comprueba en su propio test.
      assert.isString(assignee.initials, `${donde} no trae iniciales`)
      assert.isNotEmpty(assignee.initials, `${donde} trae las iniciales vacías`)
    }
  })
})
