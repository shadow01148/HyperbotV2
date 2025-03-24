interface GameSession {
    game: string;
    messageId: string;
}

const activeGames = new Map<string, GameSession>();

export function startGame(userId: string, messageId: string, gameType: string) {
    activeGames.set(userId, { game: gameType, messageId });
}

export function isGameActive(userId: string): boolean {
    return activeGames.has(userId);
}

export function endGame(userId: string) {
    activeGames.delete(userId);
}
