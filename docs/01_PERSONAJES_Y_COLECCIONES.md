# Personajes, representaciones y catálogo de piezas

Versión: 1.0. Fecha de consulta de fuentes: 30 de septiembre de 2026.
Colección inicial: **Libertadores contra Realistas**.
Estas doce fichas corresponden a veinticuatro imágenes: una versión blanca y una negra por diseño.

## 1. Uso del contenido

Los bloques «Descripción para el lobby» son el texto educativo listo para mostrar. Cada uno tiene cuatro líneas de contenido, por debajo del máximo de diez.
Los identificadores, nombres de archivos y fuentes son metadatos; no forman parte de la biografía visible.
Una ficha se comparte entre ambos colores y todas las instancias de la misma función.

Las funciones ajedrecísticas son representaciones artísticas. Bolívar no fue rey y Manuela Sáenz no fue reina: ocupan esas funciones en el juego.
Los peones representan unidades anónimas y las torres representan construcciones; no inventarles una biografía personal.

La selección realista de este catálogo utiliza Fernando VII, María Josefa Amalia, Pablo Morillo y Miguel de la Torre. Antes de publicar, cotejar estas identidades con los diseños originales: si una imagen fue creada para otra persona, actualizar su ficha con fuentes, sin atribuirle una identidad por su apariencia.

## 2. Nomenclatura de los PNG

Formato: `PIEZA-COLOR-EQUIPO.png`. Los tres segmentos tienen significado independiente.

| Segmento | Código | Significado |
|---|---|---|
| Pieza | `R` | Rey |
| Pieza | `D` | Dama / reina |
| Pieza | `T` | Torre |
| Pieza | `A` | Alfil |
| Pieza | `C` | Caballo |
| Pieza | `P` | Peón |
| Color | `B` | Blancas |
| Color | `N` | Negras |
| Equipo | `L` | Libertadores |
| Equipo | `R` | Realistas |

Ejemplos confirmados por el creador: `C-B-L` significa caballo blanco libertador y `R-B-R` significa rey blanco realista.
Las capturas confirman `D` para dama, `R` para rey y las extensiones `.png`, tal como figuran en la tabla siguiente.
Al integrar, comprobar los archivos físicos y conservar extensiones, mayúsculas y nombres exactos.

La raíz es `C:\Proyectos\winchesstar`. Los recursos están directamente en `ejercito libertador` y `ejercito realista`, sin subcarpetas por pieza.
Por ejemplo, el caballo blanco libertador está en `C:\Proyectos\winchesstar\ejercito libertador\C-B-L.png` y el rey blanco realista en `C:\Proyectos\winchesstar\ejercito realista\R-B-R.png`.
Guardar este catálogo y los otros tres documentos en `C:\Proyectos\winchesstar\docs`.

### Manifiesto de nombres observado

Los veinticuatro nombres aparecen en las capturas del creador. La inspección de imágenes fue visual; la IA implementadora debe comprobar después que los archivos son accesibles en el equipo de desarrollo.

| Equipo | Función | Representación | ID estable | Blanca | Negra |
|---|---|---|---|---|---|
| Libertadores | Rey | Simón Bolívar | `lib-bolivar` | `R-B-L.png` | `R-N-L.png` |
| Libertadores | Dama | Manuela Sáenz | `lib-saenz` | `D-B-L.png` | `D-N-L.png` |
| Libertadores | Alfil | José Antonio Páez | `lib-paez` | `A-B-L.png` | `A-N-L.png` |
| Libertadores | Caballo | Antonio José de Sucre | `lib-sucre` | `C-B-L.png` | `C-N-L.png` |
| Libertadores | Torre | Campanario patriota fortificado | `lib-campanario` | `T-B-L.png` | `T-N-L.png` |
| Libertadores | Peón | Soldado del Ejército Libertador | `lib-infanteria` | `P-B-L.png` | `P-N-L.png` |
| Realistas | Rey | Fernando VII | `rea-fernando-vii` | `R-B-R.png` | `R-N-R.png` |
| Realistas | Dama | María Josefa Amalia de Sajonia | `rea-maria-josefa` | `D-B-R.png` | `D-N-R.png` |
| Realistas | Alfil | Pablo Morillo | `rea-morillo` | `A-B-R.png` | `A-N-R.png` |
| Realistas | Caballo | Miguel de la Torre | `rea-de-la-torre` | `C-B-R.png` | `C-N-R.png` |
| Realistas | Torre | Fortaleza de Puerto Cabello | `rea-san-felipe` | `T-B-R.png` | `T-N-R.png` |
| Realistas | Peón | Fusilero realista de Valencey | `rea-valencey` | `P-B-R.png` | `P-N-R.png` |

