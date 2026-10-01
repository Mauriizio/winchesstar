# Reglas del ajedrez estándar y su aplicación en el juego

Versión: 1.0. Verificación: 30 de septiembre de 2026.
Referencia normativa: Leyes del Ajedrez FIDE aplicables desde el 1 de enero de 2023, edición vigente mostrada en el Handbook consultado.
Este documento explica las reglas con redacción propia y fija su adaptación a una partida digital local sin reloj.

## 1. Objetivo y turno

Se enfrentan blancas y negras. Las blancas realizan la primera jugada; después los jugadores alternan.
El objetivo es dar **jaque mate**: atacar al rey rival de forma que no tenga ninguna respuesta legal.
El rey no se captura. Está prohibido dejar al propio rey en jaque, moverlo a una casilla atacada o realizar una jugada que lo exponga.
No existe «pasar turno».

## 2. Tablero y posición inicial

El tablero tiene 64 casillas, ocho columnas `a–h` y ocho filas `1–8`. Cada casilla se identifica, por ejemplo, como `e4`.
`a1` es oscura y `h1` es clara. Vista desde blancas, `a8` queda arriba a la izquierda y `h1` abajo a la derecha.
La casilla de la esquina cercana derecha de cada jugador es clara.

| Color | Fila principal, de la columna a a la h | Peones |
|---|---|---|
| Blancas | `a1` torre, `b1` caballo, `c1` alfil, `d1` dama, `e1` rey, `f1` alfil, `g1` caballo, `h1` torre | `a2–h2` |
| Negras | `a8` torre, `b8` caballo, `c8` alfil, `d8` dama, `e8` rey, `f8` alfil, `g8` caballo, `h8` torre | `a7–h7` |

Cada jugador empieza con un rey, una dama, dos torres, dos alfiles, dos caballos y ocho peones.
La dama empieza en una casilla de su color.

## 3. Movimiento y captura ordinarios

No puede ocuparse una casilla con una pieza propia. Una captura ordinaria reemplaza a la pieza rival en su casilla y la retira.

| Pieza | Movimiento | Restricciones |
|---|---|---|
| Rey | Una casilla en cualquier dirección; también puede enrocar | Nunca entra en una casilla atacada |
| Dama | Cualquier distancia por fila, columna o diagonal | No atraviesa piezas |
| Torre | Cualquier distancia por fila o columna | No atraviesa piezas |
| Alfil | Cualquier distancia por diagonal | No atraviesa piezas y permanece en el mismo color de casillas |
| Caballo | Dos casillas en una dirección y una perpendicular: forma de L | Salta sobre piezas; no termina sobre una pieza propia |
| Peón | Avanza una casilla hacia delante; desde su fila inicial puede avanzar dos | Avanza solo por casillas vacías y captura de otra manera |

Blancas avanzan hacia filas de número mayor; negras, hacia filas de número menor.
El peón captura una casilla diagonal hacia delante. No captura avanzando recto, no retrocede y no salta.
Para el avance doble, tanto la casilla intermedia como la de destino deben estar vacías. Un peón bloqueado tampoco puede avanzar dos.
Los reyes nunca pueden ocupar casillas contiguas.

## 4. Jaque y respuestas

Hay jaque cuando el rey está atacado. La respuesta debe eliminar el ataque:

- Mover el rey a una casilla segura.
- Capturar la pieza atacante, si es legal.
- Interponer una pieza, cuando el ataque lo permita.

No se puede bloquear el ataque de un caballo ni un ataque a distancia de una sola casilla.
Ante un jaque doble, el rey debe moverse.
Una pieza clavada no puede moverse si expone a su rey; aun así, para la seguridad del rey rival, cuenta como atacante de las casillas que ataca según su patrón. No calcular ataques usando únicamente los movimientos legales del rival.

## 5. Captura al paso

Se aplica únicamente entre peones.
Un peón rival acaba de avanzar dos casillas desde su posición inicial y termina junto a un peón propio, en una columna adyacente.
El peón propio puede capturarlo como si hubiese avanzado una casilla: se mueve en diagonal a la casilla que el rival cruzó y se retira el peón de la casilla donde realmente terminó.

Ejemplo: peón blanco en `e5`; negras juegan `d7–d5`. Inmediatamente, blancas pueden jugar `e5xd6` y retirar el peón negro de `d5`.
Para las negras, el caso equivalente se produce desde su cuarta fila hacia la tercera.

La captura es opcional y solo está disponible en la respuesta inmediata al avance doble.
Si se realiza otra jugada, se pierde esa oportunidad.
También es ilegal capturar al paso si, al retirar los dos peones de sus casillas anteriores, el propio rey queda expuesto.
Es la captura en la que la pieza capturada no está en la casilla de llegada.

