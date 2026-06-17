import { Card } from './card.model';

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  isCurrentTurn: boolean;
  isHuman: boolean;
}
