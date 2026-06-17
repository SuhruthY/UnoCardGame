import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameBoardComponent } from './game-board.component';
import { AuthService } from '../../services/auth.service';
import { RewardService } from '../../services/reward.service';
describe('GameBoardComponent', () => {
    let component;
    let fixture;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameBoardComponent],
            providers: [
                provideRouter([]),
                AuthService,
                RewardService,
            ],
        })
            .compileComponents();
        fixture = TestBed.createComponent(GameBoardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=game-board.component.spec.js.map