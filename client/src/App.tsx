import { useState } from "react";
import { GameCanvas } from "./GameCanvas";
import { LobbyUI } from "./LobbyUI";
import { TelemetryDashboard } from "./TelemetryDashboard";

export default function App() {
  const [inGame, setInGame] = useState(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [showTelemetry, setShowTelemetry] = useState(false);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#000" }}>
      {inGame ? (
        <GameCanvas
          lobbyId={lobbyId}
          onBackToMenu={() => {
            setInGame(false);
            setLobbyId(null);
          }}
        />
      ) : (
        <LobbyUI
          onStartSolo={() => {
            setLobbyId(null);
            setInGame(true);
          }}
          onJoinLobby={(id) => {
            setLobbyId(id);
            setInGame(true);
          }}
          onOpenTelemetry={() => setShowTelemetry(true)}
        />
      )}

      {showTelemetry && <TelemetryDashboard onClose={() => setShowTelemetry(false)} />}
    </div>
  );
}