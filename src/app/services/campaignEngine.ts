import { createDeck, shuffleDeck, evaluateHand } from "../utils/deck";
import type { CampaignGameState, CampaignPlayer, CampaignLocation, CampaignState } from "../types/campaign";

const AI_NAMES = [
  "El Rápido", "La Viuda", "Cara de Piedra", "Mano Fría",
  "El Zorro", "Doña Suerte", "Terciopelo", "El Reloj",
  "Sombra", "La Cobra", "Pistolero", "El Escorpión",
];

export const DEFAULT_CAMPAIGN_LOCATIONS: CampaignLocation[] = [
  { id: "saloon1", name: "Salón del Polvo", description: "El primer salón. Fácil.", buyIn: 50, aiCount: 5, difficulty: "facil", unlocked: true, completed: false, x: 15, y: 75, icon: "🍺" },
  { id: "pueblo2", name: "Pueblo Rojo", description: "Los locales juegan duro.", buyIn: 50, aiCount: 5, difficulty: "facil", unlocked: false, completed: false, x: 30, y: 60, icon: "🏘" },
  { id: "mina3", name: "La Mina", description: "Oro y riesgo.", buyIn: 50, aiCount: 5, difficulty: "normal", unlocked: false, completed: false, x: 45, y: 70, icon: "⛏" },
  { id: "rio4", name: "Puerto del Río", description: "Jugadores viajeros.", buyIn: 50, aiCount: 5, difficulty: "normal", unlocked: false, completed: false, x: 55, y: 45, icon: "⛵" },
  { id: "ciudad5", name: "Ciudad Grande", description: "Todo cambia aquí.", buyIn: 50, aiCount: 5, difficulty: "dificil", unlocked: false, completed: false, x: 70, y: 55, icon: "🏙" },
  { id: "fortin6", name: "El Fortín", description: "Solo los duros llegan.", buyIn: 50, aiCount: 5, difficulty: "dificil", unlocked: false, completed: false, x: 80, y: 35, icon: "🏰" },
  { id: "capital7", name: "La Capital", description: "Antes del jefe final.", buyIn: 50, aiCount: 5, difficulty: "experto", unlocked: false, completed: false, x: 88, y: 20, icon: "👑" },
  { id: "gobernador8", name: "Residencia del Gobernador", description: "El desafío final.", buyIn: 50, aiCount: 5, difficulty: "experto", unlocked: false, completed: false, x: 92, y: 8, icon: "🏆" },
];

export function createCampaignState(): CampaignState {
  return {
    balance: 500,
    locations: DEFAULT_CAMPAIGN_LOCATIONS.map((l) => ({ ...l })),
    currentLocationId: null,
    totalWon: 0,
    totalLost: 0,
    gamesPlayed: 0,
    gamesWon: 0,
  };
}

function randomName(used: Set<string>): string {
  const available = AI_NAMES.filter((n) => !used.has(n));
  const pool = available.length > 0 ? available : AI_NAMES;
  const name = pool[Math.floor(Math.random() * pool.length)];
  used.add(name);
  return name;
}

export function startCampaignGame(location: CampaignLocation): CampaignGameState {
  const deck = shuffleDeck(createDeck().map((c) => ({ suit: c.suit, value: c.value })));
  const usedNames = new Set<string>();
  const players: CampaignPlayer[] = [];

  for (let i = 0; i < location.aiCount; i++) {
    players.push({
      id: `ai-${i}`,
      name: randomName(usedNames),
      isAI: true,
      isDealer: false,
      balance: location.buyIn,
      bet: -1,
      cards: [],
      thirdCard: null,
      result: "",
      folded: false,
    });
  }

  players.push({
    id: "you",
    name: "Vos",
    isAI: false,
    isDealer: false,
    balance: location.buyIn,
    bet: -1,
    cards: [],
    thirdCard: null,
    result: "",
    folded: false,
  });

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const youIndex = shuffled.findIndex((p) => p.id === "you");
  const you = shuffled.splice(youIndex, 1)[0];
  shuffled.push(you);

  const state: CampaignGameState = {
    locationId: location.id,
    buyIn: location.buyIn,
    pot: location.buyIn * 10,
    round: 1,
    roundResolved: false,
    currentTurn: 0,
    players: shuffled,
    deck,
    message: "Ronda 1 — ¡Empezá!",
  };

  dealRound(state);
  state.currentTurn = findFirstActiveTurn(state);
  return state;
}

function dealRound(state: CampaignGameState) {
  for (const p of state.players) {
    if (p.balance <= 0) continue;
    p.bet = -1;
    p.thirdCard = null;
    p.result = "";
    p.folded = false;
    p.cards = [drawCard(state), drawCard(state)];
  }
  state.roundResolved = false;
}

function drawCard(state: CampaignGameState): { suit: string; value: number } {
  if (state.deck.length === 0) {
    state.deck = shuffleDeck(createDeck().map((c) => ({ suit: c.suit, value: c.value })));
  }
  return state.deck.pop()!;
}

function findFirstActiveTurn(state: CampaignGameState): number {
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].bet === -1 && state.players[i].balance > 0) return i;
  }
  return 0;
}

