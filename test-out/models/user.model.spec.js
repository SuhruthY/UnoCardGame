import { calculateLevel, xpForLevel, xpToNextLevel, xpInCurrentLevel, XP_PER_LEVEL } from './user.model';
describe('User model helpers', () => {
    it('calculateLevel returns 1 for 0 XP', () => {
        expect(calculateLevel(0)).toBe(1);
    });
    it('calculateLevel returns 1 for XP just under level 2', () => {
        expect(calculateLevel(XP_PER_LEVEL - 1)).toBe(1);
    });
    it('calculateLevel returns 2 at exactly XP_PER_LEVEL', () => {
        expect(calculateLevel(XP_PER_LEVEL)).toBe(2);
    });
    it('calculateLevel returns 5 at 4*XP_PER_LEVEL', () => {
        expect(calculateLevel(4 * XP_PER_LEVEL)).toBe(5);
    });
    it('xpForLevel returns 0 for level 1', () => {
        expect(xpForLevel(1)).toBe(0);
    });
    it('xpForLevel returns XP_PER_LEVEL for level 2', () => {
        expect(xpForLevel(2)).toBe(XP_PER_LEVEL);
    });
    it('xpToNextLevel returns remaining XP needed', () => {
        const remaining = xpToNextLevel(100);
        expect(remaining).toBe(XP_PER_LEVEL - 100);
    });
    it('xpInCurrentLevel returns correct progress', () => {
        const progress = xpInCurrentLevel(650);
        expect(progress).toBe(150);
    });
    it('xpToNextLevel for level 1 returns full XP_PER_LEVEL', () => {
        expect(xpToNextLevel(0)).toBe(XP_PER_LEVEL);
    });
    it('xpInCurrentLevel for 0 XP returns 0', () => {
        expect(xpInCurrentLevel(0)).toBe(0);
    });
});
//# sourceMappingURL=user.model.spec.js.map