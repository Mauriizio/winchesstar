# Guía de implementación del tablero y de la aplicación

Versión: 1.0. Fecha: 30 de septiembre de 2026.
Destinatario: GPT-6.1 o cualquier IA/equipo que implemente el proyecto.
Leer primero la constitución, el catálogo y las reglas. Este documento prescribe una implementación web adaptable; no crea el juego por sí solo.

## 1. Decisión principal: tablero SVG interactivo y coordenadas lógicas

**Usar SVG real para las 64 casillas interactivas y los PNG existentes mediante elementos `<image>`.**
Decisión explícita del creador para la implementación inicial: sustituye la recomendación anterior de CSS Grid.
El área jugable utiliza `viewBox="0 0 800 800"`, sin marco ni etiquetas dentro de sus coordenadas.

Cada casilla tiene una identidad lógica, como `e4`. Un clic en su botón proporciona esa identidad directamente; no necesita calcular coordenadas de píxeles.
El motor decide la legalidad y la cuadrícula solo muestra su posición.

| Técnica | Uso recomendado en este proyecto |
|---|---|
| HTML + CSS Grid | Composición de la página, opciones e historial; no define las casillas |
| SVG | Implementación principal: 64 grupos interactivos con rectángulos, PNG encuadrados, marcas, foco y teclado |
| PNG de tablero | Textura decorativa opcional; no define coordenadas, áreas de clic ni legalidad |
| Sprite sheet | Optimización posible más adelante; no aporta una ventaja necesaria con estas 24 imágenes reutilizadas |
| Canvas/WebGL | No es necesario para un tablero de 64 casillas; exige resolver interacción y accesibilidad por separado |

No hace falta convertir los PNG de las piezas a SVG. Un SVG puede contener una imagen PNG mediante `<image>`.
No elaborar una tabla manual con 64 rectángulos medidos sobre un tablero dibujado.

## 2. Separar cinco responsabilidades

| Capa | Responsabilidad | No debe hacer |
|---|---|---|
| `RulesEngine` | Posición, turno, historial y movimientos legales | Elegir imágenes o evaluar la biografía |
| `OutcomeService` | Resultados, ofertas y reclamaciones según el reglamento | Confundir toda repetición triple con un final automático |
| Catálogo | Equipos, personajes, imágenes y fuentes | Alterar el movimiento de una función |
| Interfaz | Lobby, tablero, selección, promoción e historial visible | Mantener una segunda posición independiente del motor |
| Persistencia | Guardado versionado y restauración del historial | Recuperar repeticiones solo desde el último FEN |

La ampliación Stockfish añade un `AnalysisEngine` independiente. Su evaluación no reemplaza al motor de reglas ni a la política de resultados.

Para un proyecto nuevo, usar TypeScript + React + Vite y un adaptador para `chess.js`.
Si ya existe un proyecto compatible, aprovechar su estructura; no migrarlo por preferencia.
Fijar dependencias con archivo de bloqueo y consultar las APIs de la versión realmente instalada.
No añadir servidor, base de datos, Stockfish en ejecución ni librerías de estado global para terminar una partida local por clic.

## 3. Coordenadas canónicas

El estado usa siempre notación algebraica: columna `a–h`, fila `1–8`.
Las coordenadas de pantalla son otra representación:

- `row`: fila visible, de 0 arriba a 7 abajo.
- `col`: columna visible, de 0 izquierda a 7 derecha.
- `file`: índice lógico de columna, `a = 0` hasta `h = 7`.
- `rank`: número lógico de fila, de 1 a 8.

### Fórmulas en ambas orientaciones

| Vista | De casilla lógica a pantalla | De pantalla a casilla lógica |
|---|---|---|
| Desde blancas | `col = file`; `row = 8 - rank` | `file = col`; `rank = 8 - row` |
| Desde negras | `col = 7 - file`; `row = rank - 1` | `file = 7 - col`; `rank = row + 1` |

| Casilla | Vista blanca: row, col | Vista negra: row, col |
|---|---|---|
| `a1` | `7, 0` | `0, 7` |
| `h1` | `7, 7` | `0, 0` |
| `a8` | `0, 0` | `7, 7` |
| `h8` | `0, 7` | `7, 0` |
| `e4` | `4, 4` | `3, 3` |

Una casilla es oscura cuando `(file + rank - 1) % 2 === 0`. Así `a1` siempre es oscura y `h1` siempre es clara.
Calcular el color desde la casilla lógica, no desde una imagen ni desde el equipo.
Girar la vista no modifica la posición.

