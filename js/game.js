// Game state management
class Game {
    constructor() {
        this.currentPlayerIndex = null;
        this.picks = {}; // { playerId: [itemIds] }
        this.completedPlayers = new Set();
        this.timerInterval = null;
        this.timeRemaining = CONFIG.timerSeconds;

        // Initialize empty picks for all players
        CONFIG.players.forEach(p => {
            this.picks[p.id] = [];
        });
    }

    setCurrentPlayer(playerIndex) {
        this.currentPlayerIndex = playerIndex;
        this.timeRemaining = CONFIG.timerSeconds;
    }

    getCurrentPlayer() {
        return CONFIG.players[this.currentPlayerIndex];
    }

    toggleItem(itemId) {
        const player = this.getCurrentPlayer();
        const playerPicks = this.picks[player.id];
        const index = playerPicks.indexOf(itemId);

        if (index > -1) {
            playerPicks.splice(index, 1);
            return { added: false, count: playerPicks.length };
        } else if (playerPicks.length < CONFIG.maxPicks) {
            playerPicks.push(itemId);
            return { added: true, count: playerPicks.length };
        }
        return { added: false, count: playerPicks.length, full: true };
    }

    lockInPlayer() {
        const player = this.getCurrentPlayer();
        this.completedPlayers.add(player.id);
        this.stopTimer();
    }

    isPlayerDone(playerId) {
        return this.completedPlayers.has(playerId);
    }

    allPlayersDone() {
        return this.completedPlayers.size === CONFIG.players.length;
    }

    startTimer(onTick, onExpire) {
        this.stopTimer();
        this.timeRemaining = CONFIG.timerSeconds;
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            onTick(this.timeRemaining);
            if (this.timeRemaining <= 0) {
                this.stopTimer();
                onExpire();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // Get packages for delivery phase
    // Team "them" picks → Package 1 (initially headed to them)
    // Team "us" picks → Package 2 (initially headed to them too)
    // THE TWIST: packages swap destinations
    getPackages() {
        const themPlayers = CONFIG.players.filter(p => p.team === 'them');
        const usPlayers = CONFIG.players.filter(p => p.team === 'us');

        const pkg1Items = [];
        themPlayers.forEach(p => {
            this.picks[p.id].forEach(id => pkg1Items.push(id));
        });

        const pkg2Items = [];
        usPlayers.forEach(p => {
            this.picks[p.id].forEach(id => pkg2Items.push(id));
        });

        return {
            package1: { items: pkg1Items, pickedBy: themPlayers.map(p => p.name).join(' & ') },
            package2: { items: pkg2Items, pickedBy: usPlayers.map(p => p.name).join(' & ') },
        };
    }
}
