import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
const STORAGE_KEY = 'uno_penalty_db';
let PenaltyDbService = class PenaltyDbService {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    getDb() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        }
        catch {
            return {};
        }
    }
    saveDb(db) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }
    getUserStore(userId) {
        const db = this.getDb();
        if (!db[userId]) {
            const defaultComputers = {};
            for (let i = 1; i <= 3; i++) {
                const name = `Computer ${i}`;
                defaultComputers[name] = { name, wins: 0, losses: 0, activePenalties: {} };
            }
            db[userId] = { computers: defaultComputers, playerPenalties: {} };
            this.saveDb(db);
        }
        return db[userId];
    }
    getComputerProfiles() {
        const user = this.auth.currentUser();
        if (!user)
            return [];
        const store = this.getUserStore(user.id);
        return Object.values(store.computers);
    }
    getComputerNames() {
        return this.getComputerProfiles().map(c => c.name);
    }
    getOrCreateComputerProfile(name) {
        const user = this.auth.currentUser();
        if (!user)
            return { name, wins: 0, losses: 0, activePenalties: {} };
        const store = this.getUserStore(user.id);
        if (!store.computers[name]) {
            store.computers[name] = { name, wins: 0, losses: 0, activePenalties: {} };
            this.saveDb(this.getDb());
        }
        return store.computers[name];
    }
    saveComputerPenalties(name, penalties) {
        const user = this.auth.currentUser();
        if (!user)
            return;
        const store = this.getUserStore(user.id);
        if (!store.computers[name]) {
            store.computers[name] = { name, wins: 0, losses: 0, activePenalties: {} };
        }
        store.computers[name].activePenalties = penalties;
        this.saveDb(this.getDb());
    }
    recordMatchResult(computerNames, humanWon) {
        const user = this.auth.currentUser();
        if (!user)
            return;
        const store = this.getUserStore(user.id);
        for (const name of computerNames) {
            if (!store.computers[name]) {
                store.computers[name] = { name, wins: 0, losses: 0, activePenalties: {} };
            }
            if (humanWon) {
                store.computers[name].losses++;
            }
            else {
                store.computers[name].wins++;
            }
        }
        this.saveDb(this.getDb());
    }
    getPlayerPenalties() {
        const user = this.auth.currentUser();
        if (!user)
            return {};
        return this.getUserStore(user.id).playerPenalties;
    }
    savePlayerPenalties(penalties) {
        const user = this.auth.currentUser();
        if (!user)
            return;
        const store = this.getUserStore(user.id);
        store.playerPenalties = penalties;
        this.saveDb(this.getDb());
    }
    getStoredPenaltyMap(playerNames) {
        const result = {};
        for (let i = 0; i < playerNames.length; i++) {
            const name = playerNames[i];
            const profile = this.getOrCreateComputerProfile(name);
            if (Object.keys(profile.activePenalties).length > 0) {
                result[i] = profile.activePenalties;
            }
        }
        const playerPenalties = this.getPlayerPenalties();
        if (Object.keys(playerPenalties).length > 0) {
            const humanIdx = playerNames.findIndex((_, i) => i === 0);
            if (humanIdx >= 0)
                result[humanIdx] = { ...(result[humanIdx] || {}), ...playerPenalties };
        }
        return result;
    }
};
PenaltyDbService = __decorate([
    Injectable({ providedIn: 'root' })
], PenaltyDbService);
export { PenaltyDbService };
//# sourceMappingURL=penalty-db.service.js.map