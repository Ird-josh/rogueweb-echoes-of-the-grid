import React, { useState } from "react";

interface LobbyUIProps {
  onStartSolo: () => void;
  onJoinLobby: (lobbyId: string) => void;
  onOpenTelemetry: () => void;
}

export const LobbyUI: React.FC<LobbyUIProps> = ({
  onStartSolo,
  onJoinLobby,
  onOpenTelemetry,
}) => {
  const [lobbyInput, setLobbyInput] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleTelemetryClick = () => {
    if (!user) {
      setAuthError("⛔ Acceso denegado: Inicia sesión con Google o GitHub para ver la Telemetría.");
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
        background: "radial-gradient(circle, #0f172a 0%, #020617 100%)",
      }}
    >
      <div
        style={{
          width: "92%",
          maxWidth: "480px",
          background: "linear-gradient(to bottom, #001890, #000035)",
          border: "4px solid #ffffff",
          borderRadius: "10px",
          padding: "28px",
          boxShadow: "0 0 25px rgba(0,0,0,0.9), inset 0 0 12px rgba(255,255,255,0.25)",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "26px", marginBottom: "6px", textShadow: "2px 2px 0 #000" }}>
          ⚔ ROGUEWEB ⚔
        </h1>
        <p style={{ fontSize: "13px", color: "#93c5fd", marginBottom: "20px", textShadow: "1px 1px 0 #000" }}>
          ECHOES OF THE GRID — JRPG EDITION
        </p>

        {/* Bloque de Autenticación OAuth */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "2px solid rgba(255, 255, 255, 0.5)",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "18px",
          }}
        >
          <p data-testid="auth-status" style={{ fontSize: "12px", marginBottom: "10px", color: "#e2e8f0" }}>
            {user ? `✅ Conectado como: ${user}` : "🔒 AUTENTICACIÓN OAUTH REQUERIDA"}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              data-testid="login-google"
              onClick={() => {
                setUser("Jugador_Google");
                setAuthError(null);
              }}
              style={oauthBtnStyle}
            >
              G Iniciar con Google
            </button>
            <button
              data-testid="login-github"
              onClick={() => {
                setUser("Jugador_GitHub");
                setAuthError(null);
              }}
              style={oauthBtnStyle}
            >
              🐙 Iniciar con GitHub
            </button>
          </div>
          {authError && (
            <p data-testid="auth-error" style={{ color: "#f87171", fontSize: "12px", marginTop: "8px" }}>
              {authError}
            </p>
          )}
        </div>

        {/* Vista de Sala de Espera (Lobby) o Menú Principal */}
        {joinedRoom ? (
          <div
            data-testid="lobby-room"
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              border: "2px solid #38bdf8",
              borderRadius: "8px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <h3 style={{ fontSize: "16px", color: "#38bdf8" }}>SALA PÚBLICA: {joinedRoom}</h3>
            <p data-testid="ready-status" style={{ fontSize: "14px", color: isReady ? "#4ade80" : "#facc15" }}>
              Estado: {isReady ? "LISTO PARA INCURSIÓN" : "PREPARÁNDOSE..."}
            </p>
            <button
              data-testid="toggle-ready-btn"
              onClick={() => setIsReady((r) => !r)}
              style={{
                ...ffButtonStyle,
                background: isReady ? "#15803d" : "#b45309",
              }}
            >
              {isReady ? "✓ CAMBIAR A NO LISTO" : "⚡ MARCAR COMO LISTO"}
            </button>
            <button
              data-testid="launch-multiplayer-btn"
              onClick={() => onJoinLobby(joinedRoom)}
              style={ffButtonStyle}
            >
              ▶ ENTRAR AL CALABOZO
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button data-testid="play-solo-btn" onClick={onStartSolo} style={ffButtonStyle}>
              ▶ MODO SOLITARIO (CALABOZO)
            </button>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                data-testid="lobby-input"
                type="text"
                placeholder="Ej: SALA-101"
                value={lobbyInput}
                onChange={(e) => setLobbyInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "2px solid #ffffff",
                  backgroundColor: "#000830",
                  color: "#ffffff",
                  fontFamily: "inherit",
                  fontSize: "14px",
                }}
              />
              <button
                data-testid="join-lobby-btn"
                onClick={() => setJoinedRoom(lobbyInput.trim() || "PUBLIC-1")}
                style={{ ...ffButtonStyle, padding: "10px 16px" }}
              >
                UNIRSE A LOBBY
              </button>
            </div>

            <button
              data-testid="open-telemetry-btn"
              onClick={handleTelemetryClick}
              style={{
                ...ffButtonStyle,
                background: "linear-gradient(to bottom, #065f46, #064e3b)",
                marginTop: "6px",
              }}
            >
              📊 TELEMETRÍA (+10,000 PARTIDAS)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ffButtonStyle: React.CSSProperties = {
  padding: "12px",
  background: "linear-gradient(to bottom, #0028b0, #001060)",
  color: "#ffffff",
  border: "2px solid #ffffff",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "bold",
  fontFamily: "inherit",
  cursor: "pointer",
  textShadow: "1px 1px 0 #000",
  boxShadow: "0 3px 6px rgba(0,0,0,0.5)",
};

const oauthBtnStyle: React.CSSProperties = {
  padding: "8px 12px",
  backgroundColor: "#1e293b",
  color: "#ffffff",
  border: "1px solid #94a3b8",
  borderRadius: "4px",
  fontSize: "12px",
  fontFamily: "inherit",
  cursor: "pointer",
};