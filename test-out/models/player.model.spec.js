describe('Player type', () => {
    it('type definition exists', () => {
        const player = { id: 0, name: 'Test', hand: [], isCurrentTurn: true, isHuman: true };
        expect(player.name).toBe('Test');
        expect(player.hand.length).toBe(0);
        expect(player.isHuman).toBeTrue();
    });
});
export {};
//# sourceMappingURL=player.model.spec.js.map