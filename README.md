# Ajedrez educativo temático

Aplicación en español de ajedrez estándar sin reloj para dos personas en un mismo dispositivo. Colección inicial: **Libertadores contra Realistas**. React, TypeScript, Vite y chess.js 1.4.0, con dependencias fijadas y `package-lock.json`.

Incluye lobby educativo, doce fichas con fuentes, elección de colores, tablero SVG interactivo, movimientos especiales, promoción, historial, ofertas/reclamaciones de tablas, rendición, personalización y restauración local del historial.

**Límite reglamentario:** la detección de toda posición muerta excepcional y toda incapacidad unilateral de mate no es exhaustiva. Leer [cobertura exacta](docs/COVERAGE.md). No se presenta como implementación reglamentaria completa mientras ese punto siga pendiente.

## Instalar y ejecutar en Windows

Requisito: Node.js 22.12+ (comprobado con Node 24). Desde PowerShell:

```powershell
Set-Location C:\Proyectos\winchesstar
npm ci
npm run dev
```

Abrir la URL que imprime Vite (por defecto `http://127.0.0.1:5173`). El comando ejecuta primero la preparación de recursos. No requiere Supabase, cuentas, claves ni variables de entorno.

## Verificar

```powershell
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

Las pruebas de navegador levantan el servidor si no está en ejecución. Incluyen el flujo completo y los tamaños 320×568, 390×844, 768×1024, 844×390 y 1440×900. Las capturas se guardan en `docs/validation/`; Playwright genera informe HTML y trazas de los fallos.

Para probar el sitio publicado en un contexto nuevo sin sesión de Vercel:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://URL-REAL-DEL-PROYECTO'
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

## Construcción y publicación

```powershell
npm run build
vercel login
vercel link
vercel deploy --prod
```

`vercel login` y `vercel link` son necesarios solo al configurar un equipo nuevo. Para este directorio ya vinculado puede utilizarse `npm run deploy`. `vercel.json` configura Vite y la salida `dist`. El proyecto es estático; no necesita funciones ni base de datos. El sitio debe tener la protección de acceso desactivada para su dominio público de producción.

La URL y la evidencia del despliegue realizado se registran en `docs/validation/DELIVERY.md` al finalizar la verificación.

## Recursos reproducibles

```powershell
npm run assets
```

`scripts/manifest.mjs` relaciona explícitamente `k/q/r/b/n/p` con `R/D/T/A/C/P` y cada nombre real. `scripts/prepare-assets.mjs` verifica exactamente doce PNG por carpeta, calcula el encuadre por alfa cuando cambia el SHA-256, conserva los originales y copia a `public/assets/pieces/<equipo>/`. El inventario queda en `docs/validation/assets.json` y los metadatos en `src/data/generated/sprites.json`.

`scripts/catalog.mjs` convierte las doce fichas del documento fuente en datos JSON durante la preparación. No se interpreta Markdown al jugar. Las fuentes tipográficas están alojadas junto a la aplicación, sin peticiones a Google Fonts. `.vercelignore` evita subir copias públicas redundantes: se regeneran en la construcción con los PNG originales.

## Arquitectura

| Módulo | Responsabilidad |
| --- | --- |
| `src/domain/rules.ts` | Única autoridad legal: posición, turno, movimientos, historial y repeticiones |
| `src/domain/outcomes.ts` | Finales automáticos, reclamaciones y capacidad de mate cubierta |
| `src/domain/game.ts` | Operaciones de partida y bloqueo tras resultado |
| `src/board/geometry.ts` | Conversiones algebraicas / pantalla para ambas vistas |
| `src/board/Board.tsx` | SVG 800×800; 64 grupos; foco, teclado, imágenes y marcas |
| `src/data/catalog.ts` | `TeamDefinition`, `CharacterDefinition`, recursos y fuentes |
| `src/preferences.ts` | Temas tipados, apariencia, orientación y validación |
| `src/persistence.ts` | Guardado versionado y reproducción validada del historial |
| `src/analysis/contract.ts` | Contrato independiente y descarte de análisis obsoletos |
| `src/ui/` | Lobby, partida, diálogos accesibles y personalización |

El marco y las etiquetas están fuera del área jugable. Cada casilla SVG conserva su identidad `a1`…`h8`; girar la vista no rota las figuras ni modifica el motor. Las imágenes se centran por su contenido alfa y se recortan a su casilla sin deformarse.

## Guardado y recuperación

Después de cada operación se guarda localmente: versión, FEN inicial, movimientos completos, promociones, equipos, resultado, oferta y preferencias. Recargar abre el lobby con **Continuar partida guardada**. Volver al lobby no borra la partida. Nueva partida pide confirmación antes de reemplazarla. Un guardado corrupto no se repara silenciosamente: ofrece descargarlo e iniciar otro. No se envían partidas a un servidor.

## Añadir equipos y colecciones

1. Añadir originales en una nueva carpeta, sin modificar los existentes.
2. Extender el manifiesto explícito y adaptar la validación del importador al número de recursos esperado.
3. Añadir seis entradas tipadas `k/q/r/b/n/p` con ID, nombre, clase de representación, texto y fuentes; ambas variantes de color con `SpriteSpec`.
4. Registrar el equipo en `src/data/catalog.ts` y la colección/asignación en el lobby. `TeamDefinition.category` es texto libre: admite historia, cultura, música u otras temáticas.
5. Ejecutar preparación y pruebas; revisar piezas en ambas orientaciones y tamaños. El tablero y el motor no necesitan cambios.

El importador del catálogo inicial está ligado a las doce fichas fuente. Para otra colección se añade su propio conjunto de datos; no se atribuyen biografías inventadas a soldados anónimos o construcciones.

## Añadir temas

Añadir un `BoardTheme` a `themes` en `src/preferences.ts`: ID estable, nombre, colores de casillas, marco, fondo y acento. Las opciones se generan desde esos datos. El tamaño de piezas se limita a 68–94 %. La apariencia se guarda aparte de las reglas y nunca modifica el historial.

## Stockfish 18

No está instalado ni se simulan evaluaciones. La aplicación funciona sin él. El contrato admite un adaptador WASM en Web Worker con FEN/UCI, IDs, cancelación y liberación. Ver [integración, verificación de versión y distribución GPL](docs/ANALYSIS_ENGINE.md).
