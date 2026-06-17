import { Card } from './card.model';
import { Player } from './player.model';

export type GamePhase = 'setup' | 'playing' | 'finished' | 'penalty';

export interface PenaltyOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
  detail: string;
}

export interface PenaltyState {
  active: boolean;
  loserIds: number[];
  currentLoserIndex: number;
  currentPenalty: PenaltyOption | null;
  penaltyOptions: PenaltyOption[];
  waitingForSelection: boolean;
  showApplied: boolean;
  appMessage: string;
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
  selectedColor: string | null;
  adultMode: boolean;
  penalty: PenaltyState;
}
