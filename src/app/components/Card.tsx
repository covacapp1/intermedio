import { Card as CardType } from "../types/game";

interface CardProps {
  card?: CardType;
  hidden?: boolean;
}

export function Card({ card, hidden }: CardProps) {
  if (hidden || !card) {
    return (
      <div 
        className="w-[28px] h-[40px] xs:w-[32px] xs:h-[46px] sm:w-[40px] sm:h-[56px] md:w-[50px] md:h-[70px] rounded-md sm:rounded-lg border-2 border-zinc-700 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-zinc-400 flex items-center justify-center text-[10px] sm:text-sm shadow-[0_4px_8px_rgba(0,0,0,0.6)] relative overflow-hidden"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      >
        <div className="absolute inset-0 border border-zinc-600 rounded-md sm:rounded-lg m-1"></div>
        <span className="relative z-10 font-bold text-sm sm:text-lg">?</span>
      </div>
    );
  }

  // Determine suit color and symbol
  const suitColors: Record<string, string> = {
    oros: "#FFD700",
    copas: "#DC143C", 
    espadas: "#1E3A8A",
    bastos: "#065F46",
  };

  const suitSymbols: Record<string, string> = {
    oros: "●",
    copas: "♥",
    espadas: "♠",
    bastos: "♣",
  };

  const suitColor = suitColors[card.suit] || "#000";
  const suitSymbol = suitSymbols[card.suit] || card.suit;

  return (
    <div 
      className="w-[28px] h-[40px] xs:w-[32px] xs:h-[46px] sm:w-[40px] sm:h-[56px] md:w-[50px] md:h-[70px] rounded-md sm:rounded-lg border-2 border-zinc-300 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 text-black flex flex-col items-center justify-center text-center p-0.5 sm:p-1 shadow-[0_4px_8px_rgba(0,0,0,0.3)] relative overflow-hidden"
      style={{
        boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.8)',
      }}
    >
      {/* Decorative corners */}
      <div className="absolute top-0.5 left-0.5 w-1 h-1 border-t border-l border-zinc-400 opacity-50"></div>
      <div className="absolute top-0.5 right-0.5 w-1 h-1 border-t border-r border-zinc-400 opacity-50"></div>
      <div className="absolute bottom-0.5 left-0.5 w-1 h-1 border-b border-l border-zinc-400 opacity-50"></div>
      <div className="absolute bottom-0.5 right-0.5 w-1 h-1 border-b border-r border-zinc-400 opacity-50"></div>

      {/* Inner border */}
      <div className="absolute inset-1 border border-zinc-200 rounded-sm opacity-60"></div>

      {/* Card value */}
      <div 
        className="font-bold text-[11px] xs:text-xs sm:text-base md:text-lg z-10 relative leading-none"
        style={{ 
          color: suitColor,
          textShadow: '1px 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        {card.value}
      </div>

      {/* Suit symbol */}
      <div 
        className="text-[12px] xs:text-sm sm:text-lg md:text-xl z-10 relative -mt-0.5 sm:-mt-1 leading-none"
        style={{ 
          color: suitColor,
          textShadow: '1px 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        {suitSymbol}
      </div>

      {/* Suit name */}
      <div 
        className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] z-10 relative uppercase tracking-tight opacity-70 leading-none"
        style={{ color: suitColor }}
      >
        {card.suit}
      </div>

      {/* Watermark in background */}
      <div 
        className="absolute inset-0 flex items-center justify-center opacity-[0.03] text-6xl"
        style={{ color: suitColor }}
      >
        {suitSymbol}
      </div>
    </div>
  );
}
