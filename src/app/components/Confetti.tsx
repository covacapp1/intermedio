import { useMemo } from "react";

const COLORS = ["#D4AF37", "#F5DEB3", "#e74c3c", "#2d9a68", "#4a90d9", "#ffffff", "#ff69b4"];

export function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        width: 6 + Math.random() * 6,
        height: 8 + Math.random() * 8,
        delay: Math.random() * 1.2,
        fallDuration: 2.5 + Math.random() * 2,
        drift: (Math.random() - 0.5) * 40,
        spin: 360 + Math.random() * 720,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}vw`,
            backgroundColor: p.color,
            width: `${p.width}px`,
            height: `${p.height}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.fallDuration}s`,
            ["--confetti-drift" as string]: `${p.drift}vw`,
            ["--confetti-spin" as string]: `${p.spin}deg`,
          }}
        />
      ))}
      <style>{`
        .confetti-piece {
          position: absolute;
          top: -20px;
          border-radius: 1px;
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.15, 0.6, 0.4, 1);
          animation-fill-mode: forwards;
        }
        @keyframes confetti-fall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--confetti-drift), 105vh) rotate(var(--confetti-spin)); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
