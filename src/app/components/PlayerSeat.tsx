import { useEffect, useRef, useState } from "react";
import { type Player } from "../types/game";
import { Card } from "./Card";
import { formatMoney } from "../utils/deck";

interface PlayerSeatProps {
  player?: Player;
  position: "top-left" | "top-center" | "top-right" | "left" | "right" | "bottom";
  seatNumber?: number;
  isCurrentTurn?: boolean;
  timeLeftSeconds?: number;
  isCurrentUser?: boolean;
}

const positionStyles = {
  "top-left": "absolute left-[4%] top-[12%] sm:left-[8%] sm:top-[12%] lg:left-[12%]",
  "top-center": "absolute left-1/2 top-[9%] -translate-x-1/2 sm:top-[8%]",
  "top-right": "absolute right-[4%] top-[12%] sm:right-[8%] sm:top-[12%] lg:right-[12%]",
  left: "absolute left-[1.5%] top-[38%] sm:left-[4%] lg:left-[5%]",
  right: "absolute right-[1.5%] top-[38%] sm:right-[4%] lg:right-[5%]",
  bottom: "absolute left-1/2 bottom-[19%] -translate-x-1/2 xs:bottom-[17%] sm:bottom-[7%]",
} as const;

function PlayerCards({ player }: { player?: Player }) {
  const previousThirdCardRef = useRef<string | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightThirdCard, setHighlightThirdCard] = useState(false);

  useEffect(() => {
    const thirdCardKey = player?.thirdCard
      ? `${player.thirdCard.suit}-${player.thirdCard.value}`
      : null;
    const hasNewThirdCard = thirdCardKey && thirdCardKey !== previousThirdCardRef.current;

    if (hasNewThirdCard) {
      setHighlightThirdCard(true);
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
      revealTimeoutRef.current = setTimeout(() => {
        setHighlightThirdCard(false);
      }, 850);
    } else if (!thirdCardKey) {
      setHighlightThirdCard(false);
    }

    previousThirdCardRef.current = thirdCardKey;
  }, [player?.thirdCard]);

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
    };
  }, []);

  if (!player) {
    return (
      <>
        <div className="h-9 w-7 xs:h-10 xs:w-8 sm:h-12 sm:w-8 rounded-md border border-dashed border-white/20 bg-black/15" />
        <div className="h-9 w-7 xs:h-10 xs:w-8 sm:h-12 sm:w-8 rounded-md border border-dashed border-white/20 bg-black/15" />
      </>
    );
  }

  return (
    <>
      <Card card={player.cards[0]} />
      {player.thirdCard ? (
        <div
          className={highlightThirdCard ? "animate-bounce" : ""}
          style={highlightThirdCard ? { animationDuration: "0.85s" } : undefined}
        >
          <Card card={player.thirdCard} />
        </div>
      ) : player.bet > 0 ? (
        <div className="h-9 w-7 xs:h-10 xs:w-8 sm:h-12 sm:w-8 rounded-md border-2 border-dashed border-[#fff3a3]/50 bg-[#1b2a1f]/40 flex items-center justify-center animate-pulse">
          <span className="text-[#fff3a3]/60 text-lg font-bold">?</span>
        </div>
      ) : null}
      <Card card={player.cards[1]} />
    </>
  );
}