## 3. Fichas de los Libertadores

### Rey: Simón Bolívar

- ID: `lib-bolivar`.
- Tipo de representación: persona.
- Función del motor: `k`.
- Recursos: `R-B-L.png` y `R-N-L.png`.
- Fuentes: H01.

**Descripción para el lobby**

```text
Simón Bolívar nació en Caracas el 24 de julio de 1783.
Fue uno de los principales líderes de la independencia sudamericana.
Condujo campañas decisivas contra el dominio español y promovió la Gran Colombia.
Conocido como el Libertador, representa al rey por su liderazgo político y militar.
```

### Dama: Manuela Sáenz

- ID: `lib-saenz`.
- Tipo de representación: persona.
- Función del motor: `q`.
- Recursos: `D-B-L.png` y `D-N-L.png`.
- Fuentes: H02.

**Descripción para el lobby**

```text
Manuela Sáenz nació en Quito en 1797.
Participó activamente en la causa independentista y colaboró con Simón Bolívar.
En 1828 ayudó a salvarlo de un atentado en Bogotá.
Fue conocida como la «Libertadora del Libertador»; en este juego representa a la dama.
```

### Alfil: José Antonio Páez

- ID: `lib-paez`.
- Tipo de representación: persona.
- Función del motor: `b`.
- Recursos: `A-B-L.png` y `A-N-L.png`.
- Fuentes: H03.
- Diseño: a pie; espada elevada en el centro para formar una silueta puntiaguda.

**Descripción para el lobby**

```text
José Antonio Páez nació en Curpa, actual estado Portuguesa, el 13 de junio de 1790.
Fue un destacado jefe de los llaneros del Ejército Libertador.
Tuvo una actuación decisiva en la batalla de Carabobo de 1821.
Después de la independencia presidió Venezuela y fue una figura central de su vida política.
```

### Caballo: Antonio José de Sucre

- ID: `lib-sucre`.
- Tipo de representación: persona.
- Función del motor: `n`.
- Recursos: `C-B-L.png` y `C-N-L.png`.
- Diseño: montado a caballo; única función con jinete en este equipo.
- Fuentes: H04.

**Descripción para el lobby**

```text
Antonio José de Sucre nació en Cumaná el 3 de febrero de 1795.
Fue uno de los principales comandantes del proceso de independencia sudamericano.
Dirigió las victorias de Pichincha, en 1822, y Ayacucho, en 1824.
Recibió el título de Gran Mariscal de Ayacucho y llegó a ser presidente de Bolivia.
```

### Torre: Campanario patriota fortificado

- ID: `lib-campanario`.
- Tipo de representación: construcción simbólica inspirada en la época.
- Función del motor: `r`.
- Recursos: `T-B-L.png` y `T-N-L.png`.
- Fuente del diseño: concepto original del creador; no corresponde a un edificio identificado documentalmente.

**Descripción para el lobby**

```text
Esta pieza combina un campanario colonial con elementos de defensa patriota.
La campana simboliza la convocatoria del pueblo y el llamado a las armas.
El cañón y la garita evocan la protección de una posición fortificada.
Es una creación artística con la bandera de la Primera República, no la réplica de un edificio concreto.
```

### Peón: Soldado del Ejército Libertador

- ID: `lib-infanteria`.
- Tipo de representación: unidad anónima.
- Función del motor: `p`.
- Recursos: `P-B-L.png` y `P-N-L.png`.
- Fuentes: H05.
- Diseño: infante de campaña; la vestimenta precaria representa dificultades de abastecimiento.

**Descripción para el lobby**

