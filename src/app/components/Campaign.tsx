import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CampaignMap } from "./CampaignMap";
import { CampaignTown } from "./CampaignTown";
import { CampaignTable } from "./CampaignTable";
import { CampaignShop } from "./CampaignShop";
import { CampaignRules } from "./CampaignRules";
import { Confetti } from "./Confetti";
import type { CampaignGameState, CampaignLocation, CampaignState } from "../types/campaign";
import { formatMoney } from "../utils/deck";
import {
  advanceRound,
  aiAction,
  buyProperty,
  claimIncome,
  createCampaignState,
  didYouWin,
  getPendingIncome,
  getTownDef,
  isCampaignCompleted,
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
  onOpenMarketplace: () => void;
  onBuyCampaignPack: (amount: number) => Promise<string | null>;
  onPullCampaignBalance: () => Promise<number | null>;
  onSyncCampaignBalance: (balance: number) => void;
  onClaimCompletionReward: () => Promise<"claimed" | "already" | "error">;
  completionRewardClaimed: boolean;
  shopCreditVersion: number;
}

type Phase = "map" | "town" | "game";

const AI_TURN_DELAY_MS = 900;

export const CAMPAIGN_SHOP_DONE_KEY = "campaignShopDone";

export function Campaign({
  onBack,
  userId,
  onOpenMarketplace,
  onBuyCampaignPack,
  onPullCampaignBalance,
  onSyncCampaignBalance,
  onClaimCompletionReward,
  completionRewardClaimed,
  shopCreditVersion,
}: CampaignProps) {
  const [campaignState, setCampaignState] = useState<CampaignState>(() => {
    const saved = userId ? loadCampaignState(userId) : null;
    return saved ?? createCampaignState();
  });
  const [phase, setPhase] = useState<Phase>("map");
  const [gameState, setGameState] = useState<CampaignGameState | null>(null);
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const finalizedRef = useRef(false);
  const shopPromptedRef = useRef(false);
  const lastPushedRef = useRef<number | null>(null);
  const prevBalanceRef = useRef(campaignState.balance);
  const shopReloadedRef = useRef(false);
  const completionClaimedRef = useRef(false);
  const [confettiOn, setConfettiOn] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (userId) saveCampaignState(userId, campaignState);
  }, [campaignState, userId]);

  useEffect(() => {
    if (campaignState.balance === prevBalanceRef.current) return;
    prevBalanceRef.current = campaignState.balance;
    lastPushedRef.current = campaignState.balance;
    onSyncCampaignBalance(campaignState.balance);
  }, [campaignState.balance, onSyncCampaignBalance]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void onPullCampaignBalance().then((serverBalance) => {
      if (cancelled || serverBalance === null) return;
      if (lastPushedRef.current !== null || shopReloadedRef.current) return;
      setCampaignState((prev) =>
        prev.balance === serverBalance ? prev : { ...prev, balance: serverBalance }
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const showSuccessBanner = (amount: number) => {
    setSuccess(`¡Pago confirmado! Sumamos ${formatMoney(amount)} a tu campaña.`);
    window.setTimeout(() => setSuccess(null), 6000);
  };

  useEffect(() => {
    const done = sessionStorage.getItem(CAMPAIGN_SHOP_DONE_KEY);
    if (!done) return;
    sessionStorage.removeItem(CAMPAIGN_SHOP_DONE_KEY);
    showSuccessBanner(Number(done));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shopCreditVersion || !userId) return;
    const fresh = loadCampaignState(userId);
    if (fresh) {
      shopReloadedRef.current = true;
      setCampaignState(fresh);
    }
    const done = sessionStorage.getItem(CAMPAIGN_SHOP_DONE_KEY);
    if (done) {
      sessionStorage.removeItem(CAMPAIGN_SHOP_DONE_KEY);
      showSuccessBanner(Number(done));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopCreditVersion, userId]);

  useEffect(() => {
    if (!userId || completionClaimedRef.current) return;
    if (!isCampaignCompleted(campaignState)) return;
    completionClaimedRef.current = true;
    void onClaimCompletionReward().then((result) => {
      if (result === "claimed") {
        setSuccess("🏆 ¡Campaña completada! Regalamos 5000 INT a tu Caja de Multijugador.");
        window.setTimeout(() => setSuccess(null), 20000);
        setConfettiOn(true);
        window.setTimeout(() => setConfettiOn(false), 5500);
      } else if (result === "error") {
        completionClaimedRef.current = false;
      }
    });
  }, [campaignState, userId, onClaimCompletionReward]);

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
      <>
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
        {confettiOn ? <Confetti /> : null}
      </>
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
        {success ? <SuccessBanner message={success} /> : null}
        {confettiOn ? <Confetti /> : null}
        {shopOpen ? (
          <CampaignShop
            balance={campaignState.balance}
            onClose={() => setShopOpen(false)}
            onBuyPack={onBuyCampaignPack}
            onOpenMarketplace={() => {
              setShopOpen(false);
              onOpenMarketplace();
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <CampaignMap
        campaignState={campaignState}
        pendingIncome={pendingIncome}
        completionRewardClaimed={completionRewardClaimed}
        onBack={onBack}
        onSelectLocation={handleSelectLocation}
        onClaimIncome={handleClaimIncome}
        onShowRules={() => setRulesOpen(true)}
      />
      {rulesOpen ? <CampaignRules onClose={() => setRulesOpen(false)} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {success ? <SuccessBanner message={success} /> : null}
      {confettiOn ? <Confetti /> : null}
      {shopOpen ? (
        <CampaignShop
          balance={campaignState.balance}
          onClose={() => setShopOpen(false)}
          onBuyPack={onBuyCampaignPack}
          onOpenMarketplace={() => {
            setShopOpen(false);
            onOpenMarketplace();
          }}
        />
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

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 border-2 border-green-500 rounded-lg px-4 py-2 text-white text-sm shadow-lg max-w-[90%] text-center animate-pulse">
      {message}
    </div>
  );
}
