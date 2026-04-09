import { Card, Suit, Value } from "../types/game";

const SUITS: Suit[] = ["oros", "copas", "espadas", "bastos"];
const VALUES: Value[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function randomTableCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function evaluateHand(cardA: Card, cardB: Card, cardC: Card): boolean {
  const low = Math.min(cardA.value, cardB.value);
  const high = Math.max(cardA.value, cardB.value);
  return cardC.value > low && cardC.value < high;
}

export function formatMoney(value: number): string {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Math.round(value))} INT`;
}
