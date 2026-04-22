import { supabase } from "../../lib/supabase";
import { projectId, publicAnonKey } from "/utils/supabase/info";

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
  rebuyDeadline?: number;
  hasDeclinedRebuy?: boolean;
}

export interface GameTable {
  mode?: "pvp" | "vs_ai";
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

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface RoomRow {
  id: string;
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
  name?: string;
  game_mode?: "pvp" | "vs_ai";
  ai_state?: {
    seat: number;
    name: string;
    balance: number;
    bet: number;
    cards: Card[];
    thirdCard: Card | null;
    result: string;
  } | null;
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

const TURN_DURATION_MS = 20000;
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  publicAnonKey;
const FUNCTION_URL =
  `${((import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || `https://${projectId}.supabase.co`)}/functions/v1/server`;

const authFetch = async <T>(path: string, method: string = "GET", body?: unknown): Promise<ApiResponse<T>> => {
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
      fetch(`${FUNCTION_URL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { error: "No active session" };
    }

    let response = await doRequest(accessToken);

    if (response.status === 401) {
      const refreshedToken = await getAccessToken();
      if (!refreshedToken) {
        return { error: "Unauthorized" };
      }
      response = await doRequest(refreshedToken);
    }

    const data = await response.json();
    console.log(`Response status: ${response.status}, ok: ${response.ok}, data:`, data);

    if (!response.ok) {
      console.error(`Request failed: ${response.status} - ${data.error || "Unknown error"}`);
      return { error: data.error || `Request failed with status ${response.status}` };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Network error" };
  }
};

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
    if (players[candidate].bet < 0) {
      return candidate;
    }
  }
  return -1;
};

const mapRoomToGameTable = (room: RoomRow, players: RoomPlayerRow[]): GameTable => {
  const sortedPlayers = [...players].sort((left, right) => left.seat - right.seat);
  const currentTurnIndex = sortedPlayers.findIndex((player) => player.seat === room.current_turn_seat);

  return {
  mode: room.game_mode === "vs_ai" ? "vs_ai" : "pvp",
  id: room.id,
  name: room.name || `Mesa ${room.code}`,
  code: room.code,
  buyIn: Number(room.buy_in),
  maxPlayers: room.max_players,
  currentPlayers: players.length,
  pot: Number(room.pot),
  deck: room.deck || [],
  round: room.round,
  roundResolved:
    players.length > 0 &&
    players.every((player) => player.bet >= 0) &&
    (room.game_mode !== "vs_ai" || (room.ai_state ? Number(room.ai_state.bet) >= 0 : false)),
  currentTurn: currentTurnIndex >= 0 ? currentTurnIndex : 0,
  turnStartedAt: room.turn_started_at ? new Date(room.turn_started_at).getTime() : 0,
  status: room.status,
  createdAt: new Date(room.created_at).getTime(),
  lastActivity: new Date(room.updated_at).getTime(),
  players: [
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
      rebuyDeadline: player.rebuy_deadline ? new Date(player.rebuy_deadline).getTime() : undefined,
      hasDeclinedRebuy: player.has_declined_rebuy,
    })),
    ...(room.game_mode === "vs_ai" && room.ai_state
      ? [
          {
            id: `ai:${room.id}`,
            name: room.ai_state.name || "IA",
            photoUrl: "",
            isAI: true,
            balance: Number(room.ai_state.balance),
            bet: Number(room.ai_state.bet),
            cards: room.ai_state.cards || [],
            thirdCard: room.ai_state.thirdCard || null,
            result: room.ai_state.result || "",
            connected: true,
            lastSeen: Date.now(),
          },
        ]
      : []),
  ],
  };
};

const loadRoomRows = async (roomId: string): Promise<ApiResponse<{ room: RoomRow; players: RoomPlayerRow[] }>> => {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError || !room) {
    return { error: roomError?.message || "Room not found" };
  }

  const { data: players, error: playersError } = await supabase
    .from("room_players")
    .select("*, profiles(username, avatar_url)")
    .eq("room_id", roomId)
    .order("seat", { ascending: true });

  if (playersError) {
    return { error: playersError.message };
  }

  return { data: { room: room as RoomRow, players: (players || []) as RoomPlayerRow[] } };
};

const loadLobbyTables = async (): Promise<ApiResponse<{ tables: TableInfo[] }>> => {
  const roomsCutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("*")
    .in("status", ["waiting", "playing"])
    .gte("created_at", roomsCutoffIso)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  const roomIds = (rooms || []).map((room) => room.id);
  const { data: roomPlayers, error: roomPlayersError } = roomIds.length
    ? await supabase.from("room_players").select("room_id").in("room_id", roomIds)
    : { data: [], error: null };

  if (roomPlayersError) {
    return { error: roomPlayersError.message };
  }

  const playerCountByRoom = new Map<string, number>();
  for (const row of roomPlayers || []) {
    playerCountByRoom.set(row.room_id, (playerCountByRoom.get(row.room_id) || 0) + 1);
  }

  return {
    data: {
      tables: (rooms || [])
        .filter((room) => room.game_mode !== "vs_ai")
        .map((room) => ({
        id: room.id,
        name: room.name || `Mesa ${room.code}`,
        code: room.code,
        buyIn: Number(room.buy_in),
        maxPlayers: room.max_players,
        currentPlayers: playerCountByRoom.get(room.id) || 0,
        createdAt: new Date(room.created_at).getTime(),
      })),
    },
  };
};

export const realtimeGame = {
  getTables: loadLobbyTables,

  async createTable(
    tableName: string,
    buyIn: number,
    initialStack: number,
    maxPlayers: number,
    userId: string,
    gameMode: "pvp" | "vs_ai" = "pvp"
  ): Promise<ApiResponse<{ table: GameTable }>> {
    void userId;
    return authFetch<{ table: GameTable }>("/realtime/rooms", "POST", {
      tableName,
      buyIn,
      initialStack,
      maxPlayers,
      gameMode,
      aiInitialStack: initialStack,
    });
  },

  async joinTable(tableId: string, userId: string, stackAmount: number): Promise<ApiResponse<{ table: GameTable }>> {
    void userId;
    return authFetch<{ table: GameTable }>(`/realtime/rooms/${tableId}/join`, "POST", { stackAmount });
  },

  async getTable(tableId: string): Promise<ApiResponse<{ table: GameTable }>> {
    const roomState = await loadRoomRows(tableId);
    if (!roomState.data) {
      return { error: roomState.error || "Mesa no encontrada" };
    }

    return { data: { table: mapRoomToGameTable(roomState.data.room, roomState.data.players) } };
  },

  async makeBet(tableId: string, userId: string, betAmount: number): Promise<ApiResponse<{ table: GameTable }>> {
    void userId;
    return authFetch<{ table: GameTable }>(`/realtime/rooms/${tableId}/bet`, "POST", { betAmount });
  },

  async nextRound(tableId: string): Promise<ApiResponse<{ table: GameTable }>> {
    return authFetch<{ table: GameTable }>(`/realtime/rooms/${tableId}/next-round`, "POST");
  },

  async leaveTable(tableId: string, userId: string): Promise<ApiResponse<{ success: boolean }>> {
    void userId;
    return authFetch<{ success: boolean }>(`/realtime/rooms/${tableId}/leave`, "POST");
  },

  async rebuy(tableId: string, userId: string): Promise<ApiResponse<{ table: GameTable }>> {
    void userId;
    return authFetch<{ table: GameTable }>(`/realtime/rooms/${tableId}/rebuy`, "POST");
  },

  async heartbeat(tableId: string, userId: string): Promise<ApiResponse<{ success: boolean }>> {
    void userId;
    const response = await authFetch<{ table: GameTable }>(`/realtime/rooms/${tableId}/heartbeat`, "POST");
    if (response.error) {
      return { error: response.error };
    }
    return { data: { success: true } };
  },

  subscribeToLobby(onTables: (tables: TableInfo[]) => void, onError?: (message: string) => void): () => void {
    const refresh = async () => {
      const result = await loadLobbyTables();
      if (result.data) {
        onTables(result.data.tables);
      } else if (result.error && onError) {
        onError(result.error);
      }
    };

    void refresh();

    const channel = supabase
      .channel("lobby:rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  subscribeToGame(
    roomId: string,
    onTable: (table: GameTable) => void,
    onError?: (message: string) => void
  ): () => void {
    const refresh = async () => {
      const result = await this.getTable(roomId);
      if (result.data) {
        onTable(result.data.table);
      } else if (result.error && onError) {
        onError(result.error);
      }
    };

    void refresh();

    const channel = supabase
      .channel(`game:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        console.log("Realtime: rooms update", payload);
        void refresh();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        (payload) => {
          console.log("Realtime: room_players update", payload);
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_moves", filter: `room_id=eq.${roomId}` },
        (payload) => {
          console.log("Realtime: room_moves update", payload);
          void refresh();
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status for ${roomId}:`, status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
