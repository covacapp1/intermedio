export type Suit = "oros" | "copas" | "espadas" | "bastos";
export type Value = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  suit: Suit;
  value: Value;
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  balance: number;
  bet: number;
  cards: Card[];
  thirdCard: Card | null;
  result: string;
  photoUrl?: string;
  connected?: boolean;
  lastSeen?: number;
  rebuyDeadline?: number;
  hasDeclinedRebuy?: boolean;
}

export interface GameState {
  mode?: "pvp" | "vs_ai";
  tableCode: string;
  initialBuyIn: number;
  maxPlayers: number;
  pot: number;
  deck: Card[];
  round: number;
  roundResolved: boolean;
  currentTurn: number;
  turnStartedAt: number;
  players: Player[];
}
