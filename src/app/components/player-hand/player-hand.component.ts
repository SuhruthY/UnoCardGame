import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { Card } from '../../models/card.model';

@Component({
  selector: 'app-player-hand',
  standalone: true,
  imports: [CardComponent, CommonModule],
  templateUrl: './player-hand.component.html',
  styleUrls: ['./player-hand.component.css'],
})
export class PlayerHandComponent {
  @Input() cards: Card[] = [];
  @Input() isCurrentTurn = false;
  @Input() canPlayCheck!: (card: Card) => boolean;
  @Output() playCard = new EventEmitter<Card>();

  isPlayable(card: Card): boolean {
    return this.isCurrentTurn && this.canPlayCheck(card);
  }

  onCardClick(card: Card): void {
    if (this.isPlayable(card)) this.playCard.emit(card);
  }
}
