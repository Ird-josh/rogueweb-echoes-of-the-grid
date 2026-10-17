import { useState } from 'react';
import GameCanvas from './GameCanvas';
import LobbyUI from './LobbyUI';
import './App.css';

function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);

  return (
    <>
      {!isGameStarted && <LobbyUI onStart={() => setIsGameStarted(true)} />}
      {isGameStarted && <GameCanvas />}
    </>
  );
}

export default App;
