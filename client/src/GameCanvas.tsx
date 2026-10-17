import React, { useEffect, useRef, useState } from "react";

const TILE_SIZE = 48;

interface GameCanvasProps {
  onBackToMenu: () => void;
  lobbyId?: string | null;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onBackToMenu, lobbyId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [stats, setStats] = useState({ hp: 100, maxHp: 100, level: 1, xp: 0, gold: 15 });

  // Coordenadas del jugador en celdas de la cuadrícula (no píxeles sueltos)
  const playerGrid = useRef({ col: 5, row: 5 });

  // Enemigos de prueba en la cuadrícula para que parezca un Roguelike real
  const enemies = useRef([
    { col: 8, row: 5, hp: 30 },
    { col: 10, row: 8, hp: 30 },
    { col: 4, row: 9, hp: 30 },
  ]);

  const movePlayer = (dCol: number, dRow: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxCols = Math.floor(canvas.width / TILE_SIZE);
    const maxRows = Math.floor(canvas.height / TILE_SIZE);

    const nextCol = Math.max(1, Math.min(maxCols - 2, playerGrid.current.col + dCol));
    const nextRow = Math.max(1, Math.min(maxRows - 2, playerGrid.current.row + dRow));

    // Verificar si hay un enemigo en esa casilla (Combate por turnos estilo Roguelike)
    const enemyIndex = enemies.current.findIndex(
      (e) => e.col === nextCol && e.row === nextRow
    );

    if (enemyIndex !== -1) {
      // Atacar al enemigo en vez de caminar encima
      enemies.current[enemyIndex].hp -= 15;
      if (enemies.current[enemyIndex].hp <= 0) {
        enemies.current.splice(enemyIndex, 1);
        setStats((s) => ({
          ...s,
          xp: s.xp + 25,
          gold: s.gold + 10,
          level: s.xp + 25 >= 50 ? s.level + 1 : s.level,
        }));
      }
      return;
    }

    playerGrid.current = { col: nextCol, row: nextRow };
  };

  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobile(hasTouch || window.innerWidth <= 768);
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

      // 1. Fondo del calabozo
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Dibujar Cuadrícula y Muros perimetrales
      for (let c = 0; c < maxCols; c++) {
        for (let r = 0; r < maxRows; r++) {
          const x = c * TILE_SIZE;
          const y = r * TILE_SIZE;

          const isWall = c === 0 || r === 0 || c === maxCols - 1 || r === maxRows - 1;

          if (isWall) {
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "#334155";
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // 3. Dibujar Enemigos (Cuadros morados con ojos)
      enemies.current.forEach((enemy) => {
        const ex = enemy.col * TILE_SIZE;
        const ey = enemy.row * TILE_SIZE;

        ctx.fillStyle = "#9333ea";
        ctx.fillRect(ex + 6, ey + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        ctx.strokeStyle = "#f3e8ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(ex + 6, ey + 6, TILE_SIZE - 12, TILE_SIZE - 12);
      });

      // 4. Dibujar al Jugador (Héroe Rojo de 48x48 con borde blanco)
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
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />

      {/* HUD Superior estilo Final Fantasy */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <button
          onClick={onBackToMenu}
          style={{
            pointerEvents: "auto",
            padding: "10px 18px",
            background: "linear-gradient(to bottom, #001890, #000040)",
            color: "#ffffff",
            border: "3px solid #ffffff",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.7)",
          }}
        >
          ◀ MENÚ
        </button>

        <div
          style={{
            background: "linear-gradient(to bottom, #001890, #000040)",
            border: "3px solid #ffffff",
            borderRadius: "6px",
            padding: "8px 16px",
            color: "#ffffff",
            display: "flex",
            gap: "20px",
            fontSize: "14px",
            fontWeight: "bold",
            boxShadow: "0 4px 10px rgba(0,0,0,0.7)",
          }}
        >
          <span>SALA: {lobbyId ? lobbyId : "SOLITARIO"}</span>
          <span style={{ color: "#4ade80" }}>HP: {stats.hp}/{stats.maxHp}</span>
          <span style={{ color: "#facc15" }}>NV: {stats.level}</span>
          <span style={{ color: "#38bdf8" }}>EXP: {stats.xp}</span>
        </div>
      </div>

      {/* Controles Táctiles en Pantalla (Se activan en vista móvil o pantallas chicas) */}
      {isMobile && (
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

const dPadStyle: React.CSSProperties = {
  background: "linear-gradient(to bottom, #001890, #000040)",
  color: "#ffffff",
  border: "2px solid #ffffff",
  borderRadius: "8px",
  fontSize: "22px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 4px 8px rgba(0,0,0,0.6)",
};