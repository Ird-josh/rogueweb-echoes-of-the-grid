import { useState } from 'react';
import GameCanvas from './GameCanvas';
import LobbyUI from './LobbyUI';
import TelemetryDashboard from './TelemetryDashboard';
import './App.css';

function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  return (
    <>
      {isTelemetryOpen && <TelemetryDashboard onClose={() => setIsTelemetryOpen(false)} />}
      {!isGameStarted && !isTelemetryOpen && (
        <LobbyUI 
          onStart={() => setIsGameStarted(true)} 
          onViewTelemetry={() => setIsTelemetryOpen(true)} 
        />
      )}
      {isGameStarted && <GameCanvas />}
    </>
  );
}

export default App;
