# Constitución del juego de ajedrez educativo temático

Versión: 1.0. Fecha: 30 de septiembre de 2026.
Destinatario: la IA o el equipo que implemente el juego.
Este documento fija el producto y el alcance de la primera versión.

## 1. Visión

Crear un juego de ajedrez en español que combine partidas de ajedrez estándar con colecciones de piezas basadas en personas, agrupaciones, unidades y construcciones reales.
La diferencia del producto está en sus colecciones temáticas y en la posibilidad de conocer a sus protagonistas mediante fichas breves.
La experiencia debe ser cómoda para quien solo quiere jugar y útil para quien también quiere consultar la historia.

El componente educativo se consulta voluntariamente en el lobby antes de iniciar una partida. Durante la partida no aparecerán lecciones, preguntas, biografías ni interrupciones educativas automáticas.

Nombre de trabajo: **Ajedrez educativo temático**. No inventar un nombre comercial definitivo.

## 2. Documentos fuente y orden de lectura

1. `00_CONSTITUCION_DEL_JUEGO.md`: producto, alcance y principios.
2. `01_PERSONAJES_Y_COLECCIONES.md`: fichas, identidad de las piezas y nomenclatura.
3. `02_REGLAS_DEL_AJEDREZ.md`: reglas y política de resultados.
4. `03_TABLERO_Y_ARQUITECTURA.md`: geometría, renderizado, interacción e implementación.

La constitución determina el alcance; el archivo de reglas determina la legalidad; el archivo de personajes determina el contenido; la guía técnica determina cómo representarlo. Una decisión visual nunca puede modificar una regla.
Si hay una contradicción real entre documentos, señalarla y resolverla explícitamente antes de implementar la parte afectada. No ampliar el alcance por inferencia.

### 2.1. Raíz y carpetas del proyecto

La carpeta principal en el equipo del creador es **`C:\Proyectos\winchesstar`**, identificada en sus capturas del Explorador de Windows.
La aplicación debe desarrollarse en esa raíz; los recursos existentes no son un proyecto separado.

| Ubicación | Contenido |
|---|---|
| `C:\Proyectos\winchesstar` | Raíz de todo el proyecto |
| `C:\Proyectos\winchesstar\ejercito libertador` | Doce PNG originales del equipo libertador |
| `C:\Proyectos\winchesstar\ejercito realista` | Doce PNG originales del equipo realista |
| `C:\Proyectos\winchesstar\docs` | Carpeta para los cuatro documentos fuente Markdown |

Crear `docs` junto a las dos carpetas de piezas y colocar allí estos cuatro archivos.
Conservar exactamente los nombres de las carpetas y archivos originales, incluidos sus espacios.
Para ejecutar la aplicación web, resolver los recursos mediante el proceso de construcción indicado en la guía técnica; no usar rutas `C:\...` como URLs de imágenes.
La ruta absoluta identifica la ubicación actual del creador. Dentro del código, usar rutas relativas a la raíz para que el proyecto también pueda trasladarse a otro equipo.

## 3. Primera colección

**Libertadores contra Realistas**, ambientada en la independencia de Venezuela y Sudamérica durante las primeras décadas del siglo XIX.
En este proyecto, «Realistas» identifica al bando de la monarquía española; no es un tercer ejército distinto del español.

| Función de ajedrez | Libertadores | Realistas |
|---|---|---|
| Rey | Simón Bolívar | Fernando VII |
| Dama / reina | Manuela Sáenz | María Josefa Amalia de Sajonia |
| Alfil | José Antonio Páez | Pablo Morillo |
| Caballo | Antonio José de Sucre a caballo | Miguel de la Torre a caballo |
| Torre | Campanario patriota fortificado | Fortaleza inspirada en San Felipe de Puerto Cabello |
| Peón | Soldado de infantería del Ejército Libertador | Fusilero inspirado en el batallón de Valencey |

Las seis funciones utilizan las reglas habituales del ajedrez. No existen poderes, ataques especiales, estadísticas de combate, ventajas por ejército ni habilidades por personaje.
«Rey», «dama», «alfil», etc. son funciones del juego: Bolívar no fue rey, Manuela no fue reina consorte y los alfiles no se presentan como obispos históricos.
El conjunto es una selección temática; no afirma que todas las figuras participaron juntas en una misma batalla.

## 4. Color, equipo e identidad son conceptos independientes

- Color ajedrecístico: blancas o negras; internamente `w` o `b`.
- Equipo: `libertadores` o `realistas` en el MVP.
- Función: `k`, `q`, `r`, `b`, `n`, `p` en el motor.
- Personaje o representación: un identificador estable del catálogo.
- Imagen: el PNG correspondiente a equipo, función y color.

Cada equipo tiene sus seis diseños en blanco y negro: **24 recursos visuales** entre los dos equipos.
Una partida empieza con **32 instancias**: 16 por color. Los dos alfiles, los dos caballos, las dos torres y los ocho peones pueden reutilizar la imagen y ficha de su función.

