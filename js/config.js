// Game configuration
const CONFIG = {
    timerSeconds: 120,
    maxPicks: 5,
    devMode: false, // LIVE MODE — full multiplayer flow
    
    // Players — replace avatar paths with actual headshots
    players: [
        { id: 'friend-a', name: 'A', avatar: 'assets/avatars/friend-a.png', team: 'them' },
        { id: 'friend-s', name: 'S', avatar: 'assets/avatars/friend-s.png', team: 'them' },
        { id: 'you-a', name: 'A', avatar: 'assets/avatars/you-a.png', team: 'us' },
        { id: 'you-s', name: 'S', avatar: 'assets/avatars/you-s.png', team: 'us' },
    ],

    // Which team is the "expecting" couple they know about
    knownExpecting: 'them',

    // Caps displayed during delivery
    caps: {
        mom: '👩‍🍼',
        dad: '👨‍🍼',
        maasi: '🧡',
        mausa: '🎩',
    },

    // Reveal content — replace with actual image paths
    revealPhotos: [
        { src: 'assets/reveal/milestone1.jpg', alt: 'Milestone Photo' },
        { src: 'assets/reveal/milestone2.jpg', alt: 'Milestone Photo' },
        { src: 'assets/reveal/ultrasound.jpg', alt: 'Ultrasound' },
    ],

    // Due date info
    dueMonth: 'Coming Soon 🍼',
};
