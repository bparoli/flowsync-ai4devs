import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import { ref, wrapData } from '#openapi/schemas'

export default class ProfileController {
  @ApiOperation({
    summary: 'Perfil de la sesión activa',
    description:
      'Devuelve la cuenta asociada al token presentado. Es además la forma de comprobar que un token sigue siendo válido.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'La cuenta de la sesión.',
    schema: wrapData(ref('User')),
  })
  @ApiResponse({
    status: 401,
    description:
      'El token falta, está mal formado o ya no es válido. No se devuelve ningún dato de cuenta.',
    schema: ref('ApiError'),
  })
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }
}
