import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardComponent } from './card.component';
import type { Card } from '../../models/card.model';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    component.card = { id: 1, color: 'red', type: 'number', value: 5 } as Card;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