```text
Representa a un soldado anónimo de la infantería del Ejército Libertador.
Durante algunas campañas, las tropas sufrieron escasez de ropa y suministros.
Comunidades locales ayudaron a vestir y abastecer a los combatientes.
Su aspecto humilde recuerda esas dificultades, sin afirmar que todos los soldados iban descalzos.
```

## 4. Fichas de los Realistas

### Rey: Fernando VII

- ID: `rea-fernando-vii`.
- Tipo de representación: persona.
- Función del motor: `k`.
- Recursos: `R-B-R.png` y `R-N-R.png`.
- Fuentes: H06.

**Descripción para el lobby**

```text
Fernando VII nació en San Lorenzo de El Escorial el 14 de octubre de 1784.
Fue rey de España en 1808 y nuevamente entre 1814 y 1833.
Durante su reinado se desarrollaron las principales guerras de independencia hispanoamericanas.
Representa a la monarquía cuya autoridad defendían los ejércitos realistas.
```

### Dama: María Josefa Amalia de Sajonia

- ID: `rea-maria-josefa`.
- Tipo de representación: persona.
- Función del motor: `q`.
- Recursos: `D-B-R.png` y `D-N-R.png`.
- Fuentes: H07.

**Descripción para el lobby**

```text
María Josefa Amalia de Sajonia nació en Dresde en 1803.
Fue la tercera esposa de Fernando VII y reina consorte de España entre 1819 y 1829.
Su vida estuvo ligada a la corte española durante las guerras de independencia americanas.
En este juego representa a la dama del bando realista.
```

### Alfil: Pablo Morillo

- ID: `rea-morillo`.
- Tipo de representación: persona.
- Función del motor: `b`.
- Recursos: `A-B-R.png` y `A-N-R.png`.
- Fuentes: H08.
- Diseño: a pie; espada o elemento puntiagudo sobre el eje central, por encima de la cabeza.

**Descripción para el lobby**

```text
Pablo Morillo fue un militar español y comandante de las fuerzas realistas.
En 1815 encabezó una expedición a Venezuela y Nueva Granada para restablecer el dominio español.
Dirigió campañas contra los ejércitos independentistas.
En 1820 acordó con Bolívar el armisticio y el tratado de regularización de la guerra.
```

### Caballo: Miguel de la Torre

- ID: `rea-de-la-torre`.
- Tipo de representación: persona.
- Función del motor: `n`.
- Recursos: `C-B-R.png` y `C-N-R.png`.
- Diseño: montado a caballo; única función con jinete en este equipo.
- Fuentes: H09.

**Descripción para el lobby**

```text
Miguel de la Torre nació en Bernales, España, el 13 de diciembre de 1786.
Llegó a América con la expedición de Pablo Morillo en 1815.
En 1820 asumió el mando principal de las fuerzas realistas en Venezuela.
Dirigió al ejército realista derrotado en Carabobo el 24 de junio de 1821.
```

### Torre: Fortaleza de Puerto Cabello

- ID: `rea-san-felipe`.
- Tipo de representación: construcción inspirada en una fortificación real.
- Función del motor: `r`.
- Recursos: `T-B-R.png` y `T-N-R.png`.
- Fuentes: H10.
- Referente: castillo de San Felipe de Puerto Cabello; diseño adaptado a una pieza de ajedrez.

**Descripción para el lobby**

```text
Esta torre se inspira en el castillo de San Felipe de Puerto Cabello.
La fortificación formó parte del sistema defensivo español en la costa venezolana.
Sus murallas, baluartes y artillería evocan el control y la defensa del puerto.
La pieza es una adaptación artística de una fortaleza colonial, no un castillo medieval ni una réplica exacta.
```

### Peón: Fusilero realista de Valencey

- ID: `rea-valencey`.
- Tipo de representación: unidad anónima inspirada en un batallón histórico.
- Función del motor: `p`.
- Recursos: `P-B-R.png` y `P-N-R.png`.
- Fuentes: H11.

**Descripción para el lobby**

```text
Representa a un infante realista inspirado en el batallón de Valencey.
Esta unidad llegó a América con la expedición española de 1815.
Combatió en Carabobo en 1821 y se retiró hacia Puerto Cabello conservando su formación.
El uniforme y el fusil evocan una unidad regular; no representan a un soldado individual identificado.
```

