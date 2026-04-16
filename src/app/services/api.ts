import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from "../../lib/supabase";
import {
  STARTING_BALANCE,
  type AdminWithdrawalItem,
  createEmptyWalletSummary,
  type CreateDepositCheckoutPayload,
  type CreateDepositCheckoutResponse,
  type ReconcileDepositPayload,
  type ReconcileDepositResponse,
  type CreateWithdrawalPayload,
  type RecordWalletMovementPayload,
  type UpdateWithdrawalStatusPayload,
  type WalletSummary,
  type WalletTransaction,
  type WithdrawalRequest,
} from "../types/wallet";

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  `https://${projectId}.supabase.co`;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  publicAnonKey;
const API_URL = `${supabaseUrl}/functions/v1/server`;
const LOCAL_TABLES_KEY = "intermedio_local_tables";
const LOCAL_WALLETS_KEY = "intermedio_wallets";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface TableInfo {
  id: string;
  name: string;
  code: string;
  buyIn: number;
  maxPlayers: number;
  currentPlayers: number;
  createdAt: number;
}

export interface Card {
  suit: string;
  value: number;
  displayValue: string;
}

export interface Player {
  id: string;
  name: string;
  photoUrl: string;
  isAI: boolean;
  balance: number;
  bet: number;
  cards: Card[];
  thirdCard: Card | null;
  result: string;
  connected: boolean;
  lastSeen: number;
}

export interface GameTable {
  id: string;
  name: string;
  code: string;
  buyIn: number;
  maxPlayers: number;
  currentPlayers: number;
  pot: number;
  deck: Card[];
  round: number;
  roundResolved: boolean;
  players: Player[];
  currentTurn: number;
  turnStartedAt: number;
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  lastActivity: number;
}

const TURN_DURATION_MS = 15000;

const isBrowser = typeof window !== "undefined";
const walletStorage = {
  read(): Record<string, WalletSummary> {
    if (!isBrowser) return {};

    const raw = window.localStorage.getItem(LOCAL_WALLETS_KEY);
    if (!raw) return {};

    try {
      return JSON.parse(raw) as Record<string, WalletSummary>;
    } catch (error) {
      console.error("Error reading local wallets:", error);
      return {};
    }
  },

  write(wallets: Record<string, WalletSummary>): void {
    if (!isBrowser) return;
    window.localStorage.setItem(LOCAL_WALLETS_KEY, JSON.stringify(wallets));
  },

  get(userId: string, email: string): WalletSummary {
    const wallets = walletStorage.read();
    const wallet = wallets[userId];

    if (wallet) {
      return wallet;
    }

    const created = createEmptyWalletSummary(userId, email);
    wallets[userId] = created;
    walletStorage.write(wallets);
    return created;
  },

  save(summary: WalletSummary): WalletSummary {
    const wallets = walletStorage.read();
    wallets[summary.userId] = {
      ...summary,
      updatedAt: Date.now(),
    };
    walletStorage.write(wallets);
    return wallets[summary.userId];
  },
};

const sortTransactions = (transactions: WalletTransaction[]): WalletTransaction[] =>
  [...transactions].sort((left, right) => right.createdAt - left.createdAt);

const sortWithdrawals = (withdrawals: WithdrawalRequest[]): WithdrawalRequest[] =>
  [...withdrawals].sort((left, right) => right.requestedAt - left.requestedAt);

const createDeck = (): Card[] => {
  const suits = ["oros", "copas", "espadas", "bastos"];
  const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        suit,
        value,
        displayValue: value === 1 ? "A" : value === 10 ? "S" : value === 11 ? "C" : value === 12 ? "R" : value.toString(),
      });
    }
  }

  return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const nextDeck = [...deck];
  for (let i = nextDeck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [nextDeck[i], nextDeck[j]] = [nextDeck[j], nextDeck[i]];
  }
  return nextDeck;
};

const drawCard = (deck: Card[]): [Card, Card[]] => {
  const sourceDeck = deck.length > 0 ? deck : shuffleDeck(createDeck());
  return [sourceDeck[sourceDeck.length - 1], sourceDeck.slice(0, -1)];
};

const evaluateHand = (card1: Card, card2: Card, thirdCard: Card): boolean => {
  const min = Math.min(card1.value, card2.value);
  const max = Math.max(card1.value, card2.value);
  return thirdCard.value > min && thirdCard.value < max;
};