### Funciones de referencia

```ts
import type { Square } from "chess.js";

type Color = "w" | "b";
type Orientation = Color;
const FILES = "abcdefgh";

export function squareToDisplay(square: Square, view: Orientation) {
  if (!/^[a-h][1-8]$/.test(square)) throw new RangeError("Casilla inválida");
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return view === "w"
    ? { row: 8 - rank, col: file }
    : { row: rank - 1, col: 7 - file };
}

export function displayToSquare(
  row: number,
  col: number,
  view: Orientation,
): Square {
  if (![row, col].every(v => Number.isInteger(v) && v >= 0 && v < 8)) {
    throw new RangeError("Coordenadas fuera del tablero");
  }
  const file = view === "w" ? col : 7 - col;
  const rank = view === "w" ? 8 - row : row + 1;
  return (FILES[file] + String(rank)) as Square;
}

export function isDarkSquare(square: Square): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return (file + rank - 1) % 2 === 0;
}
```

Generar 64 elementos en orden visible: `row = Math.floor(index / 8)`, `col = index % 8`.
Obtener su identidad con `displayToSquare`; usarla como clave estable y como `data-square`.
Todas las capas —casillas, marcas y futuras animaciones— deben usar estas mismas funciones.
No girar todo el contenedor con `rotate(180deg)`: ordenar las casillas según la vista mantiene derechos los personajes y las etiquetas.

## 4. Tamaño y composición del tablero

El área de las 64 casillas, llamada `board-core`, debe ser cuadrada y no tener bordes, separación ni relleno internos.
El marco y las letras/números van fuera de esa área. Así nunca entran en el cálculo de una casilla.
El contenedor exterior puede limitar el tamaño máximo y adaptarse al espacio disponible.

CSS de referencia actualizado para SVG (los grupos `.square` usan `role="button"` y foco itinerante):

```css
.board-core {
  --square-light: #e6d8bd;
  --square-dark: #72847a;
  --focus-color: #174e88;
  display: block;
  inline-size: min(100%, 42rem);
  aspect-ratio: 1 / 1;
  gap: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

.square {
  cursor: pointer;
  outline: none;
}

.focus-ring { opacity: 0; }
.square:focus-visible .focus-ring { opacity: 1; }
/* Los colores son fill de los rectángulos SVG; el foco son rectángulos
   internos. Cada grupo se recorta con clipPath a su propia casilla. */

.piece-viewport {
  inline-size: 88%;
  block-size: 88%;
  display: block;
  pointer-events: none;
}

img.piece-viewport {
  object-fit: contain;
  object-position: center;
  user-select: none;
}
```

Las marcas de selección, última jugada, jaque y destinos se dibujan dentro de la casilla mediante capas que no interceptan el puntero.
No agregar bordes que cambien el tamaño de casillas al seleccionar.
El 88 % es una proporción de referencia, configurable por el tema dentro de un margen seguro; no es un tamaño fijo en píxeles.
Una pieza conserva su relación de aspecto y cabe completa, incluidos espada, bandera, caballo y pedestal.
No usar `object-fit: cover` ni deformar ancho y alto para llenar el cuadro.

## 5. Centrar el contenido visible de los PNG

Centrar un elemento `img` centra su lienzo. Si un PNG tiene más transparencia a un lado, su figura puede seguir viéndose desplazada.
El importador debe comprobar tanto las dimensiones del archivo como los límites de sus píxeles visibles.

Procedimiento:

1. Inventariar cada PNG sin modificarlo.
2. Calcular una vez sus límites por canal alfa y guardar el rectángulo en metadatos.
3. Añadir un pequeño margen al rectángulo para conservar el suavizado de bordes.
4. Revisar visualmente el resultado; excluir artefactos transparentes aislados solo con un criterio documentado.
5. Si ambas versiones de color comparten lienzo y composición, usar la unión de sus límites para evitar cambios de escala al cambiar de color.
6. Si sus lienzos difieren, normalizar los límites en el espacio de referencia y revisar el par; no unir coordenadas de píxeles incompatibles.

Tipo de referencia:

```ts
type SpriteSpec = {
  src: string;                   // Ruta real del PNG
  sourceWidth: number;           // Dimensiones reales
  sourceHeight: number;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };                             // Límite visible más margen
};
```

Si los PNG ya están encuadrados de manera uniforme, basta un `img` con `object-fit: contain`.
Para márgenes desiguales, usar un encuadre virtual SVG. Este ejemplo JSX conserva el archivo original:

