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
          maxWidth: "460px",
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
        <p style={{ fontSize: "13px", color: "#93c5fd", marginBottom: "22px", textShadow: "1px 1px 0 #000" }}>
          ECHOES OF THE GRID — JRPG EDITION
        </p>

        {/* Bloque de Autenticación OAuth */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "2px solid rgba(255, 255, 255, 0.5)",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "20px",
          }}
        >
          <p style={{ fontSize: "12px", marginBottom: "10px", color: "#e2e8f0" }}>
            {user ? `✅ Conectado como: ${user}` : "🔒 AUTENTICACIÓN OAUTH REQUERIDA"}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => setUser("Jugador_Google")}
              style={oauthBtnStyle}
            >
              G Iniciar con Google
            </button>
            <button
              onClick={() => setUser("Jugador_GitHub")}
              style={oauthBtnStyle}
            >
              🐙 Iniciar con GitHub
            </button>
          </div>
        </div>

        {/* Comandos Principales */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button onClick={onStartSolo} style={ffButtonStyle}>
            ▶ MODO SOLITARIO (CALABOZO)
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
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
              onClick={() => onJoinLobby(lobbyInput.trim() || "PUBLIC-1")}
              style={{ ...ffButtonStyle, padding: "10px 16px" }}
            >
              UNIRSE A LOBBY
            </button>
          </div>

          <button
            onClick={onOpenTelemetry}
            style={{
              ...ffButtonStyle,
              background: "linear-gradient(to bottom, #065f46, #064e3b)",
              marginTop: "6px",
            }}
          >
            📊 TELEMETRÍA (+10,000 PARTIDAS)
          </button>
        </div>
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