const getNextPendingTurn = (table: GameTable, startIndex: number): number => {
  for (let offset = 1; offset <= table.players.length; offset += 1) {
    const candidate = (startIndex + offset) % table.players.length;
    if (table.players[candidate].bet < 0) {
      return candidate;
    }
  }
  return -1;
};

const resolveTurnTimeout = (table: GameTable): GameTable => {
  if (typeof table.currentTurn !== "number") {
    table.currentTurn = 0;
  }
  if (!table.turnStartedAt) {
    table.turnStartedAt = Date.now();
  }

  if (
    table.status !== "playing" ||
    table.roundResolved ||
    table.players.length === 0 ||
    Date.now() - table.turnStartedAt < TURN_DURATION_MS
  ) {
    return table;
  }

  const currentPlayer = table.players[table.currentTurn];
  if (!currentPlayer || currentPlayer.bet >= 0) {
    return table;
  }

  currentPlayer.bet = 0;
  currentPlayer.thirdCard = null;
  currentPlayer.result = "Pasa por tiempo";

  const nextTurn = getNextPendingTurn(table, table.currentTurn);
  if (nextTurn === -1) {
    table.roundResolved = true;
  } else {
    table.currentTurn = nextTurn;
    table.turnStartedAt = Date.now();
  }

  table.lastActivity = Date.now();
  return table;
};

const randomTableCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const readLocalTables = (): GameTable[] => {
  if (!isBrowser) return [];

  const raw = window.localStorage.getItem(LOCAL_TABLES_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as GameTable[];
  } catch (error) {
    console.error("Error reading local tables:", error);
    return [];
  }
};

const writeLocalTables = (tables: GameTable[]): void => {
  if (!isBrowser) return;
  window.localStorage.setItem(LOCAL_TABLES_KEY, JSON.stringify(tables));
};

const withLocalFallback = async <T>(request: () => Promise<ApiResponse<T>>, fallback: () => ApiResponse<T> | Promise<ApiResponse<T>>): Promise<ApiResponse<T>> => {
  const response = await request();
  if (response.data) {
    return response;
  }

  console.warn("Supabase multiplayer backend unavailable, using local fallback:", response.error);
  return fallback();
};

