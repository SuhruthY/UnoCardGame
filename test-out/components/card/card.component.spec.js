import { TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';
describe('CardComponent', () => {
    let component;
    let fixture;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CardComponent]
        })
            .compileComponents();
        fixture = TestBed.createComponent(CardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=card.component.spec.js.map