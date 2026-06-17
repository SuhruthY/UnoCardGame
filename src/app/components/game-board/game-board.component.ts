import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { Card, CardColor } from '../../models/card.model';
import { CardComponent } from '../card/card.component';
import { PlayerHandComponent } from '../player-hand/player-hand.component';
import { ColorPickerComponent } from '../color-picker/color-picker.component';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, CardComponent, PlayerHandComponent, ColorPickerComponent],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.css'],
})
export class GameBoardComponent implements OnInit {
  gameState;
  currentPlayer;
  topCard;
  mustDraw;
  isHumanTurn;
  notifications;

  showColorPicker = false;
  pendingWildCard: Card | null = null;
  readonly Math = Math;
  readonly confettiColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4'];

  constructor(
    public gameService: GameService,
    private router: Router
  ) {
    this.gameState = gameService.gameState;
    this.currentPlayer = gameService.currentPlayer;
    this.topCard = gameService.topCard;
    this.mustDraw = gameService.mustDraw;
    this.isHumanTurn = gameService.isHumanTurn;
    this.notifications = gameService.notificationsList;
  }

  ngOnInit(): void {
    this.gameService.resetGame();
    this.gameService.initGame(['You', 'Bot']);
  }

  canPlayCard(card: Card): boolean {
    return this.gameService.canPlayCard(card);
  }

  onPlayCard(card: Card): void {
    if (card.type === 'wild' || card.type === 'wild4') {
      this.pendingWildCard = card;
      this.showColorPicker = true;
    } else {
      this.gameService.playCard(card.id);
    }
  }

  onColorSelected(color: CardColor): void {
    this.showColorPicker = false;
    if (this.pendingWildCard) {
      this.gameService.playCard(this.pendingWildCard.id, color);
      this.pendingWildCard = null;
    }
  }

  drawCard(): void {
    this.gameService.drawCard();
  }

  passTurn(): void {
    this.gameService.passTurn();
  }

  getCardColor(card: Card): string {
    const color = card.chosenColor || card.color;
    switch (color) {
      case 'red': return '#e53935';
      case 'blue': return '#1e88e5';
      case 'green': return '#43a047';
      case 'yellow': return '#fdd835';
      default: return 'linear-gradient(135deg, #e53935 25%, #1e88e5 25%, #1e88e5 50%, #43a047 50%, #43a047 75%, #fdd835 75%)';
    }
  }

  getDisplayColor(card: Card): string {
    const c = card.chosenColor || card.color;
    return c === 'wild' ? 'wild' : c;
  }

  getBotHandCount(): number {
    const s = this.gameState();
    const bot = s.players.find(p => !p.isHuman);
    return bot?.hand.length || 0;
  }

  playAgain(): void {
    this.gameService.resetGame();
    this.gameService.initGame(['You', 'Bot']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