## 5. Fuentes históricas

Las referencias deben conservarse junto a los datos del catálogo y pueden mostrarse mediante un enlace «Fuentes». Las descripciones son resúmenes propios.

- **H01 — Bolívar:** [Biblioteca Nacional de Chile, Memoria Chilena: Simón Bolívar](https://www.memoriachilena.gob.cl/602/w3-article-96495.html).
- **H02 — Sáenz:** [Fundación Empresas Polar, Diccionario de Historia de Venezuela: Sáenz, Manuela](https://bibliofep.fundacionempresaspolar.org/dhv/entradas/s/saenz-manuela/).
- **H03 — Páez:** [Fundación Empresas Polar: Páez, José Antonio](https://bibliofep.fundacionempresaspolar.org/dhv/entradas/p/paez-jose-antonio/).
- **H04 — Sucre:** [Banco de la República de Colombia, Enciclopedia Banrepcultural: Antonio José de Sucre](https://enciclopedia.banrepcultural.org/Antonio_Jos%C3%A9_de_Sucre).
- **H05 — Abastecimiento libertador:** [Banco de la República: Matilde Anaray](https://enciclopedia.banrepcultural.org/Matilde_Anaray) y [Páramo de Pisba](https://enciclopedia.banrepcultural.org/P%C3%A1ramo_de_Pisba). Documentan dificultades y apoyo civil en la campaña de 1819; no describen un uniforme único para toda la guerra.
- **H06 — Fernando VII:** [Museo Nacional del Prado: Fernando VII con manto real](https://www.museodelprado.es/coleccion/obra-de-arte/fernando-vii-con-manto-real/1b46165d-1ef7-4399-8282-7056bb901ad9) y [PARES, Ministerio de Cultura de España: Fernando VII](https://pares.cultura.gob.es/ParesBusquedas20/catalogo/autoridad/46890).
- **H07 — María Josefa Amalia:** [Museo Nacional del Prado: María Josefa Amalia de Sajonia](https://www.museodelprado.es/coleccion/obra-de-arte/maria-josefa-amalia-de-sajonia/ee69b725-759c-4c36-bd4b-af07d38b0eb7).
- **H08 — Morillo:** [Fundación Empresas Polar: Morillo, Pablo](https://bibliofep.fundacionempresaspolar.org/dhv/entradas/m/morillo-pablo/) y [Tratados de Trujillo](https://bibliofep.fundacionempresaspolar.org/dhv/entradas/t/tratados-de-trujillo/).
- **H09 — De la Torre:** [Fundación Empresas Polar: Torre y Pando, Miguel de la](https://bibliofep.fundacionempresaspolar.org/dhv/entradas/t/torre-y-pando-miguel-de-la/).
- **H10 — Fortaleza:** [Armada Española, Revista de Historia Naval n.º 125, 2014](https://armada.defensa.gob.es/archivo/mardigitalrevistas/rhn/2014/2014125.pdf), referencia al sistema defensivo venezolano y al castillo de San Felipe de Puerto Cabello.
- **H11 — Valencey:** [Ejército de Tierra de España, Revista Ejército n.º 892, julio/agosto de 2015](https://ejercito.defensa.gob.es/Galerias/multimedia/revista-ejercito/2015/Revista_Ejercito_julio_agosto_892.pdf), artículo «El honor de las armas españolas. Batallón de Valencey».

## 6. Criterios editoriales para ampliaciones

- Mantener las fichas breves y comprobar cada identidad con fuentes consultables.
- En María Josefa Amalia se usa el año de nacimiento; no añadir un día exacto sin resolver las discrepancias entre referencias.
- En Morillo se omite la fecha de nacimiento porque las fuentes publican años diferentes. No escoger uno como certeza por conveniencia.
- No atribuir a todos los combatientes de un bando la misma riqueza, origen o vestimenta. Ambos ejércitos tuvieron situaciones y composiciones diversas.
- Añadir fichas para personas, grupos o construcciones nuevas mediante datos; no modificar las reglas para que encajen con la temática.
- Trasladar este contenido a objetos TypeScript o JSON al implementar. Los Markdown son documentos fuente; el motor no necesita interpretar biografías para jugar.
