import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

interface Card {
  suit: string;
  value: number;
  displayValue: string;
}

interface Player {
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

interface GameTable {
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

type WalletTransactionKind = "deposit" | "withdrawal" | "game_buy_in" | "rebuy" | "adjustment";
type WalletDirection = "credit" | "debit";
type WalletTransactionStatus = "pending" | "approved" | "rejected";
type WithdrawalMethod = "bank_transfer" | "mercado_pago";
type WithdrawalStatus = "pending" | "approved" | "rejected";

interface WalletTransaction {
  id: string;
  kind: WalletTransactionKind;
  direction: WalletDirection;
  amount: number;
  status: WalletTransactionStatus;
  description: string;
  createdAt: number;
  metadata?: Record<string, string>;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  requestedAt: number;
  reviewedAt?: number;
  rejectionReason?: string;
  fullName: string;
  dni: string;
  email: string;
  accountHolder: string;
  accountDestination: string;
  notes?: string;
}

interface AdminWithdrawalItem extends WithdrawalRequest {
  userId: string;
  walletEmail: string;
  walletBalance: number;
}

interface WalletSummary {
  userId: string;
  email: string;
  balance: number;
  transactions: WalletTransaction[];
  withdrawals: WithdrawalRequest[];
  updatedAt: number;
}

interface DepositRecord {
  id: string;
  userId: string;
  email: string;
  amount: number;
  status: WalletTransactionStatus;
  preferenceId?: string;
  paymentId?: string;
  createdAt: number;
  approvedAt?: number;
}

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
  for (let index = nextDeck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextDeck[index], nextDeck[swapIndex]] = [nextDeck[swapIndex], nextDeck[index]];
  }
  return nextDeck;
};

const drawCard = (deck: Card[]): [Card, Card[]] => {
  if (deck.length === 0) {
    const nextDeck = shuffleDeck(createDeck());
    return [nextDeck[nextDeck.length - 1], nextDeck.slice(0, -1)];
  }
  return [deck[deck.length - 1], deck.slice(0, -1)];
};

const evaluateHand = (card1: Card, card2: Card, thirdCard: Card): boolean => {
  const min = Math.min(card1.value, card2.value);
  const max = Math.max(card1.value, card2.value);
  return thirdCard.value > min && thirdCard.value < max;
};

const randomTableCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const STARTING_BALANCE = 50000;
const TURN_DURATION_MS = 15000;

const createEmptyWallet = (userId: string, email: string): WalletSummary => ({
  userId,
  email,
  balance: STARTING_BALANCE,
  transactions: [],
  withdrawals: [],
  updatedAt: Date.now(),
});

const walletKey = (userId: string) => `wallet:${userId}`;
const depositKey = (depositId: string) => `deposit:${depositId}`;

const sortTransactions = (transactions: WalletTransaction[]) =>
  [...transactions].sort((left, right) => right.createdAt - left.createdAt);

const sortWithdrawals = (withdrawals: WithdrawalRequest[]) =>
  [...withdrawals].sort((left, right) => right.requestedAt - left.requestedAt);

const getWallet = async (userId: string, email: string): Promise<WalletSummary> => {
  const wallet = await kv.get(walletKey(userId)) as WalletSummary | null;
  if (wallet) {
    if (wallet.balance < STARTING_BALANCE) {
      wallet.balance = STARTING_BALANCE;
      wallet.updatedAt = Date.now();
      await kv.set(walletKey(userId), wallet);
    }
    if (!wallet.email && email) {
      wallet.email = email;
      wallet.updatedAt = Date.now();
      await kv.set(walletKey(userId), wallet);
    }
    return wallet;
  }

  const created = createEmptyWallet(userId, email);
  await kv.set(walletKey(userId), created);
  return created;
};

const saveWallet = async (summary: WalletSummary): Promise<WalletSummary> => {
  const nextWallet = {
    ...summary,
    transactions: sortTransactions(summary.transactions),
    withdrawals: sortWithdrawals(summary.withdrawals),
    updatedAt: Date.now(),
  };
  await kv.set(walletKey(summary.userId), nextWallet);
  return nextWallet;
};

const appendTransaction = (wallet: WalletSummary, transaction: WalletTransaction): WalletSummary => ({
  ...wallet,
  transactions: sortTransactions([transaction, ...wallet.transactions]),
});

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

