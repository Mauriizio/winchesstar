import { defaults, themes, type Preferences } from "../preferences";
export function Settings({
  value,
  onChange,
}: {
  value: Preferences;
  onChange: (p: Preferences) => void;
}) {
  const update = (patch: Partial<Preferences>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="settings-content">
      <p className="muted">
        Hazlo tuyo. La posición y todas las jugadas se conservan.
      </p>
      <fieldset>
        <legend>Tablero, marco y fondo</legend>
        <div className="theme-options">
          {themes.map((t) => (
            <button
              key={t.id}
              className={`theme-option ${value.themeId === t.id ? "active" : ""}`}
              aria-pressed={value.themeId === t.id}
              onClick={() =>
                update({ themeId: t.id, light: t.light, dark: t.dark })
              }
            >
              <span className="swatches">
                <i style={{ background: t.light }} />
                <i style={{ background: t.dark }} />
                <i style={{ background: t.frame }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="color-options">
        <label>
          Casillas claras
          <input
            aria-label="Color de casillas claras"
            type="color"
            value={value.light}
            onChange={(e) => update({ light: e.target.value })}
          />
        </label>
        <label>
          Casillas oscuras
          <input
            aria-label="Color de casillas oscuras"
            type="color"
            value={value.dark}
            onChange={(e) => update({ dark: e.target.value })}
          />
        </label>
      </div>
      <label className="range-label">
        Tamaño de piezas <output>{Math.round(value.scale * 100)} %</output>
        <input
          type="range"
          min="68"
          max="94"
          value={Math.round(value.scale * 100)}
          onChange={(e) => update({ scale: Number(e.target.value) / 100 })}
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={value.coordinates}
          onChange={(e) => update({ coordinates: e.target.checked })}
        />
        Mostrar coordenadas
      </label>
      <label className="select-label">
        Orientación
        <select
          value={value.orientation}
          onChange={(e) => update({ orientation: e.target.value as "w" | "b" })}
        >
          <option value="w">Desde blancas</option>
          <option value="b">Desde negras</option>
        </select>
      </label>
      <button
        className="secondary full"
        onClick={() => onChange({ ...defaults })}
      >
        Restaurar valores predeterminados
      </button>
    </div>
  );
}
