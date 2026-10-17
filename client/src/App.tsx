import { useCallback, useRef, useState } from "react";
import { GameCanvas } from "./GameCanvas";
import { LobbyUI } from "./LobbyUI";
import { DEFAULT_SETTINGS, type GameSettings } from "./GameSettings";
import { SettingsMenu } from "./SettingsMenu";
import { TelemetryDashboard } from "./TelemetryDashboard";
import { type CharacterId } from "./RunContent";
import { loadProgression, saveProgression, upgradeCost, type RunProgression } from "./RunProgression";
import { apiRequest, type LobbyMember } from "./backend";

export default function App() {
  const [inGame, setInGame] = useState(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [backendNotice, setBackendNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [progression, setProgression] = useState<RunProgression>(() => loadProgression());
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>("vesper");
  const [newGamePlusSelected, setNewGamePlusSelected] = useState(false);
  const [runOptions, setRunOptions] = useState<{ character: CharacterId; newGamePlus: boolean }>({
    character: "vesper",
    newGamePlus: false,
  });
  const [runPlayer, setRunPlayer] = useState<{
    id: string | null;
    name: string;
    members: LobbyMember[];
    hostId: string | null;
  }>({ id: null, name: "Explorador", members: [], hostId: null });
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicSource = import.meta.env.DEV
    ? "/audio/game-music.wav"
    : import.meta.env.VITE_GAME_MUSIC_URL || undefined;

  const saveCompletedRun = useCallback((run: {
    characterId: CharacterId;
    newGamePlus: boolean;
    status: "victory" | "defeat";
    floor: number;
    kills: number;
    durationSeconds: number;
    inventory: string[];
    lobbyCode: string | null;
  }) => {
    void apiRequest<{ id: string }>("/api/runs", {
      method: "POST",
      body: JSON.stringify(run),
    }, true).then(
      ({ id }) => setBackendNotice({ text: `Partida guardada · ${id.slice(0, 8)}`, error: false }),
      (error: unknown) => setBackendNotice({
        text: error instanceof Error ? `No se guardó la partida: ${error.message}` : "No se pudo guardar la partida.",
        error: true,
      }),
    );
  }, []);

  const startRun = (
    character: CharacterId,
    newGamePlus: boolean,
    id: string | null,
    player: { id: string | null; name: string; members: LobbyMember[]; hostId: string | null } =
      { id: null, name: "Explorador", members: [], hostId: null },
  ) => {
    playMusic();
    setSelectedCharacter(character);
    setNewGamePlusSelected(newGamePlus);
    setRunOptions({ character, newGamePlus });
    setLobbyId(id);
    setRunPlayer(player);
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
    if (!enabled || !musicSource || !musicRef.current) return;
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
        src={musicSource}
        loop
        preload="none"
        onError={musicSource ? () => setMusicError("No se pudo cargar el archivo de música.") : undefined}
      />
      {inGame ? (
        <GameCanvas
          lobbyId={lobbyId}
          playerId={runPlayer.id}
          playerName={runPlayer.name}
          lobbyMembers={runPlayer.members}
          lobbyHostId={runPlayer.hostId}
          settings={settings}
          settingsOpen={showSettings}
          characterId={runOptions.character}
          newGamePlus={runOptions.newGamePlus}
          progression={progression}
          onVictory={handleVictory}
          onRunComplete={saveCompletedRun}
          onOpenSettings={() => setShowSettings(true)}
          onBackToMenu={() => {
            setInGame(false);
            setLobbyId(null);
          }}
        />
      ) : (
        <LobbyUI
          onStartSolo={(character, newGamePlus) => startRun(character, newGamePlus, null)}
          onJoinLobby={(lobby, character, newGamePlus, playerId, playerName) =>
            startRun(character, newGamePlus, lobby.code, {
              id: playerId,
              name: playerName,
              members: lobby.members,
              hostId: lobby.hostUserId,
            })}
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
      {backendNotice && (
        <div
          role={backendNotice.error ? "alert" : "status"}
          style={{
            position: "fixed",
            zIndex: 11000,
            right: 12,
            bottom: 12,
            maxWidth: "min(90vw, 520px)",
            padding: "10px 14px",
            background: "#100a10",
            border: `2px solid ${backendNotice.error ? "#ef4444" : "#f2b84b"}`,
            color: backendNotice.error ? "#fca5a5" : "#ffe28a",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
          }}
        >
          {backendNotice.text}
          <button type="button" onClick={() => setBackendNotice(null)} aria-label="Cerrar aviso"> ×</button>
        </div>
      )}
    </div>
  );
}