## ADDED Requirements

### Requirement: Fijar, cambiar y quitar la fecha de vencimiento de una tarea existente
El sistema SHALL permitir poner, cambiar o quitar la fecha de vencimiento de una tarea ya creada, y SHALL aceptar una fecha anterior al día de hoy sin rechazarla.

#### Scenario: poner fecha a una tarea que no la tenía
- **WHEN** se fija una fecha de vencimiento sobre una tarea que no tenía ninguna
- **THEN** la tarea queda con esa fecha

#### Scenario: quitar la fecha de una tarea que la tenía
- **WHEN** se quita explícitamente la fecha de vencimiento de una tarea que la tenía
- **THEN** la tarea vuelve a no tener fecha, y deja de estar vencida si lo estaba

#### Scenario: se acepta una fecha ya pasada
- **WHEN** se fija sobre una tarea una fecha de vencimiento anterior al día de hoy
- **THEN** el sistema la acepta sin impedirlo, y esa tarea pasa a considerarse vencida

### Requirement: Una fecha de vencimiento inválida se rechaza sin perder la que hubiera
El sistema SHALL rechazar un valor de fecha que no sea una fecha real o esté incompleto, y SHALL dejar intacta la fecha que la tarea tuviera antes del intento.

#### Scenario: fecha con formato inválido o incompleta
- **WHEN** se intenta fijar sobre una tarea un valor que no es una fecha válida
- **THEN** el sistema rechaza el cambio con un error de validación asociado al campo de fecha, y la tarea conserva la fecha que tuviera antes del intento

### Requirement: La creación de una tarea nunca admite fecha de vencimiento
El sistema SHALL crear toda tarea nueva sin fecha de vencimiento, sin importar qué envíe la petición de creación.

#### Scenario: una fecha enviada al crear se ignora
- **WHEN** se crea una tarea incluyendo un valor de fecha de vencimiento en la petición
- **THEN** la tarea se crea igualmente, sin ninguna fecha de vencimiento asociada

### Requirement: Regla de vencimiento de una tarea
El sistema SHALL considerar una tarea vencida cuando, y solo cuando, tiene una fecha de vencimiento, esa fecha es anterior al día de quien consulta, y su estado no es "hecho".

#### Scenario: la fecha de vencimiento es hoy
- **WHEN** se consulta una tarea cuya fecha de vencimiento es el día de hoy y que no está en estado "hecho"
- **THEN** el sistema no la considera vencida

#### Scenario: la fecha de vencimiento es futura
- **WHEN** se consulta una tarea con fecha de vencimiento posterior a hoy
- **THEN** el sistema no la considera vencida

#### Scenario: sin fecha de vencimiento
- **WHEN** se consulta una tarea sin fecha de vencimiento, sin importar su antigüedad
- **THEN** el sistema no la considera vencida

#### Scenario: pasar a "hecho" resuelve el vencimiento sin tocar la fecha
- **WHEN** una tarea vencida cambia a estado "hecho"
- **THEN** el sistema deja de considerarla vencida, y su fecha de vencimiento no cambia

#### Scenario: una tarea "hecha" con fecha pasada no está vencida
- **WHEN** se consulta una tarea en estado "hecho" cuya fecha de vencimiento ya pasó
- **THEN** el sistema no la considera vencida

#### Scenario: aplazar la fecha resuelve el vencimiento
- **WHEN** la fecha de vencimiento de una tarea vencida se cambia a una fecha posterior a hoy
- **THEN** el sistema deja de considerarla vencida

### Requirement: El vencimiento se calcula en cada lectura, según el día de quien consulta
El sistema SHALL calcular si una tarea está vencida en el momento de cada consulta, a partir del día que indica quien consulta, sin guardar ese veredicto en ningún sitio ni aceptarlo si lo envía el cliente.

