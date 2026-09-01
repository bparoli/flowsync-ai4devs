# 2. Los tests de integración como única fuente de verdad ejecutable

> **Documento de escenario.** Redactado el 2026-08-31 como ejercicio de
> anticipación, fechado a un año vista. No registra una decisión ya tomada: su
> contexto describe la situación *supuesta* de 2027-08-31, no medidas reales de
> ese momento. Los números atribuidos a 2026 sí son medidas del repositorio.

Reemplaza a [ADR 0001 — Las delta-specs de OpenSpec como fuente de verdad viva](0001-openspec-como-fuente-de-verdad.md).

## Contexto

El [ADR 0001](0001-openspec-como-fuente-de-verdad.md) declaró `openspec/` fuente
de verdad de FlowSync y anotó, entre sus costes, tres que el año transcurrido ha
convertido en el problema principal:

- **Una spec no es una prueba.** En 2026-08-31 la capability `tasks` tenía 124
  scenarios y 3 tests automatizados; el proyecto entero, 169 scenarios y 23
  tests. La inmensa mayoría de aquellas garantías no las verificaba nadie al
  hacer push.
- **Nada comprobaba que el archivo compusiera las specs vivas.** `openspec
  validate` leía las specs y no `changes/archive/`, y el orden real de los
  deltas no constaba en ningún metadato: los tres changes archivados llevaban la
  misma fecha y su orden correcto no era el alfabético.
- **La deriva ya había ocurrido.** El filtro por estado se implementó dejando la
  spec viva afirmando lo contrario, y se detectó porque alguien lo escribió como
  riesgo en la proposal de otro change, no porque saltara ninguna alarma.

Durante este año la suite de integración ha crecido hasta cubrir el
comportamiento que la spec describía, y el efecto ha sido que cada cambio se
documenta dos veces: una en prosa normativa y otra en aserciones. Cuando las dos
discrepan gana la que falla en CI, no la que manda sobre el papel — de modo que
la jerarquía que el ADR 0001 declaró dejó de ser la real antes de que nadie la
revocara.

Este ADR registra que la jerarquía pasa a ser la que ya se practica.

Lo que se decide **no** es que la spec estuviera mal: es que mantener dos
descripciones del mismo comportamiento solo se sostiene mientras una de las dos
aporta algo que la otra no puede. Cuando la suite cubre lo que la prosa
prometía, la prosa pasa a ser coste sin contrapartida —salvo en las zonas que
ningún test alcanza, que este ADR enumera y que son el precio de la decisión.

## Decisión

**Los tests de integración son la única fuente de verdad ejecutable de
FlowSync.**

1. **Una garantía de comportamiento existe si, y solo si, hay un test que
   falla cuando se rompe.** Ante una contradicción entre un test y cualquier
   otra descripción —una spec, un comentario, el documento OpenAPI, el
   `CLAUDE.md`—, manda el test. Lo que no está cubierto no está garantizado, y
   se dice así en lugar de darlo por especificado.
2. **`openspec/` se congela, no se borra.** Las specs vivas y los tres changes
   archivados se conservan tal cual como registro histórico, marcados como no
   mantenidos. No se actualizan más y dejan de consultarse para saber qué hace
   el sistema hoy.
3. **Los tests se escriben para leerse como especificación**: agrupados por
   capability, con nombres que digan el comportamiento observable y no el
   método que ejercitan. La correspondencia que ya existía —el test `'la tarea
   no filtra datos de cuenta'` frente al scenario homónimo— pasa de convención
   agradable a requisito.
4. **Los requisitos negativos se codifican como aserciones explícitas.** Que la
   lista no lleve el vencimiento no puede quedar como la ausencia de dos campos
   en un transformer: se afirma que esos campos no están. Una garantía negativa
   sin aserción propia desaparece con esta decisión.
5. **El porqué se muda a los ADR.** Lo que los `design.md` guardaban —la
   alternativa descartada, el riesgo asumido, la decisión de producto detrás de
   una comparación— no cabe en una aserción, y sin sitio adonde ir se pierde.
   A partir de aquí, toda decisión con alternativa razonable descartada se
   registra en `docs/adr/`.
