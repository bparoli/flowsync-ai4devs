/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import openapi from '@foadonis/openapi/services/main'

router.get('/', () => {
  return { hello: 'world' }
})

/**
 * Documentación de la API: la interfaz en `/api` y el documento en `/api.json`
 * y `/api.yaml`. Se deja el path por defecto de `registerRoutes()`.
 *
 * No choca con el grupo `/api/v1` de abajo: `/api` es una ruta literal y
 * distinta de `/api/v1/...`, así que ninguna de las dos tapa a la otra.
 *
 * Va sin autenticar, igual que el resto de rutas públicas. `registerRoutes()`
 * acepta un modificador para protegerlas (`(route) => route.use(...)`) el día
 * que esto salga de local.
 */
openapi.registerRoutes()

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [controllers.Tasks, 'index'])
        router.post('/', [controllers.Tasks, 'store'])
        router.get(':id', [controllers.Tasks, 'show'])
        router.patch(':id/status', [controllers.TaskStatuses, 'update'])
        router.put(':id/due-date', [controllers.TaskDueDates, 'update'])
      })
      .prefix('tasks')
      .as('tasks')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
