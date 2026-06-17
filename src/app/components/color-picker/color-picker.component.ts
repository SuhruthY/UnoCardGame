import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardColor } from '../../models/card.model';

@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.css'],
})
export class ColorPickerComponent {
  @Output() colorSelected = new EventEmitter<CardColor>();

  colors: { name: CardColor; label: string }[] = [
    { name: 'red', label: 'Red' },
    { name: 'blue', label: 'Blue' },
    { name: 'green', label: 'Green' },
    { name: 'yellow', label: 'Yellow' },
  ];

  select(color: CardColor): void {
    this.colorSelected.emit(color);
  }
}
