export interface CampaignLocation {
  id: string;
  name: string;
  description: string;
  buyIn: number;
  aiCount: number;
  difficulty: "facil" | "normal" | "dificil" | "experto";
  unlocked: boolean;
  completed: boolean;
  x: number;
  y: number;
  icon: string;
}

export interface CampaignState {
  balance: number;
  locations: CampaignLocation[];
  currentLocationId: string | null;
  totalWon: number;
  totalLost: number;
  gamesPlayed: number;
  gamesWon: number;
}

export interface CampaignPlayer {
  id: string;
  name: string;
  isAI: boolean;
  isDealer: boolean;
  balance: number;
  bet: number;
  cards: { suit: string; value: number }[];
  thirdCard: { suit: string; value: number } | null;
  result: string;
  folded: boolean;
}

export interface CampaignGameState {
  locationId: string;
  buyIn: number;
  pot: number;
  round: number;
  roundResolved: boolean;
  currentTurn: number;
  players: CampaignPlayer[];
  deck: { suit: string; value: number }[];
  message: string;
}