## 6. Promoción

Un peón que llega a la última fila —fila 8 para blancas, fila 1 para negras— debe convertirse, en esa misma jugada, en dama, torre, alfil o caballo del mismo color.
No puede quedarse como peón, convertirse en rey ni elegir una pieza del rival.
La elección no depende de qué piezas fueron capturadas: pueden existir varias damas, torres, alfiles o caballos.
Promover a una pieza distinta de dama se conoce como subpromoción y puede ser la mejor jugada.
También se puede capturar y promover en una misma jugada.

La nueva pieza actúa inmediatamente; un jaque o mate se evalúa según la pieza elegida.
En la interfaz, pedir la elección antes de confirmar el movimiento completo. No alternar turno ni dejar un estado parcial con un peón en la última fila.

## 7. Enroque

Es una única jugada del rey que también mueve una torre del mismo color.
El rey avanza dos casillas hacia esa torre; la torre pasa a la casilla que el rey cruzó.

| Color | Enroque | Rey | Torre |
|---|---|---|---|
| Blancas | Corto, `O-O` | `e1 → g1` | `h1 → f1` |
| Blancas | Largo, `O-O-O` | `e1 → c1` | `a1 → d1` |
| Negras | Corto, `O-O` | `e8 → g8` | `h8 → f8` |
| Negras | Largo, `O-O-O` | `e8 → c8` | `a8 → d8` |

Requisitos:

1. El rey no se ha movido anteriormente.
2. La torre participante conserva su derecho de enroque: no se ha movido anteriormente.
3. No hay ninguna pieza entre rey y torre.
4. El rey no está en jaque.
5. La casilla atravesada por el rey y su casilla final no están atacadas.

Volver a la casilla de origen no recupera derechos perdidos.
Una torre promovida que llega a `a1`, `h1`, `a8` o `h8` no crea un nuevo derecho de enroque.
En el enroque largo, `b1` o `b8` debe estar vacía, aunque no necesita estar libre de ataques: el rey no pasa por ella.
La torre participante puede estar atacada. Lo que debe estar a salvo es el recorrido del rey.

## 8. Finales y tablas

| Situación | Resultado | Forma de finalizar |
|---|---|---|
| Jaque mate | Victoria del jugador que da mate | Inmediata |
| Ahogado | Tablas: quien tiene el turno no está en jaque y no tiene jugadas legales | Inmediata |
| Posición muerta | Tablas: ningún jugador puede dar mate mediante ninguna secuencia legal | Inmediata |
| Acuerdo | Tablas aceptadas por ambos jugadores, después de que cada uno haya realizado al menos una jugada | Aceptación del rival |
| Triple repetición | Tablas si el jugador con el turno hace una reclamación correcta | Reclamable |
| Regla de 50 jugadas | Tablas si el jugador con el turno hace una reclamación correcta | Reclamable |
| Quíntuple repetición | Tablas al aparecer la misma posición al menos cinco veces | Automática |
| Regla de 75 jugadas | Tablas tras 75 jugadas de cada jugador sin captura ni movimiento de peón | Automática; el mate de la última jugada prevalece |
| Rendición | Normalmente victoria del rival | Si el rival no puede dar mate por ninguna secuencia legal, el resultado es tablas |

Una oferta de tablas no detiene la partida por sí sola. El rival puede aceptarla, rechazarla o rechazarla jugando. En la app, seleccionar una pieza no equivale a tocarla físicamente con obligación de mover.

## 9. Repetición: posiciones, no dibujos ni secuencias

Las apariciones no tienen que ser consecutivas.
Para considerar la misma posición deben coincidir las piezas y sus casillas, el jugador con el turno y las posibilidades de movimiento, incluidos derechos de enroque y una captura al paso realmente legal.
No basta con comparar una captura de pantalla o la distribución de piezas.
La posición inicial cuenta como una aparición.

La triple repetición se puede reclamar cuando la posición ya apareció por tercera vez y el reclamante tiene el turno, o antes de una jugada declarada que produciría esa tercera aparición.
La declaración de jugada para reclamar no es una jugada ya ejecutada.
El jaque perpetuo no es una condición independiente de tablas: puede desembocar en repetición o en otra condición reglamentaria.

## 10. Regla de 50 y de 75 jugadas

«50 jugadas de cada jugador» equivale a **100 medias jugadas**; «75» equivale a **150 medias jugadas**.
Una media jugada es un movimiento de un solo jugador.
El contador se reinicia con cualquier movimiento de peón o captura, incluida la captura al paso.
El enroque y un movimiento ordinario de rey o torre no reinician el contador por sí mismos.

