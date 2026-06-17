import { Card } from './card.model';

describe('Card type', () => {
  it('type definition exists', () => {
    const card: Card = { id: 1, color: 'red', type: 'number', value: 5 };
    expect(card.id).toBe(1);
    expect(card.color).toBe('red');
    expect(card.type).toBe('number');
    expect(card.value).toBe(5);
  });
});
