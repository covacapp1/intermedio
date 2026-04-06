import { useEffect, useRef, useState } from "react";
import { Login } from "./components/Login";
import { WesternHome } from "./components/WesternHome";
import { Cashier } from "./components/Cashier";
import { Ads } from "./components/Ads";
import { Profile } from "./components/Profile";
import { TablesList } from "./components/TablesList";
import { CreateTableModal } from "./components/CreateTableModal";
import { GameTable } from "./components/GameTable";
import { ControlPanel } from "./components/ControlPanel";
import { PotModal } from "./components/PotModal";
import { RebuyModal } from "./components/RebuyModal";
import { AdminWithdrawals } from "./components/AdminWithdrawals";
import { type GameState } from "./types/game";
import { formatMoney } from "./utils/deck";
import { api, type TableInfo } from "./services/api";
import { appConfig } from "./config";
import {
  STARTING_BALANCE,
  type AdminWithdrawalItem,
  createEmptyWalletSummary,
  type WalletSummary,
  type WithdrawalMethod,
} from "./types/wallet";

type AppView = "login" | "home" | "profile" | "tables" | "cashier" | "ads" | "game" | "admin";

interface UserData {
  id: string;
  email: string;
  balance: number;
  hasAdFree: boolean;
  profile: {
    username: string;
    fullName: string;
    dni: string;
    email: string;
    photoUrl: string;
  };
}

const SESSION_KEY = "intermedio_session";

const emptyUserData: UserData = {
  id: "",
  email: "",
  balance: STARTING_BALANCE,
  hasAdFree: false,
  profile: {
    username: "",
    fullName: "",
    dni: "",
    email: "",
    photoUrl: "",
  },
};

const isBrowser = typeof window !== "undefined";
const TURN_DURATION_MS = 15000;

const slugifyEmail = (email: string): string =>
  email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "jugador";

const getStoredSession = (): UserData | null => {
  if (!isBrowser) return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserData;
  } catch (error) {
    console.error("Error reading session:", error);
    return null;
  }
};

const storedSession = getStoredSession();

