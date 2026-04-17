import { useState, useEffect } from "react";

interface ControlPanelProps {
  maxBet: number;
  roundResolved: boolean;
  isYourTurn: boolean;
  timeLeftSeconds: number;
  onPlayRound: (bet: number) => void;
  onPass: () => void;
  message: string;
  isProcessingBet?: boolean;
}

export function ControlPanel({
  maxBet,
  roundResolved,
  isYourTurn,
  timeLeftSeconds,
  onPlayRound,
  onPass,
  message,
  isProcessingBet = false,
}: ControlPanelProps) {
  const [bet, setBet] = useState("200");
  const minimumBet = maxBet > 0 ? 1 : 0;

  useEffect(() => {
    setBet((currentBet) => {
      const parsedBet = Number(currentBet);
      if (!Number.isFinite(parsedBet)) {
        return String(maxBet || 0);
      }
      return String(Math.min(parsedBet, maxBet));
    });
  }, [maxBet]);

  const handlePlayRound = () => {
    onPlayRound(Number(bet) || 0);
  };

  return (
    <section className="bg-gradient-to-br from-[#13261e]/95 to-[#173226]/95 border border-[#2f4f3f] rounded-xl p-2 sm:p-3 md:p-4 shadow-[0_10px_25px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      {/* Desktop: Layout vertical (input arriba, botones abajo) */}
      {/* Mobile: Layout horizontal (input + botones en fila) */}
      <div className="hidden sm:flex sm:flex-col sm:space-y-2">
        <label htmlFor="betInputDesktop" className="block text-zinc-400 text-sm md:text-base">
          Tu apuesta
        </label>
        <input
          id="betInputDesktop"
          type="number"
          min={minimumBet}
          step="1"
          max={maxBet}
          value={bet}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setBet(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-[#2f4f3f] rounded-lg bg-[#0f1f19] text-white focus:outline focus:outline-2 focus:outline-[#3a7d5a]"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handlePlayRound}
            disabled={roundResolved || !isYourTurn || isProcessingBet}
            className="border-none rounded-lg px-3 py-2 text-sm font-bold cursor-pointer bg-gradient-to-br from-[#d09a2a] to-[#ffd166] text-[#1d1d1d] transition-all hover:translate-y-[-1px] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isProcessingBet ? "..." : "Jugar"}
          </button>
          <button
            onClick={onPass}
            disabled={roundResolved || !isYourTurn || isProcessingBet}
            className="border-none rounded-lg px-3 py-2 text-sm font-bold cursor-pointer bg-[#395946] text-white transition-all hover:translate-y-[-1px] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isProcessingBet ? "..." : "Pasar"}
          </button>
        </div>
      </div>

      {/* Mobile: Horizontal layout */}
      <div className="flex sm:hidden items-center gap-2">
        <div className="flex-1">
          <label htmlFor="betInputMobile" className="sr-only">Tu apuesta</label>
          <input
            id="betInputMobile"
            type="number"
            min={minimumBet}
            step="1"
            max={maxBet}
            value={bet}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setBet(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#2f4f3f] rounded-lg bg-[#0f1f19] text-white focus:outline focus:outline-2 focus:outline-[#3a7d5a] text-center"
          />
        </div>
        <button
          onClick={handlePlayRound}
          disabled={roundResolved || !isYourTurn || isProcessingBet}
          className="border-none rounded-lg px-3 py-2 text-sm font-bold cursor-pointer bg-gradient-to-br from-[#d09a2a] to-[#ffd166] text-[#1d1d1d] transition-all hover:translate-y-[-1px] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 whitespace-nowrap"
        >
          {isProcessingBet ? "..." : "Jugar"}
        </button>
        <button
          onClick={onPass}
          disabled={roundResolved || !isYourTurn || isProcessingBet}
          className="border-none rounded-lg px-3 py-2 text-sm font-bold cursor-pointer bg-[#395946] text-white transition-all hover:translate-y-[-1px] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 whitespace-nowrap"
        >
          {isProcessingBet ? "..." : "Pasar"}
        </button>
      </div>

      {/* Mensaje de estado - solo visible en desktop */}
      <div className="hidden sm:block mt-2 rounded-lg border border-[#2f4f3f] bg-[#0f1f19]/80 px-3 py-2 text-xs text-zinc-300">
        {roundResolved
          ? "La ronda termino. Preparando la siguiente..."
          : isYourTurn
          ? maxBet > 0
            ? `Es tu turno. Puedes apostar entre ${minimumBet} y ${maxBet} INT. Te quedan ${timeLeftSeconds} segundos.`
            : `Es tu turno. Solo puedes pasar. Te quedan ${timeLeftSeconds} segundos.`
          : "Esperando el turno del jugador activo."}
      </div>
      {message && <p className="hidden sm:block text-zinc-400 text-xs min-h-[1.4rem] mt-1">{message}</p>}
    </section>
  );
}
