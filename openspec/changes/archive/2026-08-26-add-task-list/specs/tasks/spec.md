## ADDED Requirements

### Requirement: Listado de todas las tareas
El sistema SHALL exponer una única lista con todas las tareas del espacio, idéntica para cualquier miembro que la consulte, y SHALL no alterar ninguna tarea al consultarla.

#### Scenario: el listado no depende de quién lo pide
- **WHEN** dos miembros distintos, ambos con sesión iniciada, consultan la lista de tareas sin haber hecho ningún cambio
- **THEN** el sistema les devuelve exactamente el mismo conjunto de tareas

#### Scenario: consultar la lista no cambia nada
- **WHEN** se consulta la lista de tareas
- **THEN** ninguna tarea cambia de estado ni de responsable como consecuencia de esa consulta

### Requirement: Acceso a la lista de tareas exige sesión iniciada
El sistema SHALL requerir una sesión válida para listar, crear o actualizar tareas, y SHALL no exigir ningún otro requisito (rol, permiso especial) más allá de esa sesión.

#### Scenario: sin sesión no hay acceso a las tareas
- **WHEN** se solicita el listado, la creación o la actualización de una tarea sin una sesión válida
- **THEN** el sistema rechaza la petición con un error de autenticación y no revela ninguna tarea

#### Scenario: cualquier persona con sesión ve la lista entera
- **WHEN** una persona con sesión iniciada en el espacio consulta la lista
- **THEN** la ve completa, sin contenido reservado a ningún rol

#### Scenario: la pantalla de tareas exige haber iniciado sesión
- **WHEN** una persona sin sesión activa intenta llegar a la pantalla de la lista de tareas
- **THEN** la aplicación la redirige a la pantalla de inicio de sesión en vez de mostrar ninguna tarea

### Requirement: Una sola lista compartida, sin tareas privadas
El sistema SHALL mantener una única lista de tareas compartida por todo el espacio, sin ningún mecanismo para crear tareas privadas ni para filtrarla a "mis tareas".

#### Scenario: lo que crea cualquiera aparece para todos
- **WHEN** una persona crea una tarea y se asigna a sí misma como responsable
- **THEN** esa tarea aparece en la lista que ve cualquier otro miembro del espacio

#### Scenario: no existe una vista de "mis tareas"
- **WHEN** se recorren las pantallas de la aplicación en busca de otra vista de tareas
- **THEN** no hay ninguna separada de la lista compartida del equipo

### Requirement: Creación de una tarea con solo el título
El sistema SHALL permitir crear una tarea indicando únicamente su título, y el formulario de creación SHALL no ofrecer ni sugerir responsable, estado ni ningún otro dato.

#### Scenario: un título basta para crear la tarea
- **WHEN** se envía la creación de una tarea con un título y ningún otro dato
- **THEN** la tarea queda creada y pasa a formar parte de la lista

#### Scenario: el formulario de creación no pide nada más que el título
- **WHEN** se recorre el flujo de creación de una tarea
- **THEN** el único campo que se pide es el título, sin ningún control para elegir responsable, estado o fecha

#### Scenario: la tarea recién creada se ve sin recargar
- **WHEN** se termina de crear una tarea desde la pantalla de la lista
- **THEN** esa tarea aparece ya en la lista visible, sin recargar la página ni navegar a otra pantalla

### Requirement: El título de una tarea es obligatorio
El sistema SHALL rechazar la creación de una tarea cuyo título esté ausente o contenga únicamente espacios en blanco.

#### Scenario: crear sin título se rechaza
- **WHEN** se intenta crear una tarea sin haber indicado ningún título
- **THEN** el sistema la rechaza con un error de validación, no crea la tarea, y el error se puede asociar al campo de título

#### Scenario: un título de solo espacios se rechaza igual que uno vacío
- **WHEN** se intenta crear una tarea cuyo título contiene únicamente espacios en blanco
- **THEN** el sistema la rechaza igual que si no se hubiera indicado título, y no aparece ninguna fila sin texto en la lista

### Requirement: Estado y responsable por defecto al crear una tarea
El sistema SHALL asignar automáticamente, al crear una tarea, el estado "pendiente" y como responsable a la persona que la crea, sin que ninguno de los dos se pueda elegir en la creación.

#### Scenario: la tarea nace con quien la crea como responsable
- **WHEN** una persona con sesión iniciada crea una tarea indicando solo el título
- **THEN** la tarea queda con esa persona como responsable, sin que se haya seleccionado a nadie

