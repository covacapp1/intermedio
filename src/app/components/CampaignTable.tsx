import { useState } from "react";
import { ArrowLeft, Coins, User } from "lucide-react";
import type { CampaignGameState, CampaignPlayer } from "../types/campaign";
import { formatMoney } from "../utils/deck";
import { calculateWinChance, WIN_PRIZE, ROUND_ANTE } from "../services/campaignEngine";

interface CampaignTableProps {
  gameState: CampaignGameState;
  locationName: string;
  campaignBalance: number;
  onBack: () => void;
  onBet: (amount: number) => void;
  onPass: () => void;
  onNextRound: () => void;
  onLeave: () => void;
  gameOver: boolean;
  didWin: boolean;
}

function MiniCard({ card, small, faceDown }: { card?: { suit: string; value: number }; small?: boolean; faceDown?: boolean }) {
  if (!card && !faceDown) return null;
  const size = small ? "w-7 h-10 sm:w-8 sm:h-11" : "w-9 h-13 sm:w-11 sm:h-15";

  if (faceDown) {
    return (
      <div
        className={`${size} rounded border border-zinc-300 bg-gradient-to-br from-[#8B4513] to-[#4a2c14] flex items-center justify-center shadow-md`}
      >
        <div className="w-2/3 h-3/4 border-2 border-[#D4AF37]/70 rounded-sm" />
      </div>
    );
  }

  const suitColors: Record<string, string> = { oros: "#FFD700", copas: "#DC143C", espadas: "#1E3A8A", bastos: "#065F46" };
  const suitSymbols: Record<string, string> = { oros: "●", copas: "♥", espadas: "♠", bastos: "♣" };
  const color = suitColors[card!.suit] || "#000";

  return (
    <div
      className={`${size} rounded border border-zinc-300 bg-white flex flex-col items-center justify-center shadow-md`}
    >
      <span className="font-bold text-xs sm:text-sm" style={{ color }}>{card!.value}</span>
      <span className="text-sm leading-none" style={{ color }}>{suitSymbols[card!.suit]}</span>
    </div>
  );
}

