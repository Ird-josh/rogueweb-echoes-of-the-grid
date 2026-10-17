import { useEffect, useRef, useState, type CSSProperties, type FC } from "react";
import { io, type Socket } from "socket.io-client";
import { CHARACTERS, type CharacterId } from "./RunContent";
import { upgradeCost, type RunProgression } from "./RunProgression";
import { apiRequest, apiUrl, type LobbySnapshot, supabase } from "./backend";

const portraitPixels: Record<CharacterId, string[]> = {
  vesper: ["..HH..", ".HHHH.", "CCSSCC", "CSEEEC", "CSSSSC", ".RRRR.", "RRRRRR", "BB..BB"],
  nyx: ["HH..HH", ".HHHH.", "CCSSCC", "CSEEEC", "CSSSSC", "RRRRR.", ".RRRRR", "BB..BB"],
  bram: ["HHHHHH", "HCCCHH", "CCSSCC", "CSEEEC", "CSSSSC", "RRRRRR", "RRRRRR", "BB..BB"],
  sol: [".HHHH.", "HHHHHH", "CCSSCC", "CSEEEC", "CSSSSC", ".RRRR.", "RRRRRR", "BB..BB"],
};

interface LobbyUIProps {
  onStartSolo: (character: CharacterId, newGamePlus: boolean) => void;
  onJoinLobby: (
    lobby: LobbySnapshot,
    character: CharacterId,
    newGamePlus: boolean,
    playerId: string,
    playerName: string,
  ) => void;
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
  const [lobbyDialog, setLobbyDialog] = useState<"create" | "join" | null>(null);
  const [lobbyNameInput, setLobbyNameInput] = useState("");
  const [lobbyPasswordInput, setLobbyPasswordInput] = useState("");
  const [showLobbyPassword, setShowLobbyPassword] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbySnapshot | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [lobbyBusy, setLobbyBusy] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const lobbyPasswordRef = useRef("");
  const selectedCharacterRef = useRef(selectedCharacter);
  const newGamePlusRef = useRef(newGamePlus);
  const onJoinLobbyRef = useRef(onJoinLobby);

  useEffect(() => {
    onJoinLobbyRef.current = onJoinLobby;
  }, [onJoinLobby]);

