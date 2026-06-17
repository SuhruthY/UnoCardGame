import { GameState, GamePhase } from './game.model';

describe('GameState type', () => {
  it('type definition exists', () => {
    const state: GameState = {
      players: [],
      drawPile: [],
      discardPile: [],
      currentPlayerIndex: 0,
      direction: 1,
      phase: 'setup' as GamePhase,
      winner: null,
      pendingDrawCount: 0,
      drawnThisTurn: false,
      drawnCards: [],
      selectedColor: null,
      adultMode: false,
      penalty: { active: false, loserIds: [], currentLoserIndex: 0, currentPenalty: null, penaltyOptions: [], waitingForSelection: false, showApplied: false, appMessage: '' },
    };
    expect(state.phase).toBe('setup');
    expect(state.direction).toBe(1);
  });
});
