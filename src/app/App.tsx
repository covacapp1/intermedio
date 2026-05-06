import { useEffect, useRef, useState } from "react";
import { Login, type RegisterFormData } from "./components/Login";
import { WesternHome } from "./components/WesternHome";
import { Cashier } from "./components/Cashier";
import { Ads } from "./components/Ads";
import { Profile } from "./components/Profile";
import { TablesList } from "./components/TablesList";
import { CreateTableModal } from "./components/CreateTableModal";
import { JoinTableModal } from "./components/JoinTableModal";
import { GameTable } from "./components/GameTable";
import { ControlPanel } from "./components/ControlPanel";
import { PotModal } from "./components/PotModal";
import { RebuyModal } from "./components/RebuyModal";
import { AdminWithdrawals } from "./components/AdminWithdrawals";
import { AdminIntManager } from "./components/AdminIntManager";
import { type GameState } from "./types/game";
import { formatMoney } from "./utils/deck";
import { api } from "./services/api";
import { realtimeGame, type GameTable as RealtimeGameTable, type TableInfo } from "./services/realtimeGame";
import { appConfig } from "./config";
import { supabase } from "../lib/supabase";
import {
  STARTING_BALANCE,
  type AdminWithdrawalItem,
  createEmptyWalletSummary,
  type WalletSummary,
  type WithdrawalMethod,
} from "./types/wallet";

type AppView = "login" | "home" | "profile" | "tables" | "cashier" | "ads" | "game" | "admin" | "admin-int";

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
const TURN_DURATION_MS = 30000;
const ROUND_AUTO_ADVANCE_DELAY_MS = 5000;
const getAuthRedirectUrl = () => {
  if (isBrowser) {
    return `${window.location.origin}/`;
  }

  return "https://intermedio-ten.vercel.app/";
};

