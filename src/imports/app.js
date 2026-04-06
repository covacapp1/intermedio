const SUITS = ["oros", "copas", "espadas", "bastos"];
const VALUES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

const elements = {
  lobbyView: document.getElementById("lobbyView"),
  gameView: document.getElementById("gameView"),
  buyInInput: document.getElementById("buyInInput"),
  joinCodeInput: document.getElementById("joinCodeInput"),
  playNowBtn: document.getElementById("playNowBtn"),
  createTableBtn: document.getElementById("createTableBtn"),
  joinTableBtn: document.getElementById("joinTableBtn"),
  lobbyMessage: document.getElementById("lobbyMessage"),
  tableCodeText: document.getElementById("tableCodeText"),
  buyInText: document.getElementById("buyInText"),
  potText: document.getElementById("potText"),
  playersBoard: document.getElementById("playersBoard"),
  betInput: document.getElementById("betInput"),
  playRoundBtn: document.getElementById("playRoundBtn"),
  passBtn: document.getElementById("passBtn"),
  nextRoundBtn: document.getElementById("nextRoundBtn"),
  roundMessage: document.getElementById("roundMessage"),
  potModal: document.getElementById("potModal"),
  continueBtn: document.getElementById("continueBtn"),
  closeTableBtn: document.getElementById("closeTableBtn")
};

const GameState = {
  tableCode: "",
  initialBuyIn: 0,
  pot: 0,
  deck: [],
  round: 1,
  roundResolved: false,
  players: []
};

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function ensureDeck(minCardsNeeded) {
  if (GameState.deck.length >= minCardsNeeded) {
    return;
  }
  GameState.deck = shuffleDeck(createDeck());
}

function drawCard() {
  if (!GameState.deck.length) {
    ensureDeck(40);
  }
  return GameState.deck.pop();
}

function randomTableCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function money(value) {
  return `$${Math.round(value)}`;
}

function setView(isGame) {
  elements.lobbyView.classList.toggle("active", !isGame);
  elements.gameView.classList.toggle("active", isGame);
}

function startTable({ code, buyIn }) {
  const safeBuyIn = Number(buyIn);
  if (!Number.isFinite(safeBuyIn) || safeBuyIn < 100) {
    elements.lobbyMessage.textContent = "Ingresa un monto valido (minimo $100).";
    return;
  }

  GameState.tableCode = code;
  GameState.initialBuyIn = safeBuyIn;
  GameState.pot = safeBuyIn * 3;
  GameState.round = 1;
  GameState.roundResolved = false;
  GameState.deck = shuffleDeck(createDeck());
  GameState.players = [
    { id: "you", name: "Tu", isAI: false, balance: safeBuyIn, bet: 0, cards: [], thirdCard: null, result: "" },
    { id: "ai1", name: "IA Norte", isAI: true, balance: safeBuyIn, bet: 0, cards: [], thirdCard: null, result: "" },
    { id: "ai2", name: "IA Sur", isAI: true, balance: safeBuyIn, bet: 0, cards: [], thirdCard: null, result: "" }
  ];

  elements.tableCodeText.textContent = GameState.tableCode;
  elements.buyInText.textContent = money(GameState.initialBuyIn);
  elements.lobbyMessage.textContent = `Mesa ${GameState.tableCode} lista.`;
  elements.betInput.value = Math.max(50, Math.floor(GameState.initialBuyIn * 0.2));

  setView(true);
  startRound();
}

function startRound() {
  GameState.roundResolved = false;
  ensureDeck(9);

  for (const player of GameState.players) {
    player.cards = [drawCard(), drawCard()];
    player.thirdCard = null;
    player.bet = 0;
    player.result = "";
  }

  elements.roundMessage.textContent = `Ronda ${GameState.round}. Define tu apuesta o pasa la mano.`;
  elements.playRoundBtn.disabled = false;
  elements.passBtn.disabled = false;
  elements.nextRoundBtn.disabled = true;

  render();
}

function evaluateHand(cardA, cardB, cardC) {
  const low = Math.min(cardA.value, cardB.value);
  const high = Math.max(cardA.value, cardB.value);
  return cardC.value > low && cardC.value < high;
}

function getAvailableBalance(player) {
  return Math.max(0, Math.floor(player.balance));
}

function randomAIBet() {
  const minBet = Math.max(50, Math.floor(GameState.initialBuyIn * 0.1));
  const maxBet = Math.max(minBet, Math.floor(GameState.initialBuyIn * 0.35));
  const raw = Math.floor(Math.random() * (maxBet - minBet + 1)) + minBet;
  return Math.floor(raw / 50) * 50;
}

function resolvePlayer(player, bet) {
  const safeBet = Math.min(Math.max(0, Math.floor(bet)), getAvailableBalance(player));
  if (!safeBet || safeBet <= 0) {
    player.bet = 0;
    player.thirdCard = null;
    player.result = "Pasa";
    return;
  }

  player.bet = safeBet;
  player.thirdCard = drawCard();

  const won = evaluateHand(player.cards[0], player.cards[1], player.thirdCard);

  if (won) {
    const prize = Math.min(GameState.pot, safeBet);
    GameState.pot -= prize;
    player.balance += prize;
    player.result = `Gana ${money(prize)}`;
    return;
  }

  GameState.pot += safeBet;
  player.balance -= safeBet;
  player.result = `Pierde ${money(safeBet)}`;
}

function getAIMove(player) {
  const available = getAvailableBalance(player);
  if (available < 50) {
    return 0;
  }

  const willPass = Math.random() < 0.2;
  if (willPass) {
    return 0;
  }
  return Math.min(randomAIBet(), available);
}

