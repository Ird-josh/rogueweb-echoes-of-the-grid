import { useState, type CSSProperties, type FC } from "react";
import { CHARACTERS, type CharacterId } from "./RunContent";
import { upgradeCost, type RunProgression } from "./RunProgression";

const portraitPixels: Record<CharacterId, string[]> = {
  vesper: ["..HH..", ".HHHH.", "CCSSCC", "CSEEEC", "CSSSSC", ".RRRR.", "RRRRRR", "BB..BB"],
  nyx: ["HH..HH", ".HHHH.", "CCSSCC", "CSEEEC", "CSSSSC", "RRRRR.", ".RRRRR", "BB..BB"],
  bram: ["HHHHHH", "HCCCHH", "CCSSCC", "CSEEEC", "CSSSSC", "RRRRRR", "RRRRRR", "BB..BB"],
  sol: [".HHHH.", "HHHHHH", "CCSSCC", "CSEEEC", "CSSSSC", ".RRRR.", "RRRRRR", "BB..BB"],
};

interface LobbyUIProps {
  onStartSolo: (character: CharacterId, newGamePlus: boolean) => void;
  onJoinLobby: (lobbyId: string, character: CharacterId, newGamePlus: boolean) => void;
  onOpenTelemetry: () => void;
  onOpenSettings: () => void;
  progression: RunProgression;
  onBuyUpgrade: (upgrade: "damageLevel" | "healthLevel" | "armorLevel") => void;
  selectedCharacter: CharacterId;
  onSelectCharacter: (character: CharacterId) => void;
  newGamePlus: boolean;
  onToggleNewGamePlus: () => void;
}