const localApi = {
  getTables(): ApiResponse<{ tables: TableInfo[] }> {
    const tables = readLocalTables()
      .filter((table) => table.status === "waiting" && table.currentPlayers < table.maxPlayers)
      .map((table) => ({
        id: table.id,
        name: table.name,
        code: table.code,
        buyIn: table.buyIn,
        maxPlayers: table.maxPlayers,
        currentPlayers: table.currentPlayers,
        createdAt: table.createdAt,
      }));

    return { data: { tables } };
  },

  createTable(
    tableName: string,
    buyIn: number,
    maxPlayers: number,
    userId: string,
    userName: string,
    userPhoto?: string
  ): ApiResponse<{ table: GameTable }> {
    if (!tableName || !buyIn || !userId || !userName) {
      return { error: "Missing required fields" };
    }

    const tables = readLocalTables();
    const tableId = `table:${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const table: GameTable = {
      id: tableId,
      name: tableName,
      code: randomTableCode(),
      buyIn,
      maxPlayers,
      currentPlayers: 1,
      pot: 0,
      deck: shuffleDeck(createDeck()),
      round: 0,
      roundResolved: false,
      players: [
        {
          id: userId,
          name: userName,
          photoUrl: userPhoto || "",
          isAI: false,
          balance: buyIn,
          bet: -1,
          cards: [],
          thirdCard: null,
          result: "",
          connected: true,
          lastSeen: Date.now(),
        },
      ],
      currentTurn: 0,
      turnStartedAt: Date.now(),
      status: "waiting",
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    tables.push(table);
    writeLocalTables(tables);
    return { data: { table } };
  },

  joinTable(
    tableId: string,
    userId: string,
    userName: string,
    userPhoto?: string
  ): ApiResponse<{ table: GameTable }> {
    const cleanTableId = tableId.replace("table:", "");
    const tables = readLocalTables();
    const table = tables.find((item) => item.id.replace("table:", "") === cleanTableId);

    if (!table) {
      return { error: "Table not found" };
    }

    if (table.currentPlayers >= table.maxPlayers) {
      return { error: "Table is full" };
    }

    if (table.players.some((player) => player.id === userId)) {
      return { error: "Already in table" };
    }

    table.players.push({
      id: userId,
      name: userName,
      photoUrl: userPhoto || "",
      isAI: false,
      balance: table.buyIn,
      bet: -1,
      cards: [],
      thirdCard: null,
      result: "",
      connected: true,
      lastSeen: Date.now(),
    });
    table.currentPlayers = table.players.length;
    table.lastActivity = Date.now();

    if (table.currentPlayers === table.maxPlayers) {
      table.status = "playing";
      table.round = 1;
      table.pot = table.buyIn * table.maxPlayers;
      table.currentTurn = 0;
      table.turnStartedAt = Date.now();

      let deck = table.deck;
      table.players.forEach((player) => {
        const [card1, deck1] = drawCard(deck);
        const [card2, deck2] = drawCard(deck1);
        player.cards = [card1, card2];
        player.thirdCard = null;
        player.bet = -1;
        player.result = "";
        deck = deck2;
      });
      table.deck = deck;
    }

    writeLocalTables(tables);
    return { data: { table } };
  },

  getTable(tableId: string): ApiResponse<{ table: GameTable }> {
    const cleanTableId = tableId.replace("table:", "");
    const tables = readLocalTables();
    const table = tables.find((item) => item.id.replace("table:", "") === cleanTableId);
    if (table) {
      resolveTurnTimeout(table);
      writeLocalTables(tables);
    }
    return table ? { data: { table } } : { error: "Table not found" };
  },

  makeBet(tableId: string, userId: string, betAmount: number): ApiResponse<{ table: GameTable }> {
    const cleanTableId = tableId.replace("table:", "");
    const tables = readLocalTables();
    const table = tables.find((item) => item.id.replace("table:", "") === cleanTableId);

    if (!table) {
      return { error: "Table not found" };
    }

    resolveTurnTimeout(table);

    const player = table.players.find((item) => item.id === userId);
    if (!player) {
      return { error: "Player not in table" };
    }

    const playerIndex = table.players.findIndex((item) => item.id === userId);
    if (playerIndex !== table.currentTurn) {
      return { error: "It is not this player's turn" };
    }

    if (betAmount < 0 || betAmount > player.balance) {
      return { error: "Invalid bet amount" };
    }

    player.bet = betAmount;

    if (betAmount > 0) {
      const [thirdCard, deck] = drawCard(table.deck);
      player.thirdCard = thirdCard;
      table.deck = deck;

      const won = evaluateHand(player.cards[0], player.cards[1], thirdCard);
      if (won) {
        // Player wins: gets bet back + same amount from pot
        const prize = Math.min(table.pot, betAmount);
        player.balance += betAmount + prize; // Return bet + win from pot
        table.pot -= prize;
        player.result = `Gana $${prize}`;
      } else {
        // Player loses: loses bet to pot
        player.balance -= betAmount;
        table.pot += betAmount;
        player.result = `Pierde $${betAmount}`;
      }
    } else {
      player.thirdCard = null;
      player.result = "Pasa";
    }

    const nextTurn = getNextPendingTurn(table, table.currentTurn);
    if (nextTurn === -1) {
      table.roundResolved = true;
    } else {
      table.currentTurn = nextTurn;
      table.turnStartedAt = Date.now();
    }
    table.lastActivity = Date.now();
    writeLocalTables(tables);

    return { data: { table } };
  },

  nextRound(tableId: string): ApiResponse<{ table: GameTable }> {
    const cleanTableId = tableId.replace("table:", "");
    const tables = readLocalTables();
    const table = tables.find((item) => item.id.replace("table:", "") === cleanTableId);

    if (!table) {
      return { error: "Table not found" };
    }

    if (!table.roundResolved) {
      return { error: "Round not resolved yet" };
    }

    if (table.pot <= 0) {
      const recharge = table.buyIn;
      table.players = table.players.map((player) => ({
        ...player,
        balance: player.balance - recharge,
      }));
      table.pot = recharge * table.players.length;
    }

    table.round += 1;
    table.roundResolved = false;
    table.currentTurn = 0;
    table.turnStartedAt = Date.now();

    let deck = table.deck.length < table.players.length * 3 ? shuffleDeck(createDeck()) : table.deck;
    table.players.forEach((player) => {
      const [card1, deck1] = drawCard(deck);
      const [card2, deck2] = drawCard(deck1);
      player.cards = [card1, card2];
      player.thirdCard = null;
      player.bet = -1;
      player.result = "";
      deck = deck2;
    });

    table.deck = deck;
    table.lastActivity = Date.now();
    writeLocalTables(tables);

    return { data: { table } };
  },

  leaveTable(tableId: string, userId: string): ApiResponse<{ success: boolean }> {
    const cleanTableId = tableId.replace("table:", "");
    const nextTables = readLocalTables()
      .map((table) => {
        if (table.id.replace("table:", "") !== cleanTableId) {
          return table;
        }

        const players = table.players.filter((player) => player.id !== userId);
        return {
          ...table,
          players,
          currentPlayers: players.length,
          lastActivity: Date.now(),
        };
      })
      .filter((table) => table.currentPlayers > 0);

    writeLocalTables(nextTables);
    return { data: { success: true } };
  },

  heartbeat(tableId: string, userId: string): ApiResponse<{ success: boolean }> {
    const cleanTableId = tableId.replace("table:", "");
    const tables = readLocalTables();
    const table = tables.find((item) => item.id.replace("table:", "") === cleanTableId);

    if (!table) {
      return { error: "Table not found" };
    }

    resolveTurnTimeout(table);

    const player = table.players.find((item) => item.id === userId);
    if (player) {
      player.lastSeen = Date.now();
      player.connected = true;
      table.lastActivity = Date.now();
      writeLocalTables(tables);
    }

    return { data: { success: true } };
  },

  getWalletSummary(userId: string, email: string): ApiResponse<WalletSummary> {
    return { data: walletStorage.get(userId, email) };
  },

  createWithdrawal(payload: CreateWithdrawalPayload): ApiResponse<WalletSummary> {
    const wallet = walletStorage.get(payload.userId, payload.email);

    if (payload.amount <= 0) {
      return { error: "Withdrawal amount must be greater than zero" };
    }

    if (payload.amount > wallet.balance) {
      return { error: "Insufficient balance" };
    }

    const withdrawal: WithdrawalRequest = {
      id: `withdrawal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: payload.amount,
      method: payload.method,
      status: "pending",
      requestedAt: Date.now(),
      fullName: payload.fullName,
      dni: payload.dni,
      email: payload.email,
      accountHolder: payload.accountHolder,
      accountDestination: payload.accountDestination,
      notes: payload.notes,
    };

    const transaction: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind: "withdrawal",
      direction: "debit",
      amount: payload.amount,
      status: "pending",
      description: "Retiro solicitado",
      createdAt: Date.now(),
      metadata: {
        withdrawalId: withdrawal.id,
        method: payload.method,
      },
    };

    return {
      data: walletStorage.save({
        ...wallet,
        balance: wallet.balance - payload.amount,
        withdrawals: sortWithdrawals([withdrawal, ...wallet.withdrawals]),
        transactions: sortTransactions([transaction, ...wallet.transactions]),
      }),
    };
  },

  recordWalletMovement(payload: RecordWalletMovementPayload): ApiResponse<WalletSummary> {
    const wallet = walletStorage.get(payload.userId, payload.email);
    const nextBalance =
      payload.direction === "credit"
        ? wallet.balance + payload.amount
        : wallet.balance - payload.amount;

    if (payload.amount <= 0) {
      return { error: "Amount must be greater than zero" };
    }

    if (payload.direction === "debit" && nextBalance < 0) {
      return { error: "Insufficient balance" };
    }

    const transaction: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind: payload.kind,
      direction: payload.direction,
      amount: payload.amount,
      status: "approved",
      description: payload.description,
      createdAt: Date.now(),
    };

    return {
      data: walletStorage.save({
        ...wallet,
        balance: nextBalance,
        transactions: sortTransactions([transaction, ...wallet.transactions]),
      }),
    };
  },

  getAdminWithdrawals(): ApiResponse<{ withdrawals: AdminWithdrawalItem[] }> {
    const wallets = Object.values(walletStorage.read());
    const withdrawals = wallets
      .flatMap((wallet) =>
        wallet.withdrawals.map((withdrawal) => ({
          ...withdrawal,
          userId: wallet.userId,
          walletEmail: wallet.email,
          walletBalance: wallet.balance,
        }))
      )
      .sort((left, right) => right.requestedAt - left.requestedAt);

    return { data: { withdrawals } };
  },

  updateWithdrawalStatus(payload: UpdateWithdrawalStatusPayload): ApiResponse<{ withdrawals: AdminWithdrawalItem[] }> {
    const wallets = walletStorage.read();
    const entries = Object.entries(wallets);

    for (const [userId, wallet] of entries) {
      const withdrawal = wallet.withdrawals.find((item) => item.id === payload.withdrawalId);
      if (!withdrawal) {
        continue;
      }

      withdrawal.status = payload.status;
      withdrawal.reviewedAt = Date.now();
      withdrawal.rejectionReason = payload.status === "rejected" ? payload.rejectionReason : undefined;

      wallet.transactions = wallet.transactions.map((transaction) =>
        transaction.metadata?.withdrawalId === payload.withdrawalId
          ? {
              ...transaction,
              status: payload.status,
            }
          : transaction
      );

      if (payload.status === "rejected") {
        wallet.balance += withdrawal.amount;
        wallet.transactions = sortTransactions([
          {
            id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            kind: "adjustment",
            direction: "credit",
            amount: withdrawal.amount,
            status: "approved",
            description: "Reintegro por retiro rechazado",
            createdAt: Date.now(),
            metadata: {
              withdrawalId: payload.withdrawalId,
            },
          },
          ...wallet.transactions,
        ]);
      }

      wallets[userId] = {
        ...wallet,
        withdrawals: sortWithdrawals([...wallet.withdrawals]),
        transactions: sortTransactions([...wallet.transactions]),
        updatedAt: Date.now(),
      };
      walletStorage.write(wallets);
      return localApi.getAdminWithdrawals();
    }

    return { error: "Withdrawal not found" };
  },
};