function resolveRound(userPassed) {
  let userBet = 0;
  const you = GameState.players.find((player) => player.id === "you");

  if (!userPassed) {
    userBet = Number(elements.betInput.value);
    if (!Number.isFinite(userBet) || userBet < 50) {
      elements.roundMessage.textContent = "Tu apuesta debe ser valida y minimo $50, o usa Pasar.";
      return;
    }
    if (you && userBet > getAvailableBalance(you)) {
      elements.roundMessage.textContent = `No puedes apostar mas de tu saldo (${money(getAvailableBalance(you))}).`;
      return;
    }
  }

  ensureDeck(3);

  for (const player of GameState.players) {
    const bet = player.isAI ? getAIMove(player) : userBet;
    resolvePlayer(player, bet);
  }

  GameState.roundResolved = true;
  elements.playRoundBtn.disabled = true;
  elements.passBtn.disabled = true;
  elements.nextRoundBtn.disabled = false;

  if (GameState.pot <= 0) {
    GameState.pot = 0;
    elements.roundMessage.textContent = "El pozo llego a $0.";
    openPotModal();
  } else {
    elements.roundMessage.textContent = `Ronda ${GameState.round} finalizada. Pozo actual: ${money(GameState.pot)}.`;
  }

  render();
}

function openPotModal() {
  elements.potModal.classList.remove("hidden");
}

function closePotModal() {
  elements.potModal.classList.add("hidden");
}

function continueTable() {
  const recharge = GameState.initialBuyIn;
  for (const player of GameState.players) {
    player.balance -= recharge;
  }

  GameState.pot += recharge * GameState.players.length;
  closePotModal();
  elements.roundMessage.textContent = `Se recargo el pozo con ${money(recharge)} por jugador.`;
  GameState.round += 1;
  startRound();
}

function closeTable() {
  closePotModal();
  GameState.tableCode = "";
  GameState.initialBuyIn = 0;
  GameState.pot = 0;
  GameState.deck = [];
  GameState.players = [];
  GameState.round = 1;
  GameState.roundResolved = false;

  elements.roundMessage.textContent = "";
  elements.tableCodeText.textContent = "------";
  elements.buyInText.textContent = "$0";
  elements.potText.textContent = "$0";
  elements.playersBoard.innerHTML = "";

  setView(false);
  elements.lobbyMessage.textContent = "Mesa cerrada. Volviste al lobby.";
}

function nextRound() {
  if (!GameState.roundResolved) {
    return;
  }
  GameState.round += 1;
  startRound();
}

function cardLabel(card) {
  return `${card.value}<br><small>${card.suit}</small>`;
}

function renderPlayers() {
  const you = GameState.players.find((player) => player.id === "you");
  const left = GameState.players.find((player) => player.id === "ai1");
  const right = GameState.players.find((player) => player.id === "ai2");

  const seatHtml = (player, seatClass) => {
    if (!player) {
      return "";
    }

    const thirdCardHtml = player.thirdCard
      ? `<div class="card">${cardLabel(player.thirdCard)}</div>`
      : '<div class="card hidden">?</div>';

    return `
      <article class="seat ${seatClass}">
        <div class="player-head">
          <strong>${player.name}</strong>
          <span>Apuesta: ${player.bet ? money(player.bet) : "-"}</span>
        </div>
        <p class="hint seat-balance">Saldo: ${money(player.balance)}</p>
        <div class="cards-row">
          <div class="card">${cardLabel(player.cards[0])}</div>
          <div class="card">${cardLabel(player.cards[1])}</div>
          ${thirdCardHtml}
        </div>
        <p class="hint">${player.result || "Esperando jugada..."}</p>
      </article>
    `;
  };

  elements.playersBoard.innerHTML = `
    <section class="poker-table" aria-label="Mesa de juego">
      <div class="dealer-zone" aria-label="Crupier">
        <span class="dealer-label">CRUPIER</span>
        <div class="chips-row">
          <span class="chip chip-red"></span>
          <span class="chip chip-blue"></span>
          <span class="chip chip-gold"></span>
        </div>
      </div>
      ${seatHtml(left, "seat-left")}
      ${seatHtml(right, "seat-right")}
      ${seatHtml(you, "seat-bottom")}
    </section>
  `;
}

function renderMeta() {
  const you = GameState.players.find((player) => player.id === "you");
  const available = you ? getAvailableBalance(you) : 0;
  elements.potText.textContent = money(GameState.pot);
  elements.betInput.max = String(available);
}

function render() {
  renderMeta();
  renderPlayers();
}

function getBuyInFromInput() {
  return Number(elements.buyInInput.value);
}

elements.playNowBtn.addEventListener("click", () => {
  startTable({ code: randomTableCode(), buyIn: getBuyInFromInput() });
});

elements.createTableBtn.addEventListener("click", () => {
  const code = randomTableCode();
  startTable({ code, buyIn: getBuyInFromInput() });
  elements.lobbyMessage.textContent = `Mesa privada creada. Codigo: ${code}`;
});

elements.joinTableBtn.addEventListener("click", () => {
  const rawCode = elements.joinCodeInput.value.trim().toUpperCase();
  const code = rawCode || randomTableCode();
  startTable({ code, buyIn: getBuyInFromInput() });
});

elements.playRoundBtn.addEventListener("click", () => resolveRound(false));
elements.passBtn.addEventListener("click", () => resolveRound(true));
elements.nextRoundBtn.addEventListener("click", nextRound);
elements.continueBtn.addEventListener("click", continueTable);
elements.closeTableBtn.addEventListener("click", closeTable);

setView(false);
