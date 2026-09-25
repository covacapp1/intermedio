import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CampaignMap } from "./CampaignMap";
import { CampaignTown } from "./CampaignTown";
import { CampaignTable } from "./CampaignTable";
import { CampaignShop } from "./CampaignShop";
import type { CampaignGameState, CampaignLocation, CampaignState } from "../types/campaign";
import {
  advanceRound,
  aiAction,
  buyProperty,
  claimIncome,
  createCampaignState,
  didYouWin,
  getPendingIncome,
  getTownDef,
  isGameOver,
  loadCampaignState,
  MATCH_BUY_IN,
  playerAction,
  saveCampaignState,
  skipUnlock,
  startCampaignGame,
  unlockNextIfConquered,
  WIN_PRIZE,
} from "../services/campaignEngine";

interface CampaignProps {
  onBack: () => void;
  userId: string;
}

type Phase = "map" | "town" | "game";

const AI_TURN_DELAY_MS = 900;

export function Campaign({ onBack, userId }: CampaignProps) {
  const [campaignState, setCampaignState] = useState<CampaignState>(() => {
    const saved = userId ? loadCampaignState(userId) : null;
    return saved ?? createCampaignState();
  });
  const [phase, setPhase] = useState<Phase>("map");
  const [gameState, setGameState] = useState<CampaignGameState | null>(null);
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const finalizedRef = useRef(false);
  const shopPromptedRef = useRef(false);

  useEffect(() => {
    if (userId) saveCampaignState(userId, campaignState);
  }, [campaignState, userId]);

  useEffect(() => {
    if (phase === "game") return;
    if (campaignState.balance < MATCH_BUY_IN) {
      if (!shopPromptedRef.current) {
        shopPromptedRef.current = true;
        setShopOpen(true);
      }
    } else {
      shopPromptedRef.current = false;
    }
  }, [campaignState.balance, phase]);

  const pendingIncome = useMemo(() => getPendingIncome(campaignState), [campaignState]);
  const currentLocation = campaignState.locations.find((l) => l.id === campaignState.currentLocationId) ?? null;
  const currentTownDef = currentLocation ? getTownDef(currentLocation.id) : null;

  const showError = (msg: string) => {
    setError(msg);
    window.setTimeout(() => setError(null), 4000);
  };

  const finalizeGame = useCallback(
    (state: CampaignGameState) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;

      const you = state.players.find((p) => p.id === "you");
      const cashOut = you ? Math.max(0, you.balance) : 0;
      const win = didYouWin(state);
      const buildingKey =
        win && state.locationId && activeBuildingId ? `${state.locationId}:${activeBuildingId}` : null;

      setCampaignState((prev) => {
        let next: CampaignState = {
          ...prev,
          balance: prev.balance + cashOut + (win ? WIN_PRIZE : 0),
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: prev.gamesWon + (win ? 1 : 0),
          totalWon: prev.totalWon + (win ? cashOut + WIN_PRIZE : 0),
        };

        if (buildingKey && !next.completedBuildings.includes(buildingKey)) {
          next = { ...next, completedBuildings: [...next.completedBuildings, buildingKey] };
        }

        next = unlockNextIfConquered(next);
        return next;
      });

      setGameState(null);
      setActiveBuildingId(null);
      setPhase("town");
    },
    [activeBuildingId]
  );

  const handleSelectLocation = (location: CampaignLocation) => {
    setCampaignState((prev) => ({ ...prev, currentLocationId: location.id }));
    setPhase("town");
  };

  const handlePlay = (buildingId: string) => {
    if (!currentLocation) return;
    if (campaignState.balance < currentLocation.buyIn) {
      setShopOpen(true);
      return;
    }
    finalizedRef.current = false;
    setActiveBuildingId(buildingId);
    setCampaignState((prev) => ({ ...prev, balance: prev.balance - currentLocation.buyIn }));
    setGameState(startCampaignGame(currentLocation));
    setPhase("game");
  };

  const handleBuyProperty = (propertyId: string) => {
    if (!currentLocation) return;
    const result = buyProperty(campaignState, currentLocation.id, propertyId);
    if (!result.ok) {
      showError(result.error ?? "No se pudo comprar.");
      return;
    }
    setCampaignState(unlockNextIfConquered(result.state));
  };

  const handleSkipUnlock = () => {
    if (!currentLocation) return;
    const result = skipUnlock(campaignState, currentLocation.id);
    if (!result.ok) {
      showError(result.error ?? "No se pudo desbloquear.");
      return;
    }
    setCampaignState(result.state);
  };

  const handleShopBuy = (amount: number) => {
    setCampaignState((prev) => ({ ...prev, balance: prev.balance + amount }));
    setShopOpen(false);
    shopPromptedRef.current = false;
  };

  const handleClaimIncome = () => {
    setCampaignState((prev) => claimIncome(prev));
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

  const activeBuilding =
    currentTownDef && activeBuildingId
      ? currentTownDef.play.find((b) => b.id === activeBuildingId) ?? null
      : null;

  if (phase === "game" && gameState && currentLocation) {
    const you = gameState.players.find((p) => p.id === "you");
    const tableTitle = activeBuilding ? `${activeBuilding.icon} ${activeBuilding.name} — ${currentLocation.name}` : currentLocation.name;
    return (
      <CampaignTable
        gameState={gameState}
        locationName={tableTitle}
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

  if (phase === "town" && currentLocation && currentTownDef) {
    return (
      <div className="relative">
        <CampaignTown
          location={currentLocation}
          townDef={currentTownDef}
          campaignState={campaignState}
          pendingIncome={pendingIncome}
          onBack={() => {
            setPhase("map");
            setCampaignState((prev) => ({ ...prev, currentLocationId: null }));
          }}
          onPlay={handlePlay}
          onBuyProperty={handleBuyProperty}
          onClaimIncome={handleClaimIncome}
          onSkipUnlock={handleSkipUnlock}
        />
        {error ? <ErrorBanner message={error} /> : null}
        {shopOpen ? (
          <CampaignShop balance={campaignState.balance} onClose={() => setShopOpen(false)} onBuy={handleShopBuy} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <CampaignMap
        campaignState={campaignState}
        pendingIncome={pendingIncome}
        onBack={onBack}
        onSelectLocation={handleSelectLocation}
        onClaimIncome={handleClaimIncome}
      />
      {error ? <ErrorBanner message={error} /> : null}
      {shopOpen ? (
        <CampaignShop balance={campaignState.balance} onClose={() => setShopOpen(false)} onBuy={handleShopBuy} />
      ) : null}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#8B4513] border-2 border-[#D4AF37] rounded-lg px-4 py-2 text-[#F5DEB3] text-sm shadow-lg max-w-[90%] text-center">
      {message}
    </div>
  );
}