function App() {
  const [currentView, setCurrentView] = useState<AppView>("login");
  const [userData, setUserData] = useState<UserData>(emptyUserData);
  const [walletSummary, setWalletSummary] = useState<WalletSummary>(createEmptyWalletSummary("", ""));
  const [cashierNotice, setCashierNotice] = useState("");
  const [adminWithdrawals, setAdminWithdrawals] = useState<AdminWithdrawalItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<Array<{ userId: string; email: string; balance: number }>>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  const [tables, setTables] = useState<TableInfo[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingJoinTableId, setPendingJoinTableId] = useState<string | null>(null);

  const [gameMessage, setGameMessage] = useState("");
  const [currentTableId, setCurrentTableId] = useState<string>("");
  const [gameState, setGameState] = useState<GameState>({
    mode: "pvp",
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
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(20);
  const [isProcessingBet, setIsProcessingBet] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvancedRoundRef = useRef<number | null>(null);
  const lobbyUnsubscribeRef = useRef<(() => void) | null>(null);
  const gameUnsubscribeRef = useRef<(() => void) | null>(null);
  const processedMercadoPagoReturnRef = useRef<string | null>(null);
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

  const syncUserFromAuth = async (
    authUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    } | null
  ) => {
    if (!authUser?.id || !authUser.email) {
      setUserData(emptyUserData);
      setWalletSummary(createEmptyWalletSummary("", ""));
      setCurrentView("login");
      return;
    }

    const email = authUser.email.trim().toLowerCase();
    const metadataUsername =
      typeof authUser.user_metadata?.username === "string" && authUser.user_metadata.username.trim()
        ? authUser.user_metadata.username.trim()
        : email.split("@")[0] || "Jugador";
    const metadataFirstName =
      typeof authUser.user_metadata?.first_name === "string" ? authUser.user_metadata.first_name.trim() : "";
    const metadataLastName =
      typeof authUser.user_metadata?.last_name === "string" ? authUser.user_metadata.last_name.trim() : "";
    const metadataDni =
      typeof authUser.user_metadata?.dni === "string" ? authUser.user_metadata.dni.trim() : "";
    const metadataFullName =
      typeof authUser.user_metadata?.full_name === "string"
        ? authUser.user_metadata.full_name
        : [metadataFirstName, metadataLastName].filter(Boolean).join(" ");
    const avatarUrl =
      typeof authUser.user_metadata?.avatar_url === "string" ? authUser.user_metadata.avatar_url : "";

    const profilePayload = {
      id: authUser.id,
      username: metadataUsername,
      avatar_url: avatarUrl || null,
      first_name: metadataFirstName || null,
      last_name: metadataLastName || null,
      dni: metadataDni || null,
      email: email,
    };

    const { data: upsertedProfile, error } = await supabase
      .from("profiles")
      .upsert(profilePayload)
      .select("username, avatar_url, first_name, last_name, dni, email")
      .maybeSingle();

    if (error) {
      console.error("Error syncing profile:", error);
    }

    const profile = upsertedProfile;

    const username = profile?.username || metadataUsername;
    const fullName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || metadataFullName;
    const dni = profile?.dni || metadataDni;
    const profileEmail = profile?.email || email;
    const profilePhotoUrl = profile?.avatar_url || avatarUrl;

    setUserData((previous) => ({
      ...previous,
      id: authUser.id,
      email: profileEmail,
      profile: {
        ...previous.profile,
        username,
        fullName,
        dni,
        email: profileEmail,
        photoUrl: profilePhotoUrl,
      },
    }));
    setCurrentView((previous) => (previous === "login" ? "home" : previous));
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

  const refreshAdminUsers = async () => {
    const response = await api.getAdminUsers();
    if (response.data) {
      setAdminUsers(response.data.users);
    }
  };

  const handleUpdateUserBalance = async (userId: string, newBalance: number) => {
    const response = await api.updateUserBalance(userId, newBalance);
    if (response.data) {
      await refreshAdminUsers();
    } else {
      alert(response.error ?? "No pudimos actualizar el balance");
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
    let isMounted = true;

    const bootstrapAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      await syncUserFromAuth(session?.user ?? null);
      if (isMounted) {
        setAuthLoading(false);
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUserFromAuth(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userData.id || !userData.email) return;
    refreshWallet(userData.id, userData.email);
  }, [userData.id, userData.email]);

  useEffect(() => {
    if (!isBrowser) return;
    if (authLoading) return;

    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    if (!paymentStatus) return;

    const paymentId = params.get("payment_id") || params.get("collection_id");
    const paymentReturnKey = `${paymentStatus}:${paymentId || "no-payment-id"}:${userData.id || "anonymous"}`;

    if (processedMercadoPagoReturnRef.current === paymentReturnKey) {
      return;
    }

    const handleMercadoPagoReturn = async () => {
      const noticeByStatus: Record<string, string> = {
        success: "Volviste desde Mercado Pago. Vamos a refrescar tu saldo INT para confirmar la acreditacion.",
        pending: "El pago quedo pendiente. Apenas Mercado Pago lo confirme por webhook, se acreditan tus INT.",
        error: "El pago no pudo completarse. Podes intentarlo nuevamente desde el cajero.",
      };

      setCashierNotice(noticeByStatus[paymentStatus] ?? "Estado de pago recibido.");
      setCurrentView(userData.id ? "cashier" : "login");

      if (!userData.id || !userData.email) {
        return;
      }

      processedMercadoPagoReturnRef.current = paymentReturnKey;

      if (paymentId && (paymentStatus === "success" || paymentStatus === "pending")) {
        const response = await api.reconcileDeposit({
          userId: userData.id,
          email: userData.email,
          paymentId,
        });

        if (response.data?.wallet) {
          applyWalletSummary(response.data.wallet);
          if (response.data.approved) {
            setCashierNotice("Pago confirmado. Ya acreditamos tus INT.");
          } else if (response.data.paymentStatus === "pending") {
            setCashierNotice("El pago sigue pendiente. Apenas se confirme, se acreditan tus INT.");
          }
        } else {
          await refreshWallet(userData.id, userData.email);
        }
      } else {
        await refreshWallet(userData.id, userData.email);
      }

      params.delete("payment");
      params.delete("payment_id");
      params.delete("collection_id");
      const nextQuery = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
    };

    void handleMercadoPagoReturn();
  }, [authLoading, userData.id, userData.email]);

  useEffect(() => {
    if (currentView === "tables") {
      lobbyUnsubscribeRef.current?.();
      lobbyUnsubscribeRef.current = realtimeGame.subscribeToLobby(
        (nextTables) => {
          setTables(nextTables);
        },
        (message) => {
          console.error("Lobby realtime error:", message);
        }
      );

      return () => {
        lobbyUnsubscribeRef.current?.();
        lobbyUnsubscribeRef.current = null;
      };
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === "admin" && isAdmin) {
      refreshAdminWithdrawals();
    }
  }, [currentView, isAdmin]);

  useEffect(() => {
    if (currentView === "admin-int" && isAdmin) {
      refreshAdminUsers();
    }
  }, [currentView, isAdmin]);

  useEffect(() => {
    if (currentView === "game" && currentTableId) {
      gameUnsubscribeRef.current?.();
      gameUnsubscribeRef.current = realtimeGame.subscribeToGame(
        currentTableId,
        (table) => {
          applyRealtimeTable(table);
        },
        (message) => {
          console.error("Game realtime error:", message);
          if (message === "Room not found") {
            alert("La mesa fue cerrada.");
            void handleCloseTable();
          }
        }
      );

      heartbeatIntervalRef.current = setInterval(() => {
        void realtimeGame.heartbeat(currentTableId, userData.id);
      }, 8000);

      return () => {
        gameUnsubscribeRef.current?.();
        gameUnsubscribeRef.current = null;
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
      };
    }
  }, [currentView, currentTableId, userData.id]);

  useEffect(() => {
    if (currentView !== "game" || gameState.roundResolved || !gameState.turnStartedAt) {
      setTimeLeftSeconds(20);
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
    }, ROUND_AUTO_ADVANCE_DELAY_MS);

    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [
    currentView,
    gameState.round,
    gameState.roundResolved,
  ]);

  const applyRealtimeTable = (serverTable: RealtimeGameTable) => {
    if (!serverTable) return;

    const localGameState: GameState = {
      mode: serverTable.mode || "pvp",
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
        rebuyDeadline: player.rebuyDeadline,
        hasDeclinedRebuy: player.hasDeclinedRebuy,
      })),
    };

    setGameState(localGameState);

    // Check if user reached 0 balance and show RebuyModal immediately
    const you = serverTable.players.find((player) => player.id === userData.id);
    if (you && you.balance === 0 && you.rebuyDeadline && !showRebuyModal) {
      setShowRebuyModal(true);
    }

    // Check if user was ejected (rebuy deadline expired)
    if (you && you.hasDeclinedRebuy && you.balance === 0 && !showPotModal) {
      setGameMessage("Te quedaste sin tiempo para recargar. Fuiste echado de la mesa.");
      setShowPotModal(true);
    }

    if (serverTable.status === "waiting") {
      if (serverTable.mode === "vs_ai") {
        setGameMessage("Mesa vs IA lista. Es tu turno para abrir la ronda.");
      } else {
        setGameMessage(`Esperando jugadores... ${serverTable.currentPlayers}/${serverTable.maxPlayers}`);
      }
      return;
    }

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
  };

  const handleLogin = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    setAuthSubmitting(true);
    setAuthError("");

    const signInResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (!signInResult.error) {
      setAuthSubmitting(false);
      return;
    }
    setAuthSubmitting(false);
    const lowerMessage = signInResult.error.message.toLowerCase();
    if (lowerMessage.includes("invalid login credentials")) {
      setAuthError("Email o contrasena incorrectos. Si no tienes cuenta, usa Registrarse.");
      return;
    }

    setAuthError(signInResult.error.message || "No pudimos iniciar sesion.");
  };

  const handleRegister = async (formData: RegisterFormData) => {
    const normalizedEmail = formData.email.trim().toLowerCase();
    const normalizedUsername = formData.username.trim();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const dni = formData.dni.trim();
    const password = formData.password;

    if (!firstName || !lastName || !dni || !normalizedUsername || !normalizedEmail || !password) {
      setAuthError("Completa todos los campos para registrarte.");
      return;
    }

    setAuthSubmitting(true);
    setAuthError("");

    const signUpResult = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          username: normalizedUsername,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          dni,
        },
      },
    });

    setAuthSubmitting(false);

    if (signUpResult.error) {
      const lowerMessage = signUpResult.error.message.toLowerCase();
      if (lowerMessage.includes("password")) {
        setAuthError("La contrasena no es valida. Usa al menos 6 caracteres.");
        return;
      }

      if (lowerMessage.includes("email")) {
        setAuthError(`No pudimos registrar ese email: ${signUpResult.error.message}`);
        return;
      }

      setAuthError(signUpResult.error.message || "No pudimos crear la cuenta.");
      return;
    }

    if (!signUpResult.data.session) {
      setAuthError("Cuenta creada. Revisa tu email para confirmarla antes de ingresar.");
      return;
    }

    const authUserId = signUpResult.data.session.user.id;
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authUserId,
      username: normalizedUsername,
      first_name: firstName,
      last_name: lastName,
      dni,
      email: normalizedEmail,
    });

    if (profileError) {
      const lowerProfileMessage = profileError.message.toLowerCase();
      if (lowerProfileMessage.includes("username")) {
        setAuthError("Ese nombre de usuario ya esta en uso.");
        return;
      }

      if (lowerProfileMessage.includes("dni")) {
        setAuthError("Ese DNI ya esta registrado.");
        return;
      }

      if (lowerProfileMessage.includes("email")) {
        setAuthError("Ese email ya esta asociado a otra cuenta.");
        return;
      }

      setAuthError(profileError.message || "La cuenta se creo, pero no pudimos guardar el perfil.");
      return;
    }

    setCurrentView("home");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView("login");
    setWalletSummary(createEmptyWalletSummary("", ""));
    setCashierNotice("");
    setUserData(emptyUserData);
    setAuthError("");
  };

  const handleNavigate = (view: "profile" | "tables" | "createTable" | "cashier" | "ads" | "admin" | "admin-int") => {
    if (view === "tables") {
      setCurrentView("tables");
    } else if (view === "createTable") {
      setCurrentView("tables");
      setShowCreateModal(true);
    } else if (view === "admin") {
      if (isAdmin) {
        setCurrentView("admin");
      }
    } else if (view === "admin-int") {
      if (isAdmin) {
        setCurrentView("admin-int");
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
      setCashierNotice("Te estamos redirigiendo a Mercado Pago para comprar INT.");
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
      setCashierNotice("La solicitud de retiro quedo registrada y los INT quedaron reservados.");
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

  const handleSaveProfile = async (profileData: UserData["profile"]) => {
    if (userData.id) {
      const [firstName = "", ...restName] = (profileData.fullName || "").trim().split(/\s+/);
      const lastName = restName.join(" ");
      const { error } = await supabase.from("profiles").upsert({
        id: userData.id,
        username: profileData.username || userData.email.split("@")[0] || "Jugador",
        avatar_url: profileData.photoUrl || null,
        first_name: firstName || null,
        last_name: lastName || null,
        dni: profileData.dni || null,
        email: profileData.email || userData.email,
      });

      if (error) {
        alert("No pudimos guardar el perfil en Supabase.");
        return;
      }
    }

    setUserData((previous) => ({
      ...previous,
      email: profileData.email || previous.email,
      profile: profileData,
    }));
    setCashierNotice("");
    alert("Perfil guardado exitosamente");
  };

  const handleCreateTable = async (
    tableName: string,
    buyIn: number,
    initialStack: number,
    maxPlayers: number,
    gameMode: "pvp" | "vs_ai"
  ) => {
    const totalRequired = buyIn + initialStack;

    if (totalRequired > userData.balance) {
      alert("No tienes suficiente saldo para crear esta mesa");
      return;
    }

    const response = await realtimeGame.createTable(tableName, buyIn, initialStack, maxPlayers, userData.id, gameMode);

    if (response.data) {
      await recordWalletDebit(totalRequired, "game_buy_in", `Ingreso a mesa: ${tableName}`);
      setShowCreateModal(false);
      setCurrentTableId(response.data.table.id);
      setCurrentView("game");
      setGameMessage(gameMode === "vs_ai" ? "Mesa vs IA creada. Ronda 1 lista." : "Esperando jugadores...");
    } else {
      alert(`Error al crear mesa: ${response.error}`);
    }
  };

  const handleJoinTable = async (tableId: string) => {
    const table = tables.find((item) => item.id === tableId);
    if (!table) return;

    setPendingJoinTableId(tableId);
  };

  const handleConfirmJoinTable = async (stackAmount: number) => {
    if (!pendingJoinTableId) return;

    const table = tables.find((item) => item.id === pendingJoinTableId);
    if (!table) {
      setPendingJoinTableId(null);
      return;
    }

    const totalRequired = table.buyIn + stackAmount;

    if (stackAmount <= 0) {
      alert("Debes indicar con cuantos INT quieres ingresar a jugar");
      return;
    }

    if (totalRequired > userData.balance) {
      alert("No tienes suficiente saldo para unirte a esta mesa");
      setPendingJoinTableId(null);
      return;
    }

    const response = await realtimeGame.joinTable(table.id, userData.id, stackAmount);

    if (response.data) {
      await recordWalletDebit(totalRequired, "game_buy_in", `Ingreso a mesa: ${table.name}`);
      setPendingJoinTableId(null);
      setCurrentTableId(response.data.table.id);
      setCurrentView("game");

      if (response.data.table.status === "playing") {
        setGameMessage(`Ronda ${response.data.table.round}. Define tu apuesta o pasa la mano.`);
      } else {
        setGameMessage("Esperando jugadores...");
      }
    } else {
      setPendingJoinTableId(null);
      alert(`Error al unirse a la mesa: ${response.error}`);
    }
  };

  const handlePlayRound = async (bet: number) => {
    const maxBet = getMaxBet();
    const dynamicMinimumBet = 1;

    if (gameState.roundResolved) {
      setGameMessage("Espera a que todos los jugadores terminen.");
      return;
    }

    if (!isYourTurn) {
      setGameMessage("No es tu turno.");
      return;
    }

    if (bet !== 0 && bet < dynamicMinimumBet) {
      if (dynamicMinimumBet > 0) {
        setGameMessage(`La apuesta minima disponible ahora es ${formatMoney(dynamicMinimumBet)}, o usa Pasar.`);
      } else {
        setGameMessage("No queda pozo disponible para apostar. Usa Pasar.");
      }
      return;
    }

    if (bet > gameState.pot) {
      setGameMessage(`No puedes apostar mas que el pozo disponible (${formatMoney(gameState.pot)}).`);
      return;
    }

    setIsProcessingBet(true);
    console.log(`Making bet: tableId=${currentTableId}, bet=${bet}`);
    
    // Optimistic update: show processing state immediately
    setGameMessage(bet > 0 ? "Procesando apuesta..." : "Pasando...");
    
    const response = await realtimeGame.makeBet(currentTableId, userData.id, bet);
    console.log(`Bet response:`, response);
    setIsProcessingBet(false);

    if (response.data?.table) {
      // Immediately apply the server response to show the card
      applyRealtimeTable(response.data.table);
      setGameMessage("Apuesta enviada y procesada");
    } else if (response.error) {
      alert(`Error al procesar apuesta: ${response.error}`);
    } else {
      setGameMessage("Error: Respuesta del servidor incompleta");
      console.error("Invalid response:", response);
    }
  };

  const handlePass = async () => {
    await handlePlayRound(0);
  };

  const handleNextRound = async () => {
    if (!gameState.roundResolved) {
      return;
    }

    const response = await realtimeGame.nextRound(currentTableId);

    if (response.data) {
      setGameMessage(`Iniciando ronda ${response.data.table.round}...`);
    } else {
      alert(`Error al iniciar siguiente ronda: ${response.error}`);
    }
  };

  const handleRebuy = async () => {
    const response = await realtimeGame.rebuy(currentTableId, userData.id);

    if (response.data) {
      setShowRebuyModal(false);
      await refreshWallet(userData.id, userData.email);
      setGameMessage("Recarga exitosa. Continúa jugando.");
    } else {
      if (response.error === "Insufficient wallet balance") {
        alert("No tienes suficiente saldo en tu wallet para recargar. Debes cargar dinero primero.");
        setShowRebuyModal(false);
        await handleCloseTable();
      } else {
        alert(`Error al recargar: ${response.error}`);
      }
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
    const response = await realtimeGame.nextRound(currentTableId);

    if (response.data) {
      setShowPotModal(false);
      setGameMessage(`Se recargo el pozo con ${formatMoney(recharge)} por jugador.`);
    } else {
      alert(`Error al continuar: ${response.error}`);
    }
  };

  const handleCloseTable = async () => {
    const playerInTable = gameState.players.find((player) => player.id === userData.id);
    const refundAmount = Math.max(0, Math.floor(playerInTable?.balance ?? 0));

    if (currentTableId) {
      const leaveResponse = await realtimeGame.leaveTable(currentTableId, userData.id);
      if (leaveResponse.error) {
        alert(`Error al salir de la mesa: ${leaveResponse.error}`);
        return;
      }
    }

    if (refundAmount > 0) {
      const refundResponse = await api.recordWalletMovement({
        userId: userData.id,
        email: userData.email,
        amount: refundAmount,
        direction: "credit",
        kind: "adjustment",
        description: "Devolucion de saldo restante al salir de la mesa",
      });

      if (refundResponse.data) {
        applyWalletSummary(refundResponse.data);
      } else {
        await refreshWallet(userData.id, userData.email);
      }
    }

    setShowPotModal(false);
    setShowRebuyModal(false);
    setCurrentTableId("");
    setGameState({
      mode: "pvp",
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

  const getMaxBet = (): number => {
    const you = gameState.players.find((player) => player.id === userData.id);
    return you ? Math.max(0, Math.min(Math.floor(you.balance), Math.floor(gameState.pot))) : 0;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1b120a] text-[#F5DEB3]">
        Cargando sesion...
      </div>
    );
  }

  if (currentView === "login") {
    return (
      <Login
        onLogin={handleLogin}
        onRegister={handleRegister}
        isLoading={authSubmitting}
        errorMessage={authError}
      />
    );
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
        onNavigateToIntManager={() => handleNavigate("admin-int")}
      />
    );
  }

  if (currentView === "admin-int" && isAdmin) {
    return (
      <AdminIntManager
        users={adminUsers}
        onBack={handleBackToHome}
        onRefresh={refreshAdminUsers}
        onUpdateBalance={handleUpdateUserBalance}
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
    const pendingJoinTable = tables.find((table) => table.id === pendingJoinTableId) ?? null;

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
        <JoinTableModal
          isOpen={Boolean(pendingJoinTable)}
          tableName={pendingJoinTable?.name ?? ""}
          buyIn={pendingJoinTable?.buyIn ?? 0}
          userBalance={userData.balance}
          onConfirm={handleConfirmJoinTable}
          onClose={() => setPendingJoinTableId(null)}
        />
      </>
    );
  }

  if (currentView === "game") {
    const handleGameBack = () => {
      const confirmed = window.confirm("Estas seguro de que quieres abandonar la mesa?");
      if (confirmed) {
        handleCloseTable();
      }
    };

    return (
      <div className="h-screen bg-[radial-gradient(circle_at_10%_10%,#1a2d22_0%,transparent_30%),radial-gradient(circle_at_90%_90%,#193126_0%,transparent_35%),#0a0f0d] text-white overflow-hidden sm:min-h-screen sm:overflow-auto">
        <main className="w-full max-w-none mx-auto h-full sm:h-auto sm:max-w-[980px] sm:p-4">
          <button
            onClick={handleGameBack}
            className="mb-3 sm:mb-4 ml-2 mt-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-[#654321] text-[#F5DEB3] border-2 border-[#D4AF37] rounded hover:bg-[#7d5a2e] transition-colors hidden sm:inline-flex"
          >
            Volver
          </button>
          <GameTable
            gameState={gameState}
            currentUserId={userData.id}
            timeLeftSeconds={timeLeftSeconds}
            maxBet={getMaxBet()}
            isYourTurn={isYourTurn}
            onPlayRound={handlePlayRound}
            onPass={handlePass}
            onBack={handleGameBack}
            message={gameMessage}
            isProcessingBet={isProcessingBet}
          />
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
          rebuyDeadline={gameState.players.find((p) => p.id === userData.id)?.rebuyDeadline}
          onRebuy={handleRebuy}
          onLeave={handleCloseTable}
        />
      </div>
    );
  }

  return null;
}

export default App;
