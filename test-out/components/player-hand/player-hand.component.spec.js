import { TestBed } from '@angular/core/testing';
import { PlayerHandComponent } from './player-hand.component';
describe('PlayerHandComponent', () => {
    let component;
    let fixture;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerHandComponent]
        })
            .compileComponents();
        fixture = TestBed.createComponent(PlayerHandComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=player-hand.component.spec.js.map