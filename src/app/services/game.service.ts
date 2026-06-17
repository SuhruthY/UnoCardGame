import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { Card, CardColor } from '../models/card.model';
import { Player } from '../models/player.model';
import { GameState, GamePhase, GameNotification } from '../models/game.model';
import { SoundService } from './sound.service';

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private sound: SoundService) {}

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
  private notificationIdCounter = 0;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;
  private humanAnalysis: { handSize: number; colorCounts: Record<string, number> } | null = null;

  readonly gameState = computed(() => this.state());
  readonly currentPlayer = computed(() => {
    const currentState = this.state();
    return currentState.players[currentState.currentPlayerIndex] || null;
  });
  readonly topCard = computed(() => {
    const discardPile = this.state().discardPile;
    return discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  });
  readonly isHumanTurn = computed(() => {
    const activePlayer = this.currentPlayer();
    return activePlayer !== null && activePlayer.isHuman;
  });
  readonly notificationsList = computed(() => this.notifications());
  readonly mustDraw = computed(() => {
    const currentState = this.state();
    if (currentState.phase !== 'playing') return false;
    if (currentState.drawnThisTurn) return false;
    const activePlayer = currentState.players[currentState.currentPlayerIndex];
    if (!activePlayer || !activePlayer.isHuman) return false;
    return !activePlayer.hand.some(card => this.canPlayCard(card));
  });

  private nextCardId = 0;

  private getNextCardId(): number {
    return this.nextCardId++;
  }

  private addNotification(message: string, color: string): void {
    const notificationId = this.notificationIdCounter++;
    const newNotification: GameNotification = { id: notificationId, message, color };
    this.notifications.update(currentNotifications => [...currentNotifications.slice(-4), newNotification]);
    setTimeout(() => {
      this.notifications.update(currentNotifications => currentNotifications.filter(n => n.id !== notificationId));
    }, 3500);
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    for (const color of colors) {
      deck.push({ id: this.getNextCardId(), color, type: 'number', value: 0 });
      for (let n = 1; n <= 9; n++) {
        deck.push({ id: this.getNextCardId(), color, type: 'number', value: n });
        deck.push({ id: this.getNextCardId(), color, type: 'number', value: n });
      }
      for (let i = 0; i < 2; i++) {
        deck.push({ id: this.getNextCardId(), color, type: 'skip' });
        deck.push({ id: this.getNextCardId(), color, type: 'reverse' });
        deck.push({ id: this.getNextCardId(), color, type: 'draw2' });
      }
    }
    for (let i = 0; i < 4; i++) {
      deck.push({ id: this.getNextCardId(), color: 'wild', type: 'wild' });
      deck.push({ id: this.getNextCardId(), color: 'wild', type: 'wild4' });
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
    this.nextCardId = 0;
    this.notifications.set([]);
    const shuffledDeck = this.shuffle(this.createDeck());
    const players: Player[] = playerNames.map((name, index) => ({
      id: index,
      name,
      hand: [],
      isCurrentTurn: false,
      isHuman: index === 0,
    }));

    for (const player of players) {
      player.hand = shuffledDeck.splice(0, 7);
    }

    let firstCard = shuffledDeck.pop()!;
    while (firstCard.type === 'wild4' || firstCard.type === 'wild') {
      shuffledDeck.unshift(firstCard);
      firstCard = shuffledDeck.pop()!;
    }

    this.state.set({
      players,
      drawPile: shuffledDeck,
      discardPile: [firstCard],
      currentPlayerIndex: 0,
      direction: 1,
      phase: 'playing',
      winner: null,
      pendingDrawCount: 0,
      drawnThisTurn: false,
      drawnCards: [],
    });

    players[0].isCurrentTurn = true;
    this.state.update(currentState => ({ ...currentState, players: [...players] }));
    this.addNotification('Game started. Your turn.', 'rgba(255,255,255,0.6)');
    this.scheduleAI();
  }

  playCard(cardId: number, chosenColor?: CardColor): void {
    const currentState = this.state();
    if (currentState.phase !== 'playing') return;

    const activePlayer = currentState.players[currentState.currentPlayerIndex];
    const handCardIndex = activePlayer.hand.findIndex(card => card.id === cardId);
    const drawnCardIndex = currentState.drawnCards.findIndex(card => card.id === cardId);
    if (handCardIndex === -1 && drawnCardIndex === -1) return;

    const playedCard = handCardIndex !== -1
      ? { ...activePlayer.hand[handCardIndex] }
      : { ...currentState.drawnCards[drawnCardIndex] };
    if (!this.canPlayCard(playedCard)) return;

    if (playedCard.type === 'wild' || playedCard.type === 'wild4') {
      playedCard.chosenColor = chosenColor || this.pickBestColor(activePlayer.hand);
      const colorName = playedCard.chosenColor.charAt(0).toUpperCase() + playedCard.chosenColor.slice(1);
      if (!activePlayer.isHuman) {
        this.addNotification(`Bot changed color to ${colorName}`, 'rgba(255,255,255,0.6)');
      }
      this.sound.wildCard();
    } else if (playedCard.type === 'skip' || playedCard.type === 'reverse' || playedCard.type === 'draw2') {
      this.sound.actionCard();
    } else {
      this.sound.playCard();
    }

    let updatedHand = [...activePlayer.hand];
    let updatedDrawnCards = [...currentState.drawnCards];
    if (handCardIndex !== -1) {
      updatedHand = activePlayer.hand.filter(card => card.id !== cardId);
    } else {
      updatedDrawnCards = currentState.drawnCards.filter(card => card.id !== cardId);
      updatedHand = [...updatedHand, ...updatedDrawnCards];
      updatedDrawnCards = [];
    }
    activePlayer.hand = updatedHand;

    const updatedDiscardPile = [...currentState.discardPile, playedCard];

    if (updatedHand.length === 0) {
      this.cancelAI();
      this.state.update(previousState => ({
        ...previousState,
        players: previousState.players.map(player => player.id === activePlayer.id ? { ...activePlayer } : player),
        drawnCards: updatedDrawnCards,
        discardPile: updatedDiscardPile,
        phase: 'finished' as GamePhase,
        winner: { ...activePlayer, hand: [] },
      }));
      if (activePlayer.isHuman) {
        this.sound.win();
      } else {
        this.sound.lose();
      }
      this.addNotification(`${activePlayer.name} wins.`, 'rgba(255,255,255,0.8)');
      return;
    }

    if (updatedHand.length === 1) {
      if (!activePlayer.isHuman) {
        this.addNotification('Bot: UNO!', 'rgba(255,255,255,0.6)');
      }
      this.sound.uno();
    }

    const currentPendingDrawCount = currentState.pendingDrawCount;
    let updatedPendingDrawCount = currentPendingDrawCount;
    let shouldSkipNextPlayer = false;

    if (playedCard.type === 'skip') {
      shouldSkipNextPlayer = true;
      if (!activePlayer.isHuman) {
        this.addNotification('Bot skipped your turn!', 'rgba(255,255,255,0.6)');
      }
    } else if (playedCard.type === 'reverse') {
      if (currentState.players.length === 2) {
        shouldSkipNextPlayer = true;
        if (!activePlayer.isHuman) {
          this.addNotification('Bot skipped your turn!', 'rgba(255,255,255,0.6)');
        }
      }
    } else if (playedCard.type === 'draw2') {
      updatedPendingDrawCount = currentPendingDrawCount + 2;
      if (!activePlayer.isHuman) {
        this.addNotification('Bot played +2!', 'rgba(255,255,255,0.6)');
      }
    } else if (playedCard.type === 'wild4') {
      updatedPendingDrawCount = currentPendingDrawCount + 4;
      if (!activePlayer.isHuman) {
        this.addNotification('Bot played +4!', 'rgba(255,255,255,0.6)');
      }
    }

    const turnAdvance = shouldSkipNextPlayer ? 2 : 1;
    let nextPlayerIndex = (currentState.currentPlayerIndex + currentState.direction * turnAdvance + currentState.players.length) % currentState.players.length;

    this.state.update(previousState => ({
      ...previousState,
      players: previousState.players.map(player => player.id === activePlayer.id ? { ...activePlayer } : player),
      drawnCards: updatedDrawnCards,
      discardPile: updatedDiscardPile,
      currentPlayerIndex: nextPlayerIndex,
      pendingDrawCount: updatedPendingDrawCount,
      drawnThisTurn: false,
    }));

    this.state.update(previousState => {
      const updatedPlayers = previousState.players.map((player, index) => ({
        ...player,
        isCurrentTurn: index === previousState.currentPlayerIndex,
      }));
      return { ...previousState, players: updatedPlayers };
    });

    this.scheduleAI();
  }

  drawCard(): void {
    const currentState = this.state();
    if (currentState.phase !== 'playing') return;
    if (currentState.drawnThisTurn) return;

    const activePlayer = currentState.players[currentState.currentPlayerIndex];
    const cardsToDraw = currentState.pendingDrawCount > 0 ? currentState.pendingDrawCount : 1;
    const drawnFromPile = this.drawFromPile(cardsToDraw);
    const accumulatedDrawnCards = [...currentState.drawnCards, ...drawnFromPile];

    if (!activePlayer.isHuman && cardsToDraw > 1) {
      this.addNotification(`Bot drew ${cardsToDraw} cards`, 'rgba(255,255,255,0.5)');
    }
    this.sound.drawCard();

    const hasPlayableDrawnCard = drawnFromPile.some(card => this.canPlayCard(card));

    this.state.update(previousState => ({
      ...previousState,
      drawPile: [...previousState.drawPile],
      pendingDrawCount: 0,
      drawnThisTurn: true,
      drawnCards: accumulatedDrawnCards,
    }));

    if (!hasPlayableDrawnCard) {
      this.passTurn();
    } else if (!activePlayer.isHuman) {
      this.scheduleAI();
    }
  }

  passTurn(): void {
    const currentState = this.state();
    if (currentState.phase !== 'playing') return;

    if (currentState.drawnCards.length > 0) {
      const activePlayer = currentState.players[currentState.currentPlayerIndex];
      activePlayer.hand = [...activePlayer.hand, ...currentState.drawnCards];
      this.state.update(previousState => ({
        ...previousState,
        players: previousState.players.map(player => player.id === activePlayer.id ? { ...activePlayer } : player),
        drawnCards: [],
      }));
    }

    this.endTurn();
  }

  canPlayCard(card: Card): boolean {
    const topDiscardCard = this.topCard();
    if (!topDiscardCard) return true;

    const currentState = this.state();
    const activePlayer = currentState.players[currentState.currentPlayerIndex];
    const currentEffectiveColor = topDiscardCard.chosenColor || topDiscardCard.color;

    if (card.type === 'wild') {
      if (currentState.pendingDrawCount > 0) return false;
      return true;
    }

    if (card.type === 'wild4') {
      const hasMatchingColorCard = activePlayer.hand.some(
        existingCard => existingCard.id !== card.id
          && existingCard.color === currentEffectiveColor
          && existingCard.type !== 'wild'
          && existingCard.type !== 'wild4'
      );
      return !hasMatchingColorCard;
    }

    if (currentState.pendingDrawCount > 0) {
      return card.type === 'draw2';
    }

    if (currentEffectiveColor === 'wild') return true;
    if (card.color === currentEffectiveColor) return true;

    if (card.type === 'number' && topDiscardCard.type === 'number') {
      return card.value === topDiscardCard.value;
    }
    return card.type !== 'number' && card.type === topDiscardCard.type;
  }

  private drawFromPile(count: number): Card[] {
    const drawnCards: Card[] = [];
    let remainingPile: Card[] = [];

    for (let cardIndex = 0; cardIndex < count; cardIndex++) {
      const currentState = this.state();
      if (remainingPile.length === 0) {
        remainingPile = [...currentState.drawPile];
      }
      if (remainingPile.length === 0) {
        if (currentState.discardPile.length <= 1) break;
        const topCardToKeep = currentState.discardPile[currentState.discardPile.length - 1];
        const cardsToRecycle = currentState.discardPile.slice(0, -1);
        remainingPile = this.shuffle(cardsToRecycle);
        this.state.update(previousState => ({
          ...previousState,
          discardPile: [topCardToKeep],
          drawPile: remainingPile,
        }));
      }
      drawnCards.push(remainingPile.pop()!);
    }

    this.state.update(previousState => ({ ...previousState, drawPile: remainingPile }));
    return drawnCards;
  }

  private pickBestColor(hand: Card[]): CardColor {
    const colorCounts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const card of hand) {
      if (card.color !== 'wild') colorCounts[card.color]++;
    }
    let bestColor: CardColor = 'red';
    let highestCount = 0;
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count > highestCount) {
        highestCount = count;
        bestColor = color as CardColor;
      }
    }
    return bestColor;
  }

  private analyzeHuman(): void {
    const currentState = this.state();
    const humanPlayer = currentState.players.find(player => player.isHuman);
    if (!humanPlayer) { this.humanAnalysis = null; return; }
    const colorDistribution: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const card of humanPlayer.hand) {
      if (card.color !== 'wild') colorDistribution[card.color] = (colorDistribution[card.color] || 0) + 1;
    }
    this.humanAnalysis = { handSize: humanPlayer.hand.length, colorCounts: colorDistribution };
  }

  private pickColorHumanLacks(): CardColor {
    if (this.humanAnalysis) {
      const sortedColors = Object.entries(this.humanAnalysis.colorCounts).sort((a, b) => a[1] - b[1]);
      return sortedColors[0][0] as CardColor;
    }
    return this.pickRandomColor();
  }

  private pickRandomColor(): CardColor {
    const availableColors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }

  private getColorScore(color: CardColor): number {
    if (!this.humanAnalysis) return 0;
    return this.humanAnalysis.colorCounts[color] || 0;
  }

  private endTurn(): void {
    this.state.update(previousState => {
      const previousPlayerIndex = previousState.currentPlayerIndex;
      let nextPlayerIndex = (previousPlayerIndex + previousState.direction + previousState.players.length) % previousState.players.length;
      let playersAfterTurn = previousState.players.map(player => ({ ...player, isCurrentTurn: false }));
      playersAfterTurn[nextPlayerIndex] = { ...playersAfterTurn[nextPlayerIndex], isCurrentTurn: true };
      return { ...previousState, currentPlayerIndex: nextPlayerIndex, players: playersAfterTurn, drawnThisTurn: false, drawnCards: [] };
    });
    const updatedState = this.state();
    const nextActivePlayer = updatedState.players[updatedState.currentPlayerIndex];
    if (nextActivePlayer?.isHuman) {
      this.sound.yourTurn();
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
    const currentState = this.state();
    if (currentState.phase !== 'playing') return;
    const currentTurnPlayer = currentState.players[currentState.currentPlayerIndex];
    if (!currentTurnPlayer || currentTurnPlayer.isHuman) return;
    this.aiTimer = setTimeout(() => this.runAI(), 600);
  }

  private isHumanNext(currentState: GameState): boolean {
    let nextPlayerIndex = (currentState.currentPlayerIndex + currentState.direction + currentState.players.length) % currentState.players.length;
    return currentState.players[nextPlayerIndex]?.isHuman ?? false;
  }

  private runAI(): void {
    const currentState = this.state();
    if (currentState.phase !== 'playing') return;

    const aiPlayer = currentState.players[currentState.currentPlayerIndex];
    if (!aiPlayer || aiPlayer.isHuman) return;

    this.analyzeHuman();

    const playableDrawnCards = currentState.drawnCards.filter(card => this.canPlayCard(card));
    if (playableDrawnCards.length > 0) {
      this.playCard(playableDrawnCards[0].id);
      return;
    }

    const playableHandCards = aiPlayer.hand.filter(card => this.canPlayCard(card));

    if (currentState.pendingDrawCount > 0) {
      const draw2Playable = playableHandCards.filter(card => card.type === 'draw2');
      if (draw2Playable.length > 0) {
        this.playCard(draw2Playable[0].id);
        return;
      }
      this.drawCard();
      return;
    }

    if (playableHandCards.length === 0) {
      this.drawCard();
      return;
    }

    const wild4Cards = playableHandCards.filter(card => card.type === 'wild4');
    const wildCards = playableHandCards.filter(card => card.type === 'wild');
    const draw2Cards = playableHandCards.filter(card => card.type === 'draw2');
    const skipCards = playableHandCards.filter(card => card.type === 'skip');
    const reverseCards = playableHandCards.filter(card => card.type === 'reverse');
    const numberCards = playableHandCards.filter(card => card.type === 'number');

    const isHumanTargetedNext = this.isHumanNext(currentState);

    if (draw2Cards.length > 0 && isHumanTargetedNext) {
      this.playCard(draw2Cards[0].id);
      return;
    }

    if (skipCards.length > 0 && isHumanTargetedNext) {
      this.playCard(skipCards[0].id);
      return;
    }

    if (reverseCards.length > 0 && currentState.players.length === 2 && isHumanTargetedNext) {
      this.playCard(reverseCards[0].id);
      return;
    }

    if (numberCards.length > 0) {
      const cardsSortedByHumanColorStrength = numberCards.sort((a, b) => {
        const cardAScore = a.color !== 'wild' ? this.getColorScore(a.color) : 0;
        const cardBScore = b.color !== 'wild' ? this.getColorScore(b.color) : 0;
        return cardAScore - cardBScore;
      });
      this.playCard(cardsSortedByHumanColorStrength[0].id);
      return;
    }

    if (wild4Cards.length > 0) {
      const colorHumanIsWeakIn = this.pickColorHumanLacks();
      this.playCard(wild4Cards[0].id, colorHumanIsWeakIn);
      return;
    }

    if (wildCards.length > 0) {
      const colorHumanIsWeakIn = this.pickColorHumanLacks();
      this.playCard(wildCards[0].id, colorHumanIsWeakIn);
      return;
    }

    if (draw2Cards.length > 0) {
      this.playCard(draw2Cards[0].id);
      return;
    }

    if (skipCards.length > 0) {
      this.playCard(skipCards[0].id);
      return;
    }

    if (reverseCards.length > 0) {
      this.playCard(reverseCards[0].id);
      return;
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