const getAdminWithdrawals = async (): Promise<AdminWithdrawalItem[]> => {
  const wallets = await kv.getByPrefix("wallet:");
  return wallets
    .flatMap((wallet: WalletSummary) =>
      wallet.withdrawals.map((withdrawal) => ({
        ...withdrawal,
        userId: wallet.userId,
        walletEmail: wallet.email,
        walletBalance: wallet.balance,
      }))
    )
    .sort((left: AdminWithdrawalItem, right: AdminWithdrawalItem) => right.requestedAt - left.requestedAt);
};

const sendWithdrawalEmail = async (withdrawal: WithdrawalRequest) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("WITHDRAWAL_NOTIFICATION_TO") || "grafica.covac@hotmail.com";
  const from = Deno.env.get("WITHDRAWAL_NOTIFICATION_FROM");

  if (!resendApiKey || !from) {
    return;
  }

  const text = [
    "Nueva solicitud de retiro",
    `Monto: ${withdrawal.amount}`,
    `Metodo: ${withdrawal.method}`,
    `Nombre: ${withdrawal.fullName}`,
    `DNI: ${withdrawal.dni}`,
    `Email: ${withdrawal.email}`,
    `Titular: ${withdrawal.accountHolder}`,
    `Destino: ${withdrawal.accountDestination}`,
    `Notas: ${withdrawal.notes || "-"}`,
  ].join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Retiro pendiente de ${withdrawal.fullName || withdrawal.email}`,
      text,
    }),
  });
};

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-b530d664/health", (c) => c.json({ status: "ok" }));

app.get("/make-server-b530d664/tables", async (c) => {
  try {
    const tables = await kv.getByPrefix("table:");
    const activeTables = tables
      .filter((table: GameTable) => table.status === "waiting" && table.currentPlayers < table.maxPlayers)
      .map((table: GameTable) => ({
        id: table.id,
        name: table.name,
        code: table.code,
        buyIn: table.buyIn,
        maxPlayers: table.maxPlayers,
        currentPlayers: table.currentPlayers,
        createdAt: table.createdAt,
      }));

    return c.json({ tables: activeTables });
  } catch (error) {
    console.log("Error fetching tables:", error);
    return c.json({ error: "Failed to fetch tables" }, 500);
  }
});

app.post("/make-server-b530d664/tables", async (c) => {
  try {
    const body = await c.req.json();
    const { tableName, buyIn, maxPlayers, userId, userName, userPhoto } = body;

    if (!tableName || !buyIn || !userId || !userName) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const tableId = `table:${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const newTable: GameTable = {
      id: tableId,
      name: tableName,
      code: randomTableCode(),
      buyIn,
      maxPlayers: maxPlayers === 6 ? 6 : 3,
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

    await kv.set(tableId, newTable);
    return c.json({ table: newTable });
  } catch (error) {
    console.log("Error creating table:", error);
    return c.json({ error: "Failed to create table" }, 500);
  }
});

app.post("/make-server-b530d664/tables/:tableId/join", async (c) => {
  try {
    const tableId = `table:${c.req.param("tableId")}`;
    const body = await c.req.json();
    const { userId, userName, userPhoto } = body;

    if (!userId || !userName) {
      return c.json({ error: "Missing user info" }, 400);
    }

    const table = await kv.get(tableId) as GameTable | null;
    if (!table) {
      return c.json({ error: "Table not found" }, 404);
    }

    if (table.currentPlayers >= table.maxPlayers) {
      return c.json({ error: "Table is full" }, 400);
    }

    if (table.players.some((player) => player.id === userId)) {
      return c.json({ error: "Already in table" }, 400);
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

      let nextDeck = table.deck;
      for (const player of table.players) {
        const [firstCard, deckAfterFirst] = drawCard(nextDeck);
        const [secondCard, deckAfterSecond] = drawCard(deckAfterFirst);
        player.cards = [firstCard, secondCard];
        player.thirdCard = null;
        player.bet = -1;
        player.result = "";
        nextDeck = deckAfterSecond;
      }
      table.deck = nextDeck;
    }

    await kv.set(tableId, table);
    return c.json({ table });
  } catch (error) {
    console.log("Error joining table:", error);
    return c.json({ error: "Failed to join table" }, 500);
  }
});

