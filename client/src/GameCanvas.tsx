import React, { useEffect, useRef, useState } from "react";

const TILE_SIZE = 48;

interface GameCanvasProps {
  onBackToMenu: () => void;
  lobbyId?: string | null;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onBackToMenu, lobbyId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [stats, setStats] = useState({
    hp: 100,
    maxHp: 100,
    level: 1,
    floor: 1,
    xp: 0,
    kills: 0,
  });

  const playerGrid = useRef({ col: 2, row: 2 });
  const stairsPos = useRef({ col: 10, row: 7 });
  const walls = useRef<Set<string>>(new Set());
  const enemies = useRef<{ col: number; row: number; hp: number }[]>([]);

  // Generador procedimental de calabozos conexos
  const generateProceduralFloor = (cols: number, rows: number, currentFloor: number) => {
    const newWalls = new Set<string>();
    const newEnemies: { col: number; row: number; hp: number }[] = [];

    playerGrid.current = { col: 2, row: 2 };
    const sCol = Math.max(4, cols - 3);
    const sRow = Math.max(4, rows - 3);
    stairsPos.current = { col: sCol, row: sRow };

    for (let c = 1; c < cols - 1; c++) {
      for (let r = 1; r < rows - 1; r++) {
        // Garantiza un camino libre en L entre el jugador y las escaleras
        const isSafePath = r === 2 || c === sCol;
        const isStartOrStairs = (c === 2 && r === 2) || (c === sCol && r === sRow);

        if (!isSafePath && !isStartOrStairs && Math.random() < 0.22) {
          newWalls.add(`${c},${r}`);
        } else if (!isStartOrStairs && Math.random() < 0.05) {
          newEnemies.push({
            col: c,
            row: r,
            hp: 20 + currentFloor * 10,
          });
        }
      }
    }

    walls.current = newWalls;
    enemies.current = newEnemies;
    (window as any).__PLAYER_POS__ = { ...playerGrid.current };
  };

  const movePlayer = (dCol: number, dRow: number) => {
    if (isDead) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxCols = Math.floor(canvas.width / TILE_SIZE);
    const maxRows = Math.floor(canvas.height / TILE_SIZE);

    const nextCol = Math.max(1, Math.min(maxCols - 2, playerGrid.current.col + dCol));
    const nextRow = Math.max(1, Math.min(maxRows - 2, playerGrid.current.row + dRow));

    // Bloqueo por muro procedimental
    if (walls.current.has(`${nextCol},${nextRow}`)) return;

    // Combate por turnos al chocar con enemigo
    const enemyIndex = enemies.current.findIndex(
      (e) => e.col === nextCol && e.row === nextRow
    );

    if (enemyIndex !== -1) {
      enemies.current[enemyIndex].hp -= 20;

      setStats((prev) => {
        const nextHp = prev.hp - 15;
        if (nextHp <= 0) setIsDead(true);
        return { ...prev, hp: Math.max(0, nextHp) };
      });

      if (enemies.current[enemyIndex].hp <= 0) {
        enemies.current.splice(enemyIndex, 1);
        setStats((s) => {
          const newXp = s.xp + 25;
          const levelUp = newXp >= s.level * 50;
          return {
            ...s,
            xp: newXp,
            kills: s.kills + 1,
            level: levelUp ? s.level + 1 : s.level,
            hp: levelUp ? s.maxHp : s.hp,
          };
        });
      }
      return;
    }

    playerGrid.current = { col: nextCol, row: nextRow };
    (window as any).__PLAYER_POS__ = { ...playerGrid.current };

    // Avanzar al siguiente piso al pisar las escaleras amarillas
    if (nextCol === stairsPos.current.col && nextRow === stairsPos.current.row) {
      setStats((s) => {
        const nextFloor = s.floor + 1;
        generateProceduralFloor(maxCols, maxRows, nextFloor);
        return { ...s, floor: nextFloor };
      });
    }
  };

