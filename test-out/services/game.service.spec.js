import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service';
describe('GameService', () => {
    let service;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GameService);
    });
    it('deck has 108 cards', () => {
        const deck = service.createDeck();
        expect(deck.length).toBe(108);
    });
    it('deck has correct card distribution', () => {
        const deck = service.createDeck();
        const byColor = (color) => deck.filter((c) => c.color === color);
        const byType = (type) => deck.filter((c) => c.type === type);
        expect(byColor('red').length).toBe(25);
        expect(byColor('blue').length).toBe(25);
        expect(byColor('green').length).toBe(25);
        expect(byColor('yellow').length).toBe(25);
        expect(byColor('wild').length).toBe(8);
        expect(byType('wild').length).toBe(4);
        expect(byType('wild4').length).toBe(4);
        expect(byType('skip').length).toBe(8);
        expect(byType('reverse').length).toBe(8);
        expect(byType('draw2').length).toBe(8);
        // Number cards: one 0 + two of each 1-9 = 19 per color × 4 = 76
        expect(byType('number').length).toBe(76);
    });
    it('initGame deals 7 cards to each player and starts with non-wild', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const state = service.gameState();
        expect(state.phase).toBe('playing');
        expect(state.players.length).toBe(2);
        expect(state.players[0].hand.length).toBe(7);
        expect(state.players[1].hand.length).toBe(7);
        expect(state.discardPile.length).toBe(1);
        const top = state.discardPile[0];
        expect(top.type).not.toBe('wild');
        expect(top.type).not.toBe('wild4');
        expect(state.drawPile.length).toBe(108 - 14 - 1);
    });
    it('isHumanTurn returns true for human player', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        expect(service.isHumanTurn()).toBeTrue();
    });
    it('canPlayCard matches by color', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        // Override discard to a known card
        const s = service.gameState();
        const red5 = { id: 999, color: 'red', type: 'number', value: 5 };
        service.state.update((st) => ({ ...st, discardPile: [red5] }));
        expect(service.canPlayCard({ id: 1, color: 'red', type: 'number', value: 3 })).toBeTrue();
        expect(service.canPlayCard({ id: 2, color: 'blue', type: 'number', value: 5 })).toBeTrue();
        expect(service.canPlayCard({ id: 3, color: 'blue', type: 'number', value: 3 })).toBeFalse();
    });
    it('canPlayCard matches by action type', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const skipCard = { id: 999, color: 'red', type: 'skip' };
        service.state.update((st) => ({ ...st, discardPile: [skipCard] }));
        expect(service.canPlayCard({ id: 1, color: 'red', type: 'skip' })).toBeTrue();
        expect(service.canPlayCard({ id: 2, color: 'blue', type: 'skip' })).toBeTrue();
        expect(service.canPlayCard({ id: 3, color: 'red', type: 'reverse' })).toBeFalse();
        expect(service.canPlayCard({ id: 4, color: 'wild', type: 'wild' })).toBeTrue();
    });
    it('canPlayCard with wild4 checks color restriction', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const red5 = { id: 999, color: 'red', type: 'number', value: 5 };
        service.state.update((st) => ({ ...st, discardPile: [red5] }));
        // Give player a red card - cannot play wild4
        const player = service.gameState().players[0];
        player.hand.push({ id: 100, color: 'red', type: 'number', value: 1 });
        service.state.update((st) => ({ ...st, players: [...st.players] }));
        expect(service.canPlayCard({ id: 1, color: 'wild', type: 'wild4' })).toBeFalse();
        // Remove all red cards from hand
        player.hand = player.hand.filter((c) => c.color !== 'red');
        service.state.update((st) => ({ ...st, players: [...st.players] }));
        expect(service.canPlayCard({ id: 1, color: 'wild', type: 'wild4' })).toBeTrue();
    });
    it('playCard removes card from hand', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const state = service.gameState();
        const player = state.players[0];
        const top = state.discardPile[0];
        const playable = player.hand.find((c) => service.canPlayCard(c));
        if (!playable) {
            // If nothing playable, skip this test
            return;
        }
        const handSize = player.hand.length;
        service.playCard(playable.id);
        const newState = service.gameState();
        if (newState.phase === 'playing') {
            const newPlayer = newState.players[0];
            expect(newPlayer.hand.length).toBe(handSize - 1);
        }
    });
    it('skip card advances turn by 2 positions (4 players)', () => {
        service.initGame([
            { name: 'P1', isHuman: true },
            { name: 'P2', isHuman: false },
            { name: 'P3', isHuman: false },
            { name: 'P4', isHuman: false },
        ]);
        const player = service.gameState().players[0];
        // Give player a skip card and force it to be playable
        const skipCard = { id: 5000, color: 'red', type: 'skip' };
        player.hand.push(skipCard);
        const redAny = { id: 9999, color: 'red', type: 'number', value: 1 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redAny],
        }));
        service.playCard(5000);
        const state = service.gameState();
        if (state.phase === 'playing') {
            // Should skip player 1, go to player 2
            expect(state.currentPlayerIndex).toBe(2);
        }
    });
    it('reverse in 2-player acts as skip (same player goes again)', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const player = service.gameState().players[0];
        const revCard = { id: 5001, color: 'red', type: 'reverse' };
        player.hand.push(revCard);
        const redAny = { id: 9999, color: 'red', type: 'number', value: 1 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redAny],
        }));
        service.playCard(5001);
        const state = service.gameState();
        if (state.phase === 'playing') {
            expect(state.currentPlayerIndex).toBe(0);
        }
    });
    it('draw2 adds 2 to pending draw count (stacking)', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const player = service.gameState().players[0];
        const draw2 = { id: 5002, color: 'red', type: 'draw2' };
        player.hand.push(draw2);
        const redAny = { id: 9999, color: 'red', type: 'number', value: 1 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redAny],
        }));
        service.playCard(5002);
        const state = service.gameState();
        if (state.phase === 'playing') {
            expect(state.pendingDrawCount).toBe(2);
        }
    });
    it('draw2 is playable on draw2 (stacking) when pending draw', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const player = service.gameState().players[0];
        // Force state where current player has pending draw
        const draw2onDiscard = { id: 6000, color: 'red', type: 'draw2' };
        const anotherDraw2 = { id: 6001, color: 'blue', type: 'draw2' };
        player.hand.push(anotherDraw2);
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [draw2onDiscard],
            pendingDrawCount: 2,
        }));
        expect(service.canPlayCard(anotherDraw2)).toBeTrue();
    });
    it('wild cannot be played when pending draw > 0', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        service.state.update((st) => ({
            ...st,
            pendingDrawCount: 2,
        }));
        expect(service.canPlayCard({ id: 1, color: 'wild', type: 'wild' })).toBeFalse();
    });
    it('mustDraw returns true when no playable cards', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const player = service.gameState().players[0];
        // Remove all cards and give only unplayable ones
        player.hand = [
            { id: 7000, color: 'blue', type: 'number', value: 9 },
        ];
        const green5 = { id: 9999, color: 'green', type: 'number', value: 5 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [green5],
        }));
        expect(service.mustDraw()).toBeTrue();
    });
    it('mustDraw returns false when playable card exists', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const player = service.gameState().players[0];
        player.hand = [
            { id: 8000, color: 'red', type: 'number', value: 5 },
        ];
        const redAny = { id: 9999, color: 'red', type: 'number', value: 1 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redAny],
        }));
        expect(service.mustDraw()).toBeFalse();
    });
    it('drawCard adds to drawnCards not hand', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const state = service.gameState();
        const player = state.players[0];
        const origSize = player.hand.length;
        // Ensure mustDraw is true
        player.hand = [{ id: 9000, color: 'blue', type: 'number', value: 3 }];
        const green5 = { id: 9999, color: 'green', type: 'number', value: 5 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [green5],
        }));
        service.drawCard();
        const newState = service.gameState();
        expect(newState.drawnCards.length).toBe(1);
        expect(newState.drawnThisTurn).toBeTrue();
    });
    it('pickHumanColor returns a valid color', () => {
        const color = service.pickHumanColor();
        expect(['red', 'blue', 'green', 'yellow']).toContain(color);
    });
    it('game finishes when player runs out of cards', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const player = service.gameState().players[0];
        // Give player exactly 1 playable card
        const redDiscard = { id: 9999, color: 'red', type: 'number', value: 5 };
        player.hand = [{ id: 10000, color: 'red', type: 'number', value: 5 }];
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redDiscard],
        }));
        service.playCard(10000);
        const state = service.gameState();
        expect(state.phase).toBe('finished');
        expect(state.winner?.id).toBe(0);
    });
    it('initGame with 4 players deals correctly', () => {
        service.initGame([
            { name: 'A', isHuman: true },
            { name: 'B', isHuman: false },
            { name: 'C', isHuman: false },
            { name: 'D', isHuman: false },
        ]);
        const state = service.gameState();
        expect(state.players.length).toBe(4);
        expect(state.players[0].hand.length).toBe(7);
        expect(state.players[1].hand.length).toBe(7);
        expect(state.players[2].hand.length).toBe(7);
        expect(state.players[3].hand.length).toBe(7);
    });
    it('initGame with stored penalties applies them to players', () => {
        const penalties = {
            1: { 'skips-ahead': true, 'wild-roulette': true },
        };
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }], false, penalties);
        const state = service.gameState();
        expect(state.players[1].skipNextTurn).toBeTrue();
        expect(state.players[1].wildRoulette).toBeTrue();
        expect(state.players[0].skipNextTurn).toBeFalsy();
    });
    it('adult mode triggers penalty phase on win', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }], true);
        const player = service.gameState().players[0];
        const redDiscard = { id: 9999, color: 'red', type: 'number', value: 5 };
        player.hand = [{ id: 10000, color: 'red', type: 'number', value: 5 }];
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redDiscard],
        }));
        service.playCard(10000);
        const state = service.gameState();
        expect(state.phase).toBe('penalty');
        expect(state.penalty.active).toBeTrue();
        expect(state.penalty.loserIds.length).toBe(1);
    });
    it('penalty phase generates 3 options', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }], true);
        const player = service.gameState().players[0];
        player.hand = [{ id: 10000, color: 'red', type: 'number', value: 5 }];
        const redDiscard = { id: 9999, color: 'red', type: 'number', value: 5 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redDiscard],
        }));
        service.playCard(10000);
        const state = service.gameState();
        expect(state.penalty.penaltyOptions.length).toBe(3);
        expect(state.penalty.waitingForSelection).toBeTrue();
    });
    it('selectPenalty selects a penalty and shows reveal', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }], true);
        const player = service.gameState().players[0];
        player.hand = [{ id: 10000, color: 'red', type: 'number', value: 5 }];
        const redDiscard = { id: 9999, color: 'red', type: 'number', value: 5 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redDiscard],
        }));
        service.playCard(10000);
        const pid = service.gameState().penalty.penaltyOptions[0].id;
        service.selectPenalty(pid);
        const state = service.gameState();
        expect(state.penalty.currentPenalty?.id).toBe(pid);
        expect(state.penalty.waitingForSelection).toBeFalse();
    });
    it('applyPenalty applies extra-draw and adds cards', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }], true);
        const player = service.gameState().players[0];
        player.hand = [{ id: 10000, color: 'red', type: 'number', value: 5 }];
        const redDiscard = { id: 9999, color: 'red', type: 'number', value: 5 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redDiscard],
        }));
        service.playCard(10000);
        const loserId = service.gameState().penalty.loserIds[0];
        const loserHandSize = service.gameState().players.find(p => p.id === loserId).hand.length;
        // Force select extra-draw by manipulating options
        service.state.update((st) => ({
            ...st,
            penalty: {
                ...st.penalty,
                penaltyOptions: [{ id: 'extra-draw', name: 'Extra Draw', emoji: '🃏', description: '', detail: '' }],
            },
        }));
        service.selectPenalty('extra-draw');
        service.applyPenalty();
        const state = service.gameState();
        expect(state.penalty.showApplied).toBeTrue();
        expect(state.penalty.appMessage).toContain('drew');
    });
    it('applyPenalty random-discard removes a card', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }], true);
        const player = service.gameState().players[0];
        player.hand = [{ id: 10000, color: 'red', type: 'number', value: 5 }];
        const redDiscard = { id: 9999, color: 'red', type: 'number', value: 5 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redDiscard],
        }));
        service.playCard(10000);
        service.state.update((st) => ({
            ...st,
            penalty: {
                ...st.penalty,
                penaltyOptions: [{ id: 'random-discard', name: 'Random Discard', emoji: '🗑️', description: '', detail: '' }],
            },
        }));
        service.selectPenalty('random-discard');
        service.applyPenalty();
        const state = service.gameState();
        expect(state.penalty.showApplied).toBeTrue();
        expect(state.penalty.appMessage).toContain('lost');
    });
    it('nextPenalty advances to next loser', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }, { name: 'C', isHuman: false }], true);
        const player = service.gameState().players[0];
        player.hand = [{ id: 10000, color: 'red', type: 'number', value: 5 }];
        const redDiscard = { id: 9999, color: 'red', type: 'number', value: 5 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redDiscard],
        }));
        service.playCard(10000);
        expect(service.gameState().penalty.currentLoserIndex).toBe(0);
        expect(service.gameState().penalty.loserIds.length).toBe(2);
        // Skip through penalties
        const options = service.gameState().penalty.penaltyOptions;
        service.selectPenalty(options[0].id);
        service.applyPenalty();
        service.nextPenalty();
        expect(service.gameState().penalty.currentLoserIndex).toBe(1);
    });
    it('nextPenalty finishes after all losers', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }], true);
        const player = service.gameState().players[0];
        player.hand = [{ id: 10000, color: 'red', type: 'number', value: 5 }];
        const redDiscard = { id: 9999, color: 'red', type: 'number', value: 5 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redDiscard],
        }));
        service.playCard(10000);
        const options = service.gameState().penalty.penaltyOptions;
        service.selectPenalty(options[0].id);
        service.applyPenalty();
        service.nextPenalty();
        expect(service.gameState().phase).toBe('finished');
    });
    it('skipCurrentTurn clears flag and ends turn', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        service.state.update((st) => ({
            ...st,
            players: st.players.map((p) => p.id === 0 ? { ...p, skipNextTurn: true } : p),
        }));
        service.skipCurrentTurn();
        const state = service.gameState();
        expect(state.players[0].skipNextTurn).toBeFalsy();
        expect(state.currentPlayerIndex).toBe(1);
    });
    it('wildRoulette picks random color on wild card', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        const player = service.gameState().players[0];
        player.wildRoulette = true;
        player.hand = [{ id: 20000, color: 'wild', type: 'wild' }];
        const redAny = { id: 9999, color: 'red', type: 'number', value: 1 };
        service.state.update((st) => ({
            ...st,
            players: [...st.players],
            discardPile: [redAny],
        }));
        service.playCard(20000);
        const state = service.gameState();
        const topCard = state.discardPile[state.discardPile.length - 1];
        expect(['red', 'blue', 'green', 'yellow']).toContain(topCard.chosenColor ?? 'wild');
    });
    it('handRevealTurns decrements on endTurn', () => {
        service.initGame([{ name: 'You', isHuman: true }, { name: 'Bot', isHuman: false }]);
        service.state.update((st) => ({
            ...st,
            players: st.players.map((p) => p.id === 0 ? { ...p, handRevealTurns: 2 } : p),
        }));
        service.endTurn();
        const state = service.gameState();
        expect(state.players[0].handRevealTurns).toBe(1);
    });
});
//# sourceMappingURL=game.service.spec.js.map