app.get("/make-server-b530d664/tables/:tableId", async (c) => {
  try {
    const tableId = `table:${c.req.param("tableId")}`;
    const table = await kv.get(tableId) as GameTable | null;

    if (!table) {
      return c.json({ error: "Table not found" }, 404);
    }

    resolveTurnTimeout(table);
    await kv.set(tableId, table);

    return c.json({ table });
  } catch (error) {
    console.log("Error fetching table:", error);
    return c.json({ error: "Failed to fetch table" }, 500);
  }
});

app.post("/make-server-b530d664/tables/:tableId/bet", async (c) => {
  try {
    const tableId = `table:${c.req.param("tableId")}`;
    const body = await c.req.json();
    const { userId, betAmount } = body;

    const table = await kv.get(tableId) as GameTable | null;
    if (!table) {
      return c.json({ error: "Table not found" }, 404);
    }

    resolveTurnTimeout(table);

    const player = table.players.find((item) => item.id === userId);
    if (!player) {
      return c.json({ error: "Player not in table" }, 404);
    }

    const playerIndex = table.players.findIndex((item) => item.id === userId);
    if (playerIndex !== table.currentTurn) {
      return c.json({ error: "It is not this player's turn" }, 400);
    }

    if (betAmount < 0 || betAmount > player.balance) {
      return c.json({ error: "Invalid bet amount" }, 400);
    }

    player.bet = betAmount;

    if (betAmount > 0) {
      const [thirdCard, nextDeck] = drawCard(table.deck);
      player.thirdCard = thirdCard;
      table.deck = nextDeck;

      const won = evaluateHand(player.cards[0], player.cards[1], thirdCard);
      if (won) {
        const prize = Math.min(table.pot, betAmount);
        player.balance += prize;
        table.pot -= prize;
        player.result = `Gana $${prize}`;
      } else {
        player.balance -= betAmount;
        table.pot += betAmount;
        player.result = `Pierde $${betAmount}`;
      }
    } else {
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
    await kv.set(tableId, table);

    return c.json({ table });
  } catch (error) {
    console.log("Error processing bet:", error);
    return c.json({ error: "Failed to process bet" }, 500);
  }
});

app.post("/make-server-b530d664/tables/:tableId/next-round", async (c) => {
  try {
    const tableId = `table:${c.req.param("tableId")}`;
    const table = await kv.get(tableId) as GameTable | null;

    if (!table) {
      return c.json({ error: "Table not found" }, 404);
    }

    if (!table.roundResolved) {
      return c.json({ error: "Round not resolved yet" }, 400);
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

    let nextDeck = table.deck.length < table.players.length * 3 ? shuffleDeck(createDeck()) : table.deck;
    for (const player of table.players) {
      const [firstCard, deckAfterFirst] = drawCard(nextDeck);
      const [secondCard, deckAfterSecond] = drawCard(deckAfterFirst);
      player.cards = [firstCard, secondCard];
      player.thirdCard = null;
      player.bet = -1;
      player.result = "";
      nextDeck = deckAfterSecond;
    }

    table.deck = nextDeck;
    table.lastActivity = Date.now();
    await kv.set(tableId, table);

    return c.json({ table });
  } catch (error) {
    console.log("Error starting next round:", error);
    return c.json({ error: "Failed to start next round" }, 500);
  }
});

app.post("/make-server-b530d664/tables/:tableId/leave", async (c) => {
  try {
    const tableId = `table:${c.req.param("tableId")}`;
    const body = await c.req.json();
    const { userId } = body;

    const table = await kv.get(tableId) as GameTable | null;
    if (!table) {
      return c.json({ error: "Table not found" }, 404);
    }

    table.players = table.players.filter((player) => player.id !== userId);
    table.currentPlayers = table.players.length;

    if (table.players.length === 0) {
      await kv.del(tableId);
    } else {
      table.lastActivity = Date.now();
      await kv.set(tableId, table);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Error leaving table:", error);
    return c.json({ error: "Failed to leave table" }, 500);
  }
});

app.post("/make-server-b530d664/tables/:tableId/heartbeat", async (c) => {
  try {
    const tableId = `table:${c.req.param("tableId")}`;
    const body = await c.req.json();
    const { userId } = body;

    const table = await kv.get(tableId) as GameTable | null;
    if (!table) {
      return c.json({ error: "Table not found" }, 404);
    }

    const player = table.players.find((item) => item.id === userId);
    if (player) {
      player.lastSeen = Date.now();
      player.connected = true;
      await kv.set(tableId, table);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Error processing heartbeat:", error);
    return c.json({ error: "Failed to process heartbeat" }, 500);
  }
});

app.get("/make-server-b530d664/wallet/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const email = c.req.query("email") || "";
    const wallet = await getWallet(userId, email);
    return c.json(wallet);
  } catch (error) {
    console.log("Error fetching wallet:", error);
    return c.json({ error: "Failed to fetch wallet" }, 500);
  }
});

app.post("/make-server-b530d664/wallet/transactions", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, email, amount, direction, kind, description } = body;

    if (!userId || !email || !amount || !direction || !kind || !description) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const wallet = await getWallet(userId, email);
    const nextBalance = direction === "credit" ? wallet.balance + amount : wallet.balance - amount;

    if (direction === "debit" && nextBalance < 0) {
      return c.json({ error: "Insufficient balance" }, 400);
    }

    const nextWallet = appendTransaction(
      {
        ...wallet,
        balance: nextBalance,
      },
      {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind,
        direction,
        amount,
        status: "approved",
        description,
        createdAt: Date.now(),
      }
    );

    return c.json(await saveWallet(nextWallet));
  } catch (error) {
    console.log("Error recording wallet movement:", error);
    return c.json({ error: "Failed to record wallet movement" }, 500);
  }
});