function StandardSeat({
  player,
  seatNumber,
  isCurrentTurn,
  timeLeftSeconds,
}: {
  player?: Player;
  seatNumber?: number;
  isCurrentTurn: boolean;
  timeLeftSeconds: number;
}) {
  const isPlaceholder = !player;
  const isConnected = player ? ("connected" in player ? player.connected : true) : false;

  return (
    <>
      <div className="relative">
        {player && isCurrentTurn ? (
          <div className="absolute left-1/2 -top-5 xs:-top-6 -translate-x-1/2 rounded-full border border-[#fff3a3]/70 bg-[#1b2a1f]/90 px-2 py-0.5 text-[9px] xs:text-[10px] sm:text-xs font-bold text-[#fff3a3] shadow-[0_4px_12px_rgba(0,0,0,0.45)] whitespace-nowrap">
            {timeLeftSeconds}s
          </div>
        ) : null}
        <div
          className={`rounded-full border-2 sm:border-4 shadow-lg flex items-center justify-center overflow-hidden ${
            isPlaceholder
              ? "w-10 h-10 xs:w-11 xs:h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#0f1c16]/55 border-[#d4af37]/35"
              : `w-10 h-10 xs:w-11 xs:h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#654321] to-[#8B4513] ${isCurrentTurn ? "border-[#fff3a3]" : "border-[#D4AF37]"}`
          }`}
          style={{
            boxShadow: isPlaceholder
              ? "0 4px 12px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.08)"
              : isCurrentTurn
              ? "0 0 0 3px rgba(255,243,163,0.35), 0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2)"
              : "0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2)",
          }}
        >
          {player?.photoUrl ? (
            <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <span className={`text-sm xs:text-base sm:text-xl md:text-2xl ${isPlaceholder ? "text-white/35" : ""}`}>
              {isPlaceholder ? "?" : player?.isAI ? "AI" : "U"}
            </span>
          )}
        </div>

        {!isPlaceholder && !player?.isAI ? (
          <div
            className={`absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
            title={isConnected ? "Conectado" : "Desconectado"}
          />
        ) : null}
      </div>

      <div className="flex min-h-[34px] sm:min-h-[40px] flex-col items-center gap-0">
        <p
          className={`text-center text-[9px] xs:text-[10px] sm:text-xs font-bold truncate px-1 max-w-full ${
            isPlaceholder ? "text-white/45" : "text-white"
          }`}
          style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)" }}
        >
          {player ? player.name : `Esperando jugador ${seatNumber ?? ""}`}
        </p>
        <p
          className={`text-center text-[10px] xs:text-[11px] sm:text-sm md:text-base font-bold ${
            isPlaceholder ? "text-[#D4AF37]/45" : "text-[#FFD700]"
          }`}
          style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)" }}
        >
          {player ? formatMoney(player.balance) : "Asiento libre"}
        </p>
        {player && player.bet > 0 ? (
          <p className="text-white/90 text-[10px] sm:text-xs text-center" style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.8)" }}>
            Apuesta: {formatMoney(player.bet)}
          </p>
        ) : null}
        {player && isCurrentTurn ? (
          <p className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-[#fff3a3] tracking-[0.15em] uppercase">Su turno</p>
        ) : null}
      </div>

      <div className="flex min-h-[40px] xs:min-h-[44px] sm:min-h-[52px] gap-0.5 xs:gap-1 sm:gap-1.5 items-center justify-center">
        <PlayerCards player={player} />
      </div>

      {player?.result ? (
        <div
          className={`px-2 py-0.5 sm:py-1 rounded-lg text-[9px] xs:text-[10px] sm:text-xs font-semibold shadow-lg ${
            player.result.includes("Gana")
              ? "bg-green-600/90 text-white"
              : player.result.includes("Pierde")
              ? "bg-red-600/90 text-white"
              : "bg-gray-600/90 text-white"
          }`}
          style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
        >
          {player.result}
        </div>
      ) : null}
    </>
  );
}

export function PlayerSeat({
  player,
  position,
  seatNumber,
  isCurrentTurn = false,
  timeLeftSeconds = 0,
  isCurrentUser = false,
}: PlayerSeatProps) {
  const isBottomCurrentUser = position === "bottom" && isCurrentUser;

  if (isBottomCurrentUser) {
    return (
      <div className={`${positionStyles[position]} z-20`}>
        <div className="sm:hidden w-[min(95vw,420px)] rounded-xl border border-[#D4AF37]/60 bg-[#102118]/92 px-2.5 py-2 shadow-[0_8px_22px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2">
            <div className="relative">
              {player && isCurrentTurn ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-[#fff3a3]/70 bg-[#1b2a1f]/90 px-1.5 py-0.5 text-[9px] font-bold text-[#fff3a3]">
                  {timeLeftSeconds}s
                </div>
              ) : null}
              <div className="h-12 w-12 rounded-full border-2 border-[#D4AF37] overflow-hidden bg-[#3d2a18] flex items-center justify-center">
                {player?.photoUrl ? (
                  <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm text-white/80">{player?.isAI ? "AI" : "U"}</span>
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-md border border-white/20 bg-black/35 px-2.5 py-1">
              <p className="max-w-[130px] truncate text-xs font-semibold text-white">{player?.name || `Jugador ${seatNumber ?? ""}`}</p>
              <p className="text-xs font-bold text-[#FFD700]">{player ? formatMoney(player.balance) : "Asiento libre"}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5 rounded-md border border-white/15 bg-black/25 py-1.5">
            <PlayerCards player={player} />
          </div>
        </div>

        <div className="hidden sm:flex w-[72px] xs:w-[82px] sm:w-[108px] md:w-[122px] flex-col items-center gap-1 sm:gap-1.5">
          <StandardSeat
            player={player}
            seatNumber={seatNumber}
            isCurrentTurn={isCurrentTurn}
            timeLeftSeconds={timeLeftSeconds}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${positionStyles[position]} flex w-[72px] xs:w-[82px] sm:w-[108px] md:w-[122px] flex-col items-center gap-1 sm:gap-1.5 z-10`}>
      <StandardSeat
        player={player}
        seatNumber={seatNumber}
        isCurrentTurn={isCurrentTurn}
        timeLeftSeconds={timeLeftSeconds}
      />
    </div>
  );
}
