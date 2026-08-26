# Auth

## Purpose

Cuentas y acceso de FlowSync: alta de una cuenta, inicio y cierre de sesión mediante un token de acceso, consulta del perfil propio, y la persistencia y protección de esa sesión en el frontend.

## Requirements

### Requirement: Registro de una cuenta nueva
El sistema SHALL permitir crear una cuenta con nombre completo (opcional), email y contraseña con su confirmación, sin necesitar sesión previa, y SHALL devolver los datos de la cuenta creada junto con un token de acceso.

#### Scenario: alta con datos válidos
- **WHEN** se solicita el alta con un email no registrado y una contraseña de entre 8 y 32 caracteres junto con una confirmación idéntica
- **THEN** el sistema crea la cuenta y responde con éxito (200) incluyendo el id, nombre, email, iniciales y fechas de la cuenta, más un token de acceso, sin incluir en ningún momento la contraseña

#### Scenario: email ya registrado
- **WHEN** se solicita el alta con un email que ya pertenece a otra cuenta
- **THEN** el sistema responde con un error de validación (422) sobre el campo de email señalando que ya está en uso, y no crea ninguna cuenta

#### Scenario: confirmación de contraseña no coincide
- **WHEN** la contraseña y su confirmación no son iguales
- **THEN** el sistema responde con un error de validación (422) sobre el campo de confirmación y no crea la cuenta

#### Scenario: contraseña fuera del rango de longitud permitido
- **WHEN** la contraseña, o su confirmación, tiene menos de 8 o más de 32 caracteres
- **THEN** el sistema responde con un error de validación (422) sobre ese campo y no crea la cuenta

#### Scenario: nombre completo ausente
- **WHEN** el alta se solicita sin nombre completo (valor nulo)
- **THEN** el sistema crea la cuenta igualmente, sin nombre asociado

### Requirement: Inicio de sesión con credenciales
El sistema SHALL autenticar una cuenta existente mediante email y contraseña, devolviendo los datos de la cuenta y un nuevo token de acceso cuando las credenciales son correctas, y SHALL rechazar el intento sin revelar cuál de los dos datos falló.

#### Scenario: credenciales válidas
- **WHEN** se envía el email y la contraseña correctos de una cuenta existente
- **THEN** el sistema responde con éxito (200) incluyendo los datos de la cuenta y un nuevo token de acceso

#### Scenario: credenciales inválidas
- **WHEN** el email no corresponde a ninguna cuenta, o la contraseña no coincide con la de la cuenta
- **THEN** el sistema responde con un error (400) sin indicar cuál de los dos campos es incorrecto, y no emite ningún token

### Requirement: Autorización de las rutas de cuenta mediante el token de acceso
El sistema SHALL exigir un token de acceso válido, enviado como cabecera `Authorization: Bearer <token>`, para servir las rutas de perfil y cierre de sesión, y SHALL mantenerlo válido indefinidamente hasta que se cierre la sesión que lo emitió (el token no caduca por sí solo).

#### Scenario: acceso con token válido
- **WHEN** una petición a la ruta de perfil o de cierre de sesión incluye un token de acceso vigente, emitido por un alta o un inicio de sesión anterior
- **THEN** el sistema identifica a la cuenta dueña del token y sirve la petición

#### Scenario: acceso sin token o con token inválido
- **WHEN** una petición a la ruta de perfil o de cierre de sesión no incluye la cabecera de autorización, o incluye un token inexistente o ya invalidado
- **THEN** el sistema responde con un error de autenticación (401) y no sirve la petición

### Requirement: Consulta del perfil de la cuenta autenticada
El sistema SHALL exponer, para la cuenta autenticada, su id, nombre completo, email, iniciales calculadas y fechas de alta y de última actualización, y SHALL no incluir la contraseña en ninguna respuesta.

#### Scenario: iniciales a partir de un nombre completo de dos o más palabras
- **WHEN** se consulta el perfil de una cuenta cuyo nombre completo tiene al menos dos palabras
- **THEN** el sistema devuelve como iniciales la primera letra de la primera palabra seguida de la primera letra de la segunda palabra, ambas en mayúsculas

#### Scenario: iniciales a partir del email cuando no hay nombre completo utilizable
- **WHEN** se consulta el perfil de una cuenta sin nombre completo, o con un nombre completo de una sola palabra
- **THEN** el sistema calcula las iniciales a partir del email: la primera letra de la parte local y la primera letra del dominio, en mayúsculas

### Requirement: Cierre de sesión
El sistema SHALL invalidar, al cerrar sesión, el token de acceso usado en la petición, de modo que deje de servir peticiones posteriores.

#### Scenario: logout con un token activo
- **WHEN** se solicita el cierre de sesión autenticado con un token de acceso vigente
- **THEN** el sistema elimina ese token y responde con éxito (200) con un mensaje de confirmación, en un cuerpo sin el envoltorio que usan el resto de respuestas (`{"message": "Logged out successfully"}` en vez de `{"data": ...}`)

#### Scenario: el token usado para cerrar sesión deja de servir
- **WHEN**, tras cerrar sesión, se reutiliza ese mismo token en una nueva petición a la ruta de perfil o de cierre de sesión
- **THEN** el sistema la trata como no autenticada

### Requirement: Persistencia y rehidratación de la sesión en el cliente
El sistema SHALL recordar la sesión iniciada entre recargas de la aplicación guardando el token localmente, y SHALL revalidarlo contra el backend antes de dar la sesión por buena.