6. **Antes de congelar nada, se paga la migración.** Cada scenario de
   `openspec/specs/` se traduce a un test, se descarta por escrito con su
   motivo, o se traslada a un ADR si lo que aporta es rationale y no
   comportamiento. Congelar la spec sin ese barrido convertiría esta decisión en
   una pérdida de información encubierta.

## Estado

Aceptada (2027-08-31). Reemplaza al
[ADR 0001](0001-openspec-como-fuente-de-verdad.md), cuyo estado pasa a
*Reemplazada*.

## Consecuencias

### Lo que ganamos

- **Una sola descripción, y falla sola.** Desaparece la clase entera de defectos
  que el ADR 0001 no supo cerrar: no hay dos artefactos que puedan discrepar
  porque solo hay uno, y CI lo comprueba en cada push en lugar de depender de
  que alguien lo mire.
- **Se acaba el problema de composición.** No hay deltas, ni orden que
  reconstruir, ni requisito reescrito entero por cambiar una frase. El defecto
  estructural más serio del ADR 0001 —que las specs vivas no eran una función
  reproducible de su archivo— deja de existir.
- **Cambiar sale más barato.** Un cambio de comportamiento cuesta el test y el
  código, no además 300 líneas de delta.
- **La cobertura deja de ser una métrica y pasa a ser el mapa.** Lo que no está
  cubierto se ve, y se ve como lo que es: comportamiento sin garantizar.

### Lo que nos cuesta

- **La interfaz se queda sin fuente de verdad de ningún tipo.** De las 51
  requirements de las dos capabilities, **25 son de interfaz** (10 de 19 en
  `auth`, 15 de 32 en `tasks`), y el frontend **no tiene runner de tests
  instalado**: `frontend/package.json` declara `dev`, `build`, `lint`, `format`
  y `preview`, y ni vitest, ni jest, ni playwright, ni testing-library. Tomada
  hoy, esta decisión no traslada esas 25 requirements a los tests: las deja
  huérfanas. Es el coste más grande y el que condiciona el calendario — sin
  suite de frontend antes de congelar, media especificación se evapora.
- **Los scenarios que afirman una ausencia universal no son codificables.**
  *«El catálogo de estados no se toca»* dice: «se recorre la API entera en busca
  de una operación para crear, renombrar o borrar un estado — no existe
  ninguna». Igual *«No hay lista personal»* y *«Un solo estado por petición»*.
  Ningún test afirma que algo no existe en ninguna parte; a lo sumo comprueba
  los sitios donde se le ocurre mirar. Estas garantías bajan de categoría: de
  requisito a costumbre.
- **El porqué no cabe en una aserción.** Un test fija que la comparación es `<`
  y no `<=`; no dice que *«vencer hoy todavía no es estar vencida»* fuera una
  decisión de producto y no un detalle de implementación. Sin ese contexto,
  quien vea el test dentro de dos años puede leerlo como un off-by-one y
  «arreglarlo». El punto 5 de la decisión existe para tapar esto, y depende por
  completo de que se cumpla.
- **Se pierde el lenguaje común con quien no programa.** 169 scenarios en
  WHEN/THEN los lee producto y los discute; una suite de Japa, no. La
  especificación deja de ser un sitio donde negociar el comportamiento antes de
  construirlo y pasa a ser una consecuencia de haberlo construido.
- **Los tests describen el presente y no guardan el alcance.** Ninguna suite
  registra lo que se dejó fuera **a propósito**, que es la mitad del valor de
  los `proposal.md` archivados. El `git log` no lo sustituye: contesta qué
  cambió, no qué se decidió no hacer.
- **Se acopla la verdad a la forma de hoy.** Un test de integración fija rutas,
  códigos y formas de payload. Un refactor que preserva el comportamiento puede
  romperlos, y —peor— pueden pasar en verde describiendo un producto
  equivocado: verifican que el sistema hace lo que hace, no que sea lo que hay
  que hacer.
- **La migración es trabajo real y no es opcional.** 169 scenarios que traducir,
  descartar o mudar, uno a uno, más levantar la suite de frontend que hoy no
  existe. Si se congela `openspec/` antes de terminar ese barrido, el resultado
  no es cambiar de fuente de verdad: es quedarse sin ninguna para lo que faltaba
  por migrar.
