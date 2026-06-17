import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Card, CardColor } from '../../models/card.model';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
})
export class CardComponent {
  @Input() card!: Card;
  @Input() playable = false;
  @Output() cardClick = new EventEmitter<Card>();

  get displayValue(): string {
    switch (this.card.type) {
      case 'skip': return '⊘';
      case 'reverse': return '⟳';
      case 'draw2': return '+2';
      case 'wild': return 'W';
      case 'wild4': return '+4';
      case 'number': return String(this.card.value);
    }
  }

  get displayColor(): string {
    if (this.card.chosenColor) return this.card.chosenColor;
    if (this.card.color === 'wild') return 'wild';
    return this.card.color;
  }

  get bgClass(): string {
    const c = this.displayColor;
    if (c === 'wild') return 'card-wild';
    return `card-${c}`;
  }

  onClick(): void {
    if (this.playable) this.cardClick.emit(this.card);
  }
}
