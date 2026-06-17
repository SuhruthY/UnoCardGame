import { __decorate } from "tslib";
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
let ColorPickerComponent = class ColorPickerComponent {
    colorSelected = new EventEmitter();
    colors = [
        { name: 'red', label: 'Red' },
        { name: 'blue', label: 'Blue' },
        { name: 'green', label: 'Green' },
        { name: 'yellow', label: 'Yellow' },
    ];
    select(color) {
        this.colorSelected.emit(color);
    }
};
__decorate([
    Output()
], ColorPickerComponent.prototype, "colorSelected", void 0);
ColorPickerComponent = __decorate([
    Component({
        selector: 'app-color-picker',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './color-picker.component.html',
        styleUrls: ['./color-picker.component.css'],
    })
], ColorPickerComponent);
export { ColorPickerComponent };
//# sourceMappingURL=color-picker.component.js.map