function findNextTurn(state: CampaignGameState): number {
  const start = state.currentTurn;
  for (let i = 1; i <= state.players.length; i++) {
    const idx = (start + i) % state.players.length;
    if (state.players[idx].bet === -1 && state.players[idx].balance > 0) return idx;
  }
  return -1;
}

export function calculateWinChance(cardA: { value: number }, cardB: { value: number }): number {
  const low = Math.min(cardA.value, cardB.value);
  const high = Math.max(cardA.value, cardB.value);
  if (high - low <= 1) return 0;
  return (high - low - 1) / 10;
}

function aiDecide(state: CampaignGameState, player: CampaignPlayer): number {
  if (player.cards.length < 2) return 0;
  const chance = calculateWinChance(player.cards[0], player.cards[1]);
  const maxBet = Math.min(player.balance, state.pot);

  if (chance <= 0.1) return 0;
  if (chance < 0.2) return Math.random() < 0.6 ? 0 : Math.max(1, Math.floor(maxBet * 0.15));
  if (chance < 0.35) return Math.random() < 0.35 ? 0 : Math.max(1, Math.floor(maxBet * 0.25));
  if (chance < 0.55) return Math.max(1, Math.floor(maxBet * (0.3 + Math.random() * 0.2)));
  if (chance < 0.75) return Math.max(1, Math.floor(maxBet * (0.5 + Math.random() * 0.25)));
  return Math.max(1, Math.floor(maxBet * (0.65 + Math.random() * 0.3)));
}

export function aiAction(state: CampaignGameState, playerIndex: number): CampaignGameState {
  const s = JSON.parse(JSON.stringify(state)) as CampaignGameState;
  const player = s.players[playerIndex];
  if (!player || player.bet >= 0 || player.balance <= 0) return s;
  applyAction(s, playerIndex, aiDecide(s, player));
  return s;
}

function applyAction(state: CampaignGameState, playerIndex: number, bet: number) {
  const player = state.players[playerIndex];

  if (bet <= 0) {
    player.bet = 0;
    player.folded = true;
    player.result = "Pasa";
  } else {
    const actualBet = Math.max(1, Math.min(bet, player.balance));
    const card = drawCard(state);
    player.thirdCard = card;
    const won = evaluateHand(
      { suit: player.cards[0].suit, value: player.cards[0].value },
      { suit: player.cards[1].suit, value: player.cards[1].value },
      card
    );
    if (won) {
      player.balance += actualBet;
      state.pot -= actualBet;
      player.result = `Gana ${actualBet} INT`;
    } else {
      player.balance -= actualBet;
      state.pot += actualBet;
      player.result = `Pierde ${actualBet} INT`;
    }
    if (state.pot < state.buyIn) state.pot = state.buyIn * 10;
    player.bet = actualBet;
  }

  const next = findNextTurn(state);
  if (next === -1) {
    state.roundResolved = true;
    state.message = `Ronda ${state.round} finalizada.`;
  } else {
    state.currentTurn = next;
  }
}

export function playerAction(state: CampaignGameState, bet: number): CampaignGameState {
  const s = JSON.parse(JSON.stringify(state)) as CampaignGameState;
  if (s.roundResolved || s.players[s.currentTurn]?.id !== "you") return s;
  applyAction(s, s.currentTurn, bet);
  return s;
}

export function advanceRound(state: CampaignGameState): CampaignGameState {
  const s = JSON.parse(JSON.stringify(state)) as CampaignGameState;
  if (!s.roundResolved || isGameOver(s)) return s;

  s.round += 1;
  dealRound(s);
  s.currentTurn = findFirstActiveTurn(s);
  s.message = `Ronda ${s.round} — ¡Empezá!`;
  return s;
}

export function isGameOver(state: CampaignGameState): boolean {
  const you = state.players.find((p) => p.id === "you");
  if (!you || you.balance <= 0) return true;
  return !state.players.some((p) => p.id !== "you" && p.balance > 0);
}

export function didYouWin(state: CampaignGameState): boolean {
  const you = state.players.find((p) => p.id === "you");
  if (!you || you.balance <= 0) return false;
  return !state.players.some((p) => p.id !== "you" && p.balance > 0);
}

export function getCampaignStorageKey(userId: string): string {
  return `campaign_${userId}`;
}

export function loadCampaignState(userId: string): CampaignState | null {
  try {
    const raw = localStorage.getItem(getCampaignStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CampaignState;
    if (!parsed.locations || !Array.isArray(parsed.locations) || typeof parsed.balance !== "number") return null;
    parsed.locations = DEFAULT_CAMPAIGN_LOCATIONS.map((d) => {
      const saved = parsed.locations.find((l) => l.id === d.id);
      return saved ? { ...d, unlocked: saved.unlocked, completed: saved.completed } : { ...d };
    });
    return parsed;
  } catch {
    return null;
  }
}

export function saveCampaignState(userId: string, state: CampaignState): void {
  try {
    localStorage.setItem(getCampaignStorageKey(userId), JSON.stringify(state));
  } catch {
    // storage unavailable
  }
}