#### Scenario: token guardado sigue siendo válido
- **WHEN** se abre la aplicación con un token guardado de una sesión anterior y el backend lo reconoce como válido
- **THEN** la aplicación restaura la sesión con los datos de perfil obtenidos, sin pedir un nuevo inicio de sesión

#### Scenario: token guardado ya no es válido
- **WHEN** el backend responde que el token guardado no es válido
- **THEN** la aplicación descarta ese token, queda sin sesión activa, y muestra en la pantalla de inicio de sesión el motivo ("Tu sesión ha caducado. Vuelve a iniciar sesión.")

#### Scenario: el backend no responde al validar el token guardado
- **WHEN** la comprobación del token guardado falla por un error de red o de servidor, no por un rechazo del backend
- **THEN** la aplicación queda sin sesión activa pero conserva el token guardado para reintentarlo en la siguiente carga, y muestra un aviso de que no se pudo restaurar la sesión

### Requirement: Protección de rutas de navegación en el frontend
El sistema SHALL restringir la navegación según el estado de la sesión: las pantallas de cuenta solo son accesibles con sesión activa, y las pantallas de acceso solo lo son sin sesión activa.

#### Scenario: pantalla de perfil sin sesión activa
- **WHEN** una persona sin sesión activa navega a la pantalla de perfil
- **THEN** la aplicación la redirige a la pantalla de inicio de sesión

#### Scenario: pantallas de acceso con sesión activa
- **WHEN** una persona con sesión activa navega a la pantalla de inicio de sesión o a la de registro
- **THEN** la aplicación la redirige a la pantalla de perfil

#### Scenario: estado de sesión aún resolviéndose
- **WHEN** el estado de la sesión todavía se está resolviendo (rehidratación del token guardado en curso)
- **THEN** la aplicación muestra un indicador de carga en vez de mostrar la pantalla solicitada o redirigir

#### Scenario: ruta desconocida
- **WHEN** se navega a una dirección que la aplicación no reconoce
- **THEN** la aplicación redirige a la pantalla de perfil, que a su vez redirige a inicio de sesión si no hay sesión activa

### Requirement: Presentación de errores de validación en los formularios de acceso
El sistema SHALL mostrar cada error de validación devuelto por el backend junto al campo del formulario al que corresponde, y SHALL mostrarlo como aviso general cuando el formulario no muestra ese campo.

#### Scenario: error sobre un campo visible en el formulario
- **WHEN** el backend devuelve un error de validación sobre un campo que el formulario en pantalla muestra
- **THEN** la pantalla lo muestra junto a ese campo y no como aviso general

#### Scenario: error sobre un campo no representado en el formulario
- **WHEN** el backend devuelve un error de validación sobre un campo que el formulario no muestra, o una mezcla de campos mostrados y no mostrados
- **THEN** la pantalla lo muestra como aviso general en la parte superior del formulario

### Requirement: Pantalla de inicio de sesión
El sistema SHALL ofrecer un formulario de inicio de sesión con email y contraseña.

#### Scenario: envío con credenciales incorrectas
- **WHEN** se envía el formulario de inicio de sesión y el backend responde que las credenciales no son correctas
- **THEN** la pantalla muestra el aviso "El email o la contraseña no son correctos." sin señalar un campo concreto

#### Scenario: aviso de sesión perdida
- **WHEN** se llega a la pantalla de inicio de sesión por la pérdida de una sesión anterior y no hay ningún error propio de un envío del formulario
- **THEN** la pantalla muestra el motivo de esa pérdida de sesión

### Requirement: Pantalla de registro
El sistema SHALL ofrecer un formulario de registro con nombre completo (opcional), email, contraseña y confirmación, y SHALL comprobar en el propio cliente que la contraseña y su confirmación coinciden antes de llamar al backend.

#### Scenario: confirmación de contraseña distinta, detectada antes de llamar al backend
- **WHEN** se envía el formulario de registro con una confirmación de contraseña distinta de la contraseña
- **THEN** la pantalla muestra "Las contraseñas no coinciden." bajo el campo de confirmación, sin llegar a llamar al backend

#### Scenario: email ya registrado
- **WHEN** se envía el formulario de registro y el backend responde que el email ya está en uso
- **THEN** la pantalla muestra bajo el campo de email el aviso "Ese email ya está registrado. Inicia sesión en su lugar."

#### Scenario: nombre completo vacío
- **WHEN** se envía el formulario de registro con el campo de nombre completo en blanco
- **THEN** la aplicación lo envía como ausente (sin valor) en vez de como una cadena vacía

### Requirement: Pantalla de perfil y cierre de sesión
El sistema SHALL mostrar en la pantalla de perfil los datos de la cuenta autenticada, y SHALL permitir cerrar la sesión desde ahí, terminándola en el cliente de inmediato.

#### Scenario: datos mostrados
- **WHEN** una persona con sesión activa visita la pantalla de perfil
- **THEN** la pantalla muestra sus iniciales, su nombre completo (o "Sin nombre" si no tiene), su email, y la fecha de alta con un formato de fecha larga en español

#### Scenario: cerrar sesión
- **WHEN** se pulsa el botón de cerrar sesión
- **THEN** la aplicación borra de inmediato la sesión local (token y datos de usuario), lo que hace que la protección de rutas la redirija a inicio de sesión, incluso si la llamada al backend para invalidar el token falla o tarda