#### Scenario: la tarea nace en estado pendiente
- **WHEN** se crea una tarea indicando solo el título
- **THEN** la tarea queda en estado "Pendiente", sin que se haya elegido ningún estado

### Requirement: Los estados de una tarea forman un conjunto cerrado de tres
El sistema SHALL admitir exactamente tres estados para una tarea — pendiente, en curso y hecho —, SHALL rechazar cualquier otro valor de estado, y SHALL no ofrecer ninguna forma de añadir, renombrar o eliminar estados.

#### Scenario: un estado fuera del conjunto se rechaza
- **WHEN** se intenta poner una tarea en un estado que no es pendiente, en curso ni hecho
- **THEN** el sistema rechaza la operación con un error de validación y la tarea conserva su estado anterior

#### Scenario: no hay forma de gestionar los estados disponibles
- **WHEN** se busca en la aplicación alguna forma de añadir, renombrar o eliminar un estado
- **THEN** no existe ninguna, y los únicos estados disponibles siguen siendo pendiente, en curso y hecho

### Requirement: Cambiar el estado de cualquier tarea desde la lista
El sistema SHALL permitir cambiar el estado de cualquier tarea del espacio a cualquiera de los tres estados válidos, sin restringir la operación según quién sea el responsable de la tarea ni exigir confirmación adicional.

#### Scenario: cambiar el estado de una tarea propia
- **WHEN** se cambia el estado de una tarea a uno de los tres estados válidos
- **THEN** el sistema aplica el cambio y lo refleja de inmediato en la lista, sin pedir ningún otro dato

#### Scenario: cambiar el estado de una tarea de otra persona
- **WHEN** se cambia el estado de una tarea cuyo responsable es otra persona
- **THEN** el sistema aplica el cambio exactamente igual que en una tarea propia, sin pedir permiso especial ni mostrar ninguna advertencia

#### Scenario: el cambio se hace desde la propia fila, sin abrir la tarea
- **WHEN** se cambia el estado de una tarea desde la lista
- **THEN** la aplicación lo hace sin abrir ninguna pantalla adicional ni pedir confirmación en ningún diálogo, y solo ofrece pendiente, en curso o hecho como destino

### Requirement: Cada fila de la lista muestra título, responsable y estado
El sistema SHALL mostrar, para cada tarea de la lista, su título, su responsable y su estado, sin que sea necesario abrir la tarea para conocer esos tres datos.

#### Scenario: los tres datos están a la vista en la propia fila
- **WHEN** se muestra una tarea en la lista
- **THEN** su fila incluye el título, el responsable y el estado, visibles sin ninguna interacción adicional

### Requirement: El responsable se identifica por su nombre
El sistema SHALL identificar al responsable de una tarea, en la lista, por su nombre completo, y SHALL mostrar "Sin nombre" cuando esa persona no tenga uno registrado — nunca su email ni ningún identificador interno.

#### Scenario: responsable con nombre registrado
- **WHEN** se muestra una tarea cuyo responsable tiene un nombre completo registrado
- **THEN** la fila muestra ese nombre

#### Scenario: responsable sin nombre registrado
- **WHEN** se muestra una tarea cuyo responsable no tiene un nombre completo registrado
- **THEN** la fila muestra "Sin nombre", y en ningún caso su email o su identificador

### Requirement: La lista no expone vencimiento
El sistema SHALL no mostrar en la lista de tareas ninguna fecha ni ninguna marca de tarea vencida.

#### Scenario: ninguna fila trae fecha ni aviso de vencida
- **WHEN** se muestra la lista de tareas
- **THEN** ninguna fila incluye una fecha de vencimiento ni ninguna marca que señale una tarea como vencida

### Requirement: Estado vacío de la lista
El sistema SHALL mostrar, cuando el espacio todavía no tiene ninguna tarea, una explicación de qué es la lista y un modo de crear la primera, en vez de una lista vacía sin más.

#### Scenario: el espacio sin tareas se explica
- **WHEN** se abre la lista de tareas y el espacio todavía no tiene ninguna
- **THEN** la pantalla explica qué es esa lista y ofrece crear la primera tarea, sin limitarse a mostrarla vacía

### Requirement: La lista no muestra presencia ni actividad por persona
El sistema SHALL no mostrar en la lista de tareas ninguna señal de qué miembros están conectados ni de su actividad individual.

#### Scenario: sin señales de presencia
- **WHEN** varios miembros del espacio usan la aplicación a la vez
- **THEN** la lista no muestra a ninguno de ellos como conectado, ni ningún indicador de su actividad
