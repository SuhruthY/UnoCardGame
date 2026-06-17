import { TestBed } from '@angular/core/testing';
import { ColorPickerComponent } from './color-picker.component';
describe('ColorPickerComponent', () => {
    let component;
    let fixture;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ColorPickerComponent]
        })
            .compileComponents();
        fixture = TestBed.createComponent(ColorPickerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=color-picker.component.spec.js.map