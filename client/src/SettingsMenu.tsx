import { useState, type FC, type KeyboardEvent } from "react";
import {
  GAME_ACTIONS,
  type Difficulty,
  type GameAction,
  type GameSettings,
} from "./GameSettings";

interface SettingsMenuProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  musicError?: string | null;
  onClose: () => void;
}

const difficultyOptions: { value: Difficulty; label: string; description: string }[] = [
  { value: "easy", label: "CALMA", description: "Más resistencia y enemigos menos agresivos." },
  { value: "normal", label: "NORMAL", description: "La experiencia equilibrada." },
  { value: "hard", label: "PESADILLA", description: "Menos salud y enemigos más peligrosos." },
];

const formatKey = (key: string) => {
  if (key.startsWith("arrow")) return `FLECHA ${key.slice(5).toUpperCase()}`;
  if (key === " ") return "ESPACIO";
  return key.length === 1 ? key.toUpperCase() : key.toUpperCase();
};

export const SettingsMenu: FC<SettingsMenuProps> = ({ settings, onChange, musicError, onClose }) => {
  const [listeningFor, setListeningFor] = useState<GameAction | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const setBinding = (event: KeyboardEvent<HTMLButtonElement>, action: GameAction) => {
    if (!listeningFor) return;
    event.preventDefault();
    event.stopPropagation();

    const key = event.key.toLowerCase();
    if (key === "escape") {
      setListeningFor(null);
      setKeyError(null);
      return;
    }

    const conflict = GAME_ACTIONS.find(
      (candidate) => candidate.id !== action && settings.controls[candidate.id] === key
    );
    if (conflict) {
      setKeyError(`Esa tecla ya está asignada a «${conflict.label}».`);
      return;
    }

    onChange({ ...settings, controls: { ...settings.controls, [action]: key } });
    setListeningFor(null);
    setKeyError(null);
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        overflowY: "auto",
        background: "rgba(5, 2, 5, 0.92)",
        fontFamily: "'Courier New', Courier, monospace",
        color: "#f8fafc",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        style={{
          width: "min(100%, 650px)",
          maxHeight: "min(92vh, 900px)",
          overflowY: "auto",
          background: "#100a10",
          border: "4px solid #dc4a52",
          boxShadow: "8px 8px 0 #000, 12px 12px 0 #371119",
          padding: "20px",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <p style={{ color: "#e66c70", fontSize: 11, letterSpacing: 2, margin: "0 0 6px" }}>
              CONFIGURACIÓN DEL JUEGO
            </p>
            <h2 id="settings-title" style={{ color: "#fff", fontSize: 24, margin: 0 }}>
              AJUSTES
            </h2>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="Cerrar ajustes">
            CERRAR
          </button>
        </header>

        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>AUDIO</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <strong>Música</strong>
              <p style={mutedStyle}>Música ambiental en bucle durante la partida.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.musicEnabled}
              aria-label="Activar o desactivar música"
              onClick={() => onChange({ ...settings, musicEnabled: !settings.musicEnabled })}
              style={{
                ...toggleStyle,
                background: settings.musicEnabled ? "#7f2530" : "#27212a",
                borderColor: settings.musicEnabled ? "#f87171" : "#79717d",
              }}
            >
              {settings.musicEnabled ? "ACTIVADA" : "DESACTIVADA"}
            </button>
          </div>
          {musicError && <p role="alert" style={{ color: "#fca5a5", fontSize: 12 }}>{musicError}</p>}
        </section>

        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>DIFICULTAD</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 }}>
            {difficultyOptions.map((option) => {
              const selected = settings.difficulty === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={selected}
                  onClick={() => onChange({ ...settings, difficulty: option.value })}
                  style={{
                    ...difficultyButtonStyle,
                    borderColor: selected ? "#f87171" : "#59303a",
                    background: selected ? "#421820" : "#1a1119",
                  }}
                >
                  <strong>{option.label}</strong>
                  <span style={{ display: "block", marginTop: 5, color: "#c6b9c0", fontSize: 11 }}>
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
          <p style={mutedStyle}>El nuevo nivel de dificultad se aplica al reiniciar la partida.</p>
        </section>

        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>CONTROLES DE TECLADO</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 6 }}>
            {GAME_ACTIONS.map(({ id, label }) => (
              <div
                key={id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
              >
                <span style={{ fontSize: 12 }}>{label}</span>
                <button
                  type="button"
                  onClick={() => {
                    setListeningFor(id);
                    setKeyError(null);
                  }}
                  onKeyDown={(event) => setBinding(event, id)}
                  onBlur={() => setListeningFor((current) => (current === id ? null : current))}
                  aria-label={`Cambiar control: ${label}`}
                  style={{
                    ...bindingButtonStyle,
                    borderColor: listeningFor === id ? "#facc15" : "#74313a",
                    color: listeningFor === id ? "#facc15" : "#fff",
                  }}
                >
                  {listeningFor === id ? "PULSA UNA TECLA" : formatKey(settings.controls[id])}
                </button>
              </div>
            ))}
          </div>
          {keyError && <p role="alert" style={{ color: "#fca5a5", fontSize: 12 }}>{keyError}</p>}
          <p style={mutedStyle}>Selecciona un control y pulsa una tecla. ESC cancela la asignación.</p>
        </section>
      </section>
    </div>
  );
};

const sectionStyle = {
  marginTop: 18,
  paddingTop: 14,
  borderTop: "2px solid #38202a",
};

const sectionTitleStyle = {
  color: "#f87171",
  fontSize: 13,
  letterSpacing: 1,
  margin: "0 0 10px",
};

const mutedStyle = {
  color: "#a99ca5",
  fontSize: 11,
  margin: "6px 0 0",
};

const closeButtonStyle = {
  padding: "9px 12px",
  background: "#34141b",
  color: "#fff",
  border: "2px solid #dc4a52",
  fontFamily: "inherit",
  fontWeight: "bold",
  cursor: "pointer",
};

const toggleStyle = {
  minWidth: 112,
  padding: "10px 12px",
  color: "#fff",
  border: "2px solid",
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: "bold",
  cursor: "pointer",
};

const difficultyButtonStyle = {
  minHeight: 68,
  padding: 10,
  color: "#fff",
  border: "2px solid",
  textAlign: "left" as const,
  fontFamily: "inherit",
  cursor: "pointer",
};

const bindingButtonStyle = {
  minWidth: 112,
  padding: "7px 9px",
  background: "#1b1017",
  border: "2px solid",
  fontFamily: "inherit",
  fontSize: 10,
  fontWeight: "bold",
  cursor: "pointer",
};
