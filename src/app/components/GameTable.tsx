import { type GameState } from "../types/game";
import { PlayerSeat } from "./PlayerSeat";
import { formatMoney } from "../utils/deck";

interface GameTableProps {
  gameState: GameState;
  timeLeftSeconds: number;
}

export function GameTable({ gameState, timeLeftSeconds }: GameTableProps) {
  const threePlayerPositions = ["bottom", "top-left", "top-right"] as const;
  const sixPlayerPositions = ["bottom", "left", "top-left", "top-center", "top-right", "right"] as const;
  const positions = gameState.maxPlayers > 3 ? sixPlayerPositions : threePlayerPositions;
  const seats = positions.map((position, index) => ({
    position,
    player: gameState.players[index],
    seatNumber: index + 1,
  }));
  const activePlayer = gameState.players[gameState.currentTurn];

  return (
    <div>
      <header className="mb-3 md:mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="m-0 text-xl md:text-2xl">Mesa en juego</h2>
          <div className="flex items-center gap-2 bg-green-600/20 border border-green-600/50 rounded-lg px-3 py-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm font-semibold">En vivo</span>
          </div>
        </div>
        <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 text-sm md:text-base">
          <span className="bg-[#13261e]/50 px-3 py-1.5 rounded border border-[#2f4f3f]">
            Codigo: <strong>{gameState.tableCode}</strong>
          </span>
          <span className="bg-[#13261e]/50 px-3 py-1.5 rounded border border-[#2f4f3f]">
            Aporte obligatorio: <strong>{formatMoney(gameState.initialBuyIn)}</strong>
          </span>
          <span className="bg-[#13261e]/50 px-3 py-1.5 rounded border border-[#2f4f3f]">
            Ronda: <strong>{gameState.round}</strong>
          </span>
          <span className="bg-[#13261e]/50 px-3 py-1.5 rounded border border-[#2f4f3f]">
            Jugadores: <strong>{gameState.players.length}/{gameState.maxPlayers}</strong>
          </span>
          <span className="bg-[#13261e]/50 px-3 py-1.5 rounded border border-[#2f4f3f] md:col-span-2">
            Turno: <strong>{activePlayer?.name ?? "Esperando..."}</strong>
          </span>
        </div>
      </header>

      <section className="rounded-3xl p-2.5 sm:p-4 md:p-6 bg-gradient-to-br from-[#173125] to-[#0f1c16] border-2 border-[#284736] shadow-[0_10px_25px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="relative w-full min-h-[470px] xs:min-h-[510px] sm:min-h-[580px] md:min-h-[640px] lg:min-h-[700px]">
          <div className="absolute inset-x-[10%] inset-y-[14%] xs:inset-x-[9%] xs:inset-y-[13%] sm:inset-x-[9%] sm:inset-y-[12%] md:inset-x-[11%] md:inset-y-[13%] rounded-[50%/38%] bg-gradient-to-br from-[#2d9a68] via-[#1f6b47] to-[#184d35] border-[8px] sm:border-[10px] md:border-[12px] border-[#5f3f1c] shadow-[inset_0_0_0_3px_rgba(255,255,255,0.12),inset_0_-18px_26px_rgba(0,0,0,0.35),0_16px_35px_rgba(0,0,0,0.45)]" />

          <div className="absolute left-1/2 top-[49%] sm:top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-3 sm:px-4">
            <div className="bg-black/20 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 inline-block border-2 border-white/20 mb-1.5 sm:mb-2 md:mb-3">
              <p className="text-white/70 text-[10px] sm:text-xs md:text-sm mb-1">Pozo actual</p>
              <p
                className="text-white text-xl xs:text-2xl md:text-3xl lg:text-4xl font-bold"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
              >
                {formatMoney(gameState.pot)}
              </p>
              <p className="mt-1 text-[10px] sm:text-xs text-[#f5deb3]">
                Aporte obligatorio por jugador: {formatMoney(gameState.initialBuyIn)}
              </p>
            </div>
            <div
              className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold opacity-20 sm:opacity-25"
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
            />
          ))}
        </div>
      </section>
    </div>
  );
}
