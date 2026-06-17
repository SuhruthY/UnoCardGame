import { __decorate } from "tslib";
import { Component, Input, Output, EventEmitter } from '@angular/core';
let CardComponent = class CardComponent {
    card;
    playable = false;
    cardClick = new EventEmitter();
    get displayValue() {
        switch (this.card.type) {
            case 'skip': return '⊘';
            case 'reverse': return '⟳';
            case 'draw2': return '+2';
            case 'wild': return 'W';
            case 'wild4': return '+4';
            case 'number': return String(this.card.value);
        }
    }
    get displayColor() {
        if (this.card.chosenColor)
            return this.card.chosenColor;
        if (this.card.color === 'wild')
            return 'wild';
        return this.card.color;
    }
    get bgClass() {
        const c = this.displayColor;
        if (c === 'wild')
            return 'card-wild';
        return `card-${c}`;
    }
    onClick() {
        if (this.playable)
            this.cardClick.emit(this.card);
    }
};
__decorate([
    Input()
], CardComponent.prototype, "card", void 0);
__decorate([
    Input()
], CardComponent.prototype, "playable", void 0);
__decorate([
    Output()
], CardComponent.prototype, "cardClick", void 0);
CardComponent = __decorate([
    Component({
        selector: 'app-card',
        standalone: true,
        templateUrl: './card.component.html',
        styleUrls: ['./card.component.css'],
    })
], CardComponent);
export { CardComponent };
//# sourceMappingURL=card.component.js.map