async function apiCall<T>(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Request failed' };
    }

    return { data };
  } catch (error) {
    console.error('API call error:', error);
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

async function apiCallAuthenticated<T>(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const getAccessToken = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        return session.access_token;
      }

      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session?.access_token) {
        return null;
      }

      return data.session.access_token;
    };

    const doRequest = async (accessToken: string) =>
      fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { error: 'No active session' };
    }

    let response = await doRequest(accessToken);
    if (response.status === 401) {
      const refreshedToken = await getAccessToken();
      if (!refreshedToken) {
        return { error: 'Unauthorized' };
      }
      response = await doRequest(refreshedToken);
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Request failed' };
    }

    return { data };
  } catch (error) {
    console.error('Authenticated API call error:', error);
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export const api = {
  // Get all available tables
  getTables: async (): Promise<ApiResponse<{ tables: TableInfo[] }>> => {
    return withLocalFallback(() => apiCall('/tables'), () => localApi.getTables());
  },

  // Create a new table
  createTable: async (
    tableName: string,
    buyIn: number,
    maxPlayers: number,
    userId: string,
    userName: string,
    userPhoto?: string
  ): Promise<ApiResponse<{ table: GameTable }>> => {
    return withLocalFallback(
      () => apiCall('/tables', 'POST', {
        tableName,
        buyIn,
        maxPlayers,
        userId,
        userName,
        userPhoto,
      }),
      () => localApi.createTable(tableName, buyIn, maxPlayers, userId, userName, userPhoto)
    );
  },

  // Join a table
  joinTable: async (
    tableId: string,
    userId: string,
    userName: string,
    userPhoto?: string
  ): Promise<ApiResponse<{ table: GameTable }>> => {
    const cleanTableId = tableId.replace('table:', '');
    return withLocalFallback(
      () => apiCall(`/tables/${cleanTableId}/join`, 'POST', {
        userId,
        userName,
        userPhoto,
      }),
      () => localApi.joinTable(tableId, userId, userName, userPhoto)
    );
  },

  // Get table state
  getTable: async (tableId: string): Promise<ApiResponse<{ table: GameTable }>> => {
    const cleanTableId = tableId.replace('table:', '');
    return withLocalFallback(
      () => apiCall(`/tables/${cleanTableId}`),
      () => localApi.getTable(tableId)
    );
  },

  // Make a bet
  makeBet: async (
    tableId: string,
    userId: string,
    betAmount: number
  ): Promise<ApiResponse<{ table: GameTable }>> => {
    const cleanTableId = tableId.replace('table:', '');
    return withLocalFallback(
      () => apiCall(`/tables/${cleanTableId}/bet`, 'POST', {
        userId,
        betAmount,
      }),
      () => localApi.makeBet(tableId, userId, betAmount)
    );
  },

  // Start next round
  nextRound: async (tableId: string): Promise<ApiResponse<{ table: GameTable }>> => {
    const cleanTableId = tableId.replace('table:', '');
    return withLocalFallback(
      () => apiCall(`/tables/${cleanTableId}/next-round`, 'POST'),
      () => localApi.nextRound(tableId)
    );
  },

  // Leave table
  leaveTable: async (tableId: string, userId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const cleanTableId = tableId.replace('table:', '');
    return withLocalFallback(
      () => apiCall(`/tables/${cleanTableId}/leave`, 'POST', { userId }),
      () => localApi.leaveTable(tableId, userId)
    );
  },

  // Send heartbeat
  heartbeat: async (tableId: string, userId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const cleanTableId = tableId.replace('table:', '');
    return withLocalFallback(
      () => apiCall(`/tables/${cleanTableId}/heartbeat`, 'POST', { userId }),
      () => localApi.heartbeat(tableId, userId)
    );
  },

  getWalletSummary: async (userId: string, email: string): Promise<ApiResponse<WalletSummary>> => {
    return withLocalFallback(
      () => apiCallAuthenticated(`/wallet/${encodeURIComponent(userId)}?email=${encodeURIComponent(email)}`),
      () => localApi.getWalletSummary(userId, email)
    );
  },

  createDepositCheckout: async (
    payload: CreateDepositCheckoutPayload
  ): Promise<ApiResponse<CreateDepositCheckoutResponse>> => {
    return apiCallAuthenticated('/wallet/deposits/checkout-pro', 'POST', payload);
  },

  reconcileDeposit: async (
    payload: ReconcileDepositPayload
  ): Promise<ApiResponse<ReconcileDepositResponse>> => {
    return apiCallAuthenticated('/wallet/deposits/reconcile', 'POST', payload);
  },

  createWithdrawal: async (payload: CreateWithdrawalPayload): Promise<ApiResponse<WalletSummary>> => {
    return withLocalFallback(
      () => apiCallAuthenticated('/wallet/withdrawals', 'POST', payload),
      () => localApi.createWithdrawal(payload)
    );
  },

  recordWalletMovement: async (
    payload: RecordWalletMovementPayload
  ): Promise<ApiResponse<WalletSummary>> => {
    return withLocalFallback(
      () => apiCallAuthenticated('/wallet/transactions', 'POST', payload),
      () => localApi.recordWalletMovement(payload)
    );
  },

  getAdminWithdrawals: async (): Promise<ApiResponse<{ withdrawals: AdminWithdrawalItem[] }>> => {
    return withLocalFallback(
      () => apiCallAuthenticated('/wallet/admin/withdrawals'),
      () => localApi.getAdminWithdrawals()
    );
  },

  updateWithdrawalStatus: async (
    payload: UpdateWithdrawalStatusPayload
  ): Promise<ApiResponse<{ withdrawals: AdminWithdrawalItem[] }>> => {
    return withLocalFallback(
      () => apiCallAuthenticated('/wallet/admin/withdrawals/status', 'POST', payload),
      () => localApi.updateWithdrawalStatus(payload)
    );
  },

  // Admin user INT management
  getAdminUsers: async (): Promise<ApiResponse<{ users: Array<{ userId: string; email: string; balance: number }> }>> => {
    return withLocalFallback(
      () => apiCallAuthenticated('/wallet/admin/users'),
      () => {
        const wallets = Object.values(walletStorage.read());
        const users = wallets.map((wallet) => ({
          userId: wallet.userId,
          email: wallet.email,
          balance: wallet.balance,
        }));
        return { data: { users } };
      }
    );
  },

  updateUserBalance: async (userId: string, newBalance: number): Promise<ApiResponse<{ success: boolean; userId: string; balance: number }>> => {
    return withLocalFallback(
      () => apiCallAuthenticated(`/wallet/admin/users/${encodeURIComponent(userId)}/balance`, 'POST', { balance: newBalance }),
      () => {
        const wallets = walletStorage.read();
        const wallet = wallets[userId];
        if (!wallet) {
          return { error: 'User not found' };
        }
        wallet.balance = newBalance;
        wallet.updatedAt = Date.now();
        walletStorage.save(wallet);
        return { data: { success: true, userId, balance: newBalance } };
      }
    );
  },
};
