import { Hono, type Context } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import { registerRealtimeRoomRoutes } from "./realtime_rooms.ts";

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

interface MercadoPagoPayment {
  id?: string | number;
  status?: string;
  external_reference?: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
}

interface UserProfileRecord {
  first_name?: string | null;
  last_name?: string | null;
  dni?: string | null;
  email?: string | null;
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

const STARTING_BALANCE = 10000;
const TURN_DURATION_MS = 30000;
const DEFAULT_ADMIN_EMAIL = "covacapp1@gmail.com";
const HIGH_VALUE_WITHDRAWAL_INT = 100000;

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

const approveDepositFromPayment = async (payment: MercadoPagoPayment) => {
  const depositId = payment.external_reference as string | undefined;
  if (!depositId) {
    return { approved: false, reason: "missing_external_reference" };
  }

  const deposit = await kv.get(depositKey(depositId)) as DepositRecord | null;
  if (!deposit) {
    return { approved: false, reason: "deposit_not_found" };
  }

  if (deposit.status === "approved") {
    const wallet = await getWallet(deposit.userId, deposit.email);
    return { approved: true, wallet, depositId, alreadyApproved: true };
  }

  if (payment.status !== "approved") {
    return { approved: false, reason: "payment_not_approved", paymentStatus: payment.status || "unknown" };
  }

  const wallet = await getWallet(deposit.userId, deposit.email);
  const alreadyRecorded = wallet.transactions.some(
    (transaction) => transaction.metadata?.depositId === depositId && transaction.status === "approved"
  );

  const nextWallet = alreadyRecorded
    ? wallet
    : await saveWallet({
        ...wallet,
        balance: wallet.balance + deposit.amount,
        transactions: sortTransactions(
          wallet.transactions.map((transaction) =>
            transaction.id === depositId
              ? {
                  ...transaction,
                  status: "approved" as const,
                  description: "Carga acreditada por confirmacion de pago",
                  metadata: {
                    ...(transaction.metadata || {}),
                    depositId,
                    paymentId: String(payment.id || ""),
                  },
                }
              : transaction
          )
        ),
      });

  await kv.set(depositKey(depositId), {
    ...deposit,
    status: "approved",
    paymentId: String(payment.id || ""),
    approvedAt: Date.now(),
  });

  return { approved: true, wallet: nextWallet, depositId, alreadyApproved: false };
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

const normalizeEmail = (value: string | undefined | null) => (value || "").trim().toLowerCase();
const normalizeDni = (value: string | undefined | null) => (value || "").replace(/\D/g, "").trim();
const getProfileFullName = (profile: UserProfileRecord | null) =>
  [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean).join(" ").trim();

const getAdminEmail = () => normalizeEmail(Deno.env.get("ADMIN_EMAIL") || DEFAULT_ADMIN_EMAIL);

const getRequestBearerToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader) {
    return "";
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token.trim();
};

const getAuthenticatedUser = async (c: Context) => {
  const accessToken = getRequestBearerToken(c.req.header("Authorization"));
  if (!accessToken) {
    return { error: c.json({ error: "Unauthorized" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseApiKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseApiKey) {
    console.log("Supabase auth env vars are missing");
    return { error: c.json({ error: "Auth is not configured" }, 500) };
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseApiKey,
    },
  });

  if (!authResponse.ok) {
    return { error: c.json({ error: "Unauthorized" }, 401) };
  }

  const authUser = await authResponse.json();
  if (!authUser?.id || !authUser?.email) {
    return { error: c.json({ error: "Unauthorized" }, 401) };
  }

  return {
    user: {
      id: String(authUser.id),
      email: normalizeEmail(String(authUser.email)),
    } satisfies AuthenticatedUser,
  };
};

const getUserProfile = async (userId: string): Promise<UserProfileRecord | null> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseApiKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseApiKey) {
    return null;
  }

  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=first_name,last_name,dni,email`,
    {
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
      },
    }
  );

  if (!profileResponse.ok) {
    console.log("Failed to fetch profile for withdrawal validation");
    return null;
  }

  const profiles = await profileResponse.json();
  return Array.isArray(profiles) && profiles.length > 0 ? (profiles[0] as UserProfileRecord) : null;
};

const ensureSameUser = (c: Context, authUser: AuthenticatedUser, userId: string, email?: string) => {
  if (authUser.id !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail && authUser.email !== normalizedEmail) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return null;
};

const ensureAdmin = (c: Context, authUser: AuthenticatedUser) => {
  if (authUser.email !== getAdminEmail()) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return null;
};

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: [
      "https://intermedio-ten.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

registerRealtimeRoomRoutes(app);

app.get("/server/health", (c) => c.json({ status: "ok" }));

app.get("/server/tables", async (c) => {
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

app.post("/server/tables", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const body = await c.req.json();
    const { tableName, buyIn, maxPlayers, userName, userPhoto } = body;

    if (!tableName || !buyIn || !userName) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const userId = auth.user.id;

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

app.post("/server/tables/:tableId/join", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const tableId = `table:${c.req.param("tableId")}`;
    const body = await c.req.json();
    const { userName, userPhoto } = body;
    const userId = auth.user.id;

    if (!userName) {
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

app.get("/server/tables/:tableId", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

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

app.post("/server/tables/:tableId/bet", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const tableId = `table:${c.req.param("tableId")}`;
    const body = await c.req.json();
    const { betAmount } = body;
    const userId = auth.user.id;

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
        player.result = `Gana ${Math.round(prize)} INT`;
      } else {
        player.balance -= betAmount;
        table.pot += betAmount;
        player.result = `Pierde ${Math.round(betAmount)} INT`;
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

app.post("/server/tables/:tableId/next-round", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

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

app.post("/server/tables/:tableId/leave", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const tableId = `table:${c.req.param("tableId")}`;
    const userId = auth.user.id;

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

app.post("/server/tables/:tableId/heartbeat", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const tableId = `table:${c.req.param("tableId")}`;
    const userId = auth.user.id;

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

app.get("/server/wallet/:userId", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const userId = c.req.param("userId");
    const email = c.req.query("email") || "";
    const forbiddenResponse = ensureSameUser(c, auth.user, userId, email);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    const wallet = await getWallet(auth.user.id, auth.user.email || email);
    return c.json(wallet);
  } catch (error) {
    console.log("Error fetching wallet:", error);
    return c.json({ error: "Failed to fetch wallet" }, 500);
  }
});

app.post("/server/wallet/transactions", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const body = await c.req.json();
    const { userId, email, amount, direction, kind, description } = body;

    if (!userId || !email || !amount || !direction || !kind || !description) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const forbiddenResponse = ensureSameUser(c, auth.user, userId, email);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    // Security: non-admin users can only DEBIT (spend), never CREDIT (self-fund)
    const isAdminUser = auth.user.email === getAdminEmail();
    if (direction === "credit" && !isAdminUser) {
      return c.json({ error: "Forbidden: only admin can credit balances" }, 403);
    }

    // Security: block self-adjustments of kind "adjustment" for non-admin
    if (kind === "adjustment" && !isAdminUser) {
      return c.json({ error: "Forbidden: only admin can make adjustments" }, 403);
    }

    const wallet = await getWallet(auth.user.id, auth.user.email);
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

app.post("/server/wallet/withdrawals", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const body = await c.req.json();
    const {
      userId,
      email,
      amount,
      method,
      accountHolder,
      accountDestination,
      notes,
    } = body;

    if (!userId || !email || !amount || !method || !accountHolder || !accountDestination) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const forbiddenResponse = ensureSameUser(c, auth.user, userId, email);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    const normalizedAmount = Math.floor(Number(amount));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return c.json({ error: "Invalid withdrawal amount" }, 400);
    }

    const profile = await getUserProfile(auth.user.id);
    const profileFullName = getProfileFullName(profile);
    const profileDni = normalizeDni(profile?.dni);
    const profileEmail = normalizeEmail(profile?.email || auth.user.email);
    if (!profileFullName || !profileDni || !profileEmail) {
      return c.json({ error: "Complete your profile with name, DNI and email before requesting a withdrawal" }, 400);
    }

    const normalizedAccountHolder = String(accountHolder || "").trim();
    const normalizedAccountDestination = String(accountDestination || "").trim();
    const normalizedNotes = String(notes || "").trim();
    if (!normalizedAccountHolder || !normalizedAccountDestination) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const wallet = await getWallet(auth.user.id, auth.user.email);
    if (normalizedAmount > wallet.balance) {
      return c.json({ error: "Insufficient balance" }, 400);
    }

    const withdrawal: WithdrawalRequest = {
      id: `withdrawal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: normalizedAmount,
      method,
      status: "pending",
      requestedAt: Date.now(),
      fullName: profileFullName,
      dni: profileDni,
      email: profileEmail,
      accountHolder: normalizedAccountHolder,
      accountDestination: normalizedAccountDestination,
      notes:
        normalizedAmount >= HIGH_VALUE_WITHDRAWAL_INT
          ? `${normalizedNotes ? `${normalizedNotes} | ` : ""}REQUIERE REVISION EXTRA`
          : normalizedNotes || undefined,
    };

    const nextWallet = appendTransaction(
      {
        ...wallet,
        balance: wallet.balance - normalizedAmount,
        withdrawals: sortWithdrawals([withdrawal, ...wallet.withdrawals]),
      },
      {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: "withdrawal",
        direction: "debit",
        amount: normalizedAmount,
        status: "pending",
        description: "Retiro solicitado",
        createdAt: Date.now(),
        metadata: {
          withdrawalId: withdrawal.id,
          method,
          highReview: normalizedAmount >= HIGH_VALUE_WITHDRAWAL_INT ? "true" : "false",
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

app.get("/server/wallet/admin/withdrawals", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const forbiddenResponse = ensureAdmin(c, auth.user);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    return c.json({ withdrawals: await getAdminWithdrawals() });
  } catch (error) {
    console.log("Error fetching admin withdrawals:", error);
    return c.json({ error: "Failed to fetch admin withdrawals" }, 500);
  }
});

app.post("/server/wallet/admin/withdrawals/status", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const forbiddenResponse = ensureAdmin(c, auth.user);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

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

app.post("/server/wallet/deposits/checkout-pro", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return c.json({ error: "Mercado Pago access token is not configured" }, 500);
    }

    const body = await c.req.json();
    const { userId, email, fullName, amount, successUrl, errorUrl, pendingUrl } = body;

    if (!userId || !email || !amount || !successUrl || !errorUrl || !pendingUrl) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const forbiddenResponse = ensureSameUser(c, auth.user, userId, email);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    const wallet = await getWallet(auth.user.id, auth.user.email);
    const depositId = `deposit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const notificationUrl = `${new URL(c.req.url).origin}/functions/v1/server/wallet/mercadopago/webhook`;

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
      userId: auth.user.id,
      email: auth.user.email,
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

app.post("/server/wallet/deposits/reconcile", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return c.json({ error: "Mercado Pago access token is not configured" }, 500);
    }

    const body = await c.req.json();
    const { userId, email, paymentId } = body;

    if (!userId || !email || !paymentId) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const forbiddenResponse = ensureSameUser(c, auth.user, userId, email);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) {
      console.log("Mercado Pago reconcile lookup failed:", payment);
      return c.json({ error: "Failed to verify Mercado Pago payment" }, 502);
    }

    const result = await approveDepositFromPayment(payment);
    if (!result.approved) {
      if (result.reason === "payment_not_approved") {
        return c.json({
          approved: false,
          paymentStatus: result.paymentStatus,
          wallet: await getWallet(auth.user.id, auth.user.email),
        });
      }

      return c.json({ error: "Deposit could not be reconciled" }, 404);
    }

    if (result.wallet.userId !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return c.json({
      approved: true,
      depositId: result.depositId,
      wallet: result.wallet,
    });
  } catch (error) {
    console.log("Error reconciling Mercado Pago deposit:", error);
    return c.json({ error: "Failed to reconcile deposit" }, 500);
  }
});

app.post("/server/wallet/mercadopago/webhook", async (c) => {
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

    await approveDepositFromPayment(payment);

    return c.json({ received: true });
  } catch (error) {
    console.log("Error processing Mercado Pago webhook:", error);
    return c.json({ received: true });
  }
});

// Admin endpoints for managing user INT balances
app.get("/server/wallet/admin/users", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const forbiddenResponse = ensureAdmin(c, auth.user);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    const wallets = await kv.getByPrefix("wallet:");
    const users = (wallets as WalletSummary[]).map((wallet) => ({
      userId: wallet.userId,
      email: wallet.email,
      balance: wallet.balance,
    }));

    return c.json({ users });
  } catch (error) {
    console.log("Error fetching admin users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

app.post("/server/wallet/admin/users/:userId/balance", async (c) => {
  try {
    const auth = await getAuthenticatedUser(c);
    if ("error" in auth) {
      return auth.error;
    }

    const forbiddenResponse = ensureAdmin(c, auth.user);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    const targetUserId = c.req.param("userId");
    const body = await c.req.json();
    const { balance: newBalance } = body;

    if (typeof newBalance !== "number" || newBalance < 0) {
      return c.json({ error: "Invalid balance value" }, 400);
    }

    const wallet = await getWallet(targetUserId, "");
    wallet.balance = newBalance;
    wallet.updatedAt = Date.now();
    await saveWallet(wallet);

    return c.json({ success: true, userId: targetUserId, balance: newBalance });
  } catch (error) {
    console.log("Error updating user balance:", error);
    return c.json({ error: "Failed to update balance" }, 500);
  }
});

Deno.serve(app.fetch);