```tsx
function PieceImage({ sprite }: { sprite: SpriteSpec }) {
  const box = sprite.crop;
  const viewBox = [box.x, box.y, box.width, box.height].join(" ");
  return (
    <svg
      className="piece-viewport"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <image
        href={sprite.src}
        x={0}
        y={0}
        width={sprite.sourceWidth}
        height={sprite.sourceHeight}
      />
    </svg>
  );
}
```

El rectángulo visible se ajusta, completo y centrado, al área reservada de la casilla. Validar que los límites sean positivos y estén dentro de la imagen.
No calcular el canal alfa durante cada render o movimiento.
No inventar dimensiones o recortes antes de inspeccionar los PNG reales.
Si una figura necesita un ajuste óptico adicional, guardarlo como metadato revisado del recurso; no dispersar desplazamientos arbitrarios por los componentes.

## 6. Tablero completamente SVG: implementación obligatoria

Mantener las mismas casillas lógicas y usar `viewBox="0 0 800 800"`.
Cada casilla mide 100 unidades de dibujo, independientemente del tamaño en pantalla:

```ts
const x = col * 100;
const y = row * 100;
const centerX = (col + 0.5) * 100;
const centerY = (row + 0.5) * 100;
```

Generar los 64 rectángulos con estas fórmulas. Una pieza ocupa un área de referencia de 88 × 88 centrada dentro de su rectángulo.
El SVG es la representación visual, no la fuente de la posición. La accesibilidad y el teclado deben resolverse también.
Esta es la implementación principal prescrita por el creador. Cada grupo tiene `data-square`, nombre accesible, `role="button"` y `tabIndex` itinerante. El foco se representa con rectángulos SVG; las flechas se transforman mediante las mismas funciones de geometría. El marco y las coordenadas se renderizan fuera del SVG jugable.

## 7. Catálogo y resolución de recursos

Mantener una tabla explícita entre funciones del motor y códigos del creador:

| Motor | Función | Código de archivo |
|---|---|---|
| `k` | Rey | `R` |
| `q` | Dama | `D` |
| `r` | Torre | `T` |
| `b` | Alfil | `A` |
| `n` | Caballo | `C` |
| `p` | Peón | `P` |

`b` como color interno significa negras; `b` como tipo de pieza significa alfil. Son campos distintos. La `B` del nombre PNG significa blanca.
No interpretar un nombre mediante reglas ambiguas ni usar códigos de archivos como si fueran símbolos del motor.

Modelo de referencia:

```ts
type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
type TeamId = string;
type CharacterDefinition = {
  id: string;
  name: string;
  kind: "person" | "unit" | "structure" | "symbol";
  description: string;
  sources: { title: string; url?: string }[];
  assets: Record<Color, SpriteSpec>;
};

type TeamDefinition = {
  id: TeamId;
  name: string;
  category: string;
  description: string;
  pieces: Record<PieceType, CharacterDefinition>;
};

type BoardTheme = {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
  selectionColor: string;
  ornamentSrc?: string;
};
```

Resolver una imagen mediante `teams[teamByColor[piece.color]].pieces[piece.type].assets[piece.color]`.
`teamByColor` relaciona `w` y `b` con sus equipos, no con la orientación.
No codificar «libertador siempre blanco» en los componentes.
Una promoción selecciona la entrada de la nueva función en ese mismo equipo y color.

La raíz confirmada por las capturas es `C:\Proyectos\winchesstar`. Desarrollar toda la aplicación en esa carpeta.
Los originales están en `ejercito libertador` y `ejercito realista`, directamente bajo la raíz. Los cuatro documentos fuente van en `docs`, también bajo la raíz.

| Ruta relativa a la raíz | Función |
|---|---|
| `ejercito libertador/C-B-L.png` | Ejemplo de recurso original libertador |
| `ejercito realista/R-B-R.png` | Ejemplo de recurso original realista |
| `docs/00_CONSTITUCION_DEL_JUEGO.md` | Constitución del proyecto |
| `docs/01_PERSONAJES_Y_COLECCIONES.md` | Catálogo y fichas |
| `docs/02_REGLAS_DEL_AJEDREZ.md` | Reglamento |
| `docs/03_TABLERO_Y_ARQUITECTURA.md` | Esta guía |