app.post("/make-server-b530d664/wallet/withdrawals", async (c) => {
  try {
    const body = await c.req.json();
    const {
      userId,
      email,
      fullName,
      dni,
      amount,
      method,
      accountHolder,
      accountDestination,
      notes,
    } = body;

    if (!userId || !email || !fullName || !dni || !amount || !method || !accountHolder || !accountDestination) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const wallet = await getWallet(userId, email);
    if (amount > wallet.balance) {
      return c.json({ error: "Insufficient balance" }, 400);
    }

    const withdrawal: WithdrawalRequest = {
      id: `withdrawal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount,
      method,
      status: "pending",
      requestedAt: Date.now(),
      fullName,
      dni,
      email,
      accountHolder,
      accountDestination,
      notes,
    };

    const nextWallet = appendTransaction(
      {
        ...wallet,
        balance: wallet.balance - amount,
        withdrawals: sortWithdrawals([withdrawal, ...wallet.withdrawals]),
      },
      {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: "withdrawal",
        direction: "debit",
        amount,
        status: "pending",
        description: "Retiro solicitado",
        createdAt: Date.now(),
        metadata: {
          withdrawalId: withdrawal.id,
          method,
        },
      }
    );

    try {
      await sendWithdrawalEmail(withdrawal);
    } catch (error) {
      console.log("Withdrawal email skipped:", error);
    }

    return c.json(await saveWallet(nextWallet));
  } catch (error) {
    console.log("Error creating withdrawal:", error);
    return c.json({ error: "Failed to create withdrawal" }, 500);
  }
});

app.get("/make-server-b530d664/wallet/admin/withdrawals", async (c) => {
  try {
    return c.json({ withdrawals: await getAdminWithdrawals() });
  } catch (error) {
    console.log("Error fetching admin withdrawals:", error);
    return c.json({ error: "Failed to fetch admin withdrawals" }, 500);
  }
});

app.post("/make-server-b530d664/wallet/admin/withdrawals/status", async (c) => {
  try {
    const body = await c.req.json();
    const { withdrawalId, status, rejectionReason } = body;

    if (!withdrawalId || !status || (status !== "approved" && status !== "rejected")) {
      return c.json({ error: "Invalid withdrawal update" }, 400);
    }

    const wallets = await kv.getByPrefix("wallet:");
    for (const wallet of wallets as WalletSummary[]) {
      const withdrawal = wallet.withdrawals.find((item) => item.id === withdrawalId);
      if (!withdrawal) {
        continue;
      }

      withdrawal.status = status;
      withdrawal.reviewedAt = Date.now();
      withdrawal.rejectionReason = status === "rejected" ? rejectionReason : undefined;

      wallet.transactions = wallet.transactions.map((transaction) =>
        transaction.metadata?.withdrawalId === withdrawalId
          ? {
              ...transaction,
              status,
            }
          : transaction
      );

      if (status === "rejected") {
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
              withdrawalId,
            },
          },
          ...wallet.transactions,
        ]);
      }

      await saveWallet(wallet);
      return c.json({ withdrawals: await getAdminWithdrawals() });
    }

    return c.json({ error: "Withdrawal not found" }, 404);
  } catch (error) {
    console.log("Error updating withdrawal status:", error);
    return c.json({ error: "Failed to update withdrawal status" }, 500);
  }
});

app.post("/make-server-b530d664/wallet/deposits/checkout-pro", async (c) => {
  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return c.json({ error: "Mercado Pago access token is not configured" }, 500);
    }

    const body = await c.req.json();
    const { userId, email, fullName, amount, successUrl, errorUrl, pendingUrl } = body;

    if (!userId || !email || !amount || !successUrl || !errorUrl || !pendingUrl) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const wallet = await getWallet(userId, email);
    const depositId = `deposit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const notificationUrl = `${new URL(c.req.url).origin}/functions/v1/make-server-b530d664/wallet/mercadopago/webhook`;

    const pendingWallet = appendTransaction(wallet, {
      id: depositId,
      kind: "deposit",
      direction: "credit",
      amount,
      status: "pending",
      description: "Carga iniciada en Mercado Pago",
      createdAt: Date.now(),
      metadata: {
        depositId,
      },
    });
    await saveWallet(pendingWallet);

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": depositId,
      },
      body: JSON.stringify({
        items: [
          {
            id: depositId,
            title: `Carga de saldo - ${fullName || email}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: Number(amount),
          },
        ],
        payer: {
          email,
          name: fullName || email,
        },
        external_reference: depositId,
        back_urls: {
          success: successUrl,
          failure: errorUrl,
          pending: pendingUrl,
        },
        notification_url: notificationUrl,
        auto_return: "approved",
      }),
    });

    const mpData = await mpResponse.json();
    if (!mpResponse.ok) {
      return c.json({ error: mpData.message || "Failed to create Mercado Pago preference" }, 500);
    }

    const depositRecord: DepositRecord = {
      id: depositId,
      userId,
      email,
      amount,
      status: "pending",
      preferenceId: mpData.id,
      createdAt: Date.now(),
    };
    await kv.set(depositKey(depositId), depositRecord);

    return c.json({
      checkoutUrl: mpData.init_point || mpData.sandbox_init_point,
      preferenceId: mpData.id,
      transactionId: depositId,
    });
  } catch (error) {
    console.log("Error creating Mercado Pago checkout:", error);
    return c.json({ error: "Failed to create checkout" }, 500);
  }
});

app.post("/make-server-b530d664/wallet/mercadopago/webhook", async (c) => {
  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return c.json({ received: true });
    }

    const body = await c.req.json().catch(() => ({}));
    const paymentId =
      body?.data?.id ||
      body?.resource?.split("/")?.pop() ||
      c.req.query("data.id") ||
      c.req.query("id");
    const eventType = body?.type || body?.topic || c.req.query("type") || c.req.query("topic");

    if (!paymentId || (eventType && eventType !== "payment")) {
      return c.json({ received: true });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) {
      console.log("Mercado Pago payment lookup failed:", payment);
      return c.json({ received: true });
    }

    const depositId = payment.external_reference as string | undefined;
    if (!depositId) {
      return c.json({ received: true });
    }

    const deposit = await kv.get(depositKey(depositId)) as DepositRecord | null;
    if (!deposit || deposit.status === "approved") {
      return c.json({ received: true });
    }

    if (payment.status !== "approved") {
      return c.json({ received: true });
    }

    const wallet = await getWallet(deposit.userId, deposit.email);
    const alreadyRecorded = wallet.transactions.some(
      (transaction) => transaction.metadata?.depositId === depositId && transaction.status === "approved"
    );

    if (!alreadyRecorded) {
      const nextWallet = {
        ...wallet,
        balance: wallet.balance + deposit.amount,
        transactions: sortTransactions(
          wallet.transactions.map((transaction) =>
            transaction.id === depositId
              ? {
                  ...transaction,
                  status: "approved" as const,
                  description: "Carga acreditada por webhook",
                  metadata: {
                    ...(transaction.metadata || {}),
                    depositId,
                    paymentId: String(paymentId),
                  },
                }
              : transaction
          )
        ),
      };

      await saveWallet(nextWallet);
    }

    await kv.set(depositKey(depositId), {
      ...deposit,
      status: "approved",
      paymentId: String(paymentId),
      approvedAt: Date.now(),
    });

    return c.json({ received: true });
  } catch (error) {
    console.log("Error processing Mercado Pago webhook:", error);
    return c.json({ received: true });
  }
});

Deno.serve(app.fetch);