export const LobbyUI: FC<LobbyUIProps> = ({
  onStartSolo,
  onJoinLobby,
  onOpenTelemetry,
  onOpenSettings,
  progression,
  onBuyUpgrade,
  selectedCharacter,
  onSelectCharacter,
  newGamePlus,
  onToggleNewGamePlus,
}) => {
  const [lobbyInput, setLobbyInput] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const startSolo = () => onStartSolo(selectedCharacter, newGamePlus);
  const startLobby = (id: string) => onJoinLobby(id, selectedCharacter, newGamePlus);

  const handleTelemetryClick = () => {
    if (!user) {
      setAuthError("⛔ Sangre no consagrada: Inicia sesión con Google o GitHub para abrir los Archivos.");
      return;
    }
    setAuthError(null);
    onOpenTelemetry();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at center, #2a0408 0%, #070203 75%, #000000 100%)",
        fontFamily: "'Courier New', Courier, monospace",
        overflow: "hidden",
      }}
    >
      {/* Cruz Gótica Monumental de Fondo */}
      <div
        style={{
          position: "absolute",
          width: "36px",
          height: "88vh",
          background: "#47141c",
          boxShadow: "8px 0 0 #230b10, -8px 0 0 #230b10",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "55vw",
          maxWidth: "520px",
          height: "36px",
          top: "32%",
          background: "#47141c",
          boxShadow: "8px 0 0 #230b10, -8px 0 0 #230b10",
          pointerEvents: "none",
        }}
      />

      {/* Marco Gótico Principal */}
      <div
        style={{
          position: "relative",
          width: "92%",
          maxWidth: "760px",
          maxHeight: "94vh",
          overflowY: "auto",
          background: "#100a10",
          border: "4px solid #dc4a52",
          outline: "1px solid #f8fafc",
          outlineOffset: "-7px",
          borderRadius: 0,
          padding: "32px 28px",
          boxShadow: "8px 8px 0 #000, 12px 12px 0 rgba(55, 17, 25, 0.9)",
          color: "#f8fafc",
          textAlign: "center",
        }}
      >
        {/* Emblema de Cruz Carmesí Superior */}
        <div
          style={{
            fontSize: "32px",
            color: "#ef4444",
            textShadow: "3px 3px 0 #5f1824",
            marginBottom: "4px",
            lineHeight: 1,
          }}
        >
          ✟
        </div>

        <h1
          style={{
            fontSize: "27px",
            marginBottom: "4px",
            color: "#ffffff",
            textShadow: "3px 3px 0 #7f202b",
            letterSpacing: "3px",
            fontWeight: 900,
          }}
        >
          ROGUEWEB: ECOS DEL ABISMO
        </h1>
        <p
          style={{
            fontSize: "12px",
            color: "#f87171",
            marginBottom: "22px",
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          ✦ ECOS DEL SANTUARIO CARMESÍ ✦
        </p>

        <section style={{ marginBottom: 18, textAlign: "left" }}>
          <h2 style={sectionTitleStyle}>ELIGE TU EXPLORADOR</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 }}>
            {CHARACTERS.map((option) => {
              const selected = selectedCharacter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectCharacter(option.id)}
                  style={{
                    ...characterCardStyle,
                    borderColor: selected ? "#f2b84b" : "#63212b",
                    boxShadow: selected ? "3px 3px 0 #f2b84b" : "3px 3px 0 #090509",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(6, 5px)",
                      gridTemplateRows: "repeat(8, 5px)",
                      gap: 1,
                      marginBottom: 3,
                    }}
                  >
                    {portraitPixels[option.id].join("").split("").map((pixel, index) => (
                      <span
                        key={`${option.id}-${index}`}
                        style={{ width: 5, height: 5, background: pixel === "." ? "transparent" : option.palette[pixel] }}
                      />
                    ))}
                  </span>
                  <span style={{ color: selected ? "#ffe28a" : "#f8fafc", fontSize: 15, fontWeight: "bold" }}>{option.name}</span>
                  <span style={{ color: "#f87171", fontSize: 10 }}>{option.title}</span>
                  <span style={{ color: "#cbd5e1", fontSize: 10 }}>{option.description}</span>
                  <span style={{ color: "#ffe28a", fontSize: 10 }}>HABILIDAD: {option.abilityName}</span>
                </button>
              );
            })}
          </div>
        </section>

        {progression.newGamePlusUnlocked && (
          <button
            type="button"
            aria-pressed={newGamePlus}
            onClick={onToggleNewGamePlus}
            style={{ ...crimsonButtonStyle, marginBottom: 14, background: newGamePlus ? "#553719" : "#21151d", borderColor: "#f2b84b" }}
          >
            {newGamePlus ? "✦ NUEVA PARTIDA+ ACTIVADA" : "NUEVA PARTIDA NORMAL"} · {progression.shards} fragmentos
          </button>
        )}

        {progression.newGamePlusUnlocked && (
          <section style={{ marginBottom: 18, textAlign: "left" }}>
            <h2 style={sectionTitleStyle}>MEJORAS PERMANENTES · {progression.shards} FRAGMENTOS</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {([
                ["damageLevel", "PODER", "+2 daño"],
                ["healthLevel", "VITALIDAD", "+1 corazón máximo"],
                ["armorLevel", "RESGUARDO", "+1 armadura inicial"],
              ] as const).map(([key, label, benefit]) => {
                const level = progression[key];
                const cost = upgradeCost(level);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={progression.shards < cost}
                    onClick={() => onBuyUpgrade(key)}
                    style={{ ...upgradeButtonStyle, opacity: progression.shards < cost ? 0.55 : 1 }}
                  >
                    {label} N.{level} · {benefit} · {cost} fragmentos
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Bloque de Autenticación OAuth */}
        <div
          style={{
            background: "#1b1017",
            border: "2px solid #63212b",
            borderLeft: "5px solid #ef4444",
            padding: "12px",
            marginBottom: "20px",
          }}
        >
          <p
            data-testid="auth-status"
            style={{
              fontSize: "12px",
              marginBottom: "10px",
              color: user ? "#fca5a5" : "#cbd5e1",
              fontWeight: "bold",
            }}
          >
            {user ? `🩸 PACTO SELLADO: ${user}` : "✟ SELLA TU PACTO (OAUTH REQUERIDO)"}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              data-testid="login-google"
              onClick={() => {
                setUser("Demon_Google");
                setAuthError(null);
              }}
              style={oauthBtnStyle}
            >
              † Pacto Google
            </button>
            <button
              data-testid="login-github"
              onClick={() => {
                setUser("Demon_GitHub");
                setAuthError(null);
              }}
              style={oauthBtnStyle}
            >
              † Pacto GitHub
            </button>
          </div>
          {authError && (
            <p data-testid="auth-error" style={{ color: "#ef4444", fontSize: "11px", marginTop: "8px" }}>
              {authError}
            </p>
          )}
        </div>

        {/* Sala de Espera (Lobby) o Comandos de Sangre */}
        {joinedRoom ? (
          <div
            data-testid="lobby-room"
            style={{
              background: "rgba(25, 3, 6, 0.85)",
              border: "2px solid #ef4444",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <h3 style={{ fontSize: "15px", color: "#fca5a5", letterSpacing: "1px" }}>
              ✟ COVEN PÚBLICO: {joinedRoom}
            </h3>
            <p
              data-testid="ready-status"
              style={{
                fontSize: "13px",
                color: isReady ? "#f87171" : "#94a3b8",
                fontWeight: "bold",
              }}
            >
              Estado: {isReady ? "LISTO PARA INCURSIÓN" : "PREPARÁNDOSE..."}
            </p>
            <button
              data-testid="open-settings-btn"
              onClick={onOpenSettings}
              style={{ ...crimsonButtonStyle, background: "#21151d", borderColor: "#7b3842" }}
            >
              CONFIGURACIÓN
            </button>
            <button
              data-testid="toggle-ready-btn"
              onClick={() => setIsReady((r) => !r)}
              style={{
                ...crimsonButtonStyle,
                background: isReady
                  ? "linear-gradient(180deg, #991b1b 0%, #450a0a 100%)"
                  : "linear-gradient(180deg, #27272a 0%, #09090b 100%)",
              }}
            >
              {isReady ? "✓ CAMBIAR A NO LISTO" : "🩸 JURAR SANGRE (LISTO)"}
            </button>
            <button
              data-testid="launch-multiplayer-btn"
              onClick={() => startLobby(joinedRoom)}
              style={crimsonButtonStyle}
            >
              ✟ DESCENDER A LA CATEDRAL
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button data-testid="play-solo-btn" onClick={startSolo} style={crimsonButtonStyle}>
              ✟ INCURSIÓN SOLITARIA (LA CATEDRAL)
            </button>
            <button
              data-testid="open-settings-btn"
              onClick={onOpenSettings}
              style={{
                ...crimsonButtonStyle,
                background: "#21151d",
                borderColor: "#7b3842",
                boxShadow: "3px 3px 0 #090509",
              }}
            >
              ⚙ CONFIGURACIÓN
            </button>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                data-testid="lobby-input"
                type="text"
                placeholder="Código de sala (Ej.: SANTUARIO-1)"
                value={lobbyInput}
                onChange={(e) => setLobbyInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "2px solid #991b1b",
                  backgroundColor: "#090203",
                  color: "#ffffff",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button
                data-testid="join-lobby-btn"
                onClick={() => setJoinedRoom(lobbyInput.trim() || "SANTUARIO-1")}
                style={{ ...crimsonButtonStyle, padding: "10px 14px" }}
              >
                UNIRSE A LOBBY
              </button>
            </div>

            <button
              data-testid="open-telemetry-btn"
              onClick={handleTelemetryClick}
              style={{
                ...crimsonButtonStyle,
                background: "linear-gradient(180deg, #18181b 0%, #09090b 100%)",
                border: "2px solid #f87171",
                color: "#fca5a5",
                marginTop: "4px",
              }}
            >
              ⚰️ CRÓNICAS DE LOS CAÍDOS (+10,000 PARTIDAS)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const crimsonButtonStyle: CSSProperties = {
  padding: "12px",
  background: "#8f252e",
  color: "#ffffff",
  border: "2px solid #f8fafc",
  fontSize: "13px",
  fontWeight: "bold",
  fontFamily: "inherit",
  letterSpacing: "1px",
  cursor: "pointer",
  textShadow: "1px 1px 2px #000",
  boxShadow: "4px 4px 0 #1a080c",
};

const oauthBtnStyle: CSSProperties = {
  padding: "8px 14px",
  backgroundColor: "#090203",
  color: "#f8fafc",
  border: "1px solid #ef4444",
  fontSize: "12px",
  fontFamily: "inherit",
  cursor: "pointer",
  fontWeight: "bold",
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 8px",
  color: "#f2b84b",
  fontSize: 12,
  letterSpacing: 1,
};

const characterCardStyle: CSSProperties = {
  minHeight: 112,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: 6,
  padding: 10,
  background: "#160b12",
  border: "2px solid #63212b",
  color: "#fff",
  textAlign: "left",
  fontFamily: "inherit",
  cursor: "pointer",
};

const upgradeButtonStyle: CSSProperties = {
  padding: "8px 10px",
  background: "#21151d",
  color: "#ffe6d0",
  border: "1px solid #f2b84b",
  fontFamily: "inherit",
  fontSize: 10,
  fontWeight: "bold",
  cursor: "pointer",
};