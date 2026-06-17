export const XP_PER_LEVEL = 500;
export function calculateLevel(xp) {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
}
export function xpForLevel(level) {
    return (level - 1) * XP_PER_LEVEL;
}
export function xpToNextLevel(xp) {
    const currentLevel = calculateLevel(xp);
    const currentLevelXp = xpForLevel(currentLevel);
    const nextLevelXp = xpForLevel(currentLevel + 1);
    return nextLevelXp - currentLevelXp;
}
export function xpInCurrentLevel(xp) {
    const currentLevel = calculateLevel(xp);
    const currentLevelXp = xpForLevel(currentLevel);
    return xp - currentLevelXp;
}
//# sourceMappingURL=user.model.js.map