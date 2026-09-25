import { useCallback, useEffect, useRef, useState } from "react";
import { CampaignMap } from "./CampaignMap";
import { CampaignTable } from "./CampaignTable";
import type { CampaignGameState, CampaignLocation, CampaignState } from "../types/campaign";
import {
  advanceRound,
  aiAction,
  createCampaignState,
  didYouWin,
  isGameOver,
  loadCampaignState,
  playerAction,
  saveCampaignState,
  startCampaignGame,
} from "../services/campaignEngine";

interface CampaignProps {
  onBack: () => void;
  userId: string;
}

type Phase = "map" | "game";

const AI_TURN_DELAY_MS = 900;

export function Campaign({ onBack, userId }: CampaignProps) {
  const [campaignState, setCampaignState] = useState<CampaignState>(() => {
    const saved = userId ? loadCampaignState(userId) : null;
    return saved ?? createCampaignState();
  });
  const [phase, setPhase] = useState<Phase>("map");
  const [gameState, setGameState] = useState<CampaignGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finalizedRef = useRef(false);

  useEffect(() => {
    if (userId) saveCampaignState(userId, campaignState);
  }, [campaignState, userId]);

  const currentLocation = campaignState.locations.find((l) => l.id === campaignState.currentLocationId) ?? null;

  const finalizeGame = useCallback(
    (state: CampaignGameState) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;

      const you = state.players.find((p) => p.id === "you");
      const cashOut = you ? Math.max(0, you.balance) : 0;
      const win = didYouWin(state);

      setCampaignState((prev) => {
        const next: CampaignState = {
          ...prev,
          balance: prev.balance + cashOut,
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: prev.gamesWon + (win ? 1 : 0),
          totalWon: prev.totalWon + (win ? cashOut : 0),
          currentLocationId: null,
        };

        if (win) {
          const idx = next.locations.findIndex((l) => l.id === state.locationId);
          if (idx !== -1) {
            next.locations[idx].completed = true;
            if (idx + 1 < next.locations.length) {
              next.locations[idx + 1].unlocked = true;
            }
          }
        }
        return next;
      });

      setGameState(null);
      setPhase("map");
    },
    []
  );

  const handleSelectLocation = (location: CampaignLocation) => {
    setError(null);
    if (campaignState.balance < location.buyIn) {
      setError(`Necesitás ${location.buyIn} INT para entrar a ${location.name}. Tenés ${campaignState.balance} INT.`);
      return;
    }
    finalizedRef.current = false;
    setCampaignState((prev) => ({ ...prev, balance: prev.balance - location.buyIn, currentLocationId: location.id }));
    setGameState(startCampaignGame(location));
    setPhase("game");
  };

  const gameOver = gameState ? isGameOver(gameState) : false;

  useEffect(() => {
    if (phase !== "game" || !gameState || gameOver) return;
    if (gameState.roundResolved) return;
    const current = gameState.players[gameState.currentTurn];
    if (!current || !current.isAI) return;

    const timer = setTimeout(() => {
      setGameState((prev) => (prev ? aiAction(prev, prev.currentTurn) : prev));
    }, AI_TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, gameState, gameOver]);

  const handleBet = (amount: number) => {
    setGameState((prev) => (prev ? playerAction(prev, amount) : prev));
  };

  const handlePass = () => {
    setGameState((prev) => (prev ? playerAction(prev, 0) : prev));
  };

  const handleNextRound = () => {
    setGameState((prev) => (prev ? advanceRound(prev) : prev));
  };

  const handleLeave = () => {
    if (gameState) finalizeGame(gameState);
  };

  if (phase === "game" && gameState && currentLocation) {
    const you = gameState.players.find((p) => p.id === "you");
    return (
      <CampaignTable
        gameState={gameState}
        locationName={currentLocation.name}
        campaignBalance={campaignState.balance + (you?.balance ?? 0)}
        onBack={handleLeave}
        onBet={handleBet}
        onPass={handlePass}
        onNextRound={handleNextRound}
        onLeave={handleLeave}
        gameOver={gameOver}
        didWin={gameOver ? didYouWin(gameState) : false}
      />
    );
  }

  return (
    <div className="relative">
      {error ? (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#8B4513] border-2 border-[#D4AF37] rounded-lg px-4 py-2 text-[#F5DEB3] text-sm shadow-lg max-w-[90%] text-center">
          {error}
          <button onClick={() => setError(null)} className="ml-3 underline font-bold">OK</button>
        </div>
      ) : null}
      <CampaignMap
        campaignState={campaignState}
        onBack={onBack}
        onSelectLocation={handleSelectLocation}
      />
    </div>
  );
}
