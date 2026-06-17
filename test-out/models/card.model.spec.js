describe('Card type', () => {
    it('type definition exists', () => {
        const card = { id: 1, color: 'red', type: 'number', value: 5 };
        expect(card.id).toBe(1);
        expect(card.color).toBe('red');
        expect(card.type).toBe('number');
        expect(card.value).toBe(5);
    });
});
export {};
//# sourceMappingURL=card.model.spec.js.map