La ruta Windows indica dónde abrir el proyecto; no es una URL válida para `img.src` en una aplicación desplegada.
Para servir las imágenes con Vite, añadir un paso reproducible de preparación que copie los originales a `public/assets/pieces/libertadores/` y `public/assets/pieces/realistas/` conservando sus nombres.
Esas rutas `public/assets` son salidas de integración, no las carpetas originales observadas. No mover, borrar ni renombrar los originales.
Generar el manifiesto web con URLs como `/assets/pieces/libertadores/C-B-L.png` y `/assets/pieces/realistas/R-B-R.png`, respetando la base pública configurada para el despliegue.
El paso debe ejecutarse antes de desarrollo y construcción, verificar conflictos de nombres y avisar si falta algún recurso.
Usar rutas relativas al proyecto en scripts; no fijar `C:\Proyectos\winchesstar` dentro de la lógica del juego.
Validar 6 funciones × 2 colores × 2 equipos a partir de los nombres confirmados en el catálogo.
Cargar las imágenes de la partida seleccionada antes de permitir jugar. Un error de recurso debe informarse; no mostrar una pieza invisible como si faltara en la posición.
Reutilizar URLs y la caché del navegador. No hace falta crear una copia del PNG por cada peón.

## 8. Flujo de una jugada

1. Consultar en el motor la pieza de la casilla seleccionada.
2. Permitir seleccionar una pieza del jugador con el turno.
3. Pedir al motor los movimientos legales de esa casilla.
4. Mostrar destinos derivados de esa lista.
5. Si el destino requiere promoción, abrir las cuatro opciones y esperar la elección.
6. Enviar una solicitud completa `{ from, to, promotion? }` al adaptador.
7. Si es válida, actualizar el estado visible desde el motor y evaluar el resultado.
8. Limpiar selección, actualizar historial y persistir.

Si se elige otra pieza propia, cambiar la selección; si se elige un destino ilegal, no modificar la posición.
La promoción pendiente se puede cancelar sin ejecutar la jugada.
El enroque mueve rey y torre como una sola operación legal.
La captura al paso retira el peón indicado por la jugada del motor, aunque esté fuera del destino.
Nunca simular capturas o movimientos especiales cambiando primero las imágenes.

En React, alojar la instancia mutable del motor en un servicio o referencia estable y publicar una instantánea después de cada operación válida.
No llamar a funciones que muten el motor durante un render.
Guardar en la interfaz selección, orientación, diálogos y ofertas; derivar la posición, el turno y los destinos del motor.
Evitar efectos encadenados que mantengan dos tableros intentando sincronizarse.

## 9. Resultados e historial

Implementar `OutcomeService` conforme a `02_REGLAS_DEL_AJEDREZ.md`.
No usar `isGameOver()` o `isDraw()` como política completa de este producto.
El servicio distingue:

- Mate, ahogado y casos verificados de posición muerta.
- Reclamaciones de triple repetición y 50 jugadas.
- Final automático por cinco repeticiones o 75 jugadas.
- Acuerdo, rendición y capacidad de mate aplicable.

Conservar un contador de repeticiones con claves reglamentarias, incluida la posición inicial.
Para una reclamación por jugada prevista, simular en una copia con historia y no añadir esa jugada al historial como realizada.
Resolver y declarar las limitaciones de posición muerta general; un método de material insuficiente no cubre todos los bloqueos posibles.
No usar una evaluación Stockfish cercana a cero como prueba de tablas reglamentarias.

Guardar una estructura con versión, posición inicial, movimientos `from/to/promotion`, equipos, tema, orientación y resultado.
Al restaurar, reconstruir el motor reproduciendo las jugadas y recalcular repeticiones; después validar que el resultado guardado es coherente.
Una partida malformada no debe causar movimientos ilegales ni corromper otra partida.

## 10. Tema, interacción y accesibilidad

Los colores de casillas se definen con variables CSS. Texturas o adornos deben conservar el contraste y no interceptar eventos.
Cambiar de tema no cambia coordenadas, posición, turno o historial.
Comprobar legibilidad de las piezas blancas y negras sobre ambos colores de casilla.

Usar botones con nombres accesibles, por ejemplo «e4, peón blanco del Ejército Libertador» o «e4, vacía».
Usar un punto de entrada de teclado al tablero y navegación con flechas según la orientación visible.
Enter o espacio seleccionan/confirman; Escape cancela selección o promoción pendiente.
Conservar un foco visible y anunciar cambios de turno, jaque y resultado sin abrir fichas educativas.
No usar el color como único indicador de selección o destino legal.
Las imágenes y SVG decorativos no deben duplicar el nombre accesible del botón.

