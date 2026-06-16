import { Card as CardType } from "../types/game";

interface CardProps {
  card?: CardType;
  hidden?: boolean;
}

export function Card({ card, hidden }: CardProps) {
  if (hidden || !card) {
    return (
      <div 
        className="w-[52px] h-[74px] xs:w-[56px] xs:h-[80px] sm:w-[68px] sm:h-[96px] md:w-[78px] md:h-[110px] rounded-lg sm:rounded-xl border-2 border-zinc-700 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black text-zinc-400 flex items-center justify-center text-[10px] sm:text-sm shadow-[0_4px_8px_rgba(0,0,0,0.6)] relative overflow-hidden"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      >
        <div className="absolute inset-0 border border-zinc-600 rounded-lg sm:rounded-xl m-1"></div>
        <span className="relative z-10 font-bold text-lg sm:text-2xl">?</span>
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
      className="w-[52px] h-[74px] xs:w-[56px] xs:h-[80px] sm:w-[68px] sm:h-[96px] md:w-[78px] md:h-[110px] rounded-lg sm:rounded-xl border-2 border-zinc-300 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 text-black flex flex-col items-center justify-center text-center p-1 sm:p-1.5 shadow-[0_4px_8px_rgba(0,0,0,0.3)] relative overflow-hidden"
      style={{
        boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.8)',
      }}
    >
      {/* Decorative corners */}
      <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-zinc-400 opacity-50"></div>
      <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-zinc-400 opacity-50"></div>
      <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-zinc-400 opacity-50"></div>
      <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-zinc-400 opacity-50"></div>

      {/* Inner border */}
      <div className="absolute inset-1.5 border border-zinc-200 rounded-sm opacity-60"></div>

      {/* Card value */}
      <div 
        className="font-bold text-base xs:text-lg sm:text-2xl md:text-3xl z-10 relative leading-none"
        style={{ 
          color: suitColor,
          textShadow: '1px 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        {card.value}
      </div>

      {/* Suit symbol */}
      <div 
        className="text-lg xs:text-xl sm:text-2xl md:text-3xl z-10 relative -mt-0.5 sm:-mt-1 leading-none"
        style={{ 
          color: suitColor,
          textShadow: '1px 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        {suitSymbol}
      </div>

      {/* Suit name */}
      <div 
        className="text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] z-10 relative uppercase tracking-tight opacity-70 leading-none"
        style={{ color: suitColor }}
      >
        {card.suit}
      </div>

      {/* Watermark in background */}
      <div 
        className="absolute inset-0 flex items-center justify-center opacity-[0.04] text-7xl"
        style={{ color: suitColor }}
      >
        {suitSymbol}
      </div>
    </div>
  );
}