  useEffect(() => {
    selectedCharacterRef.current = selectedCharacter;
    newGamePlusRef.current = newGamePlus;
  }, [selectedCharacter, newGamePlus]);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    const updateUser = (sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!mounted) return;
      setUser(
        sessionUser
          ? {
              id: sessionUser.id,
              email: sessionUser.email ?? "",
              name:
                String(sessionUser.user_metadata?.full_name ?? sessionUser.user_metadata?.name ?? "") ||
                sessionUser.email?.split("@")[0] ||
                "Explorador",
            }
          : null,
      );
      if (sessionUser) setAuthError(null);
      setAuthLoading(false);
    };

    void supabase.auth.getSession().then(
      ({ data, error }) => {
        if (error) setAuthError(`No se pudo recuperar la sesión: ${error.message}`);
        updateUser(data.session?.user ?? null);
      },
      (error: unknown) => {
        if (mounted) setAuthError(error instanceof Error ? error.message : "No se pudo recuperar la sesión.");
        if (mounted) setAuthLoading(false);
      },
    );

    const { data } = supabase.auth.onAuthStateChange((_event, session) => updateUser(session?.user ?? null));
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!joinedRoom || !user || !supabase) return;

    let active = true;
    let socket: Socket | null = null;
    void supabase.auth.getSession().then(
      ({ data, error }) => {
        if (!active) return;
        if (error || !data.session?.access_token) {
          setAuthError(error?.message ?? "Inicia sesión otra vez para entrar al lobby.");
          return;
        }

        socket = io(apiUrl, { auth: { accessToken: data.session.access_token } });
        socketRef.current = socket;
        socket.on("connect", () => {
          setSocketConnected(true);
          socket?.emit(
            "lobby:join",
            {
              code: joinedRoom,
              password: lobbyPasswordRef.current,
              characterId: selectedCharacterRef.current,
            },
            (result: { ok: boolean; error?: string; lobby?: LobbySnapshot }) => {
              if (!result.ok) {
                setAuthError(result.error ?? "No se pudo entrar al lobby.");
                return;
              }
              if (result.lobby) setLobby(result.lobby);
            },
          );
        });
        socket.on("connect_error", (error) => {
          setSocketConnected(false);
          setAuthError(`No se pudo conectar al lobby: ${error.message}`);
        });
        socket.on("disconnect", () => setSocketConnected(false));
        socket.on("lobby:update", (nextLobby: LobbySnapshot) => {
          setLobby(nextLobby);
          const member = nextLobby.members.find((entry) => entry.userId === user.id);
          setIsReady(member?.ready ?? false);
        });
        socket.on("lobby:started", (startedLobby: LobbySnapshot) => {
          setLobby(startedLobby);
          onJoinLobbyRef.current(
            startedLobby,
            selectedCharacterRef.current,
            newGamePlusRef.current,
            user?.id ?? "",
            user?.name ?? "Explorador",
          );
        });
        socket.on("lobby:closed", () => {
          setJoinedRoom(null);
          setLobby(null);
          setIsReady(false);
          setAuthError("El lobby se cerró porque ya no quedan jugadores.");
        });
        socket.on("lobby:error", (payload: { error?: string }) => {
          setAuthError(payload.error ?? "Ocurrió un error en el lobby.");
        });
      },
      (error: unknown) => {
        if (active) setAuthError(error instanceof Error ? error.message : "No se pudo recuperar la sesión.");
      },
    );

    return () => {
      active = false;
      socket?.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      setSocketConnected(false);
    };
  }, [joinedRoom, user]);

  const startSolo = () => onStartSolo(selectedCharacter, newGamePlus);

  const handleGoogleLogin = async () => {
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isLocalHost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    if (isMobileDevice && isLocalHost) {
      setAuthError("Abre el juego desde su URL pública de Render en el teléfono. localhost solo funciona en el dispositivo que ejecuta el servidor.");
      return;
    }
    if (!supabase) {
      setAuthError("Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en client/.env.local.");
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) setAuthError(`No se pudo iniciar sesión: ${error.message}`);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    if (joinedRoom && socketRef.current?.connected) {
      socketRef.current.emit("lobby:leave", { code: joinedRoom });
      socketRef.current.disconnect();
    }
    setJoinedRoom(null);
    setLobby(null);
    setIsReady(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setAuthError(`No se pudo cerrar sesión: ${error.message}`);
      else setAuthError(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No se pudo cerrar sesión.");
    }
  };

  const leaveLobby = () => {
    if (!joinedRoom) return;
    const finishLeaving = () => {
      setJoinedRoom(null);
      setLobby(null);
      setIsReady(false);
      setSocketConnected(false);
      lobbyPasswordRef.current = "";
    };
    if (socketRef.current?.connected) {
      socketRef.current.emit("lobby:leave", { code: joinedRoom }, (result: { ok: boolean; error?: string }) => {
        if (!result.ok) {
          setAuthError(result.error ?? "No se pudo salir del lobby.");
          return;
        }
        finishLeaving();
      });
    } else {
      finishLeaving();
    }
  };

  const handleLobbyEntry = async () => {
    if (!user) {
      setAuthError("Inicia sesión con Google para crear o unirte a un lobby.");
      return;
    }

    setLobbyBusy(true);
    setAuthError(null);
    try {
      const joining = lobbyDialog === "join";
      const requestedCode = lobbyInput.trim().toUpperCase();
      if (joining && !requestedCode) {
        setAuthError("Escribe el código de invitación del lobby.");
        return;
      }
      const credentials = {
        password: lobbyPasswordInput,
        characterId: selectedCharacter,
      };
      const result = joining
        ? await apiRequest<{ lobby: LobbySnapshot }>(
            `/api/lobbies/${encodeURIComponent(requestedCode)}/join`,
            {
              method: "POST",
              body: JSON.stringify(credentials),
            },
            true,
          )
        : await apiRequest<{ lobby: LobbySnapshot }>(
            "/api/lobbies",
            {
              method: "POST",
              body: JSON.stringify({ ...credentials, name: lobbyNameInput }),
            },
            true,
          );
      setLobby(result.lobby);
      setLobbyInput(result.lobby.code);
      lobbyPasswordRef.current = lobbyPasswordInput;
      setJoinedRoom(result.lobby.code);
      setLobbyDialog(null);
      setLobbyNameInput("");
      setLobbyPasswordInput("");
      setShowLobbyPassword(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No se pudo crear o entrar al lobby.");
    } finally {
      setLobbyBusy(false);
    }
  };

  const toggleReady = () => {
    if (!socketConnected || !joinedRoom) return;
    socketRef.current?.emit(
      "lobby:ready",
      { code: joinedRoom, ready: !isReady },
      (result: { ok: boolean; error?: string }) => {
        if (!result.ok) setAuthError(result.error ?? "No se pudo actualizar el estado.");
      },
    );
  };

  const launchLobby = () => {
    if (!socketConnected || !joinedRoom) return;
    socketRef.current?.emit(
      "lobby:start",
      { code: joinedRoom },
      (result: { ok: boolean; error?: string }) => {
        if (!result.ok) setAuthError(result.error ?? "No se pudo iniciar el lobby.");
      },
    );
  };

  const handleTelemetryClick = () => {
    if (!user) {
      setAuthError("Inicia sesión con Google para abrir el historial de partidas.");
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
                  disabled={Boolean(joinedRoom)}
                  aria-pressed={selected}
                  onClick={() => onSelectCharacter(option.id)}
                  style={{
                    ...characterCardStyle,
                    opacity: joinedRoom ? 0.65 : 1,
                    cursor: joinedRoom ? "not-allowed" : "pointer",
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
            {user ? `🩸 SESIÓN: ${user.name}` : "✟ INICIA SESIÓN PARA LOBBIES Y CRÓNICAS"}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              data-testid="login-google"
              disabled={authLoading}
              onClick={() => void handleGoogleLogin()}
              style={oauthBtnStyle}
            >
              † Pacto Google
            </button>
          </div>
          {user && (
            <button type="button" onClick={() => void handleLogout()} style={{ ...oauthBtnStyle, marginTop: 8 }}>
              CERRAR SESIÓN
            </button>
          )}
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
              ✟ {lobby?.name ?? "LOBBY"} · CÓDIGO {joinedRoom}
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#cbd5e1" }}>
              JUGADORES: {lobby?.members.length ?? 0}/{lobby?.maxPlayers ?? 3}
            </p>
            <p
              data-testid="ready-status"
              style={{
                fontSize: "13px",
                color: isReady ? "#f87171" : "#94a3b8",
                fontWeight: "bold",
              }}
            >
              Estado: {isReady ? "LISTO PARA INCURSIÓN" : "PREPARÁNDOSE..."} · {socketConnected ? "CONECTADO" : "CONECTANDO"}
            </p>
            <div data-testid="lobby-members" style={{ textAlign: "left", fontSize: 12, color: "#e2e8f0" }}>
              {lobby?.members.map((member) => (
              <p key={member.userId}>
                {member.userId === lobby.hostUserId ? "★ " : ""}{member.name} · {member.characterId} · {member.ready ? "LISTO" : "NO LISTO"}
              </p>
              ))}
            </div>
            <button
              data-testid="open-settings-btn"
              onClick={onOpenSettings}
              style={{ ...crimsonButtonStyle, background: "#21151d", borderColor: "#7b3842" }}
            >
              CONFIGURACIÓN
            </button>
            <button type="button" onClick={leaveLobby} style={{ ...crimsonButtonStyle, background: "#21151d" }}>
              SALIR DEL LOBBY
            </button>
            <button
              data-testid="toggle-ready-btn"
              onClick={toggleReady}
              disabled={!socketConnected}
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
              onClick={launchLobby}
              disabled={!socketConnected || lobby?.hostUserId !== user?.id}
              style={crimsonButtonStyle}
            >
              ✟ INICIAR INCURSIÓN
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

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button
                data-testid="create-lobby-btn"
                onClick={() => {
                  setAuthError(null);
                  setLobbyNameInput("");
                  setLobbyPasswordInput("");
                  setLobbyDialog("create");
                }}
                style={{ ...crimsonButtonStyle, flex: "1 1 180px" }}
              >
                CREAR LOBBY
              </button>
              <button
                data-testid="join-lobby-btn"
                onClick={() => {
                  setAuthError(null);
                  setLobbyPasswordInput("");
                  setLobbyDialog("join");
                }}
                style={{ ...crimsonButtonStyle, flex: "1 1 180px", background: "#21151d" }}
              >
                UNIRSE A UN LOBBY
              </button>
            </div>
            {!user && !authLoading && (
              <p style={{ margin: 0, color: "#fca5a5", fontSize: 11 }}>
                Inicia sesión en este mismo navegador para poder crear o unirte a un lobby.
              </p>
            )}

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
              ⚰️ CRÓNICAS REALES DE LOS CAÍDOS
            </button>
          </div>
        )}

        {lobbyDialog && (
          <div
            data-testid="lobby-dialog-backdrop"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: "rgba(0, 0, 0, 0.86)",
            }}
          >
            <form
              data-testid="lobby-dialog"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLobbyEntry();
              }}
              style={{
                width: "min(100%, 460px)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 22,
                background: "#100a10",
                border: "3px solid #dc4a52",
                boxShadow: "7px 7px 0 #000",
                color: "#f8fafc",
                textAlign: "left",
              }}
            >
              <h2 style={{ ...sectionTitleStyle, margin: 0 }}>
                {lobbyDialog === "create" ? "CREAR LOBBY PRIVADO" : "UNIRSE A UN LOBBY"}
              </h2>
              <p style={{ margin: 0, color: "#cbd5e1", fontSize: 12 }}>
                {lobbyDialog === "create"
                  ? "Comparte el código y la contraseña con tus amigos."
                  : "Escribe el código y la contraseña que te compartieron."}
              </p>
              {lobbyDialog === "create" ? (
                <label style={fieldLabelStyle}>
                  Nombre del lobby
                  <input
                    data-testid="lobby-name-input"
                    autoFocus
                    required
                    minLength={3}
                    maxLength={32}
                    value={lobbyNameInput}
                    onChange={(event) => setLobbyNameInput(event.target.value)}
                    placeholder="Ej. Exploradores del abismo"
                    style={lobbyInputStyle}
                  />
                </label>
              ) : (
                <label style={fieldLabelStyle}>
                  Código de invitación
                  <input
                    data-testid="lobby-code-input"
                    autoFocus
                    required
                    minLength={6}
                    maxLength={6}
                    value={lobbyInput}
                    onChange={(event) => setLobbyInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                    placeholder="Ej. A1B2C3"
                    style={lobbyInputStyle}
                  />
                </label>
              )}
              <label style={fieldLabelStyle}>
                Contraseña del lobby
                <input
                  data-testid="lobby-password-input"
                  required
                  minLength={6}
                  maxLength={128}
                  type={showLobbyPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={lobbyPasswordInput}
                  onChange={(event) => setLobbyPasswordInput(event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={lobbyInputStyle}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={showLobbyPassword}
                  onChange={(event) => setShowLobbyPassword(event.target.checked)}
                />
                Mostrar contraseña
              </label>
              {authError && (
                <p role="alert" style={{ margin: 0, color: "#fca5a5", fontSize: 12 }}>
                  {authError}
                </p>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setLobbyDialog(null);
                    setAuthError(null);
                  }}
                  style={{ ...crimsonButtonStyle, flex: 1, background: "#21151d" }}
                >
                  CANCELAR
                </button>
                <button
                  data-testid="submit-lobby-btn"
                  type="submit"
                  disabled={lobbyBusy}
                  style={{ ...crimsonButtonStyle, flex: 1 }}
                >
                  {lobbyBusy ? "CONECTANDO..." : lobbyDialog === "create" ? "CREAR" : "UNIRME"}
                </button>
              </div>
            </form>
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

const fieldLabelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#ffe28a",
  fontSize: 12,
  fontWeight: "bold",
};

const lobbyInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 10px",
  border: "2px solid #991b1b",
  backgroundColor: "#090203",
  color: "#ffffff",
  fontFamily: "inherit",
  fontSize: "14px",
  outline: "none",
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