Para el MVP, clic/toque y teclado bastan.
Si después se añade arrastre, usar Pointer Events, captura del puntero y una previsualización separada; la posición real cambia solo al validar el destino.
Para convertir el puntero en casilla, medir exclusivamente `board-core`:

```ts
function squareAtPointer(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  view: Orientation,
): Square | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
  const col = Math.floor((x / rect.width) * 8);
  const row = Math.floor((y / rect.height) * 8);
  return displayToSquare(row, col, view);
}
```

No ajustar un arrastre fuera del tablero a la casilla de la esquina: rechazarlo y restaurar la vista del estado legal.
No usar coordenadas del marco, del PNG o de la pantalla completa.

## 11. Contrato para instalar el módulo Stockfish 18

La constitución exige que el análisis pueda añadirse como módulo sin rehacer la aplicación.
Preparar el contrato y separar sus dependencias desde el MVP; la instalación y pantalla de análisis son una ampliación.

Contrato de referencia, independiente de React y del transporte:

```ts
type AnalysisRequest = {
  requestId: string;
  initialFen: string;
  movesUci: string[];            // Ej.: e2e4, e7e5, a7a8q
  limit: { kind: "depth" | "movetime"; value: number };
  multiPv: number;
};

type AnalysisLine = {
  requestId: string;
  depth: number;
  multipv: number;
  score:
    | { kind: "cp"; value: number }
    | { kind: "mate"; value: number };
  scorePerspective: Color;      // Color al que favorece una puntuación positiva
  bound?: "lower" | "upper";     // Si el motor informa un límite
  pvUci: string[];
};

interface AnalysisEngine {
  initialize(): Promise<{ name: string; version: string }>;
  analyze(
    request: AnalysisRequest,
    onInfo: (line: AnalysisLine) => void,
  ): Promise<{ requestId: string; bestMoveUci: string | null }>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
}
```

`initialFen + movesUci` preserva el contexto de la partida para el motor de análisis.
Mantener explícita la perspectiva de puntuación. Girar el tablero o invertir ejércitos no cambia el significado de una evaluación.
Una puntuación de mate no es un valor en centipeones y un límite superior/inferior no es una evaluación exacta.

Requisitos de la futura integración:

1. Verificar que el recurso distribuido corresponde a Stockfish 18; registrar versión, origen y recursos necesarios.
2. En web, seleccionar una compilación para navegador y ejecutarla en un Web Worker. No intentar lanzar un `.exe` mediante JavaScript del navegador.
3. Cargar el motor y sus recursos bajo demanda. Sin el módulo, el ajedrez local sigue funcionando.
4. Implementar negociación UCI, disponibilidad, opciones soportadas, posición, búsqueda, parada y liberación mediante el adaptador.
5. Limitar memoria, hilos y búsqueda según el dispositivo. Si la compilación multihilo requiere aislamiento entre orígenes, configurar y verificarlo; disponer de una alternativa de un hilo.
6. Permitir una búsqueda activa por instancia. Detener y drenar la búsqueda anterior antes de iniciar otra; etiquetar respuestas y descartar resultados obsoletos.
7. No confiar solo en `requestId`: UCI no lo incluye de forma nativa. El adaptador debe controlar la secuencia de comandos y respuestas.
8. Validar las variantes sugeridas en una copia del motor legal antes de convertirlas a notación visible. No modificar la partida real al analizar.
9. Abrir el análisis de forma voluntaria, inicialmente después de terminar. No mostrar recomendaciones al jugador durante la partida estándar.
10. Incluir la licencia GPL correspondiente y facilitar el código fuente que genera el binario distribuido, con las modificaciones aplicables y su procedencia.

Las opciones concretas de una compilación se obtienen de su negociación UCI; no asumir que todas las plataformas exponen las mismas.
Una integración por proceso nativo en una futura app de escritorio puede implementar esta misma interfaz.
El motor de análisis no resuelve por sí mismo la cobertura de todas las posiciones muertas del reglamento.

## 12. Comprobaciones de aceptación

### Geometría y recursos

- Hay exactamente 64 casillas distintas.
- Las conversiones casilla → pantalla → casilla son inversas para las 64 casillas en ambas vistas.
- `a1` es oscura, `h1` clara y las coordenadas visibles corresponden a la orientación.
- Las piezas caben y se ven centradas con tablero pequeño, grande, zoom y cambio de orientación.
- Espadas, cruces, banderas y caballos no invaden otras casillas.
- Ambos equipos funcionan como blancas o negras y reutilizan sus imágenes sin alterar reglas.
- Las promociones conservan equipo y color, incluidas múltiples damas.

