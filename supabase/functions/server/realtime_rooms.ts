import type { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

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

const TURN_DURATION_MS = 15000;

const serviceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

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

const getNextPendingTurn = (players: RoomPlayerRow[], startIndex: number): number => {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidate = (startIndex + offset) % players.length;
    const player = players[candidate];
    // Skip players who are waiting for rebuy (balance = 0 and rebuy_deadline is in the future)
    const isWaitingForRebuy = player.balance === 0 && player.rebuy_deadline && new Date(player.rebuy_deadline) > new Date();
    if (player.bet < 0 && !isWaitingForRebuy && !player.has_declined_rebuy) {
      return candidate;
    }
  }
  return -1;
};

const loadRoomRows = async (roomId: string) => {
  const db = serviceClient();
  const { data: room, error: roomError } = await db
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError || !room) {
    throw new Error(roomError?.message || "Room not found");
  }

  const { data: players, error: playersError } = await db
    .from("room_players")
    .select("*, profiles(username, avatar_url)")
    .eq("room_id", roomId)
    .order("seat", { ascending: true });

  if (playersError) {
    throw new Error(playersError.message);
  }

  return {
    room: room as RoomRow,
    players: (players || []) as RoomPlayerRow[],
  };
};

const mapRoomToGameTable = (room: RoomRow, players: RoomPlayerRow[]) => ({
  id: room.id,
  name: room.name || `Mesa ${room.code}`,
  code: room.code,
  buyIn: Number(room.buy_in),
  maxPlayers: room.max_players,
  currentPlayers: players.length,
  pot: Number(room.pot),
  deck: room.deck || [],
  round: room.round,
  roundResolved: players.length > 0 && players.every((player) => player.bet >= 0),
  currentTurn: room.current_turn_seat,
  turnStartedAt: room.turn_started_at ? new Date(room.turn_started_at).getTime() : 0,
  status: room.status,
  createdAt: new Date(room.created_at).getTime(),
  lastActivity: new Date(room.updated_at).getTime(),
  players: [...players]
    .sort((left, right) => left.seat - right.seat)
    .map((player) => ({
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
});

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

      if (!tableName || !buyIn || !initialStack || !maxPlayers) {
        return c.json({ error: "Missing required fields" }, 400);
      }

      const db = serviceClient();
      const { data: room, error: roomError } = await db
        .from("rooms")
        .insert({
          name: tableName,
          code: randomTableCode(),
          owner_id: userId,
          status: "waiting",
          buy_in: buyIn,
          max_players: maxPlayers,
          pot: buyIn,
          round: 0,
          current_turn_seat: 0,
          turn_started_at: null,
          deck: shuffleDeck(createDeck()),
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

      const roomState = await loadRoomRows(room.id);
      return c.json({ table: mapRoomToGameTable(roomState.room, roomState.players) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create room";
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
      const roomState = await loadRoomRows(roomId);

      if (!stackAmount) {
        return c.json({ error: "Missing required fields" }, 400);
      }

      if (roomState.players.some((player) => player.user_id === userId)) {
        return c.json({ table: mapRoomToGameTable(roomState.room, roomState.players) });
      }

      if (roomState.players.length >= roomState.room.max_players) {
        return c.json({ error: "Table is full" }, 400);
      }

      const { error: insertError } = await db.from("room_players").insert({
        room_id: roomId,
        user_id: userId,
        seat: roomState.players.length,
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

        await db
          .from("rooms")
          .update({
            status: "playing",
            round: 1,
            current_turn_seat: 0,
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
      const db = serviceClient();
      const { room, players } = await loadRoomRows(roomId);
      const sortedPlayers = [...players].sort((left, right) => left.seat - right.seat);
      const playerIndex = sortedPlayers.findIndex((player) => player.user_id === userId);
      const player = sortedPlayers[playerIndex];

      if (!player) {
        return c.json({ error: "Player not in room" }, 404);
      }

      if (playerIndex !== room.current_turn_seat) {
        console.error(`Turn mismatch: playerIndex=${playerIndex}, current_turn_seat=${room.current_turn_seat}, userId=${userId}, playerSeat=${player?.seat}`);
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
      let rebuyDeadline: string | null = player.rebuy_deadline || null;

      if (betAmount > 0) {
        const [drawnCard, nextDeck] = drawCard(deck);
        thirdCard = drawnCard;
        deck = nextDeck;

        const won = evaluateHand(player.cards[0], player.cards[1], drawnCard);
        console.log(`Bet processing: userId=${userId}, betAmount=${betAmount}, won=${won}, balanceBefore=${playerBalance}, potBefore=${currentPot}`);
        if (won) {
          nextBalance += betAmount;
          nextPot -= betAmount;
          result = `Gana ${Math.round(betAmount)} INT`;
        } else {
          nextBalance -= betAmount;
          nextPot += betAmount;
          result = `Pierde ${Math.round(betAmount)} INT`;
        }
        console.log(`Bet processing: balanceAfter=${nextBalance}, potAfter=${nextPot}`);

        // If player reaches 0 balance after losing, start rebuy timer
        if (nextBalance === 0 && !won) {
          const deadline = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
          rebuyDeadline = deadline.toISOString();
        }
      }

      const nextTurn = getNextPendingTurn(
        sortedPlayers.map((currentPlayer) =>
          currentPlayer.id === player.id ? { ...currentPlayer, bet: betAmount } : currentPlayer
        ),
        room.current_turn_seat
      );

      console.log(`Updating player: playerId=${player.id}, bet=${betAmount}, balance=${nextBalance}, result=${result}`);
      const playerUpdateResult = await db
        .from("room_players")
        .update({
          bet: betAmount,
          third_card: thirdCard,
          result,
          balance: nextBalance,
          rebuy_deadline: rebuyDeadline,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", player.id);
      console.log(`Player update result:`, playerUpdateResult.error ? playerUpdateResult.error : "Success");

      await db
        .from("rooms")
        .update({
          pot: nextPot,
          deck,
          current_turn_seat: nextTurn === -1 ? room.current_turn_seat : nextTurn,
          turn_started_at: nextTurn === -1 ? room.turn_started_at : new Date().toISOString(),
          round_resolved: nextTurn === -1,
        })
        .eq("id", roomId);

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
      const { room, players } = await loadRoomRows(roomId);
      const sortedPlayers = [...players].sort((left, right) => left.seat - right.seat);

      if (sortedPlayers.some((player) => player.bet < 0)) {
        return c.json({ error: "Round not resolved yet" }, 400);
      }

      // Check if there are at least 2 active players (balance > 0 and not declined)
      const activePlayers = sortedPlayers.filter((p) => p.balance > 0 && !p.has_declined_rebuy);
      if (activePlayers.length < 2) {
        return c.json({ error: "Not enough active players to continue" }, 400);
      }

      let nextPot = Number(room.pot);
      const playerUpdates = sortedPlayers.map((player) => ({ ...player, balance: Number(player.balance) }));

      if (nextPot <= 0) {
        nextPot = Number(room.buy_in) * activePlayers.length;
        for (const player of playerUpdates) {
          // Only deduct from active players
          if (player.balance > 0 && !player.has_declined_rebuy) {
            player.balance -= Number(room.buy_in);
          }
        }
      }

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

      await db
        .from("rooms")
        .update({
          round: room.round + 1,
          current_turn_seat: 0,
          turn_started_at: new Date().toISOString(),
          pot: nextPot,
          deck,
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
      const { players } = await loadRoomRows(roomId);
      const player = players.find((item) => item.user_id === userId);

      if (player) {
        // If player has active rebuy deadline, mark as declined
        if (player.rebuy_deadline && player.balance === 0) {
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
      const currentPlayer = sortedPlayers[room.current_turn_seat];
      const startedAt = room.turn_started_at ? new Date(room.turn_started_at).getTime() : 0;

      // Check for expired rebuy deadlines
      const now = new Date();
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

      // Check if game should end (only one player with balance > 0)
      const playersWithBalance = sortedPlayers.filter((p) => p.balance > 0 && !p.has_declined_rebuy);
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
          sortedPlayers.map((item) =>
            item.id === currentPlayer.id ? { ...item, bet: 0 } : item
          ),
          room.current_turn_seat
        );

        await db
          .from("room_players")
          .update({
            bet: 0,
            third_card: null,
            result: "Pasa por tiempo",
          })
          .eq("id", currentPlayer.id);

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

      const finalState = await loadRoomRows(roomId);
      return c.json({ table: mapRoomToGameTable(finalState.room, finalState.players) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process heartbeat";
      return c.json({ error: message }, message === "Unauthorized" ? 401 : 500);
    }
  });
};
