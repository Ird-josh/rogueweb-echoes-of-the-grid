import { useRef, useState } from "react";
import { GameCanvas } from "./GameCanvas";
import { LobbyUI } from "./LobbyUI";
import { DEFAULT_SETTINGS, type GameSettings } from "./GameSettings";
import { SettingsMenu } from "./SettingsMenu";
import { TelemetryDashboard } from "./TelemetryDashboard";
import { type CharacterId } from "./RunContent";
import { loadProgression, saveProgression, upgradeCost, type RunProgression } from "./RunProgression";

export default function App() {
  const [inGame, setInGame] = useState(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [progression, setProgression] = useState<RunProgression>(() => loadProgression());
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>("vesper");
  const [newGamePlusSelected, setNewGamePlusSelected] = useState(false);
  const [runOptions, setRunOptions] = useState<{ character: CharacterId; newGamePlus: boolean }>({
    character: "vesper",
    newGamePlus: false,
  });
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const startRun = (character: CharacterId, newGamePlus: boolean, id: string | null) => {
    playMusic();
    setSelectedCharacter(character);
    setNewGamePlusSelected(newGamePlus);
    setRunOptions({ character, newGamePlus });
    setLobbyId(id);
    setInGame(true);
  };

  const handleVictory = (newGamePlus: boolean) => {
    const next = {
      ...progression,
      wins: progression.wins + 1,
      shards: progression.shards + (newGamePlus ? 8 : 5),
      newGamePlusUnlocked: true,
    };
    saveProgression(next);
    setProgression(next);
  };

  const buyMetaUpgrade = (upgrade: "damageLevel" | "healthLevel" | "armorLevel") => {
    const cost = upgradeCost(progression[upgrade]);
    if (progression.shards < cost) return;
    const next = {
      ...progression,
      shards: progression.shards - cost,
      [upgrade]: progression[upgrade] + 1,
    };
    saveProgression(next);
    setProgression(next);
  };

  const playMusic = (enabled = settings.musicEnabled) => {
    if (!enabled || !musicRef.current) return;
    void musicRef.current.play().then(
      () => setMusicError(null),
      () => setMusicError("No se pudo iniciar la música. Prueba a activarla de nuevo.")
    );
  };

  const updateSettings = (nextSettings: GameSettings) => {
    setSettings(nextSettings);
    if (!nextSettings.musicEnabled) {
      musicRef.current?.pause();
      setMusicError(null);
    } else if (!settings.musicEnabled) {
      playMusic(nextSettings.musicEnabled);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", backgroundColor: "#000" }}>
      <audio
        ref={musicRef}
        src="/audio/game-music.wav"
        loop
        preload="none"
        onError={() => setMusicError("No se pudo cargar el archivo de música.")}
      />
      {inGame ? (
        <GameCanvas
          lobbyId={lobbyId}
          settings={settings}
          settingsOpen={showSettings}
          characterId={runOptions.character}
          newGamePlus={runOptions.newGamePlus}
          progression={progression}
          onVictory={handleVictory}
          onOpenSettings={() => setShowSettings(true)}
          onBackToMenu={() => {
            setInGame(false);
            setLobbyId(null);
          }}
        />
      ) : (
        <LobbyUI
          onStartSolo={(character, newGamePlus) => startRun(character, newGamePlus, null)}
          onJoinLobby={(id, character, newGamePlus) => startRun(character, newGamePlus, id)}
          progression={progression}
          onBuyUpgrade={buyMetaUpgrade}
          selectedCharacter={selectedCharacter}
          onSelectCharacter={setSelectedCharacter}
          newGamePlus={newGamePlusSelected}
          onToggleNewGamePlus={() => setNewGamePlusSelected((enabled) => !enabled)}
          onOpenTelemetry={() => setShowTelemetry(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {showSettings && (
        <SettingsMenu
          settings={settings}
          onChange={updateSettings}
          musicError={musicError}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showTelemetry && <TelemetryDashboard onClose={() => setShowTelemetry(false)} />}
    </div>
  );
}