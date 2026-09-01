# 1. Las delta-specs de OpenSpec como fuente de verdad viva

## Contexto

FlowSync mantiene en `openspec/` una descripción del comportamiento del producto
escrita en prosa normativa. Hoy contiene dos piezas que funcionan de forma
distinta:

**Las specs vivas** (`openspec/specs/<capability>/spec.md`) describen el sistema
tal y como es ahora, en presente. Hay dos capabilities:

| Capability | Requirements | Scenarios |
|---|---|---|
| `auth` | 19 | 45 |
| `tasks` | 32 | 124 |

Cada requirement es una frase normativa con SHALL / NO SHALL, y cuelga de ella
una lista de scenarios en formato WHEN/THEN. La granularidad es fina y llega
hasta el detalle que de otro modo se perdería: *«Vencer hoy todavía no es estar
vencida, porque la regla exige que la fecha sea anterior»*.

**Los changes archivados** (`openspec/changes/archive/`) son el histórico. Hay
tres, y cada uno trae cuatro artefactos —`proposal.md` (el porqué y el alcance),
`design.md` (las decisiones numeradas, los riesgos y el plan de migración),
`tasks.md` (la lista de trabajo, hoy toda marcada) y `.openspec.yaml`— más una
**delta-spec** por cada capability que toca:

- `2026-08-13-add-task-list` — estrena `tasks` y **además modifica `auth`**: la
  lista pasa a ser la pantalla de entrada, así que los destinos de navegación de
  la sesión dejan de ser ciertos. Un change puede cruzar capabilities.
- `2026-08-13-add-task-due-date` — añade la fecha de vencimiento y la pantalla de
  detalle.
- `2026-08-13-add-task-status-filter` — **documenta a posteriori** el filtro por
  estado, que ya estaba implementado y en verde. Su `tasks.md` lo dice sin
  rodeos: *«no hay nada que implementar; la lista de abajo es el registro de lo
  que se hizo, no un plan de trabajo»*.

La delta-spec no repite la capability entera: se organiza bajo cabeceras
`## ADDED Requirements` y `## MODIFIED Requirements`, y un requirement modificado
se reescribe **completo**, no como parche. Las specs vivas son el resultado de
componer esos deltas; la composición se puede comprobar, y se ha comprobado:
el requirement *«Una sola lista compartida del espacio»* de la spec viva es
idéntico al bloque `MODIFIED` de `add-task-status-filter`.

Este arreglo ya ha demostrado que detecta deriva. La `proposal.md` de
`add-task-due-date` anota como riesgo, en su momento, que la spec viva seguía
describiendo `GET /api/v1/tasks` como *«todas las tareas del espacio»* cuando el
filtro por estado ya se había implementado sin actualizar `openspec/`. Ese aviso
escrito es lo que provocó el change retroactivo que cerró el hueco.

Hay además herramienta: `openspec` 1.2.0 está instalado y `openspec validate
--all` da las dos specs por buenas.

Lo que hasta ahora no estaba escrito en ningún sitio es **por qué** este
directorio manda sobre las demás descripciones del sistema —el código, el
`CLAUDE.md`, el `README`, el documento OpenAPI— cuando se contradicen. Este ADR
registra esa decisión.

## Decisión

**Las delta-specs de OpenSpec son la fuente de verdad viva de FlowSync.** En
concreto:

1. **`openspec/specs/` describe el sistema en presente.** Ante una contradicción
   entre las specs vivas y cualquier otra descripción —comentarios, `CLAUDE.md`,
   documentación de API, el propio código—, la spec es la que manda, y la
   discrepancia se trata como un defecto que hay que cerrar por uno de los dos
   lados: o se arregla el código, o se escribe un change que actualice la spec.
2. **Todo cambio de comportamiento pasa por un change** con su `proposal.md`, su
   `design.md`, su `tasks.md` y su delta-spec por capability afectada. Escribir
   la delta **antes** de tocar código es el camino previsto; documentar a
   posteriori es un camino admitido y no una infracción, siempre que el change
   se escriba (precedente: `add-task-status-filter`).
3. **Los requirements se escriben en prosa normativa y verificable**, con
   scenarios WHEN/THEN que digan qué se observa desde fuera. Se especifica
   también lo que **no** debe ocurrir: *«La lista no lleva el vencimiento»* es un
   requirement de pleno derecho.
4. **Al archivar, el change se conserva íntegro.** El histórico no se resume ni
   se poda: el porqué de una decisión vive en su `proposal.md` y su `design.md`,
   y se consulta ahí.
5. **Lo derivado se deriva de la spec.** El documento OpenAPI, los tests y esta
   carpeta `docs/` describen lo que la spec ya dice; no son especificaciones
   rivales. Los nombres de los tests reflejan los de los scenarios —el test
   `'la tarea no filtra datos de cuenta'` es el scenario *«La tarea no filtra
   datos de cuenta»*— y esa correspondencia es deliberada.

