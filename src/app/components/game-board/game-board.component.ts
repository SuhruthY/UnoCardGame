import { Component, effect, EffectRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { RewardService } from '../../services/reward.service';
import { PenaltyDbService } from '../../services/penalty-db.service';
import { Card, CardColor } from '../../models/card.model';
import { CardComponent } from '../card/card.component';
import { PlayerHandComponent } from '../player-hand/player-hand.component';
import { ColorPickerComponent } from '../color-picker/color-picker.component';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, PlayerHandComponent, ColorPickerComponent],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.css'],
})
export class GameBoardComponent {
  gameState;
  currentPlayer;
  topCard;
  mustDraw;
  isHumanTurn;

  showColorPicker = false;
  pendingWildCard: Card | null = null;

  playerCount = 2;
  playerNames: string[] = ['You', 'Computer'];
  humanIndex = 0;
  adultMode = false;
  gameFinished = false;
  matchResult: { xpEarned: number; newBadges: import('../../services/reward.service').BadgeDef[] } | null = null;

  private skipEffect: EffectRef | null = null;
  private finishEffect: EffectRef | null = null;

  constructor(
    public gameService: GameService,
    private auth: AuthService,
    private reward: RewardService,
    private penaltyDb: PenaltyDbService,
    private router: Router
  ) {
    this.gameState = gameService.gameState;
    this.currentPlayer = gameService.currentPlayer;
    this.topCard = gameService.topCard;
    this.mustDraw = gameService.mustDraw;
    this.isHumanTurn = gameService.isHumanTurn;

    this.skipEffect = effect(() => {
      const s = this.gameState();
      if (s.phase === 'playing') {
        const player = s.players[s.currentPlayerIndex];
        if (player && player.skipNextTurn) {
          setTimeout(() => this.gameService['skipCurrentTurn']());
        }
      }
    });

    this.finishEffect = effect(() => {
      const s = this.gameState();
      if (s.phase === 'finished' && s.winner && !this.gameFinished) {
        this.gameFinished = true;
        const user = this.auth.currentUser();
        if (user) {
          const won = s.winner.name === user.username || s.players.some(p => p.isHuman && p.id === s.winner!.id);
          const opponentNames = s.players.filter(p => p.id !== s.winner!.id).map(p => p.name);
          const humanPlayer = s.players.find(p => p.isHuman);
          const cardsRemaining = humanPlayer ? humanPlayer.hand.length : 0;
          this.matchResult = this.reward.recordMatch(won, s.players.length, s.adultMode, opponentNames, cardsRemaining);

          // Save persistent penalties
          const computerNames = s.players.filter(p => !p.isHuman).map(p => p.name);
          this.penaltyDb.recordMatchResult(computerNames, won);
          for (const p of s.players) {
            const penalties: Record<string, boolean> = {};
            if (p.skipNextTurn) penalties['skips-ahead'] = true;
            if (p.wildRoulette) penalties['wild-roulette'] = true;
            if (p.handRevealTurns && p.handRevealTurns > 0) penalties['hand-reveal'] = true;
            if (p.isHuman) {
              this.penaltyDb.savePlayerPenalties(penalties);
            } else {
              this.penaltyDb.saveComputerPenalties(p.name, penalties);
            }
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.skipEffect?.destroy();
    this.finishEffect?.destroy();
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

  setPlayerCount(count: number): void {
    this.playerCount = count;
    this.playerNames = ['You'];
    for (let i = 1; i < count; i++) {
      this.playerNames.push(`Computer ${i}`);
    }
  }

  startGame(): void {
    const players = this.playerNames.map((name, i) => ({
      name,
      isHuman: i === this.humanIndex,
    }));
    const storedPenalties = this.penaltyDb.getStoredPenaltyMap(this.playerNames);
    this.gameService.initGame(players, this.adultMode, storedPenalties);
  }

  restartGame(): void {
    this.startGame();
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

  currentLoserName(): string {
    const s = this.gameState();
    const loserId = s.penalty.loserIds[s.penalty.currentLoserIndex];
    const loser = s.players.find(p => p.id === loserId);
    return loser?.name || '';
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  restartGameFromBoard(): void {
    this.gameFinished = false;
    this.matchResult = null;
    this.restartGame();
  }

  onPenaltySelect(penaltyId: string): void {
    this.gameService.selectPenalty(penaltyId);
  }

  onApplyPenalty(): void {
    this.gameService.applyPenalty();
  }

  onPenaltyNext(): void {
    this.gameService.nextPenalty();
  }
}