function App() {
  const [currentView, setCurrentView] = useState<AppView>(storedSession ? "home" : "login");
  const [userData, setUserData] = useState<UserData>(storedSession ?? emptyUserData);
  const [walletSummary, setWalletSummary] = useState<WalletSummary>(
    storedSession
      ? createEmptyWalletSummary(storedSession.id, storedSession.email)
      : createEmptyWalletSummary("", "")
  );
  const [cashierNotice, setCashierNotice] = useState("");
  const [adminWithdrawals, setAdminWithdrawals] = useState<AdminWithdrawalItem[]>([]);

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [gameMessage, setGameMessage] = useState("");
  const [currentTableId, setCurrentTableId] = useState<string>("");
  const [gameState, setGameState] = useState<GameState>({
    tableCode: "",
    initialBuyIn: 0,
    maxPlayers: 3,
    pot: 0,
    deck: [],
    round: 1,
    roundResolved: false,
    currentTurn: 0,
    turnStartedAt: 0,
    players: [],
  });
  const [showPotModal, setShowPotModal] = useState(false);
  const [showRebuyModal, setShowRebuyModal] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvancedRoundRef = useRef<number | null>(null);
  const isAdmin = userData.email === appConfig.adminEmail;
  const isYourTurn = gameState.players[gameState.currentTurn]?.id === userData.id;

  const applyWalletSummary = (summary: WalletSummary) => {
    setWalletSummary(summary);
    setUserData((previous) => ({
      ...previous,
      balance: summary.balance,
      email: previous.email || summary.email,
      profile: {
        ...previous.profile,
        email: previous.profile.email || summary.email,
      },
    }));
  };

  const refreshWallet = async (nextUserId?: string, nextEmail?: string) => {
    const userId = nextUserId ?? userData.id;
    const email = nextEmail ?? userData.email;

    if (!userId || !email) return;

    const response = await api.getWalletSummary(userId, email);
    if (response.data) {
      applyWalletSummary(response.data);
    }
  };

  const refreshAdminWithdrawals = async () => {
    const response = await api.getAdminWithdrawals();
    if (response.data) {
      setAdminWithdrawals(response.data.withdrawals);
    }
  };

  const recordWalletDebit = async (
    amount: number,
    kind: "game_buy_in" | "rebuy",
    description: string
  ) => {
    const response = await api.recordWalletMovement({
      userId: userData.id,
      email: userData.email,
      amount,
      direction: "debit",
      kind,
      description,
    });

    if (response.data) {
      applyWalletSummary(response.data);
    } else {
      setUserData((previous) => ({
        ...previous,
        balance: previous.balance - amount,
      }));
    }
  };

  useEffect(() => {
    if (!isBrowser) return;

    if (userData.id) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [userData]);

  useEffect(() => {
    if (!userData.id || !userData.email) return;
    refreshWallet(userData.id, userData.email);
  }, [userData.id, userData.email]);

  useEffect(() => {
    if (!isBrowser) return;

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (!paymentStatus) return;

    const noticeByStatus: Record<string, string> = {
      success: "Volviste desde Mercado Pago. Vamos a refrescar tu saldo para confirmar la acreditacion.",
      pending: "El pago quedo pendiente. Apenas Mercado Pago lo confirme por webhook, se acredita el saldo.",
      error: "El pago no pudo completarse. Podes intentarlo nuevamente desde el cajero.",
    };

    setCashierNotice(noticeByStatus[paymentStatus] ?? "Estado de pago recibido.");
    setCurrentView(userData.id ? "cashier" : "login");

    if (userData.id && userData.email) {
      refreshWallet(userData.id, userData.email);
    }

    params.delete("payment");
    const nextQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
  }, [userData.id, userData.email]);

  useEffect(() => {
    if (currentView === "tables") {
      fetchTables();
      const interval = setInterval(fetchTables, 3000);
      return () => clearInterval(interval);
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === "admin" && isAdmin) {
      refreshAdminWithdrawals();
    }
  }, [currentView, isAdmin]);

  useEffect(() => {
    if (currentView === "game" && currentTableId) {
      fetchGameState();
      pollingIntervalRef.current = setInterval(fetchGameState, 2000);

      heartbeatIntervalRef.current = setInterval(() => {
        api.heartbeat(currentTableId, userData.id);
      }, 5000);

      return () => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      };
    }
  }, [currentView, currentTableId, userData.id]);

  useEffect(() => {
    if (currentView !== "game" || gameState.roundResolved || !gameState.turnStartedAt) {
      setTimeLeftSeconds(15);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - gameState.turnStartedAt;
      const remaining = Math.max(0, Math.ceil((TURN_DURATION_MS - elapsed) / 1000));
      setTimeLeftSeconds(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [currentView, gameState.roundResolved, gameState.turnStartedAt, gameState.currentTurn]);

  useEffect(() => {
    if (currentView !== "game") {
      autoAdvancedRoundRef.current = null;
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
      return;
    }

    if (!gameState.roundResolved) {
      autoAdvancedRoundRef.current = null;
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
      return;
    }

    if (showPotModal || showRebuyModal || !currentTableId) {
      return;
    }

    if (autoAdvancedRoundRef.current === gameState.round) {
      return;
    }

    autoAdvancedRoundRef.current = gameState.round;
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      handleNextRound();
    }, 1800);

    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [
    currentView,
    currentTableId,
    gameState.round,
    gameState.roundResolved,
    showPotModal,
    showRebuyModal,
  ]);

  const fetchTables = async () => {
    const response = await api.getTables();
    if (response.data) {
      setTables(response.data.tables);
    }
  };

  const fetchGameState = async () => {
    if (!currentTableId) return;

    const response = await api.getTable(currentTableId);
    if (response.data) {
      const serverTable = response.data.table;

      const localGameState: GameState = {
        tableCode: serverTable.code,
        initialBuyIn: serverTable.buyIn,
        maxPlayers: serverTable.maxPlayers,
        pot: serverTable.pot,
        deck: serverTable.deck,
        round: serverTable.round,
        roundResolved: serverTable.roundResolved,
        currentTurn: serverTable.currentTurn,
        turnStartedAt: serverTable.turnStartedAt,
        players: serverTable.players.map((player) => ({
          id: player.id,
          name: player.name,
          isAI: player.isAI,
          balance: player.balance,
          bet: player.bet,
          cards: player.cards,
          thirdCard: player.thirdCard,
          result: player.result,
          photoUrl: player.photoUrl,
          connected: player.connected,
          lastSeen: player.lastSeen,
        })),
      };

      setGameState(localGameState);

      if (serverTable.roundResolved && !gameState.roundResolved) {
        if (serverTable.pot <= 0) {
          setGameMessage("El pozo llego a $0.");
          setShowPotModal(true);
        } else {
          setGameMessage(`Ronda ${serverTable.round} finalizada. Pozo actual: ${formatMoney(serverTable.pot)}.`);
        }
      } else if (!serverTable.roundResolved && serverTable.status === "playing") {
        const activePlayer = serverTable.players[serverTable.currentTurn];
        setGameMessage(
          activePlayer?.id === userData.id
            ? "Es tu turno. Decide tu apuesta antes de que termine el reloj."
            : `Turno de ${activePlayer?.name ?? "otro jugador"}.`
        );
      }
    } else if (response.error) {
      console.error("Error fetching game state:", response.error);
      if (response.error === "Table not found") {
        alert("La mesa fue cerrada.");
        handleCloseTable();
      }
    }
  };

  const handleLogin = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const userId = `user_${slugifyEmail(normalizedEmail)}`;

    setUserData({
      id: userId,
      email: normalizedEmail,
      balance: STARTING_BALANCE,
      hasAdFree: false,
      profile: {
        username: normalizedEmail.split("@")[0] || "Jugador",
        fullName: "",
        dni: "",
        email: normalizedEmail,
        photoUrl: "",
      },
    });
    setCurrentView("home");
  };

  const handleLogout = () => {
    setCurrentView("login");
    setWalletSummary(createEmptyWalletSummary("", ""));
    setCashierNotice("");
    setUserData(emptyUserData);
  };

  const handleNavigate = (view: "profile" | "tables" | "createTable" | "cashier" | "ads" | "admin") => {
    if (view === "tables") {
      setCurrentView("tables");
    } else if (view === "createTable") {
      setCurrentView("tables");
      setShowCreateModal(true);
    } else if (view === "admin") {
      if (isAdmin) {
        setCurrentView("admin");
      }
    } else {
      setCurrentView(view);
    }
  };

  const handleBackToHome = () => {
    setCurrentView("home");
  };

  const handleDeposit = async (amount: number) => {
    if (!userData.id || !userData.email) return;

    const origin = isBrowser ? window.location.origin : "";
    const response = await api.createDepositCheckout({
      userId: userData.id,
      email: userData.email,
      fullName: userData.profile.fullName || userData.profile.username || userData.email,
      amount,
      successUrl: `${origin}/?payment=success`,
      errorUrl: `${origin}/?payment=error`,
      pendingUrl: `${origin}/?payment=pending`,
    });

    if (response.data) {
      setCashierNotice("Te estamos redirigiendo a Mercado Pago para completar la carga.");
      if (isBrowser) {
        window.location.href = response.data.checkoutUrl;
      }
      return;
    }

    setCashierNotice(
      response.error ??
        "No pudimos iniciar Mercado Pago. Revisa Access Token, Public Key y URLs de retorno."
    );
  };

  const handleWithdraw = async (payload: {
    amount: number;
    method: WithdrawalMethod;
    accountHolder: string;
    accountDestination: string;
    notes?: string;
  }) => {
    if (!userData.id || !userData.email) return;

    const response = await api.createWithdrawal({
      userId: userData.id,
      email: userData.email,
      fullName: userData.profile.fullName,
      dni: userData.profile.dni,
      amount: payload.amount,
      method: payload.method,
      accountHolder: payload.accountHolder,
      accountDestination: payload.accountDestination,
      notes: payload.notes,
    });

    if (response.data) {
      applyWalletSummary(response.data);
      setCashierNotice("La solicitud de retiro quedo registrada y el saldo fue reservado.");
      return;
    }

    setCashierNotice(response.error ?? "No pudimos registrar el retiro.");
  };

  const handlePurchaseAdFree = () => {
    const confirmed = window.confirm("Seras redirigido a Mercado Pago para completar el pago de USD $6.99");
    if (confirmed) {
      setTimeout(() => {
        setUserData((previous) => ({ ...previous, hasAdFree: true }));
        alert("Pago exitoso. Ya no veras mas anuncios.");
      }, 1500);
    }
  };

  const handleResolveWithdrawal = async (
    withdrawalId: string,
    status: "approved" | "rejected",
    rejectionReason?: string
  ) => {
    const response = await api.updateWithdrawalStatus({
      withdrawalId,
      status,
      rejectionReason,
    });

    if (response.data) {
      setAdminWithdrawals(response.data.withdrawals);
      if (userData.id && userData.email) {
        await refreshWallet(userData.id, userData.email);
      }
      return;
    }

    alert(response.error ?? "No pudimos actualizar el retiro.");
  };

  const handleSaveProfile = (profileData: UserData["profile"]) => {
    setUserData((previous) => ({
      ...previous,
      email: profileData.email || previous.email,
      profile: profileData,
    }));
    setCashierNotice("");
    alert("Perfil guardado exitosamente");
  };

  const handleCreateTable = async (tableName: string, buyIn: number, maxPlayers: number) => {
    if (buyIn > userData.balance) {
      alert("No tienes suficiente saldo para crear esta mesa");
      return;
    }

    const response = await api.createTable(
      tableName,
      buyIn,
      maxPlayers,
      userData.id,
      userData.profile.username || userData.email,
      userData.profile.photoUrl
    );

    if (response.data) {
      await recordWalletDebit(buyIn, "game_buy_in", `Buy-in de mesa: ${tableName}`);
      setShowCreateModal(false);
      setCurrentTableId(response.data.table.id);
      setCurrentView("game");
      setGameMessage("Esperando jugadores...");
    } else {
      alert(`Error al crear mesa: ${response.error}`);
    }
  };

  const handleJoinTable = async (tableId: string) => {
    const table = tables.find((item) => item.id === tableId);
    if (!table) return;

    if (table.buyIn > userData.balance) {
      alert("No tienes suficiente saldo para unirte a esta mesa");
      return;
    }

    const response = await api.joinTable(
      tableId,
      userData.id,
      userData.profile.username || userData.email,
      userData.profile.photoUrl
    );

    if (response.data) {
      await recordWalletDebit(table.buyIn, "game_buy_in", `Buy-in en mesa: ${table.name}`);
      setCurrentTableId(response.data.table.id);
      setCurrentView("game");

      if (response.data.table.status === "playing") {
        setGameMessage(`Ronda ${response.data.table.round}. Define tu apuesta o pasa la mano.`);
      } else {
        setGameMessage("Esperando jugadores...");
      }
    } else {
      alert(`Error al unirse a la mesa: ${response.error}`);
    }
  };

  const handlePlayRound = async (bet: number) => {
    if (gameState.roundResolved) {
      setGameMessage("Espera a que todos los jugadores terminen.");
      return;
    }

    if (!isYourTurn) {
      setGameMessage("Todavia no es tu turno.");
      return;
    }

    if (bet < 50 && bet !== 0) {
      setGameMessage("La apuesta minima es $50, o usa Pasar.");
      return;
    }

    const you = gameState.players.find((player) => player.id === userData.id);
    if (you && bet > you.balance) {
      setGameMessage(`No puedes apostar mas de tu saldo (${formatMoney(you.balance)}).`);
      return;
    }

    const response = await api.makeBet(currentTableId, userData.id, bet);

    if (response.data) {
      setGameMessage("Apuesta enviada...");
    } else {
      alert(`Error al procesar apuesta: ${response.error}`);
    }
  };

  const handlePass = async () => {
    await handlePlayRound(0);
  };

  const handleNextRound = async () => {
    if (!gameState.roundResolved) {
      return;
    }

    const you = gameState.players.find((player) => player.id === userData.id);
    if (you && you.balance < 50) {
      setShowRebuyModal(true);
      return;
    }

    const response = await api.nextRound(currentTableId);

    if (response.data) {
      setGameMessage(`Iniciando ronda ${response.data.table.round}...`);
    } else {
      alert(`Error al iniciar siguiente ronda: ${response.error}`);
    }
  };

  const handleContinueTable = async () => {
    const recharge = gameState.initialBuyIn;

    if (userData.balance < recharge) {
      alert("No tienes suficiente saldo para continuar. Debes cargar dinero primero.");
      setShowPotModal(false);
      handleCloseTable();
      return;
    }

    await recordWalletDebit(recharge, "rebuy", "Recarga de pozo");
    const response = await api.nextRound(currentTableId);

    if (response.data) {
      setShowPotModal(false);
      setGameMessage(`Se recargo el pozo con ${formatMoney(recharge)} por jugador.`);
    } else {
      alert(`Error al continuar: ${response.error}`);
    }
  };

  const handleCloseTable = async () => {
    if (currentTableId) {
      await api.leaveTable(currentTableId, userData.id);
    }

    setShowPotModal(false);
    setShowRebuyModal(false);
    setCurrentTableId("");
    setGameState({
      tableCode: "",
      initialBuyIn: 0,
      maxPlayers: 3,
      pot: 0,
      deck: [],
      round: 1,
      roundResolved: false,
      currentTurn: 0,
      turnStartedAt: 0,
      players: [],
    });
    setGameMessage("");
    setCurrentView("tables");
  };

  const handleRebuy = async () => {
    if (userData.balance < gameState.initialBuyIn) {
      alert("No tienes suficiente saldo. Debes cargar dinero primero en el cajero.");
      setShowRebuyModal(false);
      handleCloseTable();
      return;
    }

    await recordWalletDebit(gameState.initialBuyIn, "rebuy", "Rebuy para seguir jugando");
    setShowRebuyModal(false);
    setGameMessage(`Recarga exitosa de ${formatMoney(gameState.initialBuyIn)}. Continuemos jugando.`);
  };

  const getMaxBet = (): number => {
    const you = gameState.players.find((player) => player.id === userData.id);
    return you ? Math.max(0, Math.floor(you.balance)) : 0;
  };

  if (currentView === "login") {
    return <Login onLogin={handleLogin} />;
  }

  if (currentView === "home") {
    return (
      <WesternHome
        userName={userData.profile.username || userData.email}
        userBalance={userData.balance}
        isAdmin={isAdmin}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === "cashier") {
    return (
      <Cashier
        userBalance={userData.balance}
        walletSummary={walletSummary}
        profileData={userData.profile}
        notice={cashierNotice}
        onBack={handleBackToHome}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        onRefresh={refreshWallet}
      />
    );
  }

  if (currentView === "ads") {
    return (
      <Ads
        onBack={handleBackToHome}
        onPurchase={handlePurchaseAdFree}
        hasAdFree={userData.hasAdFree}
      />
    );
  }

  if (currentView === "admin" && isAdmin) {
    return (
      <AdminWithdrawals
        withdrawals={adminWithdrawals}
        onBack={handleBackToHome}
        onRefresh={refreshAdminWithdrawals}
        onResolve={handleResolveWithdrawal}
      />
    );
  }

  if (currentView === "profile") {
    return (
      <Profile
        profileData={userData.profile}
        onBack={handleBackToHome}
        onSave={handleSaveProfile}
      />
    );
  }

  if (currentView === "tables") {
    return (
      <>
        <TablesList
          tables={tables}
          onJoinTable={handleJoinTable}
          onBack={handleBackToHome}
        />
        {showCreateModal && (
          <CreateTableModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateTable}
          />
        )}
      </>
    );
  }

  if (currentView === "game") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#1a2d22_0%,transparent_30%),radial-gradient(circle_at_90%_90%,#193126_0%,transparent_35%),#0a0f0d] text-white">
        <main className="w-full max-w-[980px] mx-auto px-2 py-3 sm:p-4">
          <button
            onClick={() => {
              const confirmed = window.confirm("Estas seguro de que quieres abandonar la mesa?");
              if (confirmed) {
                handleCloseTable();
              }
            }}
            className="mb-3 sm:mb-4 px-3 sm:px-4 py-2 text-sm sm:text-base bg-[#654321] text-[#F5DEB3] border-2 border-[#D4AF37] rounded hover:bg-[#7d5a2e] transition-colors"
          >
            Volver
          </button>
          <div className="space-y-2.5 sm:space-y-4">
            <GameTable gameState={gameState} timeLeftSeconds={timeLeftSeconds} />
            <ControlPanel
              maxBet={getMaxBet()}
              roundResolved={gameState.roundResolved}
              isYourTurn={isYourTurn}
              timeLeftSeconds={timeLeftSeconds}
              onPlayRound={handlePlayRound}
              onPass={handlePass}
              message={gameMessage}
            />
          </div>
        </main>

        <PotModal
          isOpen={showPotModal}
          potValue={gameState.pot}
          onContinue={handleContinueTable}
          onClose={handleCloseTable}
        />

        <RebuyModal
          isOpen={showRebuyModal}
          buyInAmount={gameState.initialBuyIn}
          userBalance={userData.balance}
          onRebuy={handleRebuy}
          onLeave={handleCloseTable}
        />
      </div>
    );
  }

  return null;
}

export default App;