Las 50 jugadas habilitan una reclamación; no cierran automáticamente esta partida.
También se puede declarar una jugada que complete ese umbral y reclamar antes de ejecutarla.
Las 75 jugadas producen tablas automáticas, salvo si la última jugada dio jaque mate.

## 11. Posición muerta y material

La pregunta es si existe **alguna** secuencia legal que produzca mate, incluso con colaboración del rival; no si puede forzarse el mate jugando bien.
Rey contra rey, rey y alfil contra rey, y rey y caballo contra rey son ejemplos de posición muerta.
No declarar tablas únicamente porque un jugador no tenga peones, tenga poco material o no pueda forzar mate.
Por ejemplo, rey y dos caballos contra rey no se declara automáticamente posición muerta solo por esa combinación de material.

La posición muerta también puede depender de bloqueos y de las posibilidades reales de la posición. No reducir toda la regla a tres casos de material.
En rendición, la capacidad de dar mate se evalúa para el rival del jugador que se rinde, no necesariamente para ambos.

## 12. Convenciones de esta app sin reloj

- Seleccionar, deseleccionar o consultar destinos no compromete una jugada. El movimiento se confirma al elegir un destino legal y, si corresponde, una promoción.
- Una jugada ilegal se rechaza; el estado legal permanece intacto.
- No hay pérdidas por tiempo, sanciones de minutos, árbitro presencial ni obligación de anotar manualmente.
- La rendición pide una confirmación breve para evitar un clic accidental.
- No hay deshacer jugadas en la partida estándar del MVP. Un futuro modo de práctica podría añadirlo con un alcance distinto.
- Una partida terminada no admite movimientos adicionales.

Estas convenciones digitales adaptan el manejo de la interfaz; no convierten el producto en un torneo FIDE homologado.

## 13. Requisitos para programar los resultados

Usar un motor verificado para generar y aplicar movimientos legales.
Comprobar el jaque mate antes de aplicar la terminación por 75 jugadas.
Mantener separados **resultados finales**, **ofertas pendientes** y **derechos a reclamar**.

Para reclamar con una jugada prevista:

1. Validar la jugada y su promoción, si la tiene.
2. Simularla en una copia que preserve la historia necesaria.
3. Comprobar la condición reclamada.
4. Si se cumple, registrar las tablas y la jugada declarada; no registrarla como una jugada ya realizada.

La interfaz solo debe ofrecer reclamaciones que haya verificado. Así evita introducir un sistema de reclamaciones incorrectas y sanciones de torneo.

Para repeticiones, mantener una clave con posición, turno, derechos de enroque y captura al paso legal. Excluir contadores de medias jugadas y número de jugada.
Si la versión instalada de `chess.js` mantiene el comportamiento documentado, su `fen()` normaliza la casilla al paso a una captura legal; validar ese contrato antes de usar los primeros cuatro campos como clave.
Reproducir la historia al restaurar: cargar únicamente el último FEN no recupera las apariciones anteriores.

**Limitación de integración que debe resolverse:** `isInsufficientMaterial()` reconoce un conjunto de casos, no es una prueba general de toda posición muerta. Los métodos genéricos de finalización de bibliotecas también pueden aplicar tablas por 50 jugadas o triple repetición con una política distinta de la de este proyecto.
Crear y probar un servicio explícito de resultados; documentar cualquier cobertura pendiente de posiciones muertas o de capacidad unilateral de mate. No anunciar cumplimiento completo mientras esa cobertura falte.

## 14. Notación y consulta

`FEN` describe una posición; `PGN` registra una partida y sus jugadas.
En la notación internacional y el motor, `K` es rey, `Q` dama, `R` torre, `B` alfil y `N` caballo. Estos códigos no son la nomenclatura española de los archivos PNG.
`O-O` indica enroque corto, `O-O-O` largo, `+` jaque y `#` mate.
Los resultados habituales son `1-0`, `0-1` y `1/2-1/2`.

## Fuentes

- [FIDE: Laws of Chess, edición desde el 1 de enero de 2023](https://handbook.fide.com/chapter/E012023). Artículos 1–5 y 9 para movimiento, finalización y tablas.
- [Documentación oficial de chess.js](https://jhlywa.github.io/chess.js/). Contratos del motor, FEN y métodos de resultados; no sustituye al reglamento.

Fecha de consulta: 30 de septiembre de 2026. Revisar la edición vigente cuando se incorporen relojes o modalidades competitivas.
