import { useEffect, useRef, useState } from 'react';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerPos = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const gridSize = 32;

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Global Keyboard controls mutating the ref directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') playerPos.current.y -= gridSize;
      else if (key === 'arrowdown' || key === 's') playerPos.current.y += gridSize;
      else if (key === 'arrowleft' || key === 'a') playerPos.current.x -= gridSize;
      else if (key === 'arrowright' || key === 'd') playerPos.current.x += gridSize;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear screen
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint gray grid
      ctx.strokeStyle = '#333';
      const cellSize = 40;
      for (let x = 0; x < canvas.width; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw player at center + ref coordinates
      const centerX = canvas.width / 2 - gridSize / 2;
      const centerY = canvas.height / 2 - gridSize / 2;

      ctx.fillStyle = 'red';
      ctx.fillRect(
        centerX + playerPos.current.x,
        centerY + playerPos.current.y,
        gridSize,
        gridSize
      );

      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const move = (dx: number, dy: number) => {
    playerPos.current.x += dx * gridSize;
    playerPos.current.y += dy * gridSize;
  };

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0 }} />
      {isMobile && (
        <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 50px)', gap: 5 }}>
          <div /> <button onClick={() => move(0, -1)}>U</button> <div />
          <button onClick={() => move(-1, 0)}>L</button> <button onClick={() => move(0, 1)}>D</button> <button onClick={() => move(1, 0)}>R</button>
        </div>
      )}
    </>
  );
};

export default GameCanvas;