## Estado

Aceptada (2026-08-31). Registra y hace explícita una práctica que ya venía
siguiéndose: los tres changes de `openspec/changes/archive/` son anteriores a
este ADR.

## Consecuencias

### Lo que ganamos

- **Una sola respuesta a «¿qué hace el sistema hoy?»** en presente y sin
  arqueología de git. `openspec/specs/tasks/spec.md` cabe en una lectura y
  responde por las 32 requirements de la capability.
- **El porqué sobrevive al commit.** `design.md` guarda las decisiones numeradas
  con su alternativa descartada, y `proposal.md` guarda el alcance y lo que se
  dejó fuera **a propósito** — que es justo lo que un diff no puede contar y lo
  que se pierde cuando rota la gente.
- **Los requisitos negativos existen.** Que la lista *no* pueda enseñar el
  vencimiento no se lee en el código —se lee como la ausencia de dos campos en
  un transformer— pero sí en la spec. Sin ella, esa garantía se rompe sin que
  nada chille.
- **Los deltas hacen el cambio revisable.** Se revisa lo que cambia, no un
  estado final de 753 líneas en el que el cambio está diluido.
- **Es una base fiable para derivar.** El documento OpenAPI de este repo se
  contrastó scenario a scenario contra `specs/tasks/spec.md`, y esa comparación
  solo tiene sentido porque hay un lado que manda.

### Lo que nos cuesta

- **Todo cambio paga un peaje de escritura por adelantado.** Los tres changes
  archivados suman 943 líneas de delta-specs y 609 de proposal, design y tasks:
  1.552 líneas de markdown para un producto con cinco endpoints de tareas.
  Un `MODIFIED` obliga a reescribir el requirement entero aunque cambie una
  frase, y esa duplicación es la que explica que 943 líneas de delta produzcan
  1.060 de spec viva.
- **El orden de los deltas no está registrado en ninguna parte legible por una
  máquina.** Los tres changes llevan `created: 2026-08-13` y los tres
  directorios empiezan por esa misma fecha. El orden real —`add-task-list`,
  luego `add-task-due-date`, luego `add-task-status-filter`— solo se deduce
  leyendo la prosa, y **no es el orden alfabético** de los directorios. Importa:
  el requirement *«Una sola vista de tareas, sin señales de presencia»* está
  modificado por dos changes, y el bloque `MODIFIED` de `add-task-due-date` no
  contiene la frase sobre acotar la lista que sí tiene la spec viva. Reproducir
  las specs replicando los deltas en el orden equivocado da un resultado
  distinto y peor.
- **Nada comprueba que el archivo componga las specs vivas.** `openspec validate
  --all` valida las dos specs y nada más: no lee `changes/archive/`. La
  coherencia entre histórico y presente se sostiene en que alguien la mire.
- **La deriva no es hipotética: ya ha pasado, y se tardó en ver.** El filtro por
  estado se implementó y se dio por bueno dejando la spec viva afirmando lo
  contrario. Se detectó porque alguien lo escribió como riesgo en la proposal de
  *otro* change, no porque saltara ninguna alarma.
- **Hay otras descripciones del sistema y también derivan.** El `CLAUDE.md` de
  la raíz afirma hoy que la capability `tasks` «no tiene ni un test» y enumera
  cuatro rutas; hay cinco rutas de tareas, tres controladores y un fichero de
  tests. Declarar `openspec/` fuente de verdad no borra a los competidores: crea
  la obligación de mantenerlos alineados o de recortarlos.
- **Una spec no es una prueba, y aquí la distancia es grande.** La capability
  `tasks` tiene 124 scenarios y **3 tests automatizados**; el proyecto entero
  tiene 23. Los tres proposals renuncian a los tests de forma explícita y
  razonada, pero el efecto es que la inmensa mayoría de esos scenarios son
  promesas que nadie verifica al hacer push. Un scenario en prosa se lee como
  una garantía y no lo es.
- **Escribir bien esta prosa es caro y no todo el mundo la escribe igual.** El
  nivel de los tres changes archivados —con sus riesgos nombrados y sus
  decisiones argumentadas— es el listón, y sostenerlo cuesta más que el código
  que describe. Bajarlo convierte `openspec/` en ceremonia: ficheros que se
  rellenan porque toca y que nadie vuelve a leer, con el agravante de que
  entonces sí mandarían sobre el código.
- **Ata el proyecto a un formato y a una herramienta.** El esquema
  `spec-driven`, las cabeceras `ADDED`/`MODIFIED` y el CLI `openspec` son
  dependencias de proceso. Cambiar de herramienta significa migrar 1.060 líneas
  de spec viva más el archivo entero.
