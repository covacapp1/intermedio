import type { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.ts";

interface Card {
  suit: string;
  value: number;
  displayValue: string;
}

interface RoomRow {
  id: string;
  name: string | null;
  code: string;
  owner_id: string;
  status: "waiting" | "playing" | "finished";
  buy_in: number;
  max_players: number;
  pot: number;
  round: number;
  current_turn_seat: number;
  turn_started_at: string | null;
  deck: Card[];
  created_at: string;
  updated_at: string;
  game_mode?: "pvp" | "vs_ai";
  ai_state?: AiState | null;
}

interface RoomPlayerRow {
  id: string;
  room_id: string;
  user_id: string;
  seat: number;
  is_ready: boolean;
  is_connected: boolean;
  balance: number;
  bet: number;
  cards: Card[];
  third_card: Card | null;
  result: string;
  joined_at: string;
  last_seen_at: string;
  rebuy_deadline: string | null;
  has_declined_rebuy: boolean;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface AiState {
  seat: number;
  name: string;
  balance: number;
  bet: number;
  cards: Card[];
  thirdCard: Card | null;
  result: string;
  strategy: "smart_v1";
}

type WalletTransactionKind = "deposit" | "withdrawal" | "game_buy_in" | "rebuy" | "adjustment";
type WalletDirection = "credit" | "debit";
type WalletTransactionStatus = "pending" | "approved" | "rejected";

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

interface WalletSummary {
  userId: string;
  email: string;
  balance: number;
  transactions: WalletTransaction[];
  withdrawals: Array<unknown>;
  updatedAt: number;
}

const TURN_DURATION_MS = 20000;
const ROOM_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_AI_NAME = "Sheriff IA";
const DEFAULT_ADMIN_EMAIL = "grafica.covac@hotmail.com";
let rebuyColumnsSupported: boolean | null = null;

const serviceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

const walletKey = (userId: string) => `wallet:${userId}`;

const isMissingRebuyColumnsError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized.includes("rebuy_deadline") || normalized.includes("has_declined_rebuy");
};

const detectRebuyColumnsSupport = async (db = serviceClient()): Promise<boolean> => {
  if (rebuyColumnsSupported !== null) {
    return rebuyColumnsSupported;
  }

  const { error } = await db.from("room_players").select("rebuy_deadline,has_declined_rebuy").limit(1);
  if (!error) {
    rebuyColumnsSupported = true;
    return true;
  }

  if (isMissingRebuyColumnsError(error.message)) {
    rebuyColumnsSupported = false;
    return false;
  }

  throw new Error(error.message);
};

const createEmptyWallet = (userId: string, email: string): WalletSummary => ({
  userId,
  email,
  balance: 0,
  transactions: [],
  withdrawals: [],
  updatedAt: Date.now(),
});

const sortTransactions = (transactions: WalletTransaction[]) =>
  [...transactions].sort((left, right) => right.createdAt - left.createdAt);

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

const saveWallet = async (wallet: WalletSummary): Promise<WalletSummary> => {
  const next = {
    ...wallet,
    transactions: sortTransactions(wallet.transactions || []),
    updatedAt: Date.now(),
  };
  await kv.set(walletKey(wallet.userId), next);
  return next;
};

const recordWalletAdjustment = async (
  userId: string,
  email: string,
  amount: number,
  direction: WalletDirection,
  description: string,
  metadata?: Record<string, string>,
): Promise<WalletSummary> => {
  const wallet = await getWallet(userId, email);
  const signed = direction === "debit" ? -amount : amount;
  const nextBalance = wallet.balance + signed;
  if (nextBalance < 0) {
    throw new Error("Insufficient wallet balance");
  }

  return saveWallet({
    ...wallet,
    balance: nextBalance,
    transactions: [
      {
        id: `ai-funds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: "adjustment",
        direction,
        amount,
        status: "approved",
        description,
        createdAt: Date.now(),
        metadata,
      },
      ...(wallet.transactions || []),
    ],
  });
};

const getRoomMode = (room: RoomRow): "pvp" | "vs_ai" => (room.game_mode === "vs_ai" ? "vs_ai" : "pvp");

const buildAiId = (roomId: string) => `ai:${roomId}`;

const calculateWinChance = (card1: Card, card2: Card): number => {
  const values = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  const min = Math.min(card1.value, card2.value);
  const max = Math.max(card1.value, card2.value);
  const favorable = values.filter((value) => value > min && value < max).length;
  return favorable / values.length;
};

const chooseSmartAiBet = (ai: AiState, opponent: RoomPlayerRow | undefined, pot: number): number => {
  const maxBet = Math.max(0, Math.min(Math.floor(ai.balance), Math.floor(pot)));
  if (maxBet <= 0 || ai.cards.length < 2) {
    return 0;
  }

  const chance = calculateWinChance(ai.cards[0], ai.cards[1]);
  if (chance <= 0.12) {
    return 0;
  }

  let aggression = 0.2;
  if (chance >= 0.35) aggression = 0.4;
  if (chance >= 0.55) aggression = 0.65;
  if (chance >= 0.75) aggression = 0.82;

  if (opponent) {
    const opponentBalance = Math.max(0, Number(opponent.balance));
    if (opponentBalance < ai.balance * 0.5) {
      aggression += 0.07;
    }
  }

  const base = Math.floor(maxBet * Math.min(0.9, aggression));
  if (base <= 0) {
    return chance > 0.65 ? 1 : 0;
  }

  if (chance < 0.3 && Math.random() < 0.45) {
    return 0;
  }

  return Math.max(1, Math.min(maxBet, base));
};

const isAiSeat = (room: RoomRow, seat: number): boolean => {
  return getRoomMode(room) === "vs_ai" && !!room.ai_state && room.ai_state.seat === seat;
};

const aiStateToTurnPlayer = (roomId: string, aiState: AiState): RoomPlayerRow => ({
  id: `ai-turn-${roomId}`,
  room_id: roomId,
  user_id: buildAiId(roomId),
  seat: aiState.seat,
  is_ready: true,
  is_connected: true,
  balance: Number(aiState.balance),
  bet: Number(aiState.bet),
  cards: aiState.cards || [],
  third_card: aiState.thirdCard || null,
  result: aiState.result || "",
  joined_at: new Date().toISOString(),
  last_seen_at: new Date().toISOString(),
  rebuy_deadline: null,
  has_declined_rebuy: false,
});

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

const randomTableCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const getNextAvailableSeat = (players: RoomPlayerRow[], maxPlayers: number): number => {
  const usedSeats = new Set(players.map((player) => player.seat));
  for (let seat = 0; seat < maxPlayers; seat += 1) {
    if (!usedSeats.has(seat)) {
      return seat;
    }
  }
  return -1;
};

const getNextPendingTurn = (players: RoomPlayerRow[], startSeat: number): number => {
  const sortedPlayers = [...players].sort((left, right) => left.seat - right.seat);
  if (sortedPlayers.length === 0) {
    return -1;
  }

  let startIndex = sortedPlayers.findIndex((player) => player.seat === startSeat);
  if (startIndex < 0) {
    startIndex = 0;
  }

  for (let offset = 1; offset <= sortedPlayers.length; offset += 1) {
    const candidate = (startIndex + offset) % sortedPlayers.length;
    const player = sortedPlayers[candidate];
    // Skip players who are waiting for rebuy (balance = 0 and rebuy_deadline is in the future)
    const isWaitingForRebuy = player.balance === 0 && player.rebuy_deadline && new Date(player.rebuy_deadline) > new Date();
    if (player.bet < 0 && !isWaitingForRebuy && !player.has_declined_rebuy) {
      return player.seat;
    }
  }
  return -1;
};

const cleanupExpiredRooms = async (db = serviceClient()) => {
  const cutoffIso = new Date(Date.now() - ROOM_EXPIRATION_MS).toISOString();
  const { error } = await db.from("rooms").delete().lt("created_at", cutoffIso);
  if (error) {
    throw new Error(error.message);
  }
};

const loadRoomRows = async (roomId: string) => {
  const db = serviceClient();
  const supportsRebuyColumns = await detectRebuyColumnsSupport(db);
  const { data: room, error: roomError } = await db
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError || !room) {
    throw new Error(roomError?.message || "Room not found");
  }

  if (Date.now() - new Date(room.created_at).getTime() >= ROOM_EXPIRATION_MS) {
    await db.from("rooms").delete().eq("id", room.id);
    throw new Error("Room not found");
  }

  const playerSelect = supportsRebuyColumns
    ? "id, room_id, user_id, seat, is_ready, is_connected, balance, bet, cards, third_card, result, joined_at, last_seen_at, rebuy_deadline, has_declined_rebuy, profiles(username, avatar_url)"
    : "id, room_id, user_id, seat, is_ready, is_connected, balance, bet, cards, third_card, result, joined_at, last_seen_at, profiles(username, avatar_url)";

  const { data: players, error: playersError } = await db
    .from("room_players")
    .select(playerSelect)
    .eq("room_id", roomId)
    .order("seat", { ascending: true });

  if (playersError) {
    throw new Error(playersError.message);
  }

  return {
    room: room as RoomRow,
    players: ((players || []) as Partial<RoomPlayerRow>[]).map((player) => ({
      ...player,
      rebuy_deadline: supportsRebuyColumns ? (player.rebuy_deadline ?? null) : null,
      has_declined_rebuy: supportsRebuyColumns ? Boolean(player.has_declined_rebuy) : false,
    })) as RoomPlayerRow[],
  };
};

const mapRoomToGameTable = (room: RoomRow, players: RoomPlayerRow[]) => {
  const mode = getRoomMode(room);
  const aiState = mode === "vs_ai" ? room.ai_state : null;
  const sortedPlayers = [...players].sort((left, right) => left.seat - right.seat);
  const combinedPlayers = [
    ...sortedPlayers.map((player) => ({
      id: player.user_id,
      name: player.profiles?.username || "Jugador",
      photoUrl: player.profiles?.avatar_url || "",
      isAI: false,
      balance: Number(player.balance),
      bet: Number(player.bet),
      cards: player.cards || [],
      thirdCard: player.third_card || null,
      result: player.result || "",
      connected: player.is_connected,
      lastSeen: new Date(player.last_seen_at).getTime(),
    })),
    ...(aiState
      ? [
          {
            id: buildAiId(room.id),
            name: aiState.name || DEFAULT_AI_NAME,
            photoUrl: "",
            isAI: true,
            balance: Number(aiState.balance),
            bet: Number(aiState.bet),
            cards: aiState.cards || [],
            thirdCard: aiState.thirdCard || null,
            result: aiState.result || "",
            connected: true,
            lastSeen: Date.now(),
          },
        ]
      : []),
  ];

  const currentTurnIndex = combinedPlayers.findIndex((player) => {
    if (player.isAI) {
      return room.current_turn_seat === (aiState?.seat ?? -1);
    }
    const realPlayer = sortedPlayers.find((row) => row.user_id === player.id);
    return realPlayer?.seat === room.current_turn_seat;
  });
  const roundResolved = combinedPlayers.length > 0 && combinedPlayers.every((player) => player.bet >= 0);

  return {
  mode,
  id: room.id,
  name: room.name || `Mesa ${room.code}`,
  code: room.code,
  buyIn: Number(room.buy_in),
  maxPlayers: room.max_players,
  currentPlayers: players.length,
  pot: Number(room.pot),
  deck: room.deck || [],
  round: room.round,
  roundResolved,
  currentTurn: currentTurnIndex >= 0 ? currentTurnIndex : 0,
  turnStartedAt: room.turn_started_at ? new Date(room.turn_started_at).getTime() : 0,
  status: room.status,
  createdAt: new Date(room.created_at).getTime(),
  lastActivity: new Date(room.updated_at).getTime(),
  players: combinedPlayers,
  };
};

const requireUserId = async (authorizationHeader: string | undefined) => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authorizationHeader.slice("Bearer ".length);
  const { data, error } = await serviceClient().auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  return data.user.id;
};

export const registerRealtimeRoomRoutes = (app: Hono) => {
  app.post("/server/realtime/rooms", async (c) => {
    try {
      const userId = await requireUserId(c.req.header("Authorization"));
      const body = await c.req.json();
      const tableName = String(body.tableName || "").trim();
      const buyIn = Number(body.buyIn);
      const initialStack = Number(body.initialStack);
      const maxPlayers = Number(body.maxPlayers);
      const gameMode = body.gameMode === "vs_ai" ? "vs_ai" : "pvp";
      const aiInitialStack = Number(body.aiInitialStack || initialStack);

      if (!tableName || !buyIn || !initialStack || !maxPlayers) {
        return c.json({ error: "Missing required fields" }, 400);
      }

      const db = serviceClient();
      await cleanupExpiredRooms(db);
      const { data: ownerProfile } = await db
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      const ownerEmail = String(ownerProfile?.email || "").trim().toLowerCase();
      const adminEmail = String(Deno.env.get("ADMIN_EMAIL") || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();

      if (gameMode === "vs_ai") {
        if (!ownerEmail || ownerEmail !== adminEmail) {
          return c.json({ error: "Solo el admin puede crear mesas vs IA." }, 403);
        }
        const aiFunding = buyIn + aiInitialStack;
        await recordWalletAdjustment(
          userId,
          ownerEmail,
          aiFunding,
          "debit",
          `Fondeo IA para mesa ${tableName}`,
          { source: "vs_ai", tableName }
        );
      }

      const { data: room, error: roomError } = await db
        .from("rooms")
        .insert({
          name: tableName,
          code: randomTableCode(),
          owner_id: userId,
          status: gameMode === "vs_ai" ? "playing" : "waiting",
          buy_in: buyIn,
          max_players: gameMode === "vs_ai" ? 2 : maxPlayers,
          pot: gameMode === "vs_ai" ? buyIn * 2 : buyIn,
          round: gameMode === "vs_ai" ? 1 : 0,
          current_turn_seat: 0,
          turn_started_at: gameMode === "vs_ai" ? new Date().toISOString() : null,
          deck: shuffleDeck(createDeck()),
          game_mode: gameMode,
          ai_state:
            gameMode === "vs_ai"
              ? {
                  seat: 1,
                  name: DEFAULT_AI_NAME,
                  balance: aiInitialStack,
                  bet: -1,
                  cards: [],
                  thirdCard: null,
                  result: "",
                  strategy: "smart_v1",
                }
              : null,
        })
        .select("*")
        .single();

      if (roomError || !room) {
        return c.json({ error: roomError?.message || "Failed to create room" }, 400);
      }

      const { error: playerError } = await db.from("room_players").insert({
        room_id: room.id,
        user_id: userId,
        seat: 0,
        is_ready: true,
        is_connected: true,
        balance: initialStack,
        bet: -1,
        cards: [],
        third_card: null,
        result: "",
      });

      if (playerError) {
        return c.json({ error: playerError.message }, 400);
      }

      if (gameMode === "vs_ai") {
        const [firstCard, deckAfterFirst] = drawCard(room.deck || []);
        const [secondCard, deckAfterSecond] = drawCard(deckAfterFirst);
        const [aiCard1, deckAfterThird] = drawCard(deckAfterSecond);
        const [aiCard2, finalDeck] = drawCard(deckAfterThird);

        await db
          .from("room_players")
          .update({
            cards: [firstCard, secondCard],
            third_card: null,
            bet: -1,
            result: "",
          })
          .eq("room_id", room.id)
          .eq("user_id", userId);

        await db
          .from("rooms")
          .update({
            deck: finalDeck,
            ai_state: {
              seat: 1,
              name: DEFAULT_AI_NAME,
              balance: aiInitialStack,
              bet: -1,
              cards: [aiCard1, aiCard2],
              thirdCard: null,
              result: "",
              strategy: "smart_v1",
            },
          })
          .eq("id", room.id);
      }

      const roomState = await loadRoomRows(room.id);
      return c.json({ table: mapRoomToGameTable(roomState.room, roomState.players) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create room";
      if (message === "Insufficient wallet balance") {
        return c.json({ error: "No tienes saldo suficiente en la caja admin para fondear la IA." }, 400);
      }
      return c.json({ error: message }, message === "Unauthorized" ? 401 : 500);
    }
  });

  app.post("/server/realtime/rooms/:roomId/join", async (c) => {
    try {
      const userId = await requireUserId(c.req.header("Authorization"));
      const roomId = c.req.param("roomId");
      const body = await c.req.json();
      const stackAmount = Number(body.stackAmount);
      const db = serviceClient();
      await cleanupExpiredRooms(db);
      const roomState = await loadRoomRows(roomId);
      if (getRoomMode(roomState.room) === "vs_ai") {
        return c.json({ error: "Esta mesa es privada (vs IA)." }, 400);
      }

      if (!stackAmount) {
        return c.json({ error: "Missing required fields" }, 400);
      }

      if (roomState.players.some((player) => player.user_id === userId)) {
        return c.json({ table: mapRoomToGameTable(roomState.room, roomState.players) });
      }

      if (roomState.players.length >= roomState.room.max_players) {
        return c.json({ error: "Table is full" }, 400);
      }

      const nextSeat = getNextAvailableSeat(roomState.players, roomState.room.max_players);
      if (nextSeat < 0) {
        return c.json({ error: "Table is full" }, 400);
      }

      const { error: insertError } = await db.from("room_players").insert({
        room_id: roomId,
        user_id: userId,
        seat: nextSeat,
        is_ready: true,
        is_connected: true,
        balance: stackAmount,
        bet: -1,
        cards: [],
        third_card: null,
        result: "",
      });

      if (insertError) {
        return c.json({ error: insertError.message }, 400);
      }

      const nextPot = Number(roomState.room.pot) + Number(roomState.room.buy_in);
      const { error: potError } = await db
        .from("rooms")
        .update({
          pot: nextPot,
        })
        .eq("id", roomId);

      if (potError) {
        return c.json({ error: potError.message }, 400);
      }

      const refreshed = await loadRoomRows(roomId);
      if (refreshed.players.length === refreshed.room.max_players) {
        let deck = refreshed.room.deck || shuffleDeck(createDeck());
        const playerUpdates = refreshed.players.map((player) => {
          const [card1, deck1] = drawCard(deck);
          const [card2, deck2] = drawCard(deck1);
          deck = deck2;
          return { id: player.id, cards: [card1, card2] };
        });

        const firstSeat = [...refreshed.players].sort((left, right) => left.seat - right.seat)[0]?.seat ?? 0;

        await db
          .from("rooms")
          .update({
            status: "playing",
            round: 1,
            current_turn_seat: firstSeat,
            turn_started_at: new Date().toISOString(),
            deck,
          })
          .eq("id", roomId);

        for (const playerUpdate of playerUpdates) {
          await db
            .from("room_players")
            .update({
              cards: playerUpdate.cards,
              third_card: null,
              bet: -1,
              result: "",
            })
            .eq("id", playerUpdate.id);
        }
      }

      const finalState = await loadRoomRows(roomId);
      return c.json({ table: mapRoomToGameTable(finalState.room, finalState.players) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join room";
      return c.json({ error: message }, message === "Unauthorized" ? 401 : 500);
    }
  });

  app.post("/server/realtime/rooms/:roomId/bet", async (c) => {
    try {
      const userId = await requireUserId(c.req.header("Authorization"));
      const roomId = c.req.param("roomId");
      const body = await c.req.json();
      const betAmount = Number(body.betAmount);
      console.log(`[BET] Received: roomId=${roomId}, userId=${userId}, betAmount=${betAmount}`);

      const db = serviceClient();
      await cleanupExpiredRooms(db);
      const supportsRebuyColumns = await detectRebuyColumnsSupport(db);
      const { room, players } = await loadRoomRows(roomId);
      console.log(`[BET] Room loaded: roomExists=${!!room}, roomStatus=${room?.status}, currentTurnSeat=${room?.current_turn_seat}, playersCount=${players?.length}`);

      if (!room) {
        return c.json({ error: "Room not found" }, 404);
      }

      const sortedPlayers = [...players].sort((left, right) => left.seat - right.seat);
      console.log(`[BET] Sorted players: ${sortedPlayers.map((p) => `seat=${p.seat},userId=${p.user_id},bet=${p.bet}`).join(" | ")}`);

      const playerIndex = sortedPlayers.findIndex((player) => player.user_id === userId);
      const player = sortedPlayers[playerIndex];
      console.log(`[BET] Player lookup: playerIndex=${playerIndex}, playerExists=${!!player}, playerSeat=${player?.seat}`);

      if (!player) {
        return c.json({ error: "Player not in room" }, 404);
      }

      if (isAiSeat(room, room.current_turn_seat)) {
        return c.json({ error: "Turno de la IA. Espera un momento." }, 400);
      }

      if (player.seat !== room.current_turn_seat) {
        console.error(`Turn mismatch: playerSeat=${player.seat}, current_turn_seat=${room.current_turn_seat}, userId=${userId}`);
        return c.json({ error: "It is not this player's turn" }, 400);
      }

      const playerBalance = Number(player.balance);
      const currentPot = Number(room.pot);
      if (betAmount < 0 || betAmount > playerBalance || betAmount > currentPot) {
        return c.json({ error: `Apuesta invalida. Maximo: ${Math.min(playerBalance, currentPot)} (tu balance: ${playerBalance}, pozo: ${currentPot})` }, 400);
      }

      let deck = room.deck || [];
      let nextBalance = playerBalance;
      let nextPot = currentPot;
      let result = "Pasa";
      let thirdCard: Card | null = null;
      let rebuyDeadline: string | null = supportsRebuyColumns ? (player.rebuy_deadline || null) : null;

      if (betAmount > 0) {
        const [drawnCard, nextDeck] = drawCard(deck);
        thirdCard = drawnCard;
        deck = nextDeck;

        const won = evaluateHand(player.cards[0], player.cards[1], drawnCard);
        if (won) {
          // Player wins: recovers bet (no change) + wins betAmount from pot
          nextBalance += betAmount;
          nextPot -= betAmount;
          result = `Gana ${Math.round(betAmount)} INT`;
        } else {
          // Player loses: loses bet to pot
          nextBalance -= betAmount;
          nextPot += betAmount;
          result = `Pierde ${Math.round(betAmount)} INT`;
        }

        // If player reaches 0 balance after losing, start rebuy timer
        if (nextBalance === 0 && !won) {
          const deadline = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
          rebuyDeadline = deadline.toISOString();
        }
      }

      const baseTurnPlayers = sortedPlayers.map((currentPlayer) =>
        currentPlayer.id === player.id ? { ...currentPlayer, bet: betAmount } : currentPlayer
      );
      const turnPlayers =
        getRoomMode(room) === "vs_ai" && room.ai_state
          ? [...baseTurnPlayers, aiStateToTurnPlayer(roomId, room.ai_state)]
          : baseTurnPlayers;
      let nextTurn = getNextPendingTurn(turnPlayers, room.current_turn_seat);

      let nextAiState = room.ai_state ? { ...room.ai_state } : null;
      let nextDeckForRoom = deck;
      let nextPotForRoom = nextPot;
      let nextTurnStartedAt = nextTurn === -1 ? room.turn_started_at : new Date().toISOString();

      if (getRoomMode(room) === "vs_ai" && nextAiState && nextTurn === nextAiState.seat && nextAiState.bet < 0) {
        const aiBet = chooseSmartAiBet(nextAiState, player, nextPotForRoom);
        let aiResult = "Pasa";
        let aiThirdCard: Card | null = null;
        let aiBalance = Number(nextAiState.balance);

        if (aiBet > 0) {
          const [drawnCard, nextDeck] = drawCard(nextDeckForRoom);
          aiThirdCard = drawnCard;
          nextDeckForRoom = nextDeck;

          const aiWon = evaluateHand(nextAiState.cards[0], nextAiState.cards[1], drawnCard);
          if (aiWon) {
            aiBalance += aiBet;
            nextPotForRoom -= aiBet;
            aiResult = `Gana ${Math.round(aiBet)} INT`;
          } else {
            aiBalance -= aiBet;
            nextPotForRoom += aiBet;
            aiResult = `Pierde ${Math.round(aiBet)} INT`;
          }
        }

        nextAiState = {
          ...nextAiState,
          bet: aiBet,
          thirdCard: aiThirdCard,
          balance: aiBalance,
          result: aiResult,
        };

        await db.from("room_moves").insert({
          room_id: roomId,
          user_id: player.user_id,
          move_type: aiBet > 0 ? "ai_bet" : "ai_pass",
          payload: { betAmount: aiBet },
        });

        // Recalculate next turn with updated AI state
        const updatedTurnPlayers = [
          ...baseTurnPlayers,
          aiStateToTurnPlayer(roomId, nextAiState),
        ];
        nextTurn = getNextPendingTurn(updatedTurnPlayers, nextAiState.seat);
        nextTurnStartedAt = nextTurn === -1 ? room.turn_started_at : new Date().toISOString();
      }

      const updateData: Record<string, unknown> = {
        bet: betAmount,
        third_card: thirdCard,
        result,
        balance: nextBalance,
        last_seen_at: new Date().toISOString(),
      };
      // Only add rebuy_deadline if it was set (column may not exist in DB)
      if (supportsRebuyColumns && rebuyDeadline) {
        updateData.rebuy_deadline = rebuyDeadline;
      }
      const playerUpdateResult = await db
        .from("room_players")
        .update(updateData)
        .eq("id", player.id);
      if (playerUpdateResult.error) {
        return c.json({ error: playerUpdateResult.error.message }, 500);
      }

      const roomUpdateData: Record<string, unknown> = {
        pot: nextPotForRoom,
        deck: nextDeckForRoom,
        current_turn_seat: nextTurn === -1 ? room.current_turn_seat : nextTurn,
        turn_started_at: nextTurnStartedAt,
        ai_state: nextAiState,
      };
      const roomUpdateResult = await db
        .from("rooms")
        .update(roomUpdateData)
        .eq("id", roomId);
      if (roomUpdateResult.error) {
        return c.json({ error: roomUpdateResult.error.message }, 500);
      }

      await db.from("room_moves").insert({
        room_id: roomId,
        user_id: userId,
        move_type: betAmount > 0 ? "bet" : "pass",
        payload: { betAmount },
      });

      const finalState = await loadRoomRows(roomId);
      return c.json({ table: mapRoomToGameTable(finalState.room, finalState.players) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process move";
      return c.json({ error: message }, message === "Unauthorized" ? 401 : 500);
    }
  });

  app.post("/server/realtime/rooms/:roomId/next-round", async (c) => {
    try {
      await requireUserId(c.req.header("Authorization"));
      const roomId = c.req.param("roomId");
      const db = serviceClient();
      await cleanupExpiredRooms(db);
      const supportsRebuyColumns = await detectRebuyColumnsSupport(db);
      if (!supportsRebuyColumns) {
        return c.json({ error: "Rebuy no disponible: falta la migracion 006_add_rebuy_fields.sql" }, 400);
      }
      const { room, players } = await loadRoomRows(roomId);
      const sortedPlayers = [...players].sort((left, right) => left.seat - right.seat);
      const mode = getRoomMode(room);
      const aiState = mode === "vs_ai" ? room.ai_state : null;

      if (sortedPlayers.some((player) => player.bet < 0) || (aiState ? Number(aiState.bet) < 0 : false)) {
        return c.json({ error: "Round not resolved yet" }, 400);
      }

      // Check if there are at least 2 active players (balance > 0 and not declined)
      const activePlayers = sortedPlayers.filter((p) => p.balance > 0 && !p.has_declined_rebuy);
      const aiIsActive = !!aiState && aiState.balance > 0;
      const totalActivePlayers = activePlayers.length + (aiIsActive ? 1 : 0);
      if (totalActivePlayers < 2) {
        return c.json({ error: "Not enough active players to continue" }, 400);
      }

      let nextPot = Number(room.pot);
      const playerUpdates = sortedPlayers.map((player) => ({ ...player, balance: Number(player.balance) }));
      let nextAiState = aiState ? { ...aiState, balance: Number(aiState.balance) } : null;

      if (nextPot <= 0) {
        nextPot = Number(room.buy_in) * totalActivePlayers;
        for (const player of playerUpdates) {
          // Only deduct from active players
          if (player.balance > 0 && !player.has_declined_rebuy) {
            player.balance -= Number(room.buy_in);
          }
        }
        if (nextAiState && nextAiState.balance > 0) {
          nextAiState.balance -= Number(room.buy_in);
        }
      }

      const firstActiveSeat =
        mode === "vs_ai"
          ? sortedPlayers[0]?.seat ?? 0
          : [...activePlayers].sort((left, right) => left.seat - right.seat)[0]?.seat ??
            sortedPlayers[0]?.seat ??
        0;

      let deck = room.deck && room.deck.length >= playerUpdates.length * 3 ? room.deck : shuffleDeck(createDeck());
      for (const player of playerUpdates) {
        const [card1, deck1] = drawCard(deck);
        const [card2, deck2] = drawCard(deck1);
        deck = deck2;
        player.cards = [card1, card2];
        player.third_card = null;
        player.bet = -1;
        player.result = "";
      }
      if (nextAiState) {
        const [card1, deck1] = drawCard(deck);
        const [card2, deck2] = drawCard(deck1);
        deck = deck2;
        nextAiState.cards = [card1, card2];
        nextAiState.thirdCard = null;
        nextAiState.bet = -1;
        nextAiState.result = "";
      }

      await db
        .from("rooms")
        .update({
          round: room.round + 1,
          current_turn_seat: firstActiveSeat,
          turn_started_at: new Date().toISOString(),
          pot: nextPot,
          deck,
          ai_state: nextAiState,
          status: "playing",
        })
        .eq("id", roomId);

      for (const player of playerUpdates) {
        await db
          .from("room_players")
          .update({
            balance: player.balance,
            cards: player.cards,
            third_card: null,
            bet: -1,
            result: "",
          })
          .eq("id", player.id);
      }

      const finalState = await loadRoomRows(roomId);
      return c.json({ table: mapRoomToGameTable(finalState.room, finalState.players) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start next round";
      return c.json({ error: message }, message === "Unauthorized" ? 401 : 500);
    }
  });

  app.post("/server/realtime/rooms/:roomId/rebuy", async (c) => {
    try {
      const userId = await requireUserId(c.req.header("Authorization"));
      const roomId = c.req.param("roomId");
      const db = serviceClient();
      await cleanupExpiredRooms(db);
      const supportsRebuyColumns = await detectRebuyColumnsSupport(db);
      const { room, players } = await loadRoomRows(roomId);
      const player = players.find((item) => item.user_id === userId);

      if (!player) {
        return c.json({ error: "Player not in room" }, 404);
      }

      if (player.balance > 0) {
        return c.json({ error: "Player already has balance" }, 400);
      }

      if (!player.rebuy_deadline || new Date(player.rebuy_deadline) < new Date()) {
        return c.json({ error: "Rebuy deadline expired" }, 400);
      }

      const rebuyAmount = Number(room.buy_in);

      // Check if user has sufficient balance in wallet
      const { data: profile } = await db
        .from("profiles")
        .select("wallet_balance")
        .eq("id", userId)
        .maybeSingle();

      if (!profile || Number(profile.wallet_balance) < rebuyAmount) {
        return c.json({ error: "Insufficient wallet balance" }, 400);
      }

      // Deduct from wallet
      const { error: walletError } = await db
        .from("profiles")
        .update({
          wallet_balance: Number(profile.wallet_balance) - rebuyAmount,
        })
        .eq("id", userId);

      if (walletError) {
        return c.json({ error: walletError.message }, 400);
      }

      // Record wallet movement
      await db.from("wallet_movements").insert({
        user_id: userId,
        amount: rebuyAmount,
        direction: "debit",
        kind: "rebuy",
        description: `Recarga en mesa ${room.code}`,
      });

      // Add balance to player in room
      const { error: playerError } = await db
        .from("room_players")
        .update({
          balance: rebuyAmount,
          rebuy_deadline: null,
          has_declined_rebuy: false,
        })
        .eq("id", player.id);

      if (playerError) {
        return c.json({ error: playerError.message }, 400);
      }

      const finalState = await loadRoomRows(roomId);
      return c.json({ table: mapRoomToGameTable(finalState.room, finalState.players) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process rebuy";
      return c.json({ error: message }, message === "Unauthorized" ? 401 : 500);
    }
  });

  app.post("/server/realtime/rooms/:roomId/leave", async (c) => {
    try {
      const userId = await requireUserId(c.req.header("Authorization"));
      const roomId = c.req.param("roomId");
      const db = serviceClient();
      await cleanupExpiredRooms(db);
      const supportsRebuyColumns = await detectRebuyColumnsSupport(db);
      const { room, players } = await loadRoomRows(roomId);
      const player = players.find((item) => item.user_id === userId);

      if (player) {
        // If player has active rebuy deadline, mark as declined
        if (supportsRebuyColumns && player.rebuy_deadline && player.balance === 0) {
          await db
            .from("room_players")
            .update({
              has_declined_rebuy: true,
              rebuy_deadline: null,
            })
            .eq("id", player.id);
        }
        await db.from("room_players").delete().eq("id", player.id);
      }

      if (getRoomMode(room) === "vs_ai" && room.ai_state && Number(room.ai_state.balance) > 0 && room.owner_id) {
        const { data: ownerProfile } = await db
          .from("profiles")
          .select("email")
          .eq("id", room.owner_id)
          .maybeSingle();
        const ownerEmail = String(ownerProfile?.email || "").trim().toLowerCase();
        await recordWalletAdjustment(
          room.owner_id,
          ownerEmail,
          Number(room.ai_state.balance),
          "credit",
          `Devolucion de saldo IA mesa ${room.code}`,
          { source: "vs_ai", roomId }
        );
      }

      try {
        const refreshed = await loadRoomRows(roomId);
        const shouldDeleteRoom =
          refreshed.players.length === 0 ||
          (refreshed.room.status !== "waiting" && refreshed.players.length < 2);

        if (shouldDeleteRoom) {
          await db.from("rooms").delete().eq("id", roomId);
        }
      } catch {
        await db.from("rooms").delete().eq("id", roomId);
      }

      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to leave room";
      return c.json({ error: message }, message === "Unauthorized" ? 401 : 500);
    }
  });

  app.post("/server/realtime/rooms/:roomId/heartbeat", async (c) => {
    try {
      const userId = await requireUserId(c.req.header("Authorization"));
      const roomId = c.req.param("roomId");
      const db = serviceClient();
      await cleanupExpiredRooms(db);
      const supportsRebuyColumns = await detectRebuyColumnsSupport(db);
      const { room, players } = await loadRoomRows(roomId);
      const player = players.find((item) => item.user_id === userId);

      if (player) {
        await db
          .from("room_players")
          .update({
            is_connected: true,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", player.id);
      }

      const sortedPlayers = [...players].sort((left, right) => left.seat - right.seat);
      const currentPlayer = sortedPlayers.find((player) => player.seat === room.current_turn_seat);
      const aiState = getRoomMode(room) === "vs_ai" ? room.ai_state : null;
      const startedAt = room.turn_started_at ? new Date(room.turn_started_at).getTime() : 0;

      // Check for expired rebuy deadlines
      const now = new Date();
      if (supportsRebuyColumns) {
        for (const p of sortedPlayers) {
          if (p.rebuy_deadline && new Date(p.rebuy_deadline) < now && p.balance === 0) {
            await db
              .from("room_players")
              .update({
                has_declined_rebuy: true,
                rebuy_deadline: null,
              })
              .eq("id", p.id);
          }
        }
      }

      // Check if game should end (only one player with balance > 0)
      const playersWithBalance = sortedPlayers.filter((p) => p.balance > 0 && !p.has_declined_rebuy);
      if (aiState && Number(aiState.balance) > 0) {
        playersWithBalance.push({
          id: `ai-balance-${roomId}`,
          room_id: roomId,
          user_id: buildAiId(roomId),
          seat: aiState.seat,
          is_ready: true,
          is_connected: true,
          balance: aiState.balance,
          bet: aiState.bet,
          cards: aiState.cards,
          third_card: aiState.thirdCard,
          result: aiState.result,
          joined_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          rebuy_deadline: null,
          has_declined_rebuy: false,
        } as RoomPlayerRow);
      }
      const playersDeclined = sortedPlayers.filter((p) => p.has_declined_rebuy);
      if (room.status === "playing" && playersWithBalance.length === 1 && playersDeclined.length > 0) {
        await db
          .from("rooms")
          .update({
            status: "finished",
          })
          .eq("id", roomId);
      }

      if (
        room.status === "playing" &&
        currentPlayer &&
        currentPlayer.bet < 0 &&
        startedAt > 0 &&
        Date.now() - startedAt >= TURN_DURATION_MS
      ) {
        const nextTurn = getNextPendingTurn(
          [
            ...sortedPlayers.map((item) =>
              item.id === currentPlayer.id ? { ...item, bet: 0 } : item
            ),
            ...(aiState ? [aiStateToTurnPlayer(roomId, aiState)] : []),
          ],
          room.current_turn_seat
        );

        // Draw card even on timeout so player can see what they would have gotten
        let deck = room.deck || [];
        const [drawnCard, nextDeck] = drawCard(deck);
        deck = nextDeck;
        
        await db
          .from("room_players")
          .update({
            bet: 0,
            third_card: drawnCard,
            result: "Pasa por tiempo",
          })
          .eq("id", currentPlayer.id);

        // Update deck in room
        await db
          .from("rooms")
          .update({
            deck: deck,
          })
          .eq("id", roomId);

        await db
          .from("rooms")
          .update({
            current_turn_seat: nextTurn === -1 ? room.current_turn_seat : nextTurn,
            turn_started_at: nextTurn === -1 ? room.turn_started_at : new Date().toISOString(),
          })
          .eq("id", roomId);

        await db.from("room_moves").insert({
          room_id: roomId,
          user_id: currentPlayer.user_id,
          move_type: "timeout_pass",
          payload: {},
        });
      }

      if (
        room.status === "playing" &&
        aiState &&
        room.current_turn_seat === aiState.seat &&
        Number(aiState.bet) < 0 &&
        startedAt > 0 &&
        Date.now() - startedAt >= 1200
      ) {
        const human = sortedPlayers[0];
        const aiBet = chooseSmartAiBet(aiState, human, Number(room.pot));
        let nextPot = Number(room.pot);
        let deck = room.deck || [];
        let result = "Pasa";
        let thirdCard: Card | null = null;
        let nextBalance = Number(aiState.balance);

        if (aiBet > 0) {
          const [drawnCard, nextDeck] = drawCard(deck);
          deck = nextDeck;
          thirdCard = drawnCard;
          const won = evaluateHand(aiState.cards[0], aiState.cards[1], drawnCard);
          if (won) {
            nextBalance += aiBet;
            nextPot -= aiBet;
            result = `Gana ${Math.round(aiBet)} INT`;
          } else {
            nextBalance -= aiBet;
            nextPot += aiBet;
            result = `Pierde ${Math.round(aiBet)} INT`;
          }
        }

        const updatedAiState: AiState = {
          ...aiState,
          bet: aiBet,
          thirdCard,
          result,
          balance: nextBalance,
        };

        const nextTurn = getNextPendingTurn(
          [
            ...sortedPlayers,
            aiStateToTurnPlayer(roomId, {
              ...aiState,
              balance: nextBalance,
              bet: aiBet,
              thirdCard,
              result,
            }),
          ],
          aiState.seat
        );

        await db
          .from("rooms")
          .update({
            ai_state: updatedAiState,
            pot: nextPot,
            deck,
            current_turn_seat: nextTurn === -1 ? room.current_turn_seat : nextTurn,
            turn_started_at: nextTurn === -1 ? room.turn_started_at : new Date().toISOString(),
          })
          .eq("id", roomId);

        await db.from("room_moves").insert({
          room_id: roomId,
          user_id: userId,
          move_type: aiBet > 0 ? "ai_bet" : "ai_pass",
          payload: { betAmount: aiBet },
        });
      }

      const finalState = await loadRoomRows(roomId);
      return c.json({ table: mapRoomToGameTable(finalState.room, finalState.players) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process heartbeat";
      return c.json({ error: message }, message === "Unauthorized" ? 401 : 500);
    }
  });
};
