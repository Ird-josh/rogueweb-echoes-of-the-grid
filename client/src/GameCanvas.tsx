import { useEffect, useRef, useState } from 'react';

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const gridSize = 32;

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPlayerPos((prev) => {
        let { x, y } = prev;
        if (e.key === 'ArrowUp' || e.key === 'w') y -= gridSize;
        else if (e.key === 'ArrowDown' || e.key === 's') y += gridSize;
        else if (e.key === 'ArrowLeft' || e.key === 'a') x -= gridSize;
        else if (e.key === 'ArrowRight' || e.key === 'd') x += gridSize;
        return { x, y };
      });
    };

    if (!isMobile) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const render = () => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

      const centerX = canvas.width / 2 - gridSize / 2;
      const centerY = canvas.height / 2 - gridSize / 2;

      ctx.fillStyle = 'red';
      ctx.fillRect(centerX + playerPos.x, centerY + playerPos.y, gridSize, gridSize);

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [playerPos]);

  const move = (dx: number, dy: number) => {
    setPlayerPos((prev) => ({ x: prev.x + dx * gridSize, y: prev.y + dy * gridSize }));
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
