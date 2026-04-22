import { type GameState } from "../types/game";
import { PlayerSeat } from "./PlayerSeat";
import { ControlPanel } from "./ControlPanel";
import { formatMoney } from "../utils/deck";

interface GameTableProps {
  gameState: GameState;
  currentUserId: string;
  timeLeftSeconds: number;
  maxBet: number;
  isYourTurn: boolean;
  onPlayRound: (bet: number) => void;
  onPass: () => void;
  onBack?: () => void;
  message: string;
  isProcessingBet?: boolean;
}

export function GameTable({
  gameState,
  currentUserId,
  timeLeftSeconds,
  maxBet,
  isYourTurn,
  onPlayRound,
  onPass,
  onBack,
  message,
  isProcessingBet = false,
}: GameTableProps) {
  const twoPlayerPositions = ["bottom", "top-center"] as const;
  const threePlayerPositions = ["bottom", "top-left", "top-right"] as const;
  const sixPlayerPositions = ["bottom", "left", "top-left", "top-center", "top-right", "right"] as const;
  const positions =
    gameState.maxPlayers === 2
      ? twoPlayerPositions
      : gameState.maxPlayers > 3
      ? sixPlayerPositions
      : threePlayerPositions;
  const seats = positions.map((position, index) => ({
    position,
    player: gameState.players[index],
    seatNumber: index + 1,
  }));
  const activePlayer = gameState.players[gameState.currentTurn];

  return (
    <section className="relative h-[100dvh] overflow-hidden bg-gradient-to-br from-[#173125] to-[#0f1c16] border-y border-[#284736] shadow-[0_10px_25px_rgba(0,0,0,0.35)] sm:h-auto sm:min-h-[580px] sm:rounded-3xl sm:border-2 sm:p-4 md:min-h-[640px] md:p-6 lg:min-h-[700px]">
      {onBack ? (
        <button
          onClick={onBack}
          className="absolute right-2 top-2 z-30 rounded border border-[#D4AF37]/80 bg-[#352313]/85 px-2 py-1 text-[11px] font-semibold text-[#F5DEB3] sm:hidden"
        >
          Volver
        </button>
      ) : null}

      <aside className="absolute left-2 top-2 z-20 max-w-[55%] rounded border border-white/20 bg-black/35 px-2 py-1 text-[10px] leading-[1.25] text-white sm:max-w-none sm:text-xs">
        <p>Codigo: <strong>{gameState.tableCode}</strong></p>
        <p>Aporte: <strong>{formatMoney(gameState.initialBuyIn)}</strong></p>
        <p>Ronda: <strong>{gameState.round}</strong></p>
        <p>Jugadores: <strong>{gameState.players.length}/{gameState.maxPlayers}</strong></p>
        <p>Turno: <strong>{activePlayer?.name ?? "Esperando..."}</strong></p>
      </aside>

      <div className="relative h-full w-full sm:min-h-[530px] md:min-h-[580px]">
        <div className="absolute inset-x-[3%] inset-y-[8%] xs:inset-x-[3%] xs:inset-y-[8%] sm:inset-x-[9%] sm:inset-y-[12%] md:inset-x-[11%] md:inset-y-[13%] rounded-[50%/38%] bg-gradient-to-br from-[#2d9a68] via-[#1f6b47] to-[#184d35] border-[8px] sm:border-[10px] md:border-[12px] border-[#5f3f1c] shadow-[inset_0_0_0_3px_rgba(255,255,255,0.12),inset_0_-18px_26px_rgba(0,0,0,0.35),0_16px_35px_rgba(0,0,0,0.45)]" />

        <div className="absolute left-1/2 top-[46%] sm:top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-3 sm:px-4">
          <p className="text-white/70 text-[10px] sm:text-xs md:text-sm mb-1">Pozo</p>
          <p
            className="text-white text-xl xs:text-2xl md:text-3xl lg:text-4xl font-bold mb-1.5 sm:mb-2 md:mb-3"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
          >
            {formatMoney(gameState.pot)}
          </p>
          <div
            className="text-lg xs:text-xl sm:text-4xl md:text-5xl lg:text-6xl font-bold opacity-20 sm:opacity-25"
            style={{
              fontFamily: "serif",
              color: "#9fe2be",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            INTERMEDIO
          </div>
        </div>

        {seats.map((seat) => (
          <PlayerSeat
            key={`${seat.position}-${seat.player?.id ?? seat.seatNumber}`}
            player={seat.player}
            position={seat.position}
            seatNumber={seat.seatNumber}
            isCurrentTurn={seat.player?.id === activePlayer?.id}
            timeLeftSeconds={seat.player?.id === activePlayer?.id ? timeLeftSeconds : 0}
            isCurrentUser={seat.player?.id === currentUserId}
          />
        ))}

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-2 sm:bottom-4 md:bottom-6 md:right-6 z-20 w-[280px] sm:w-auto">
          <ControlPanel
            maxBet={maxBet}
            roundResolved={gameState.roundResolved}
            isYourTurn={isYourTurn}
            timeLeftSeconds={timeLeftSeconds}
            onPlayRound={onPlayRound}
            onPass={onPass}
            message={message}
            isProcessingBet={isProcessingBet}
          />
        </div>
      </div>
    </section>
  );
}
