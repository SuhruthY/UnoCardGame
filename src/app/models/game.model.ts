import { Player } from './player.model';
import { Card } from './card.model';

export type GamePhase = 'setup' | 'playing' | 'finished';

export interface GameNotification {
  id: number;
  message: string;
  color: string;
}

export interface GameState {
  players: Player[];
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  phase: GamePhase;
  winner: Player | null;
  pendingDrawCount: number;
  drawnThisTurn: boolean;
  drawnCards: Card[];
}
