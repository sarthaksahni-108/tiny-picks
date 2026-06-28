// Firebase configuration and Firestore sync module
const firebaseConfig = {
    apiKey: "AIzaSyAc9S0Rmg_HdgQnnkX_IJlObIxckjts7z8",
    authDomain: "bumpbook-app.firebaseapp.com",
    projectId: "bumpbook-app",
    storageBucket: "bumpbook-app.firebasestorage.app",
    messagingSenderId: "311053875918",
    appId: "1:311053875918:web:92242f899fab941dafae9f"
};

// Will be initialized after Firebase SDK loads
let db = null;
let roomRef = null;
let currentRoomCode = null;
let currentPlayerId = null;
let isHost = false;
let unsubscribeRoom = null;

// Initialize Firebase
function initFirebase() {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}

// Generate a short room code (4 uppercase letters)
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O to avoid confusion
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Generate a player ID (stored in localStorage)
function getOrCreatePlayerId() {
    let id = localStorage.getItem('tiny-picks-player-id');
    if (!id) {
        id = 'p_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('tiny-picks-player-id', id);
    }
    return id;
}

// Create a new room (host)
async function createRoom() {
    currentPlayerId = getOrCreatePlayerId();
    isHost = true;

    // Try up to 5 times to get a unique code
    let code, roomDoc;
    for (let i = 0; i < 5; i++) {
        code = generateRoomCode();
        roomDoc = await db.collection('tiny-picks-rooms').doc(code).get();
        if (!roomDoc.exists) break;
    }

    currentRoomCode = code;
    roomRef = db.collection('tiny-picks-rooms').doc(code);

    await roomRef.set({
        host: currentPlayerId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'waiting',
        playerCount: 1,
        players: {
            [currentPlayerId]: {
                name: '👑 Host',
                playerIndex: -1,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                ready: false,
                done: false
            }
        },
        picks: {}
    });

    return code;
}

// Join an existing room
async function joinRoom(code) {
    code = code.toUpperCase().trim();
    currentPlayerId = getOrCreatePlayerId();
    currentRoomCode = code;
    roomRef = db.collection('tiny-picks-rooms').doc(code);

    const roomDoc = await roomRef.get();
    if (!roomDoc.exists) {
        throw new Error('Room not found! Check the code.');
    }

    const data = roomDoc.data();
    if (data.status !== 'waiting' && data.status !== 'picking') {
        throw new Error('This room has already started the reveal!');
    }

    // Register presence in the room
    await roomRef.update({
        [`players.${currentPlayerId}`]: {
            name: 'Player',
            playerIndex: -1,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ready: false,
            done: false
        },
        playerCount: firebase.firestore.FieldValue.increment(1)
    });

    isHost = (data.host === currentPlayerId);
    return data;
}

// Register current player's claimed character in the room
async function registerPlayer(playerIndex) {
    const player = CONFIG.players[playerIndex];
    
    await roomRef.update({
        [`players.${currentPlayerId}.name`]: player.name,
        [`players.${currentPlayerId}.playerIndex`]: playerIndex,
        [`players.${currentPlayerId}.avatar`]: player.avatar,
    });
}

// Submit picks to Firebase
async function submitPicks(picks) {
    await roomRef.update({
        [`picks.${currentPlayerId}`]: picks,
        [`players.${currentPlayerId}.done`]: true
    });
}

// Update room status (host only)
async function updateRoomStatus(status) {
    if (!isHost && status !== 'picking') return;
    await roomRef.update({ status: status });
}

// Listen to room changes
function listenToRoom(callback) {
    if (unsubscribeRoom) unsubscribeRoom();
    
    unsubscribeRoom = roomRef.onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data());
        }
    });
}

// Stop listening
function stopListening() {
    if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
    }
}

// Check if all players who claimed a character are done picking
function allPlayersDone(roomData) {
    const players = roomData.players || {};
    const claimedPlayers = Object.keys(players).filter(id => players[id].playerIndex >= 0);
    if (claimedPlayers.length < 2) return false; // need at least 2 active players
    return claimedPlayers.every(id => players[id].done === true);
}

// Get all picks organized by player index
function getPicksByPlayer(roomData) {
    const result = {};
    const players = roomData.players || {};
    const picks = roomData.picks || {};

    Object.keys(players).forEach(pid => {
        const playerIndex = players[pid].playerIndex;
        if (playerIndex < 0 || !CONFIG.players[playerIndex]) return;
        const playerId = CONFIG.players[playerIndex].id;
        result[playerId] = picks[pid] || [];
    });

    return result;
}
