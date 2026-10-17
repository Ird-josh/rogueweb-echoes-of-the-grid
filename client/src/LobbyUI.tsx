import React from 'react';

interface LobbyUIProps {
  onStart: () => void;
}

const LobbyUI: React.FC<LobbyUIProps> = ({ onStart }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        zIndex: 1000,
        gap: '2rem',
        fontFamily: 'sans-serif',
      }}
    >
      <h1>RogueWeb: Echoes of the Grid</h1>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
        <h3>Authentication</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => alert('Signing in with Google...')}>Sign in with Google</button>
          <button onClick={() => alert('Signing in with GitHub...')}>Sign in with GitHub</button>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        <h3>Game Mode</h3>
        <button onClick={onStart} style={{ padding: '0.5rem 2rem', fontSize: '1rem' }}>Play Solo</button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="text" placeholder="Enter lobby code" />
          <button onClick={onStart}>Join Public Lobby</button>
        </div>
      </section>
    </div>
  );
};

export default LobbyUI;
