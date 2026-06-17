import { __decorate } from "tslib";
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
let PlayerHandComponent = class PlayerHandComponent {
    cards = [];
    isCurrentTurn = false;
    canPlayCheck;
    playCard = new EventEmitter();
    isPlayable(card) {
        return this.isCurrentTurn && this.canPlayCheck(card);
    }
    onCardClick(card) {
        if (this.isPlayable(card))
            this.playCard.emit(card);
    }
};
__decorate([
    Input()
], PlayerHandComponent.prototype, "cards", void 0);
__decorate([
    Input()
], PlayerHandComponent.prototype, "isCurrentTurn", void 0);
__decorate([
    Input()
], PlayerHandComponent.prototype, "canPlayCheck", void 0);
__decorate([
    Output()
], PlayerHandComponent.prototype, "playCard", void 0);
PlayerHandComponent = __decorate([
    Component({
        selector: 'app-player-hand',
        standalone: true,
        imports: [CardComponent, CommonModule],
        templateUrl: './player-hand.component.html',
        styleUrls: ['./player-hand.component.css'],
    })
], PlayerHandComponent);
export { PlayerHandComponent };
//# sourceMappingURL=player-hand.component.js.map