### Casos legales que deben probarse

Los siguientes FEN son posiciones de prueba, no partidas que el MVP deba ofrecer como modo editor.

| Caso | Posición o secuencia | Resultado esperado |
|---|---|---|
| Captura al paso legal | `4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2` | `e5–d6` retira el peón de `d5` |
| Captura al paso expone al rey | `7k/8/8/r4pPK/8/8/8/8 w - f6 0 2` | `g5–f6` es ilegal |
| Ambos enroques blancos | `4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1` | Ambos disponibles; rey y torre se mueven conjuntamente |
| Enroque atraviesa ataque | `4kr2/8/8/8/8/8/8/4K2R w K - 0 1` | Enroque corto ilegal porque `f1` está atacada |
| Ataque a b1 en enroque largo | `1r2k3/8/8/8/8/8/8/R3K3 w Q - 0 1` | Enroque largo legal aunque `b1` esté atacada |
| Cuatro promociones | `4k3/P7/8/8/8/8/8/4K3 w - - 0 1` | `a7–a8` ofrece dama, torre, alfil y caballo |
| Mate | `7k/6Q1/6K1/8/8/8/8/8 b - - 0 1` | Victoria blanca |
| Ahogado | `7k/5Q2/6K1/8/8/8/8/8 b - - 0 1` | Tablas |
| Reclamación de 50 con jugada prevista | `7k/8/8/8/8/8/R7/K7 w - - 99 50` | Declarar `a2–a3` permite reclamar; ejecutarla no finaliza automáticamente |
| Mate prevalece sobre 75 | `7k/8/5K2/6Q1/8/8/8/8 w - - 149 75` | `g5–g7#` gana aunque el contador llegue a 150 |
| Repetición | Desde inicio: `g1f3, g8f6, f3g1, f6g8`, repetido | Tras dos ciclos, tercera aparición reclamable; tras cuatro, quinta automática |
| Pérdida de derechos de enroque | Rey o torre se mueve y vuelve al origen | El derecho no se recupera |

Comprobar también caducidad de captura al paso, clavadas, jaque doble, bloqueo de peones, ausencia de capturas de rey, material muerto conocido y casos pendientes de cobertura.
Verificar que rendirse contra un rival incapaz de dar mate produce tablas según el archivo de reglas.
La recarga debe conservar promociones, repeticiones y reclamaciones.
Cuando exista Stockfish, probar parada, respuestas obsoletas, identidad de versión, fallo de carga y funcionamiento de la partida sin módulo.

## 13. Orden de implementación

1. Abrir `C:\Proyectos\winchesstar`, leer `docs` e inventariar las dos carpetas de recursos; comprobar las identidades históricas y los veinticuatro nombres observados.
2. Crear tipos, catálogo, geometría y adaptador del motor.
3. Construir tablero y partida por clic/toque con promociones.
4. Implementar resultados, reclamaciones e historial.
5. Conectar lobby educativo y selección de equipos.
6. Añadir persistencia, teclado y comprobaciones en ambas orientaciones.
7. Dejar definido y desacoplado el contrato de análisis Stockfish 18.
8. Entregar instrucciones de ejecución y cobertura real de reglas; después ampliar.

No empezar por animaciones, sprite sheets o un tablero rasterizado.
La entrega debe demostrar una partida funcional y las comprobaciones relevantes; una maqueta visual sin legalidad no completa el MVP.

## Fuentes técnicas

- [MDN: CSS Grid layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout).
- [MDN: SVG viewBox](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox).
- [MDN: SVG preserveAspectRatio](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/preserveAspectRatio).
- [React: elegir la estructura del estado](https://react.dev/learn/choosing-the-state-structure).
- [Documentación oficial de chess.js](https://jhlywa.github.io/chess.js/).
- [MDN: uso de Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).
- [Stockfish: anuncio oficial de la versión 18](https://stockfishchess.org/blog/2026/stockfish-18/).
- [Stockfish: repositorio, documentación y condiciones de distribución](https://github.com/official-stockfish/Stockfish).
- [FIDE: Leyes del Ajedrez](https://handbook.fide.com/chapter/E012023).

Las decisiones de arquitectura y el código de referencia son recomendaciones específicas de este proyecto. Verificar las APIs y compilaciones elegidas al implementar.