function AIPanel({ player, isTurn }: { player: CampaignPlayer; isTurn: boolean }) {
  if (player.cards.length === 0 && player.folded) {
    return (
      <div className={`rounded-lg border-2 p-2 min-w-[70px] sm:min-w-[90px] text-center ${isTurn ? "border-[#D4AF37] bg-[#D4AF37]/20" : "border-[#5f3f1c] bg-black/30"}`}>
        <p className="text-[#D2B48C] text-[9px] sm:text-[10px] font-semibold">Eliminado</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border-2 p-1.5 sm:p-2 min-w-[70px] sm:min-w-[90px] text-center transition-all ${
        isTurn ? "border-[#D4AF37] bg-[#D4AF37]/20 shadow-[0_0_12px_rgba(212,175,55,0.4)]" : "border-[#5f3f1c] bg-black/40"
      }`}
    >
      <p className="text-[#F5DEB3] text-[9px] sm:text-[11px] font-bold truncate">{player.name}</p>
      <p className="text-[#D2B48C] text-[8px] sm:text-[9px]">{formatMoney(player.balance)}</p>
      <div className="flex justify-center gap-0.5 mt-1">
        {player.cards.map((c, i) => (
          <MiniCard key={i} card={c} small faceDown={player.result.startsWith("Pierde")} />
        ))}
      </div>
      {player.thirdCard && (
        <div className="flex justify-center mt-1">
          <MiniCard card={player.thirdCard} small faceDown={player.result.startsWith("Pierde")} />
        </div>
      )}
      {player.result && (
        <p className={`text-[8px] sm:text-[9px] font-bold mt-1 ${player.result.startsWith("Gana") ? "text-green-400" : player.result.startsWith("Pierde") ? "text-red-400" : "text-gray-400"}`}>
          {player.result}
        </p>
      )}
      {isTurn && !player.isAI && <p className="text-[#D4AF37] text-[8px] font-bold animate-pulse mt-0.5">TU TURNO</p>}
      {isTurn && player.isAI && <p className="text-[#D4AF37] text-[8px] font-bold mt-0.5">Pensando...</p>}
    </div>
  );
}

export function CampaignTable({
  gameState,
  locationName,
  campaignBalance,
  onBack,
  onBet,
  onPass,
  onNextRound,
  onLeave,
  gameOver,
  didWin,
}: CampaignTableProps) {
  const [betInput, setBetInput] = useState(Math.max(1, Math.floor(gameState.buyIn * 0.25)));

  const you = gameState.players.find((p) => p.id === "you");
  const yourTurn = !gameState.roundResolved && you && you.bet === -1 && !gameState.players[gameState.currentTurn]?.isAI;
  const currentIsYou = gameState.players[gameState.currentTurn]?.id === "you";

  const aiPlayers = gameState.players.filter((p) => p.isAI);
  const maxBet = you ? Math.min(you.balance, gameState.pot) : 0;

  const winChance = you && you.cards.length === 2
    ? Math.round(calculateWinChance(you.cards[0], you.cards[1]) * 100)
    : 0;

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4 flex items-center justify-center">
        <div className="bg-[#8B4513] border-4 border-[#D4AF37] rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
          <h2 className="text-3xl font-bold text-[#F5DEB3] mb-2" style={{ fontFamily: "serif" }}>
            {didWin ? "¡GANASTE!" : "PERDISTE"}
          </h2>
          <p className="text-[#D2B48C] mb-4">
            {didWin ? `¡Dominaste ${locationName}!` : "Te quedaste sin fichas."}
          </p>
          {didWin ? (
            <p className="text-green-400 font-bold text-sm mb-4">
              🎁 Premio: +{formatMoney(WIN_PRIZE)}
            </p>
          ) : null}
          <div className="bg-black/30 rounded-lg p-3 mb-6">
            <p className="text-[#D4AF37] font-bold text-lg">{formatMoney(campaignBalance)}</p>
            <p className="text-[#D2B48C] text-xs">Balance de campaña</p>
          </div>
          <button
            onClick={onLeave}
            className="w-full py-3 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] text-[#3E2723] font-bold text-lg border-2 border-[#654321] rounded-lg hover:from-[#FFD700] hover:to-[#D4AF37] transition-all"
          >
            Volver al Pueblo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#173125] to-[#0f1c16] p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#F5DEB3] font-semibold text-sm hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#D2B48C]">{locationName}</span>
            <span className="text-[#D2B48C]">Ronda {gameState.round}</span>
            <div className="flex items-center gap-1 bg-black/40 rounded px-2 py-1">
              <Coins className="w-3 h-3 text-[#D4AF37]" />
              <span className="text-[#F5DEB3] font-bold">{formatMoney(gameState.pot)}</span>
            </div>
            <span className="text-[#D2B48C] hidden sm:inline">Ante {ROUND_ANTE} INT/jugador por ronda</span>
          </div>
        </div>

        <div className="bg-[#5f3f1c] rounded-2xl p-3 sm:p-5 border-4 border-[#3E2723] shadow-2xl">
          {/* Crupier */}
          <div className="flex justify-center mb-3">
            <div className="bg-[#3E2723] border-2 border-[#D4AF37] rounded-lg px-4 py-2 text-center">
              <p className="text-[#D4AF37] font-bold text-xs sm:text-sm" style={{ fontFamily: "serif" }}>CRUPIER</p>
              <div className="flex justify-center gap-1 mt-1">
                <div className="w-7 h-10 sm:w-8 sm:h-11 rounded border border-zinc-600 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                  <span className="text-zinc-400 text-xs">?</span>
                </div>
                <div className="w-7 h-10 sm:w-8 sm:h-11 rounded border border-zinc-600 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                  <span className="text-zinc-400 text-xs">?</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI players */}
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-3">
            {aiPlayers.map((p, i) => (
              <AIPanel key={p.id} player={p} isTurn={gameState.currentTurn === gameState.players.indexOf(p)} />
            ))}
          </div>

          {/* Message */}
          <div className="text-center mb-3 py-1.5 bg-black/30 rounded-lg">
            <p className="text-[#F5DEB3] text-xs sm:text-sm font-semibold">{gameState.message}</p>
          </div>

          {/* You */}
          <div className="bg-[#3E2723] rounded-xl p-3 border-2 border-[#D4AF37]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[#F5DEB3] font-bold text-sm">Vos</span>
                <span className="text-[#D2B48C] text-xs">{you ? formatMoney(you.balance) : ""}</span>
              </div>
              {you && you.cards.length === 2 && (
                <span className="text-[10px] bg-black/40 rounded px-2 py-0.5 text-[#D2B48C]">
                  Prob: <strong className="text-[#D4AF37]">{winChance}%</strong>
                </span>
              )}
            </div>

            <div className="flex justify-center gap-1.5 mb-2">
              {you?.cards.map((c, i) => <MiniCard key={i} card={c} />)}
              {you?.thirdCard && (
                <>
                  <span className="text-[#D4AF37] self-center font-bold">→</span>
                  <MiniCard card={you.thirdCard} />
                </>
              )}
            </div>

            {you?.result && (
              <p className={`text-center text-sm font-bold mb-2 ${you.result.startsWith("Gana") ? "text-green-400" : you.result.startsWith("Pierde") ? "text-red-400" : "text-gray-400"}`}>
                {you.result}
              </p>
            )}

            {/* Controls */}
            {!gameOver && (
              <div className="mt-2">
                {gameState.roundResolved ? (
                  <button
                    onClick={onNextRound}
                    className="w-full py-2.5 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] text-[#3E2723] font-bold rounded-lg border-2 border-[#654321] hover:from-[#FFD700] hover:to-[#D4AF37] transition-all text-sm"
                  >
                    Siguiente Ronda →
                  </button>
                ) : currentIsYou ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={onPass}
                        className="flex-1 py-2 bg-gradient-to-b from-[#8B4513] to-[#654321] text-[#F5DEB3] font-bold rounded-lg border-2 border-[#5f3f1c] hover:bg-[#7d5a2e] transition-all text-sm"
                      >
                        Pasar
                      </button>
                      <button
                        onClick={() => onBet(betInput)}
                        disabled={betInput < 1 || betInput > maxBet}
                        className="flex-[2] py-2 bg-gradient-to-b from-[#2d9a68] to-[#1f6b47] text-white font-bold rounded-lg border-2 border-[#654321] hover:from-[#38b577] hover:to-[#2d9a68] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Apostar {formatMoney(betInput)}
                      </button>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={maxBet}
                      value={betInput}
                      onChange={(e) => setBetInput(Number(e.target.value))}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>
                ) : (
                  <p className="text-center text-[#D2B48C] text-xs py-2">
                    Turno de: <strong className="text-[#D4AF37]">{gameState.players[gameState.currentTurn]?.name}</strong>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center mt-3">
            <button
              onClick={onLeave}
              className="text-[#D2B48C] text-xs underline hover:text-[#F5DEB3]"
            >
              Abandonar mesa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
