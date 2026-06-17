import { Player } from './player.model';

describe('Player type', () => {
  it('type definition exists', () => {
    const player: Player = { id: 0, name: 'Test', hand: [], isCurrentTurn: true, isHuman: true };
    expect(player.name).toBe('Test');
    expect(player.hand.length).toBe(0);
    expect(player.isHuman).toBeTrue();
  });
});