  const restartGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maxCols = Math.floor(canvas.width / TILE_SIZE);
    const maxRows = Math.floor(canvas.height / TILE_SIZE);
    setIsDead(false);
    setStats({ hp: 100, maxHp: 100, level: 1, floor: 1, xp: 0, kills: 0 });
    generateProceduralFloor(maxCols, maxRows, 1);
  };

  useEffect(() => {
    // Detección precisa de móvil (por resolución o User-Agent móvil)
    const checkMobile = () => {
      const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsMobile(isMobileUA || window.innerWidth <= 768);
    };
    checkMobile();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      checkMobile();
      const cols = Math.floor(canvas.width / TILE_SIZE);
      const rows = Math.floor(canvas.height / TILE_SIZE);
      if (walls.current.size === 0) {
        generateProceduralFloor(cols, rows, 1);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "w" || key === "arrowup") movePlayer(0, -1);
      else if (key === "s" || key === "arrowdown") movePlayer(0, 1);
      else if (key === "a" || key === "arrowleft") movePlayer(-1, 0);
      else if (key === "d" || key === "arrowright") movePlayer(1, 0);
    };

    window.addEventListener("keydown", handleKeyDown);

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const maxCols = Math.floor(canvas.width / TILE_SIZE);
      const maxRows = Math.floor(canvas.height / TILE_SIZE);

      // 1. Fondo oscuro
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Cuadrícula y Muros Procedimentales
      for (let c = 0; c < maxCols; c++) {
        for (let r = 0; r < maxRows; r++) {
          const x = c * TILE_SIZE;
          const y = r * TILE_SIZE;

          const isBorder = c === 0 || r === 0 || c === maxCols - 1 || r === maxRows - 1;
          const isInnerWall = walls.current.has(`${c},${r}`);

          if (isBorder || isInnerWall) {
            ctx.fillStyle = isBorder ? "#1e293b" : "#334155";
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#475569";
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // 3. Escaleras al siguiente piso (Cuadro Dorado/Amarillo)
      const sx = stairsPos.current.col * TILE_SIZE;
      const sy = stairsPos.current.row * TILE_SIZE;
      ctx.fillStyle = "#eab308";
      ctx.fillRect(sx + 8, sy + 8, TILE_SIZE - 16, TILE_SIZE - 16);
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 8, sy + 8, TILE_SIZE - 16, TILE_SIZE - 16);

      // 4. Enemigos (Morado)
      enemies.current.forEach((enemy) => {
        const ex = enemy.col * TILE_SIZE;
        const ey = enemy.row * TILE_SIZE;
        ctx.fillStyle = "#9333ea";
        ctx.fillRect(ex + 6, ey + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        ctx.strokeStyle = "#f3e8ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(ex + 6, ey + 6, TILE_SIZE - 12, TILE_SIZE - 12);
      });

      // 5. Jugador (Rojo)
      const px = playerGrid.current.col * TILE_SIZE;
      const py = playerGrid.current.row * TILE_SIZE;
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDead]);

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef} data-testid="game-canvas" style={{ display: "block" }} />

      {/* Barra Superior HUD */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          right: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", gap: "10px", pointerEvents: "auto" }}>
          <button onClick={onBackToMenu} style={hudBtnStyle}>
            ◀ MENÚ
          </button>
          <button onClick={() => setIsMobile((m) => !m)} style={hudBtnStyle}>
            📱 {isMobile ? "Ocultar D-Pad" : "Modo Móvil"}
          </button>
        </div>

        <div
          style={{
            background: "linear-gradient(to bottom, #001890, #000040)",
            border: "3px solid #ffffff",
            borderRadius: "6px",
            padding: "8px 16px",
            color: "#ffffff",
            display: "flex",
            gap: "16px",
            fontSize: "14px",
            fontWeight: "bold",
            boxShadow: "0 4px 10px rgba(0,0,0,0.8)",
          }}
        >
          <span>SALA: {lobbyId ? lobbyId : "SOLO"}</span>
          <span style={{ color: "#eab308" }}>PISO: {stats.floor}</span>
          <span style={{ color: "#4ade80" }}>HP: {stats.hp}/{stats.maxHp}</span>
          <span style={{ color: "#38bdf8" }}>NV: {stats.level}</span>
          <span style={{ color: "#f87171" }}>BAJAS: {stats.kills}</span>
        </div>
      </div>

      {/* Modal de Permadeath */}
      {isDead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            style={{
              background: "linear-gradient(to bottom, #450a0a, #000000)",
              border: "4px solid #ef4444",
              borderRadius: "10px",
              padding: "32px",
              textAlign: "center",
              color: "#fff",
              maxWidth: "420px",
            }}
          >
            <h2 style={{ fontSize: "28px", color: "#ef4444", marginBottom: "12px" }}>
              💀 PERMADEATH 💀
            </h2>
            <p style={{ fontSize: "14px", marginBottom: "20px", color: "#fca5a5" }}>
              Has caído en el Piso {stats.floor}. Tus objetos y nivel se han perdido permanentemente.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={restartGame} style={{ ...hudBtnStyle, background: "#dc2626" }}>
                🔄 Reintentar (Nivel 1)
              </button>
              <button onClick={onBackToMenu} style={hudBtnStyle}>
                Salir al Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D-Pad Táctil para Móvil */}
      {isMobile && !isDead && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: 30,
            display: "grid",
            gridTemplateColumns: "repeat(3, 60px)",
            gridTemplateRows: "repeat(3, 60px)",
            gap: "6px",
            zIndex: 100,
          }}
        >
          <div />
          <button onClick={() => movePlayer(0, -1)} style={dPadStyle}>▲</button>
          <div />
          <button onClick={() => movePlayer(-1, 0)} style={dPadStyle}>◀</button>
          <div />
          <button onClick={() => movePlayer(1, 0)} style={dPadStyle}>▶</button>
          <div />
          <button onClick={() => movePlayer(0, 1)} style={dPadStyle}>▼</button>
          <div />
        </div>
      )}
    </div>
  );
};

const hudBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  background: "linear-gradient(to bottom, #001890, #000040)",
  color: "#ffffff",
  border: "2px solid #ffffff",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  fontFamily: "inherit",
  fontSize: "13px",
};

const dPadStyle: React.CSSProperties = {
  background: "linear-gradient(to bottom, #001890, #000040)",
  color: "#ffffff",
  border: "2px solid #ffffff",
  borderRadius: "8px",
  fontSize: "22px",
  fontWeight: "bold",
  cursor: "pointer",
};