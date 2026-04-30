'use client';
import { useEffect, useRef } from 'react';

/** Full-screen animated canvas: grid + particles + connections + shooting stars. */
export default function AnimatedBackground() {
  const canvasRef = useRef(null);
  const ptRef     = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      ptRef.current = Array.from({ length: 40 }, () => ({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  Math.random() * 1.2 + 0.4,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        o:  Math.random() * 0.35 + 0.1,
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    let t   = 0;
    let raf = 0;
    const render = () => {
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);

      // Grid
      for (let x = 0; x < W; x += 64) {
        for (let y = 0; y < H; y += 64) {
          const wave = Math.sin(t * 0.01 + x * 0.016 + y * 0.016) * 0.5 + 0.5;
          ctx.strokeStyle = `rgba(255,255,255,${0.015 + wave * 0.02})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.rect(x, y, 64, 64); ctx.stroke();
        }
      }

      // Particles + connections
      const pts = ptRef.current;
      for (const p of pts) {
        p.x = (p.x + p.vx + W) % W;
        p.y = (p.y + p.vy + H) % H;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.o})`;
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(109,40,217,${0.12 * (1 - d / 90)})`;
            ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }

      // Shooting star
      if (Math.random() < 0.003) {
        const sx = Math.random() * W, sy = Math.random() * H * 0.5;
        const g  = ctx.createLinearGradient(sx, sy, sx + 80, sy + 20);
        g.addColorStop(0, 'rgba(167,139,250,0.6)'); g.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 80, sy + 20);
        ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
      }

      t++;
      raf = requestAnimationFrame(render);
    };
    render();

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}