Configuración inicial: Libertadores con blancas y Realistas con negras. El lobby permitirá invertir esa asignación. Las blancas empiezan siempre, independientemente del ejército seleccionado.
Girar el tablero cambia la vista, no el turno, el color ni la identidad de los jugadores.

## 5. Alcance obligatorio del MVP

Modalidad de entrega inicial: **dos personas jugando localmente en el mismo dispositivo**, sin reloj, desde la posición inicial estándar.
Esta modalidad concreta la primera versión sin introducir servidor multijugador ni un oponente de IA.

El MVP debe incluir:

1. Lobby con presentación de ambos equipos, seis fichas por equipo y selección de su asignación a blancas/negras.
2. Inicio de una partida de ajedrez estándar sin límite de tiempo.
3. Tablero adaptable de 8 × 8, coordenadas algebraicas y piezas PNG existentes.
4. Selección por clic o toque, destinos legales visibles y captura de piezas.
5. Turno visible y bloqueo de cualquier movimiento ilegal.
6. Enroque, captura al paso y elección de promoción a dama, torre, alfil o caballo.
7. Jaque, mate, ahogado y resultados conforme a la política del archivo de reglas.
8. Rendición, oferta de tablas y reclamación válida de tablas.
9. Historial de jugadas y acceso a nueva partida o regreso al lobby.
10. Guardado local de la partida y restauración después de recargar la página.
11. Vista desde blancas o negras y funcionamiento con teclado, ratón y pantalla táctil.

Una promoción usa el diseño de la nueva función dentro del mismo equipo y color. Por ejemplo, un peón libertador promovido a dama utiliza a Manuela Sáenz. Esto no cambia la biografía ni crea una ficha nueva.

## 6. Fuera de la primera versión

Se dejan para versiones posteriores:

- Relojes, incrementos, partidas rápidas, blitz y bullet.
- Partidas por Internet, cuentas, salas, emparejamiento y clasificación.
- Oponente de IA, interfaz de análisis de mejores jugadas y entrenador de ajedrez. La arquitectura del MVP sí debe admitir el módulo de análisis Stockfish 18 descrito en el apartado 9.1.
- Torneos, pagos, tienda y desbloqueo de colecciones.
- Editor de posiciones, variantes del ajedrez y tablero Chess960.
- Arrastrar y soltar y animaciones elaboradas, si retrasan una interacción correcta por clic/toque.

«Ajedrez estándar sin reloj» describe el MVP. No etiquetarlo como una categoría oficial FIDE de ritmo clásico: las categorías competitivas por tiempo son otra cuestión.
No instalar ni implementar estas funciones futuras para «dejarlas listas» a costa de terminar la versión inicial.

## 7. Flujo de producto

**Abrir → explorar equipos y fichas → elegir colores → iniciar partida → jugar → ver resultado → nueva partida o lobby.**

En el lobby, cada ficha muestra nombre, función, imagen y descripción breve; las fuentes pueden consultarse en un área secundaria.
Mostrar de forma clara cuándo una pieza representa a una persona, una unidad anónima o una construcción inspirada en la época.
En partida, priorizar el tablero, el turno, el historial y los controles. Un nombre accesible o una ayuda breve puede indicar «Alfil: José Antonio Páez», sin abrir una biografía automáticamente.

## 8. Colecciones futuras

La arquitectura debe aceptar nuevas colecciones mediante datos, sin reescribir el tablero o el motor.
Una colección puede representar una época, un pueblo, una agrupación histórica, un movimiento, una escena musical o cualquier otra temática definida por el creador.
No limitar el modelo a países o civilizaciones.
Los ejemplos de colecciones futuras son posibilidades del producto, no contenido aprobado que deba añadirse al MVP.

Cada equipo nuevo necesita:

- ID estable, nombre, descripción general y categoría.
- Seis entradas correspondientes a las funciones de ajedrez.
- Imágenes para ambos colores.
- Fichas breves, fuentes y metadatos de encuadre de imágenes.

Los colores de casillas y la decoración del tablero pertenecen a `BoardTheme`; las imágenes y fichas pertenecen a `TeamDefinition`. El equipo no debe obligar a usar un único tablero.
Cambiar una apariencia no puede cambiar la posición, la historia de jugadas, los derechos de enroque ni el resultado.

## 9. Principios técnicos

- Usar TypeScript y componentes de interfaz reutilizables. Para una web independiente, se recomienda React + Vite; si ya existe una base de proyecto equivalente, aprovecharla.
- Usar un motor de reglas probado, como `chess.js`, detrás de un adaptador propio.
- La política de resultados debe distinguir tablas reclamables y automáticas; no delegarla ciegamente en un método genérico `isGameOver()`.
- La posición y la historia legal tienen una única autoridad: el motor. La interfaz proyecta ese estado y conserva únicamente estado de interacción o metadatos visuales.
- Generar casillas desde coordenadas algebraicas. No deducir jugadas desde píxeles, nombres históricos ni imágenes.
- Mantener separados motor, política de resultados, catálogo, representación visual y persistencia.
- Respetar los PNG existentes; no regenerar, sustituir o renombrar recursos sin necesidad.
- Usar un manifiesto explícito de recursos y comprobar rutas reales. No inventar carpetas o nombres como si estuvieran confirmados.
- Fijar las versiones instaladas mediante el archivo de bloqueo y verificar la documentación de esa versión.