#### Scenario: personas en husos horarios distintos obtienen veredictos distintos sobre la misma tarea
- **WHEN** dos personas en husos horarios distintos consultan a la vez la misma tarea, cada una indicando su propio día
- **THEN** el sistema puede darle a una un veredicto de vencida y a la otra no, y ambos veredictos son correctos para el día de cada una

#### Scenario: una tarea vence sola con el paso del día, sin que nadie la toque
- **WHEN** se consulta de nuevo una tarea sin fecha modificada, pero indicando un día posterior al de la última consulta
- **THEN** el veredicto de vencida puede cambiar de una consulta a otra, sin que la tarea se haya modificado

#### Scenario: el veredicto enviado por el cliente se ignora
- **WHEN** una petición de creación o actualización incluye un veredicto de vencida
- **THEN** el sistema lo ignora y calcula el suyo propio en cada lectura posterior

### Requirement: Cualquiera puede editar la fecha de vencimiento de cualquier tarea
El sistema SHALL permitir cambiar la fecha de vencimiento de cualquier tarea del espacio, sin restringir la operación según quién sea su responsable ni exigir confirmación adicional para quitarla.

#### Scenario: editar la fecha de una tarea de otra persona
- **WHEN** se cambia o se quita la fecha de vencimiento de una tarea cuyo responsable es otra persona
- **THEN** el sistema aplica el cambio igual que en una tarea propia, sin pedir permiso especial

#### Scenario: quitar la fecha no pide confirmación
- **WHEN** se quita la fecha de vencimiento de una tarea que la tenía
- **THEN** el cambio se aplica directamente, sin ningún paso de confirmación

### Requirement: La fecha de vencimiento es independiente de los demás cambios de una tarea
El sistema SHALL dejar la fecha de vencimiento de una tarea sin alterar cuando se cambia cualquier otro dato de esa tarea.

#### Scenario: cambiar el estado no toca la fecha
- **WHEN** se cambia el estado de una tarea que tiene fecha de vencimiento
- **THEN** esa fecha permanece igual tras el cambio

### Requirement: Lectura individual de una tarea
El sistema SHALL permitir consultar una única tarea por su identificador, con su representación completa incluyendo su fecha de vencimiento y si está vencida, y SHALL exigir sesión iniciada para ello, sin comprobar quién es su responsable.

#### Scenario: consultar una tarea existente
- **WHEN** una persona con sesión iniciada consulta una tarea del espacio por su identificador
- **THEN** el sistema devuelve su representación completa, incluida su fecha de vencimiento (si tiene) y si está vencida

#### Scenario: consultar sin sesión
- **WHEN** se consulta una tarea por su identificador sin una sesión válida
- **THEN** el sistema rechaza la petición con un error de autenticación

### Requirement: Editar la fecha de una tarea sin una pantalla de detalle
El sistema SHALL permitir abrir una tarea desde la lista para ver y editar su fecha de vencimiento, sin necesitar una pantalla dedicada a esa tarea, y SHALL reflejar cualquier cambio de fecha de inmediato, sin ningún paso de guardado aparte.

#### Scenario: el cambio de fecha se refleja al instante
- **WHEN** se pone, cambia o quita la fecha de vencimiento de una tarea abierta desde la lista
- **THEN** ese cambio se ve reflejado sin recargar la página ni volver a abrir la tarea, y queda guardado sin ninguna acción adicional

### Requirement: Señal explícita de tarea vencida al abrirla
El sistema SHALL indicar explícitamente, al abrir una tarea vencida, que lo está, sin que quien mira tenga que comparar la fecha con el día de hoy, y SHALL no dar ningún aviso al abrir una tarea sin fecha de vencimiento.

#### Scenario: se abre una tarea vencida
- **WHEN** se abre una tarea que el sistema considera vencida
- **THEN** se indica explícitamente que está vencida

#### Scenario: se abre una tarea sin fecha
- **WHEN** se abre una tarea que no tiene fecha de vencimiento
- **THEN** no se muestra ningún aviso relacionado con fechas ni vencimiento
