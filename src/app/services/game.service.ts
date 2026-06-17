import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { Card, CardColor } from '../models/card.model';
import { Player } from '../models/player.model';
import { GameState, GamePhase, GameNotification } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class GameService {
  private state: WritableSignal<GameState> = signal<GameState>({
    players: [],
    drawPile: [],
    discardPile: [],
    currentPlayerIndex: 0,
    direction: 1,
    phase: 'setup',
    winner: null,
    pendingDrawCount: 0,
    drawnThisTurn: false,
    drawnCards: [],
  });

  private notifications: WritableSignal<GameNotification[]> = signal([]);
  private notifId = 0;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;

  readonly gameState = computed(() => this.state());
  readonly currentPlayer = computed(() => {
    const s = this.state();
    return s.players[s.currentPlayerIndex] || null;
  });
  readonly topCard = computed(() => {
    const pile = this.state().discardPile;
    return pile.length > 0 ? pile[pile.length - 1] : null;
  });
  readonly isHumanTurn = computed(() => {
    const p = this.currentPlayer();
    return p !== null && p.isHuman;
  });
  readonly notificationsList = computed(() => this.notifications());
  readonly mustDraw = computed(() => {
    const s = this.state();
    if (s.phase !== 'playing') return false;
    if (s.drawnThisTurn) return false;
    const player = s.players[s.currentPlayerIndex];
    if (!player || !player.isHuman) return false;
    return !player.hand.some(c => this.canPlayCard(c));
  });

  private nextId = 0;

  private getNextId(): number {
    return this.nextId++;
  }

  private addNotification(message: string, color: string): void {
    const id = this.notifId++;
    const notif: GameNotification = { id, message, color };
    this.notifications.update(n => [...n, notif]);
    setTimeout(() => {
      this.notifications.update(n => n.filter(x => x.id !== id));
    }, 3000);
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    for (const color of colors) {
      deck.push({ id: this.getNextId(), color, type: 'number', value: 0 });
      for (let n = 1; n <= 9; n++) {
        deck.push({ id: this.getNextId(), color, type: 'number', value: n });
        deck.push({ id: this.getNextId(), color, type: 'number', value: n });
      }
      for (let i = 0; i < 2; i++) {
        deck.push({ id: this.getNextId(), color, type: 'skip' });
        deck.push({ id: this.getNextId(), color, type: 'reverse' });
        deck.push({ id: this.getNextId(), color, type: 'draw2' });
      }
    }
    for (let i = 0; i < 4; i++) {
      deck.push({ id: this.getNextId(), color: 'wild', type: 'wild' });
      deck.push({ id: this.getNextId(), color: 'wild', type: 'wild4' });
    }
    return deck;
  }

  private shuffle(cards: Card[]): Card[] {
    const arr = [...cards];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  initGame(playerNames: string[]): void {
    this.nextId = 0;
    this.notifications.set([]);
    const deck = this.shuffle(this.createDeck());
    const playerList: Player[] = playerNames.map((name, i) => ({
      id: i,
      name,
      hand: [],
      isCurrentTurn: false,
      isHuman: i === 0,
    }));

    for (const player of playerList) {
      player.hand = deck.splice(0, 7);
    }

    let firstCard = deck.pop()!;
    while (firstCard.type === 'wild4' || firstCard.type === 'wild') {
      deck.unshift(firstCard);
      firstCard = deck.pop()!;
    }

    this.state.set({
      players: playerList,
      drawPile: deck,
      discardPile: [firstCard],
      currentPlayerIndex: 0,
      direction: 1,
      phase: 'playing',
      winner: null,
      pendingDrawCount: 0,
      drawnThisTurn: false,
      drawnCards: [],
    });

    playerList[0].isCurrentTurn = true;
    this.state.update(s => ({ ...s, players: [...playerList] }));
    this.addNotification('Game started! Your turn.', '#ffd835');
    this.scheduleAI();
  }

  playCard(cardId: number, chosenColor?: CardColor): void {
    const s = this.state();
    if (s.phase !== 'playing') return;

    const player = s.players[s.currentPlayerIndex];
    const handIndex = player.hand.findIndex(c => c.id === cardId);
    const drawIndex = s.drawnCards.findIndex(c => c.id === cardId);
    if (handIndex === -1 && drawIndex === -1) return;

    const card = handIndex !== -1 ? { ...player.hand[handIndex] } : { ...s.drawnCards[drawIndex] };
    if (!this.canPlayCard(card)) return;

    if (card.type === 'wild' || card.type === 'wild4') {
      card.chosenColor = chosenColor || this.pickBestColor(player.hand);
      const cName = card.chosenColor.charAt(0).toUpperCase() + card.chosenColor.slice(1);
      this.addNotification(`${player.name} played Wild → ${cName}`, '#ffd835');
    } else {
      let label = card.type === 'number' ? String(card.value) : card.type;
      this.addNotification(`${player.name} played ${label}`, this.colorHex(card.color));
    }

    let newHand = [...player.hand];
    let newDrawn = [...s.drawnCards];
    if (handIndex !== -1) {
      newHand = player.hand.filter(c => c.id !== cardId);
    } else {
      newDrawn = s.drawnCards.filter(c => c.id !== cardId);
      newHand = [...newHand, ...newDrawn];
      newDrawn = [];
    }
    player.hand = newHand;

    const newDiscard = [...s.discardPile, card];

    if (newHand.length === 0) {
      this.cancelAI();
      this.state.update(st => ({
        ...st,
        players: st.players.map(p => p.id === player.id ? { ...player } : p),
        drawnCards: newDrawn,
        discardPile: newDiscard,
        phase: 'finished' as GamePhase,
        winner: { ...player, hand: [] },
      }));
      this.addNotification(`${player.name} wins! 🎉`, '#ffd835');
      return;
    }

    if (newHand.length === 1) {
      this.addNotification(`${player.name} says UNO! 🃏`, '#ffd835');
    }

    const pendingDraw = s.pendingDrawCount;
    let newPendingDraw = pendingDraw;
    let skipNext = false;

    if (card.type === 'skip') {
      skipNext = true;
      const targetIdx = (s.currentPlayerIndex + s.direction + s.players.length) % s.players.length;
      this.addNotification(`${s.players[targetIdx].name} was skipped! ⏭️`, '#ff9800');
    } else if (card.type === 'reverse') {
      if (s.players.length === 2) {
        skipNext = true;
        const targetIdx = (s.currentPlayerIndex + s.direction + s.players.length) % s.players.length;
        this.addNotification(`${s.players[targetIdx].name} was skipped! ⏭️`, '#ff9800');
      } else {
        this.state.update(st => ({ ...st, direction: (st.direction * -1) as 1 | -1 }));
        this.addNotification('Direction reversed! 🔄', '#9c27b0');
      }
    } else if (card.type === 'draw2') {
      newPendingDraw = pendingDraw + 2;
      this.addNotification(`${player.name} played +2!`, '#ff9800');
    } else if (card.type === 'wild4') {
      newPendingDraw = pendingDraw + 4;
      this.addNotification(`${player.name} played +4!`, '#ff9800');
    }

    const advance = skipNext ? 2 : 1;
    let nextIndex = (s.currentPlayerIndex + s.direction * advance + s.players.length) % s.players.length;

    this.state.update(st => ({
      ...st,
      players: st.players.map(p => p.id === player.id ? { ...player } : p),
      drawnCards: newDrawn,
      discardPile: newDiscard,
      currentPlayerIndex: nextIndex,
      pendingDrawCount: newPendingDraw,
      drawnThisTurn: false,
    }));

    this.state.update(st => {
      const players = st.players.map((p, i) => ({
        ...p,
        isCurrentTurn: i === st.currentPlayerIndex,
      }));
      return { ...st, players };
    });

    this.scheduleAI();
  }

  drawCard(): void {
    const s = this.state();
    if (s.phase !== 'playing') return;
    if (s.drawnThisTurn) return;

    const player = s.players[s.currentPlayerIndex];
    const drawCount = s.pendingDrawCount > 0 ? s.pendingDrawCount : 1;
    const drawn = this.drawFromPile(drawCount);
    const newDrawn = [...s.drawnCards, ...drawn];

    this.addNotification(`${player.name} drew ${drawn.length} card${drawn.length > 1 ? 's' : ''}`, '#2196f3');

    const canPlayDrawn = drawn.some(c => this.canPlayCard(c));

    this.state.update(st => ({
      ...st,
      drawPile: [...st.drawPile],
      pendingDrawCount: 0,
      drawnThisTurn: true,
      drawnCards: newDrawn,
    }));

    if (!canPlayDrawn) {
      this.passTurn();
    } else if (!player.isHuman) {
      this.scheduleAI();
    }
  }

  passTurn(): void {
    const s = this.state();
    if (s.phase !== 'playing') return;

    if (s.drawnCards.length > 0) {
      const player = s.players[s.currentPlayerIndex];
      player.hand = [...player.hand, ...s.drawnCards];
      this.state.update(st => ({
        ...st,
        players: st.players.map(p => p.id === player.id ? { ...player } : p),
        drawnCards: [],
      }));
    }

    this.endTurn();
  }

  canPlayCard(card: Card): boolean {
    const top = this.topCard();
    if (!top) return true;

    const s = this.state();
    const player = s.players[s.currentPlayerIndex];
    const effectiveColor = top.chosenColor || top.color;

    if (card.type === 'wild') {
      if (s.pendingDrawCount > 0) return false;
      return true;
    }

    if (card.type === 'wild4') {
      const hasMatchingColor = player.hand.some(
        c => c.id !== card.id && c.color === effectiveColor && c.type !== 'wild' && c.type !== 'wild4'
      );
      return !hasMatchingColor;
    }

    if (s.pendingDrawCount > 0) {
      return card.type === 'draw2';
    }

    if (effectiveColor === 'wild') return true;
    if (card.color === effectiveColor) return true;

    if (card.type === 'number' && top.type === 'number') {
      return card.value === top.value;
    }
    return card.type !== 'number' && card.type === top.type;
  }

  private drawFromPile(count: number): Card[] {
    const drawn: Card[] = [];
    let pile: Card[] = [];

    for (let i = 0; i < count; i++) {
      const cur = this.state();
      if (pile.length === 0) {
        pile = [...cur.drawPile];
      }
      if (pile.length === 0) {
        if (cur.discardPile.length <= 1) break;
        const topPile = cur.discardPile[cur.discardPile.length - 1];
        const rest = cur.discardPile.slice(0, -1);
        pile = this.shuffle(rest);
        this.state.update(st => ({
          ...st,
          discardPile: [topPile],
          drawPile: pile,
        }));
      }
      drawn.push(pile.pop()!);
    }

    this.state.update(st => ({ ...st, drawPile: pile }));
    return drawn;
  }

  private pickBestColor(hand: Card[]): CardColor {
    const counts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const c of hand) {
      if (c.color !== 'wild') counts[c.color]++;
    }
    let best: CardColor = 'red';
    let max = 0;
    for (const [color, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        best = color as CardColor;
      }
    }
    return best;
  }

  private colorHex(color: CardColor): string {
    switch (color) {
      case 'red': return '#e53935';
      case 'blue': return '#2196f3';
      case 'green': return '#43a047';
      case 'yellow': return '#fdd835';
      default: return '#fff';
    }
  }

  private endTurn(): void {
    const currentPlayerName = this.state().players[this.state().currentPlayerIndex]?.name || '';
    this.state.update(s => {
      const prevPlayerIdx = s.currentPlayerIndex;
      let nextIdx = (prevPlayerIdx + s.direction + s.players.length) % s.players.length;
      let players = s.players.map(p => ({ ...p, isCurrentTurn: false }));
      players[nextIdx] = { ...players[nextIdx], isCurrentTurn: true };
      return { ...s, currentPlayerIndex: nextIdx, players, drawnThisTurn: false, drawnCards: [] };
    });

    const s = this.state();
    const nextPlayer = s.players[s.currentPlayerIndex];
    if (nextPlayer) {
      this.addNotification(`${nextPlayer.name}'s turn`, nextPlayer.isHuman ? '#ffd835' : '#9e9e9e');
    }

    this.scheduleAI();
  }

  private cancelAI(): void {
    if (this.aiTimer !== null) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  private scheduleAI(): void {
    this.cancelAI();
    const s = this.state();
    if (s.phase !== 'playing') return;
    const player = s.players[s.currentPlayerIndex];
    if (!player || player.isHuman) return;
    this.aiTimer = setTimeout(() => this.runAI(), 800);
  }

  private runAI(): void {
    const s = this.state();
    if (s.phase !== 'playing') return;

    const player = s.players[s.currentPlayerIndex];
    if (!player || player.isHuman) return;

    const drawnPlayable = s.drawnCards.filter(c => this.canPlayCard(c));
    if (drawnPlayable.length > 0) {
      this.playCard(drawnPlayable[0].id);
      return;
    }

    const playableCards = player.hand.filter(c => this.canPlayCard(c));

    if (s.pendingDrawCount > 0) {
      const draw2Cards = playableCards.filter(c => c.type === 'draw2');
      if (draw2Cards.length > 0) {
        this.playCard(draw2Cards[0].id);
        return;
      }
      this.drawCard();
      return;
    }

    if (playableCards.length > 0) {
      const wild4 = playableCards.filter(c => c.type === 'wild4');
      const wild = playableCards.filter(c => c.type === 'wild');
      const draw2 = playableCards.filter(c => c.type === 'draw2');
      const skip = playableCards.filter(c => c.type === 'skip');
      const reverse = playableCards.filter(c => c.type === 'reverse');
      const numbers = playableCards.filter(c => c.type === 'number');

      if (draw2.length > 0) { this.playCard(draw2[0].id); return; }
      if (skip.length > 0) { this.playCard(skip[0].id); return; }
      if (reverse.length > 0) { this.playCard(reverse[0].id); return; }
      if (numbers.length > 0) { this.playCard(numbers[0].id); return; }
      if (wild4.length > 0) { this.playCard(wild4[0].id, this.pickBestColor(player.hand)); return; }
      if (wild.length > 0) { this.playCard(wild[0].id, this.pickBestColor(player.hand)); return; }
    }

    this.drawCard();
  }

  resetGame(): void {
    this.cancelAI();
    this.notifications.set([]);
    this.state.set({
      players: [],
      drawPile: [],
      discardPile: [],
      currentPlayerIndex: 0,
      direction: 1,
      phase: 'setup',
      winner: null,
      pendingDrawCount: 0,
      drawnThisTurn: false,
      drawnCards: [],
    });
  }
}