## 9.1. Módulo instalable de análisis: Stockfish 18

**Requisito del producto:** la app debe admitir la instalación o incorporación de un módulo de análisis basado en **Stockfish 18** sin tener que rehacer el tablero, el catálogo o el motor de reglas.
Stockfish 18 es la versión objetivo solicitada; no sustituirla silenciosamente por otra.

En el MVP se exige la separación arquitectónica y el contrato de integración. La descarga del motor y la interfaz completa de análisis se incorporarán como una ampliación posterior; la partida inicial debe funcionar aunque el módulo no esté instalado o no esté disponible.

- Separar `RulesEngine`, responsable de legalidad y posición, de `AnalysisEngine`, responsable de evaluaciones y variantes.
- Definir un adaptador con operaciones para inicializar, analizar, cancelar y liberar recursos; comunicar posiciones y movimientos con formatos estándar FEN/UCI y conservar el historial necesario.
- En web, el módulo se entregará como recursos compatibles con navegador, por ejemplo una compilación WebAssembly verificada de Stockfish 18 ejecutada en un Web Worker. Un ejecutable de escritorio no se ejecuta directamente en una página web.
- En una futura app de escritorio, un adaptador puede comunicarse con un proceso nativo mediante UCI. Ambos adaptadores deben respetar el mismo contrato de análisis.
- Cargar el módulo bajo demanda. Limitar recursos y cancelar análisis antiguos para mantener el tablero fluido.
- Mostrar evaluaciones y líneas sugeridas únicamente en un modo de análisis explícito, inicialmente después de la partida. Las sugerencias nunca mueven piezas ni deciden la legalidad por sí solas.
- Identificar la versión real del motor y su procedencia. Al distribuirlo, conservar su licencia y facilitar el código fuente correspondiente al binario, incluidas las modificaciones aplicables.

La constitución exige esta compatibilidad; no exige instalar Stockfish durante la creación de estos documentos ni convertir el MVP en un modo contra la computadora.
La guía técnica desarrolla el contrato y los criterios de integración.

Referencias oficiales: [anuncio de Stockfish 18](https://stockfishchess.org/blog/2026/stockfish-18/) y [repositorio del proyecto](https://github.com/official-stockfish/Stockfish).

## 10. Calidad del contenido

Las descripciones del lobby tendrán un máximo de diez líneas de contenido y se mantendrán breves. No contar los metadatos internos o la bibliografía como biografía.
En pantallas pequeñas, permitir que el texto se ajuste y se lea completo; no ocultar información mediante un recorte de diez líneas.
Separar hechos documentados, interpretación del diseño y función ajedrecística.
No inventar datos de nacimiento para soldados anónimos ni presentar una construcción imaginada como un edificio histórico exacto.
Las fichas deben explicar el contexto con lenguaje claro y fuentes consultables.

## 11. Persistencia

Guardar localmente una estructura versionada con:

- Posición inicial y lista ordenada de movimientos, incluidas las promociones.
- Asignación de equipos a colores y tema del tablero.
- Preferencia de orientación.
- Resultado, motivo y estado de ofertas/reclamaciones, cuando corresponda.

Reproducir el historial al restaurar para recuperar repeticiones y derechos históricos. Un FEN aislado no sustituye el historial completo.
Si el guardado es incompatible o está corrupto, ofrecer iniciar una partida nueva sin intentar reparar silenciosamente las reglas.
No hacen falta cuentas ni una base de datos remota para este MVP.

## 12. Forma de trabajar de la IA implementadora

1. Leer estos cuatro archivos y comprobar qué proyecto y recursos existen.
2. Inventariar los PNG y construir el manifiesto; informar de cualquier imagen faltante.
3. Implementar una partida local legal y el tablero antes de enriquecer el lobby.
4. Conectar las fichas y la selección de equipos.
5. Añadir resultados, persistencia y accesibilidad.
6. Probar las reglas especiales y la geometría en ambas orientaciones.
7. Entregar una versión utilizable, con instrucciones de ejecución y limitaciones concretas pendientes.

No inventar nuevas funciones ni convertir decisiones sencillas en bloqueos de aprobación.
No afirmar cumplimiento total del reglamento si queda una regla sin implementar o una limitación conocida del motor.

## 13. Criterios de aceptación

El MVP está completo cuando puede jugarse una partida real desde el lobby hasta un resultado correcto; las piezas permanecen en sus casillas; las reglas especiales funcionan; las fichas son consultables antes de jugar; y la recarga restaura la partida sin perder su historial.

Debe comprobarse, además, que invertir equipos o girar el tablero mantiene las coordenadas y la legalidad; que la promoción permite las cuatro opciones; y que las reclamaciones de tablas no se confunden con finales automáticos.

Las mejoras visuales y las colecciones futuras se construyen sobre esta base, después de cerrar el MVP.
