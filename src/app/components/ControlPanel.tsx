import { useState, useEffect } from "react";

interface ControlPanelProps {
  maxBet: number;
  roundResolved: boolean;
  isYourTurn: boolean;
  timeLeftSeconds: number;
  onPlayRound: (bet: number) => void;
  onPass: () => void;
  message: string;
}

export function ControlPanel({
  maxBet,
  roundResolved,
  isYourTurn,
  timeLeftSeconds,
  onPlayRound,
  onPass,
  message,
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
    <section className="bg-gradient-to-br from-[#13261e] to-[#173226] border border-[#2f4f3f] rounded-xl p-3 sm:p-4 shadow-[0_10px_25px_rgba(0,0,0,0.35)] space-y-2 sm:space-y-2.5">
      <label htmlFor="betInput" className="block text-zinc-400 text-sm sm:text-base">
        Tu apuesta
      </label>
      <input
        id="betInput"
        type="number"
        min={minimumBet}
        step="1"
        max={maxBet}
        value={bet}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setBet(e.target.value)}
        className="w-full px-3 py-2 sm:py-3 text-sm sm:text-base border border-[#2f4f3f] rounded-lg bg-[#0f1f19] text-white focus:outline focus:outline-2 focus:outline-[#3a7d5a]"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handlePlayRound}
          disabled={roundResolved || !isYourTurn}
          className="border-none rounded-lg px-3 py-2.5 sm:py-3 text-sm sm:text-base font-bold cursor-pointer bg-gradient-to-br from-[#d09a2a] to-[#ffd166] text-[#1d1d1d] transition-all hover:translate-y-[-1px] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          Jugar mano
        </button>
        <button
          onClick={onPass}
          disabled={roundResolved || !isYourTurn}
          className="border-none rounded-lg px-3 py-2.5 sm:py-3 text-sm sm:text-base font-bold cursor-pointer bg-[#395946] text-white transition-all hover:translate-y-[-1px] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          Pasar
        </button>
      </div>
      <div className="rounded-lg border border-[#2f4f3f] bg-[#0f1f19] px-3 py-2 text-xs sm:text-sm text-zinc-300">
        {roundResolved
          ? "La ronda termino. Preparando la siguiente..."
          : isYourTurn
          ? maxBet > 0
            ? `Es tu turno. Puedes apostar entre ${minimumBet} y ${maxBet} INT (maximo personal o pozo). Te quedan ${timeLeftSeconds} segundos.`
            : `Es tu turno. El pozo ya no permite apostar mas, asi que solo puedes pasar. Te quedan ${timeLeftSeconds} segundos.`
          : "Esperando el turno del jugador activo."}
      </div>
      {message && <p className="text-zinc-400 text-xs sm:text-sm min-h-[1.4rem] mt-1">{message}</p>}
    </section>
  );
}
