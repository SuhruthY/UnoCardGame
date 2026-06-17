import { __decorate } from "tslib";
import { Injectable, signal, computed } from '@angular/core';
let GameService = class GameService {
    penaltyPool = [
        { id: 'extra-draw', name: 'Extra Draw', emoji: '🃏', description: 'Draw 4 extra cards', detail: 'Forces you to draw 4 cards from the pile, padding your hand and making it harder to empty.' },
        { id: 'random-discard', name: 'Random Discard', emoji: '🗑️', description: 'Lose a random card', detail: 'One random card is removed from your hand. Could be a useful card or dead weight.' },
        { id: 'skips-ahead', name: 'Skips Ahead', emoji: '⏭️', description: 'Lose your next turn', detail: 'When your next turn comes, it is automatically skipped. You watch the game pass you by.' },
        { id: 'wild-roulette', name: 'Wild Roulette', emoji: '🎰', description: 'Next wild color is random', detail: 'If you play a Wild or Wild Draw 4, the color is chosen randomly instead of by you.' },
        { id: 'hand-reveal', name: 'Hand Reveal', emoji: '👀', description: 'Hand visible for 2 turns', detail: 'Everyone can see your cards for the next 2 of your turns. No more secrets.' },
    ];
    state = signal({
        players: [],
        drawPile: [],
        discardPile: [],
        currentPlayerIndex: 0,
        direction: 1,
        phase: 'setup',
        winner: null,
        pendingDrawCount: 0,
        drawnThisTurn: false,
        drawnCards: [],
        selectedColor: null,
        adultMode: false,
        penalty: { active: false, loserIds: [], currentLoserIndex: 0, currentPenalty: null, penaltyOptions: [], waitingForSelection: false, showApplied: false, appMessage: '' },
    });
    aiTimer = null;
    gameState = computed(() => this.state());
    currentPlayer = computed(() => {
        const s = this.state();
        return s.players[s.currentPlayerIndex] || null;
    });
    topCard = computed(() => {
        const pile = this.state().discardPile;
        return pile.length > 0 ? pile[pile.length - 1] : null;
    });
    isHumanTurn = computed(() => {
        const p = this.currentPlayer();
        return p !== null && p.isHuman;
    });
    mustDraw = computed(() => {
        const s = this.state();
        if (s.phase !== 'playing')
            return false;
        if (s.drawnThisTurn)
            return false;
        const player = s.players[s.currentPlayerIndex];
        if (!player || !player.isHuman)
            return false;
        return !player.hand.some(c => this.canPlayCard(c));
    });
    nextId = 0;
    getNextId() {
        return this.nextId++;
    }
    createDeck() {
        const deck = [];
        const colors = ['red', 'blue', 'green', 'yellow'];
        for (const color of colors) {
            deck.push({ id: this.getNextId(), color, type: 'number', value: 0 });
            for (let n = 1; n <= 9; n++) {
                deck.push({ id: this.getNextId(), color, type: 'number', value: n });
                deck.push({ id: this.getNextId(), color, type: 'number', value: n });
            }
            for (let i = 0; i < 2; i++) {
                deck.push({ id: this.getNextId(), color, type: 'skip' });
                deck.push({ id: this.getNextId(), color, type: 'reverse' });
                deck.push({ id: this.getNextId(), color, type: 'draw2' });
            }
        }
        for (let i = 0; i < 4; i++) {
            deck.push({ id: this.getNextId(), color: 'wild', type: 'wild' });
            deck.push({ id: this.getNextId(), color: 'wild', type: 'wild4' });
        }
        return deck;
    }
    shuffle(cards) {
        const arr = [...cards];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    initGame(config, adultMode, storedPenalties) {
        const playersArr = Array.isArray(config) ? config : config;
        const isAdultMode = adultMode === true;
        this.nextId = 0;
        const deck = this.shuffle(this.createDeck());
        const playerList = playersArr.map((p, i) => {
            const base = {
                id: i,
                name: p.name,
                hand: [],
                isCurrentTurn: false,
                isHuman: p.isHuman,
                skipNextTurn: false,
                wildRoulette: false,
                handRevealTurns: 0,
            };
            if (storedPenalties && storedPenalties[i]) {
                const sp = storedPenalties[i];
                base.skipNextTurn = sp['skips-ahead'] || false;
                base.wildRoulette = sp['wild-roulette'] || false;
                base.handRevealTurns = sp['hand-reveal'] ? 2 : 0;
            }
            return base;
        });
        for (const player of playerList) {
            player.hand = deck.splice(0, 7);
        }
        let firstCard = deck.pop();
        while (firstCard.type === 'wild4' || firstCard.type === 'wild') {
            deck.unshift(firstCard);
            firstCard = deck.pop();
        }
        this.state.set({
            players: playerList,
            drawPile: deck,
            discardPile: [firstCard],
            currentPlayerIndex: 0,
            direction: 1,
            phase: 'playing',
            winner: null,
            pendingDrawCount: 0,
            drawnThisTurn: false,
            drawnCards: [],
            selectedColor: null,
            adultMode: isAdultMode,
            penalty: { active: false, loserIds: [], currentLoserIndex: 0, currentPenalty: null, penaltyOptions: [], waitingForSelection: false, showApplied: false, appMessage: '' },
        });
        playerList[0].isCurrentTurn = true;
        this.state.update(s => ({ ...s, players: [...playerList] }));
        this.scheduleAI();
    }
    playCard(cardId, chosenColor) {
        const s = this.state();
        if (s.phase !== 'playing')
            return;
        const player = s.players[s.currentPlayerIndex];
        const handIndex = player.hand.findIndex(c => c.id === cardId);
        const drawIndex = s.drawnCards.findIndex(c => c.id === cardId);
        if (handIndex === -1 && drawIndex === -1)
            return;
        const card = handIndex !== -1 ? { ...player.hand[handIndex] } : { ...s.drawnCards[drawIndex] };
        if (!this.canPlayCard(card))
            return;
        if (card.type === 'wild' || card.type === 'wild4') {
            if (player.wildRoulette) {
                card.chosenColor = this.pickHumanColor();
            }
            else {
                card.chosenColor = chosenColor || this.pickBestColor(player.hand);
            }
        }
        let newHand = [...player.hand];
        let newDrawn = [...s.drawnCards];
        if (handIndex !== -1) {
            newHand = player.hand.filter(c => c.id !== cardId);
        }
        else {
            newDrawn = s.drawnCards.filter(c => c.id !== cardId);
            newHand = [...newHand, ...newDrawn];
            newDrawn = [];
        }
        player.hand = newHand;
        const newDiscard = [...s.discardPile, card];
        if (newHand.length === 0) {
            this.cancelAI();
            const winner = { ...player, hand: [] };
            if (s.adultMode) {
                const loserIds = s.players.filter(p => p.id !== player.id).map(p => p.id);
                const shuffled = [...this.penaltyPool].sort(() => Math.random() - 0.5);
                const options = shuffled.slice(0, 3);
                this.state.update(st => ({
                    ...st,
                    players: st.players.map(p => p.id === player.id ? { ...player } : p),
                    drawnCards: newDrawn,
                    discardPile: newDiscard,
                    phase: 'penalty',
                    winner,
                    penalty: {
                        active: true,
                        loserIds,
                        currentLoserIndex: 0,
                        currentPenalty: null,
                        penaltyOptions: options,
                        waitingForSelection: true,
                        showApplied: false,
                        appMessage: '',
                    },
                }));
            }
            else {
                this.state.update(st => ({
                    ...st,
                    players: st.players.map(p => p.id === player.id ? { ...player } : p),
                    drawnCards: newDrawn,
                    discardPile: newDiscard,
                    phase: 'finished',
                    winner,
                }));
            }
            return;
        }
        const pendingDraw = s.pendingDrawCount;
        let newPendingDraw = pendingDraw;
        let skipNext = false;
        if (card.type === 'skip') {
            skipNext = true;
        }
        else if (card.type === 'reverse') {
            if (s.players.length === 2) {
                skipNext = true;
            }
            else {
                this.state.update(st => ({ ...st, direction: (st.direction * -1) }));
            }
        }
        else if (card.type === 'draw2') {
            newPendingDraw = pendingDraw + 2;
        }
        else if (card.type === 'wild4') {
            newPendingDraw = pendingDraw + 4;
        }
        const advance = skipNext ? 2 : 1;
        let nextIndex = (s.currentPlayerIndex + s.direction * advance + s.players.length) % s.players.length;
        let skippedPlayer = null;
        if (s.players[nextIndex].skipNextTurn) {
            skippedPlayer = s.players[nextIndex];
            nextIndex = (nextIndex + s.direction + s.players.length) % s.players.length;
        }
        this.state.update(st => ({
            ...st,
            players: st.players.map(p => {
                if (p.id === player.id)
                    return { ...player };
                if (skippedPlayer && p.id === skippedPlayer.id)
                    return { ...p, skipNextTurn: false };
                return p;
            }),
            drawnCards: newDrawn,
            discardPile: newDiscard,
            currentPlayerIndex: nextIndex,
            pendingDrawCount: newPendingDraw,
            drawnThisTurn: false,
            selectedColor: chosenColor || null,
        }));
        this.state.update(st => {
            const players = st.players.map((p, i) => ({
                ...p,
                isCurrentTurn: i === st.currentPlayerIndex,
            }));
            return { ...st, players };
        });
        this.scheduleAI();
    }
    drawCard() {
        const s = this.state();
        if (s.phase !== 'playing')
            return;
        if (s.drawnThisTurn)
            return;
        const player = s.players[s.currentPlayerIndex];
        const drawCount = s.pendingDrawCount > 0 ? s.pendingDrawCount : 1;
        const drawn = this.drawFromPile(drawCount);
        const newDrawn = [...s.drawnCards, ...drawn];
        const canPlayDrawn = drawn.some(c => this.canPlayCard(c));
        this.state.update(st => ({
            ...st,
            drawPile: [...st.drawPile],
            pendingDrawCount: 0,
            drawnThisTurn: true,
            drawnCards: newDrawn,
        }));
        if (!canPlayDrawn) {
            this.passTurn();
        }
        else if (!player.isHuman) {
            this.scheduleAI();
        }
    }
    passTurn() {
        const s = this.state();
        if (s.phase !== 'playing')
            return;
        if (s.drawnCards.length > 0) {
            const player = s.players[s.currentPlayerIndex];
            player.hand = [...player.hand, ...s.drawnCards];
            this.state.update(st => ({
                ...st,
                players: st.players.map(p => p.id === player.id ? { ...player } : p),
                drawnCards: [],
            }));
        }
        this.endTurn();
    }
    canPlayCard(card) {
        const top = this.topCard();
        if (!top)
            return true;
        const s = this.state();
        const player = s.players[s.currentPlayerIndex];
        const effectiveColor = top.chosenColor || top.color;
        if (card.type === 'wild') {
            if (s.pendingDrawCount > 0)
                return false;
            return true;
        }
        if (card.type === 'wild4') {
            const hasMatchingColor = player.hand.some(c => c.id !== card.id && c.color === effectiveColor && c.type !== 'wild' && c.type !== 'wild4');
            return !hasMatchingColor;
        }
        if (s.pendingDrawCount > 0) {
            return card.type === 'draw2';
        }
        if (effectiveColor === 'wild')
            return true;
        if (card.color === effectiveColor)
            return true;
        if (card.type === 'number' && top.type === 'number') {
            return card.value === top.value;
        }
        return card.type !== 'number' && card.type === top.type;
    }
    drawFromPile(count) {
        const drawn = [];
        let pile = [];
        for (let i = 0; i < count; i++) {
            const cur = this.state();
            if (pile.length === 0) {
                pile = [...cur.drawPile];
            }
            if (pile.length === 0) {
                if (cur.discardPile.length <= 1)
                    break;
                const topPile = cur.discardPile[cur.discardPile.length - 1];
                const rest = cur.discardPile.slice(0, -1);
                pile = this.shuffle(rest);
                this.state.update(st => ({
                    ...st,
                    discardPile: [topPile],
                    drawPile: pile,
                }));
            }
            drawn.push(pile.pop());
        }
        this.state.update(st => ({ ...st, drawPile: pile }));
        return drawn;
    }
    pickHumanColor() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    pickBestColor(hand) {
        const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const c of hand) {
            if (c.color !== 'wild')
                counts[c.color]++;
        }
        let best = 'red';
        let max = 0;
        for (const [color, count] of Object.entries(counts)) {
            if (count > max) {
                max = count;
                best = color;
            }
        }
        return best;
    }
    endTurn() {
        this.state.update(s => {
            const prevPlayerIdx = s.currentPlayerIndex;
            let nextIdx = (prevPlayerIdx + s.direction + s.players.length) % s.players.length;
            let players = s.players.map(p => ({ ...p, isCurrentTurn: false }));
            if (players[prevPlayerIdx].handRevealTurns && players[prevPlayerIdx].handRevealTurns > 0) {
                players[prevPlayerIdx] = { ...players[prevPlayerIdx], handRevealTurns: players[prevPlayerIdx].handRevealTurns - 1 };
            }
            if (players[nextIdx].skipNextTurn) {
                players[nextIdx] = { ...players[nextIdx], skipNextTurn: false };
                nextIdx = (nextIdx + s.direction + s.players.length) % s.players.length;
            }
            players[nextIdx] = { ...players[nextIdx], isCurrentTurn: true };
            return { ...s, currentPlayerIndex: nextIdx, players, drawnThisTurn: false, drawnCards: [] };
        });
        this.scheduleAI();
    }
    cancelAI() {
        if (this.aiTimer !== null) {
            clearTimeout(this.aiTimer);
            this.aiTimer = null;
        }
    }
    aiAnalysis = null;
    scheduleAI() {
        this.cancelAI();
        const s = this.state();
        if (s.phase !== 'playing')
            return;
        const player = s.players[s.currentPlayerIndex];
        if (!player || player.isHuman)
            return;
        this.aiTimer = setTimeout(() => this.runAI(), 200);
    }
    aiAnalyzeHuman() {
        const s = this.state();
        const humanIdx = s.players.findIndex(p => p.isHuman);
        if (humanIdx < 0) {
            this.aiAnalysis = null;
            return;
        }
        const human = s.players[humanIdx];
        const colors = { red: 0, blue: 0, green: 0, yellow: 0 };
        const numbers = {};
        for (const c of human.hand) {
            if (c.color !== 'wild')
                colors[c.color] = (colors[c.color] || 0) + 1;
            if (c.type === 'number' && c.value !== undefined)
                numbers[c.value] = (numbers[c.value] || 0) + 1;
        }
        this.aiAnalysis = { humanIdx, humanColors: colors, humanNumbers: numbers };
    }
    isHumanNext(s) {
        if (!this.aiAnalysis)
            return false;
        let nextIdx = (s.currentPlayerIndex + s.direction + s.players.length) % s.players.length;
        if (s.players[nextIdx].skipNextTurn) {
            nextIdx = (nextIdx + s.direction + s.players.length) % s.players.length;
        }
        return nextIdx === this.aiAnalysis.humanIdx;
    }
    pickColorHumanFavors() {
        if (this.aiAnalysis) {
            const colors = ['red', 'blue', 'green', 'yellow'];
            const weighted = colors
                .map(c => ({ color: c, count: this.aiAnalysis.humanColors[c] || 0 }))
                .sort((a, b) => b.count - a.count);
            if (weighted[0].count > 0)
                return weighted[0].color;
        }
        return this.pickHumanColor();
    }
    runAI() {
        const s = this.state();
        if (s.phase !== 'playing')
            return;
        const player = s.players[s.currentPlayerIndex];
        if (!player || player.isHuman)
            return;
        this.aiAnalyzeHuman();
        // Handle drawn cards first
        const drawnPlayable = s.drawnCards.filter(c => this.canPlayCard(c));
        if (drawnPlayable.length > 0) {
            if (drawnPlayable[0].type === 'number') {
                this.playCard(drawnPlayable[0].id);
                return;
            }
            this.playCard(drawnPlayable[0].id);
            return;
        }
        const playableCards = player.hand.filter(c => this.canPlayCard(c));
        // Pending draw: only stack if targeting a non-human
        if (s.pendingDrawCount > 0) {
            const draw2Cards = playableCards.filter(c => c.type === 'draw2');
            if (draw2Cards.length > 0 && !this.isHumanNext(s)) {
                this.playCard(draw2Cards[0].id);
                return;
            }
            this.drawCard();
            return;
        }
        // Never play to win — draw if hand is too small
        if (player.hand.length <= 3) {
            this.drawCard();
            return;
        }
        if (playableCards.length > 0) {
            const numberCards = playableCards.filter(c => c.type === 'number');
            const actionCards = playableCards.filter(c => c.type === 'skip' || c.type === 'reverse' || c.type === 'draw2');
            const wildCards = playableCards.filter(c => c.type === 'wild' || c.type === 'wild4');
            // Prefer number cards — helps human match
            if (numberCards.length > 0) {
                const sorted = numberCards.sort((a, b) => {
                    const aScore = this.aiAnalysis?.humanNumbers[a.value] || 0;
                    const bScore = this.aiAnalysis?.humanNumbers[b.value] || 0;
                    return bScore - aScore;
                });
                if (this.aiAnalysis) {
                    const humanColorMatch = numberCards.find(c => (this.aiAnalysis.humanColors[c.color] || 0) > 0);
                    if (humanColorMatch) {
                        this.playCard(humanColorMatch.id);
                        return;
                    }
                }
                if (sorted[0] && (this.aiAnalysis?.humanNumbers[sorted[0].value] || 0) > 0) {
                    this.playCard(sorted[0].id);
                    return;
                }
                this.playCard(numberCards[numberCards.length - 1].id);
                return;
            }
            // Wilds: pick color that helps human
            if (wildCards.length > 0) {
                const chosen = this.pickColorHumanFavors();
                this.playCard(wildCards[0].id, chosen);
                return;
            }
            // Action cards: use to help human (skip other AIs, reverse in 2-player = human goes again)
            if (actionCards.length > 0) {
                if (this.aiAnalysis) {
                    const humanIsTarget = this.isHumanNext(s);
                    const nextAction = actionCards.find(c => c.type === 'skip' || c.type === 'reverse');
                    if (nextAction) {
                        if (!humanIsTarget) {
                            this.playCard(nextAction.id);
                            return;
                        }
                    }
                    const drawAction = actionCards.find(c => c.type === 'draw2');
                    if (drawAction && !humanIsTarget) {
                        this.playCard(drawAction.id);
                        return;
                    }
                }
            }
        }
        this.drawCard();
    }
    skipCurrentTurn() {
        this.state.update(s => ({
            ...s,
            players: s.players.map((p, i) => i === s.currentPlayerIndex ? { ...p, skipNextTurn: false } : p),
        }));
        this.endTurn();
    }
    selectPenalty(penaltyId) {
        const s = this.state();
        if (s.phase !== 'penalty' || !s.penalty.waitingForSelection)
            return;
        const penalty = this.penaltyPool.find(p => p.id === penaltyId);
        if (!penalty)
            return;
        this.state.update(st => ({
            ...st,
            penalty: {
                ...st.penalty,
                currentPenalty: penalty,
                waitingForSelection: false,
                showApplied: false,
                appMessage: '',
            },
        }));
    }
    applyPenalty() {
        const s = this.state();
        if (s.phase !== 'penalty' || s.penalty.waitingForSelection || !s.penalty.currentPenalty)
            return;
        const loserId = s.penalty.loserIds[s.penalty.currentLoserIndex];
        const penaltyId = s.penalty.currentPenalty.id;
        let message = '';
        let players = s.players.map(p => ({ ...p }));
        switch (penaltyId) {
            case 'extra-draw': {
                const loser = players.find(p => p.id === loserId);
                const drawn = [];
                let pile = [...s.drawPile];
                for (let i = 0; i < 4; i++) {
                    if (pile.length === 0)
                        break;
                    drawn.push(pile.pop());
                }
                loser.hand = [...loser.hand, ...drawn];
                players = players.map(p => p.id === loserId ? loser : p);
                message = `${loser.name} drew ${drawn.length} extra cards!`;
                this.state.update(st => ({ ...st, drawPile: pile }));
                break;
            }
            case 'random-discard': {
                const loser = players.find(p => p.id === loserId);
                if (loser.hand.length > 0) {
                    const idx = Math.floor(Math.random() * loser.hand.length);
                    loser.hand = loser.hand.filter((_, i) => i !== idx);
                    players = players.map(p => p.id === loserId ? loser : p);
                    message = `${loser.name} lost a random card!`;
                }
                else {
                    message = `${loser.name} has no cards to lose!`;
                }
                break;
            }
            case 'skips-ahead': {
                players = players.map(p => p.id === loserId ? { ...p, skipNextTurn: true } : p);
                const skipsLoser = players.find(p => p.id === loserId);
                message = `${skipsLoser.name} will lose their next turn!`;
                break;
            }
            case 'wild-roulette': {
                players = players.map(p => p.id === loserId ? { ...p, wildRoulette: true } : p);
                const wildLoser = players.find(p => p.id === loserId);
                message = `${wildLoser.name}'s next wild card will be random!`;
                break;
            }
            case 'hand-reveal': {
                players = players.map(p => p.id === loserId ? { ...p, handRevealTurns: 2 } : p);
                const revealLoser = players.find(p => p.id === loserId);
                message = `${revealLoser.name}'s hand is revealed for 2 turns!`;
                break;
            }
        }
        this.state.update(st => ({
            ...st,
            players,
            penalty: {
                ...st.penalty,
                currentPenalty: null,
                showApplied: true,
                appMessage: message,
            },
        }));
    }
    nextPenalty() {
        const s = this.state();
        if (s.phase !== 'penalty')
            return;
        const nextIdx = s.penalty.currentLoserIndex + 1;
        if (nextIdx >= s.penalty.loserIds.length) {
            this.state.update(st => ({
                ...st,
                phase: 'finished',
                penalty: { active: false, loserIds: [], currentLoserIndex: 0, currentPenalty: null, penaltyOptions: [], waitingForSelection: false, showApplied: false, appMessage: '' },
            }));
        }
        else {
            const shuffled = [...this.penaltyPool].sort(() => Math.random() - 0.5);
            const options = shuffled.slice(0, 3);
            this.state.update(st => ({
                ...st,
                penalty: {
                    ...st.penalty,
                    currentLoserIndex: nextIdx,
                    currentPenalty: null,
                    penaltyOptions: options,
                    waitingForSelection: true,
                    showApplied: false,
                    appMessage: '',
                },
            }));
        }
    }
};
GameService = __decorate([
    Injectable({ providedIn: 'root' })
], GameService);
export { GameService };
//# sourceMappingURL=game.service.js.map