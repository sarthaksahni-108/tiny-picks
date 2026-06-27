// Main app controller
const game = new Game();

// Scatter random baby doodles in background
(function scatterDoodles() {
    const emojis = ['⭐','🧸','🍼','🎀','👶','🧷','🎈','🦆','🌙','🎁','🧤','🚀','🌈','🧁','🪄','🐣','💫','🪺','🧶','🎠'];
    const container = document.querySelector('.doodle-bg');
    if (!container) return;
    container.innerHTML = '';
    const count = 18;
    for (let i = 0; i < count; i++) {
        const span = document.createElement('span');
        span.className = 'doodle-item';
        span.textContent = emojis[i % emojis.length];
        span.style.left = (Math.random() * 90 + 2) + '%';
        span.style.top = (Math.random() * 90 + 2) + '%';
        span.style.fontSize = (1.2 + Math.random() * 1) + 'rem';
        span.style.transform = `rotate(${Math.random() * 40 - 20}deg)`;
        span.style.opacity = (0.12 + Math.random() * 0.1).toFixed(2);
        container.appendChild(span);
    }
})();

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(screenId) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#${screenId}`).classList.add('active');
}

// ========== Emoji Cycler on Welcome Screen ==========
(function() {
    const emojis = ['🍼', '🧸', '🎁', '👶', '🧷', '🎀', '🪇', '🛍️', '🧤', '🌟', '🎈', '🚀'];
    const el = document.getElementById('welcome-emoji-cycle');
    if (!el) return;
    let i = 0;
    setInterval(() => {
        i = (i + 1) % emojis.length;
        el.style.animation = 'none';
        el.offsetHeight; // trigger reflow
        el.textContent = emojis[i];
        el.style.animation = 'float 3s ease-in-out infinite, emojiPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }, 1800);
})();

// ========== SCREEN: Welcome ==========
$('#btn-start').addEventListener('click', () => {
    initFirebase();
    if (CONFIG.devMode) {
        // In dev mode, skip lobby — go straight to player select
        showScreen('screen-players');
        renderPlayerGrid();
    } else {
        showScreen('screen-lobby');
    }
});

// ========== SCREEN: Lobby ==========
$('#btn-create-room').addEventListener('click', async () => {
    try {
        const code = await createRoom();
        showScreen('screen-room-waiting');
        $('#room-code-display').textContent = code;
        startRoomListener();
    } catch (e) {
        showLobbyError(e.message);
    }
});

$('#btn-join-room').addEventListener('click', async () => {
    const code = $('#input-room-code').value;
    if (code.length < 4) {
        showLobbyError('Enter a 4-letter code!');
        return;
    }
    try {
        await joinRoom(code);
        showScreen('screen-room-waiting');
        $('#room-code-display').textContent = code.toUpperCase();
        startRoomListener();
    } catch (e) {
        showLobbyError(e.message);
    }
});

$('#btn-copy-code').addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoomCode).then(() => {
        $('#btn-copy-code').textContent = 'Copied! ✅';
        setTimeout(() => { $('#btn-copy-code').textContent = 'Copy Code 📋'; }, 2000);
    });
});

function showLobbyError(msg) {
    const el = $('#lobby-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

// ========== SCREEN: Room Waiting ==========
function startRoomListener() {
    listenToRoom((data) => {
        renderRoomPlayers(data);

        // If host started the game, everyone moves to player select
        if (data.status === 'picking') {
            stopListening();
            // Sync picks from Firebase into local game state
            const fbPicks = getPicksByPlayer(data);
            Object.keys(fbPicks).forEach(pid => {
                game.picks[pid] = fbPicks[pid];
            });
            showScreen('screen-players');
            renderPlayerGrid();
        }
    });
}

function renderRoomPlayers(data) {
    const list = $('#room-players-list');
    list.innerHTML = '';
    const players = data.players || {};
    const count = Object.keys(players).length;

    Object.keys(players).forEach((pid, idx) => {
        const p = players[pid];
        const player = CONFIG.players[p.playerIndex] || CONFIG.players[0];
        const row = document.createElement('div');
        row.className = 'room-player-row';
        row.style.animationDelay = `${idx * 0.1}s`;
        row.innerHTML = `
            <img src="${player.avatar}" alt="${p.name}">
            <span class="room-player-name">${p.name}</span>
            <span class="room-player-badge">${pid === data.host ? '👑 Host' : '✅ Joined'}</span>
        `;
        list.appendChild(row);
    });

    $('#room-waiting-text').textContent = count < 4 
        ? `${count}/4 players joined...` 
        : 'All players are in! 🎉';

    // Show start button for host when enough players
    if (isHost && count >= 2) {
        $('#btn-start-game').classList.remove('btn-hidden');
    }
}

$('#btn-start-game').addEventListener('click', async () => {
    await updateRoomStatus('picking');
    showScreen('screen-players');
    renderPlayerGrid();
});

// ========== SCREEN: Player Select (Claim & Ready) ==========
let claimedPlayerIndex = null;
let readyPlayers = new Set();

function renderPlayerGrid() {
    const grid = $('#player-grid');
    grid.innerHTML = '';
    CONFIG.players.forEach((player, index) => {
        const card = document.createElement('div');
        card.className = 'player-card';
        
        const isClaimed = claimedPlayerIndex === index;
        const isDoneByOther = game.isPlayerDone(player.id) && !isClaimed;
        
        if (isClaimed) card.classList.add('claimed');
        if (isDoneByOther) card.classList.add('done');
        
        card.innerHTML = `
            <div class="player-avatar">
                <img src="${player.avatar}" alt="${player.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-placeholder\\'>${player.name}</div>'">
            </div>
            <div class="player-name">${player.name}</div>
            ${isClaimed ? '<div class="done-badge">That\'s me! ✋</div>' : ''}
        `;
        
        // Only allow claiming if not yet claimed by this user
        if (claimedPlayerIndex === null && !isDoneByOther) {
            card.addEventListener('click', () => claimPlayer(index));
        }
        grid.appendChild(card);
    });
}

function claimPlayer(index) {
    claimedPlayerIndex = index;
    game.setCurrentPlayer(index);
    
    // Show ready button
    $('#btn-ready').classList.remove('btn-hidden');
    $('#ready-status').classList.remove('hidden');
    
    // Re-render grid with claimed state
    renderPlayerGrid();
    
    // In multiplayer, register with Firebase
    if (roomRef) {
        registerPlayer(index);
    }
}

$('#btn-ready').addEventListener('click', () => {
    readyPlayers.add(claimedPlayerIndex);
    $('#btn-ready').classList.add('btn-hidden');
    $('#ready-text').textContent = '✅ You\'re ready! Waiting for others...';
    
    if (CONFIG.devMode) {
        // In dev mode, start immediately
        startShoppingCountdown();
    } else if (roomRef) {
        // Mark ready in Firebase
        roomRef.update({
            [`players.${currentPlayerId}.ready`]: true
        });
        // Listen for all ready
        listenForAllReady();
    }
});

function listenForAllReady() {
    listenToRoom((data) => {
        const players = data.players || {};
        const playerIds = Object.keys(players);
        const readyCount = playerIds.filter(id => players[id].ready).length;
        
        $('#ready-text').textContent = `✅ ${readyCount}/${playerIds.length} ready...`;
        
        if (readyCount >= playerIds.length && playerIds.length >= 2) {
            stopListening();
            startShoppingCountdown();
        }
    });
}

function startShoppingCountdown() {
    showScreen('screen-shop');
    const player = game.getCurrentPlayer();
    
    $('#current-player-name').textContent = player.name;
    $('#current-player-avatar').style.backgroundImage = `url(${player.avatar})`;
    $('#picks-made').textContent = '0';
    $('#btn-done-picking').classList.add('btn-hidden');
    
    renderItemsGrid();
    
    game.startTimer(
        (remaining) => {
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            $('#timer').textContent = mins > 0 ? `${mins}:${secs.toString().padStart(2,'0')}` : remaining;
            if (remaining <= 10) {
                $('#timer').classList.add('timer-warning');
            }
        },
        () => {
            finishShopping();
        }
    );
}

function renderItemsGrid() {
    const grid = $('#items-grid');
    grid.innerHTML = '';
    const player = game.getCurrentPlayer();
    const playerPicks = game.picks[player.id];

    BABY_ITEMS.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        if (playerPicks.includes(item.id)) {
            card.classList.add('selected');
        }
        card.innerHTML = `
            <div class="item-emoji">${item.emoji}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.desc}</div>
        `;
        card.addEventListener('click', () => {
            const result = game.toggleItem(item.id);
            if (result.full && !result.added) {
                card.classList.add('shake');
                setTimeout(() => card.classList.remove('shake'), 400);
                return;
            }
            card.classList.toggle('selected', result.added || playerPicks.includes(item.id));
            // Re-render to update selection state properly
            renderItemsGrid();
            $('#picks-made').textContent = result.count;

            if (result.count >= CONFIG.maxPicks) {
                $('#btn-done-picking').classList.remove('btn-hidden');
            } else {
                $('#btn-done-picking').classList.add('btn-hidden');
            }
        });
        grid.appendChild(card);
    });
}

$('#btn-done-picking').addEventListener('click', finishShopping);

function finishShopping() {
    game.lockInPlayer();
    
    // Push picks to Firebase if in multiplayer mode
    if (roomRef && currentPlayerId) {
        const player = game.getCurrentPlayer();
        submitPicks(game.picks[player.id]);
    }
    
    // Go directly to cart reveal (live-updating)
    showScreen('screen-cart-reveal');
    startCartRevealLive();
}

// ========== SCREEN: Cart Reveal (Live Updating) ==========
let cartRevealInterval = null;
let cartRevealUnsubscribe = null;

function startCartRevealLive() {
    // Render what we have so far
    renderCartReveal();
    
    if (CONFIG.devMode) {
        // In dev mode, auto-fill empty carts after a short delay
        setTimeout(() => {
            CONFIG.players.forEach(player => {
                if (game.picks[player.id].length === 0) {
                    const shuffled = [...BABY_ITEMS].sort(() => Math.random() - 0.5);
                    game.picks[player.id] = shuffled.slice(0, Math.floor(Math.random() * 3) + 2).map(i => i.id);
                }
            });
            renderCartReveal();
            showPackButton();
        }, 2000);
    } else if (roomRef) {
        // Listen to Firebase for other players' picks coming in
        cartRevealUnsubscribe = roomRef.onSnapshot((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            
            // Sync picks from Firebase into local game state
            const fbPicks = getPicksByPlayer(data);
            Object.keys(fbPicks).forEach(pid => {
                if (fbPicks[pid].length > 0) {
                    game.picks[pid] = fbPicks[pid];
                }
            });
            
            renderCartReveal();
            
            // Check if all submitted
            if (allPlayersDone(data)) {
                if (cartRevealUnsubscribe) {
                    cartRevealUnsubscribe();
                    cartRevealUnsubscribe = null;
                }
                showPackButton();
            }
        });
    }
}

function showPackButton() {
    $('#cart-reveal-sub').textContent = "Here's what everyone picked! 🎉";
    $('#btn-pack-it').classList.remove('btn-hidden');
}

function renderCartReveal() {
    const grid = $('#cart-reveal-grid');
    grid.innerHTML = '';
    
    let filledCount = 0;

    CONFIG.players.forEach((player, idx) => {
        const picks = game.picks[player.id] || [];
        const items = picks.map(id => BABY_ITEMS.find(item => item.id === id)).filter(Boolean);
        const hasPicks = items.length > 0;
        if (hasPicks) filledCount++;

        const card = document.createElement('div');
        card.className = 'cart-card' + (hasPicks ? '' : ' cart-card-waiting');
        card.style.animationDelay = `${idx * 0.15}s`;
        card.innerHTML = `
            <div class="cart-card-header">
                <img class="cart-card-avatar" src="${player.avatar}" alt="${player.name}" 
                     onerror="this.style.display='none'">
                <span class="cart-card-name">${player.name}</span>
            </div>
            <div class="cart-card-items">
                ${hasPicks 
                    ? items.map(it => `<div class="cart-item-pill">${it.emoji} ${it.name}</div>`).join('') 
                    : '<div class="cart-item-waiting">⏳ Still shopping...</div>'}
            </div>
            <div class="cart-card-count">${hasPicks ? items.length + ' item' + (items.length !== 1 ? 's' : '') + ' ✅' : 'Waiting...'}</div>
        `;
        grid.appendChild(card);
    });
    
    $('#cart-reveal-sub').textContent = filledCount >= 4 
        ? "Here's what everyone picked! 🎉"
        : `${filledCount}/4 carts in... waiting for the rest!`;
}

$('#btn-pack-it').addEventListener('click', () => {
    showScreen('screen-packing');
    renderPacking();
});

// ========== SCREEN: Packing ==========
function renderPacking() {
    const area = $('#packing-animation');
    area.innerHTML = '';

    CONFIG.players.forEach((player, idx) => {
        const box = document.createElement('div');
        box.className = 'box';
        box.style.animationDelay = `${idx * 0.2}s`;
        const pickCount = (game.picks[player.id] || []).length;
        box.innerHTML = `
            <div class="box-avatar">
                <img src="${player.avatar}" alt="${player.name}" onerror="this.style.display='none'">
            </div>
            <div class="box-label">📦 ${player.name}'s picks</div>
            <div class="box-from">${pickCount} item${pickCount !== 1 ? 's' : ''} packed!</div>
        `;
        area.appendChild(box);
    });
}

$('#btn-ship').addEventListener('click', () => {
    showScreen('screen-delivery');
    startDeliveryAnimation();
});

async function startDeliveryAnimation() {
    const root = $('#delivery-universe');
    if (!root) return;

    if (window.__deliveryCleanup) {
        window.__deliveryCleanup();
    }

    const runId = String(Date.now());
    root.dataset.runId = runId;

    const timers = [];
    const intervals = [];
    const schedule = (fn, ms) => {
        const id = setTimeout(fn, ms);
        timers.push(id);
        return id;
    };
    const repeat = (fn, ms) => {
        const id = setInterval(fn, ms);
        intervals.push(id);
        return id;
    };
    const isActive = () => root.dataset.runId === runId;
    const cleanup = () => {
        timers.forEach(clearTimeout);
        intervals.forEach(clearInterval);
        if (root.dataset.runId === runId) {
            delete root.dataset.runId;
        }
    };
    window.__deliveryCleanup = cleanup;

    const zones = [
        {
            key: 'city',
            label: '🌸 Blossom Garden',
            far: ['🌷', '🌻', '🌼', '🦋', '🐝'],
            mid: ['🌸', '🪻', '🌺', '🐦', '🌿', '🪴'],
            near: ['🍼', '🌹', '🌈', '🧸', '🪺', '🐣']
        },
        {
            key: 'toy',
            label: '🌴 Jungle Safari',
            far: ['🌴', '🦜', '🌿', '🌺', '🦎'],
            mid: ['🐒', '🦋', '🌳', '🍃', '🪻', '🦩'],
            near: ['🦁', '🐘', '🍼', '🌺', '🪄', '🌟']
        },
        {
            key: 'cloud',
            label: '🌈 Rainbow Sky',
            far: ['☁️', '🌈', '⭐', '🪽', '💫'],
            mid: ['☁️', '🫧', '🌈', '🦄', '✨', '🎈'],
            near: ['☁️', '🌟', '🫧', '🌈', '⭐', '💛']
        },
        {
            key: 'forest',
            label: '🚀 Baby Galaxy',
            far: ['🪐', '⭐', '🌙', '✨', '💫'],
            mid: ['🛸', '🌟', '🪐', '⭐', '🚀', '🌠'],
            near: ['🌎', '⭐', '🍼', '🚀', '✨', '🪐']
        }
    ];

    const whooshEmojis = ['🪇', '🍼', '🧸', '⭐', '🌟', '🦆', '🎀', '🧷', '💫', '🪄', '☁️'];
    const themPlayers = CONFIG.players.filter(player => player.team === 'them');
    const usPlayers = CONFIG.players.filter(player => player.team === 'us');
    const getItemsForPlayers = (players) => players
        .flatMap(player => (game.picks[player.id] || [])
            .map(itemId => BABY_ITEMS.find(item => item.id === itemId))
            .filter(Boolean));
    const buildEmojiBag = (items) => {
        const emojis = items.map(item => item.emoji);
        return (emojis.length ? emojis : ['📦', '✨', '🍼']).slice(0, 6);
    };
    const renderBagItems = (container, emojis) => {
        container.innerHTML = emojis.map(emoji => `<span>${emoji}</span>`).join('');
    };
    const renderDestination = (prefix, players, capsText) => {
        $(`#${prefix}-avatars`).innerHTML = players.map(player => `
            <img src="${player.avatar}" alt="${player.name}" onerror="this.style.display='none'">
        `).join('');
        $(`#${prefix}-name`).textContent = players.map(player => player.name).join(' + ');
        $(`#${prefix}-caps`).textContent = capsText;
    };

    const farTrack = $('#delivery-far-track');
    const midTrack = $('#delivery-mid-track');
    const nearTrack = $('#delivery-near-track');
    const whooshStream = $('#delivery-whoosh-stream');
    const twist = $('#delivery-twist');
    const narration = $('#delivery-narration-bubble');
    const zoneLabel = $('#delivery-zone-label');
    const boy = $('#delivery-rider-boy');
    const girl = $('#delivery-rider-girl');
    const flash = $('#delivery-flash');
    const leftDestination = $('#delivery-destination-left');
    const rightDestination = $('#delivery-destination-right');
    const usCaps = $('#delivery-destination-right-caps');
    const punchline = $('#delivery-punchline');
    const punchlineSub = $('#delivery-punchline-sub');
    const headline = $('#delivery-punchline-headline');
    const sparklesRight = $('#delivery-sparkles-right');
    const sparklesLeft = $('#delivery-sparkles-left');
    const rightNote = rightDestination.querySelector('.delivery-destination-note');

    renderBagItems($('#delivery-bag-boy-items'), buildEmojiBag(getItemsForPlayers(themPlayers)));
    renderBagItems($('#delivery-bag-girl-items'), buildEmojiBag(getItemsForPlayers(usPlayers)));

    renderDestination('delivery-destination-left', themPlayers, `${CONFIG.caps.mom} ${CONFIG.caps.dad}`);
    renderDestination('delivery-destination-right', usPlayers, `${CONFIG.caps.maasi} ${CONFIG.caps.mausa}`);

    const resetDestination = (el) => {
        el.classList.add('hidden');
        el.classList.remove('is-visible');
    };

    const populateSparkles = (container) => {
        container.innerHTML = '';
        Array.from({ length: 12 }).forEach((_, index) => {
            const spark = document.createElement('span');
            spark.textContent = index % 3 === 0 ? '✨' : (index % 3 === 1 ? '⭐' : '💫');
            spark.style.setProperty('--sx', `${Math.cos((index / 12) * Math.PI * 2) * (18 + (index % 4) * 6)}px`);
            spark.style.setProperty('--sy', `${Math.sin((index / 12) * Math.PI * 2) * (18 + (index % 5) * 7)}px`);
            spark.style.setProperty('--sr', `${-35 + index * 8}deg`);
            spark.style.setProperty('--delay', `${index * 0.03}s`);
            container.appendChild(spark);
        });
    };

    populateSparkles(sparklesRight);
    populateSparkles(sparklesLeft);

    resetDestination(leftDestination);
    resetDestination(rightDestination);
    twist.classList.add('hidden');
    punchline.classList.add('hidden');
    sparklesRight.classList.remove('is-bursting');
    sparklesLeft.classList.remove('is-bursting');
    usCaps.classList.remove('transforming');
    rightNote.textContent = 'wait for it...';

    root.className = 'delivery-universe zone-city';
    flash.style.opacity = '0';
    whooshStream.innerHTML = '';
    boy.className = 'delivery-rider delivery-rider-boy ride-left';
    girl.className = 'delivery-rider delivery-rider-girl ride-right';

    const zoneClassNames = zones.map(zone => `zone-${zone.key}`);
    const applyZone = (zoneKey) => {
        const zone = zones.find(entry => entry.key === zoneKey) || zones[0];
        root.classList.remove(...zoneClassNames);
        root.classList.add(`zone-${zone.key}`);
        zoneLabel.style.animation = 'none';
        void zoneLabel.offsetWidth;
        zoneLabel.style.animation = '';
        zoneLabel.textContent = zone.label;

        const fillTrack = (track, emojis, count, sizeRange, driftRange, baseDuration) => {
            track.innerHTML = '';
            for (let i = 0; i < count; i++) {
                const sprite = document.createElement('span');
                sprite.className = 'delivery-sprite';
                sprite.textContent = emojis[i % emojis.length];
                sprite.style.setProperty('--x', `${5 + Math.random() * 90}%`);
                sprite.style.setProperty('--delay', `${(-Math.random() * baseDuration).toFixed(2)}s`);
                sprite.style.setProperty('--dur', `${(baseDuration * (0.82 + Math.random() * 0.36)).toFixed(2)}s`);
                sprite.style.setProperty('--size', `${(sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0])).toFixed(2)}rem`);
                sprite.style.setProperty('--drift', `${(Math.random() * driftRange * 2 - driftRange).toFixed(0)}px`);
                sprite.style.setProperty('--spin', `${(-25 + Math.random() * 50).toFixed(0)}deg`);
                track.appendChild(sprite);
            }
        };

        fillTrack(farTrack, zone.far, 12, [1.1, 1.8], 24, 8.8);
        fillTrack(midTrack, zone.mid, 10, [1.4, 2.2], 42, 6.4);
        fillTrack(nearTrack, zone.near, 9, [1.7, 2.8], 60, 4.8);
    };

    const popNarration = (text) => {
        narration.classList.remove('is-pop');
        narration.textContent = text;
        void narration.offsetWidth;
        narration.classList.add('is-pop');
    };

    const triggerFlash = async (duration = 220) => {
        if (!isActive()) return;
        root.classList.add('flash-on');
        flash.style.opacity = '1';
        await sleep(duration);
        if (!isActive()) return;
        flash.style.opacity = '0';
        root.classList.remove('flash-on');
    };

    const triggerShake = async () => {
        if (!isActive()) return;
        root.classList.remove('is-shaking');
        void root.offsetWidth;
        root.classList.add('is-shaking');
        await sleep(560);
        if (!isActive()) return;
        root.classList.remove('is-shaking');
    };

    const showDestination = (el) => {
        el.classList.remove('hidden');
        requestAnimationFrame(() => el.classList.add('is-visible'));
    };

    const spawnWhoosh = (forcedEmoji) => {
        if (!isActive()) return;
        const item = document.createElement('span');
        item.className = 'delivery-whoosh-item';
        item.textContent = forcedEmoji || whooshEmojis[Math.floor(Math.random() * whooshEmojis.length)];
        item.style.setProperty('--lane', `${10 + Math.random() * 80}%`);
        item.style.setProperty('--rot', `${-28 + Math.random() * 56}deg`);
        item.style.setProperty('--dur', `${(1.9 + Math.random() * 1.2).toFixed(2)}s`);
        item.style.setProperty('--size', `${(1.4 + Math.random() * 1.2).toFixed(2)}rem`);
        whooshStream.appendChild(item);
        schedule(() => item.remove(), 3400);
    };

    applyZone('city');
    repeat(() => spawnWhoosh(), 250);
    schedule(() => applyZone('toy'), 4500);
    schedule(() => applyZone('cloud'), 9500);
    schedule(() => applyZone('forest'), 15000);

    popNarration('Gifts loaded. Off we go! 🚀');
    spawnWhoosh('🍼');
    spawnWhoosh('⭐');

    await sleep(3000);
    if (!isActive()) return;

    popNarration('Zooming through Baby Universe... 🌈');
    await sleep(3500);
    if (!isActive()) return;

    popNarration('Almost there... wait, something\'s off...');
    await sleep(3000);
    if (!isActive()) return;

    boy.classList.remove('ride-left');
    girl.classList.remove('ride-right');
    boy.classList.add('near-fork-left', 'braking');
    girl.classList.add('near-fork-right', 'braking');
    popNarration('Hold on... GPS is recalculating! 🤔');
    await sleep(2000);
    if (!isActive()) return;

    await triggerFlash(220);
    if (!isActive()) return;

    fadeIn(twist, 220);
    root.classList.add('show-fork');
    popNarration('Wait... WHAT?!');
    await Promise.all([sleep(500), triggerShake()]);
    if (!isActive()) return;

    await sleep(2500);
    if (!isActive()) return;

    await fadeOut(twist, 220);
    if (!isActive()) return;

    showDestination(leftDestination);
    showDestination(rightDestination);
    popNarration('Splitting up! One package each way! 📦↔️📦');
    boy.classList.remove('near-fork-left', 'braking');
    girl.classList.remove('near-fork-right', 'braking');
    boy.classList.add('split-left');
    girl.classList.add('split-right');
    spawnWhoosh('⚡');
    spawnWhoosh('🌟');

    await sleep(3000);
    if (!isActive()) return;

    boy.classList.remove('split-left');
    girl.classList.remove('split-right');
    boy.classList.add('arrived-left');
    girl.classList.add('arrived-right');
    sparklesLeft.classList.add('is-bursting');
    popNarration('Delivered! But wait... something\'s happening... ✨');

    await sleep(2500);
    if (!isActive()) return;

    await triggerFlash(260);
    if (!isActive()) return;

    usCaps.classList.add('transforming');
    sparklesRight.classList.add('is-bursting');
    usCaps.textContent = `${CONFIG.caps.mom} ${CONFIG.caps.dad}`;
    rightNote.textContent = 'surprise baby route';
    popNarration('SURPRISE! Maasi + Mausa are now Mom + Dad! 🎉');
    await Promise.all([sleep(520), triggerShake()]);
    if (!isActive()) return;

    headline.textContent = 'DOUBLE DELIVERY UNLOCKED';
    punchlineSub.textContent = `${usPlayers.map(player => player.name).join(' + ')} have their own baby drop on the map too. 🍼`;
    fadeIn(punchline, 260);
    popNarration('The real gift was THIS news all along! 💝');

    await sleep(5000);
    if (!isActive()) return;

    cleanup();
    showScreen('screen-reveal');
    startReveal();
}


// ========== SCREEN: Reveal ==========
let carouselInterval = null;

async function startReveal() {
    confetti();

    // Show BOGO flash
    await sleep(2000);

    // Show photos carousel
    fadeIn($('#reveal-photos'));
    startCarousel();
    
    await sleep(3000);

    // Show Spider-Man meme
    fadeIn($('#reveal-meme'));

    // Setup meme faces
    CONFIG.players.forEach((player, i) => {
        const memeSlot = $(`#meme-${i + 1}`);
        memeSlot.innerHTML = `
            <img src="${player.avatar}" alt="${player.name}">
            <div class="meme-shirt">${player.name}</div>
            <div class="meme-cap">${CONFIG.caps[i < 2 ? (i === 0 ? 'mom' : 'dad') : (i === 2 ? 'mom' : 'dad')]}</div>
            <div class="meme-point">👉</div>
        `;
    });
}

// Photo carousel auto-rotation
function startCarousel() {
    const slides = $$('#carousel-track .carousel-slide');
    const dots = $$('#carousel-dots .dot');
    let current = 0;

    if (carouselInterval) clearInterval(carouselInterval);

    carouselInterval = setInterval(() => {
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
    }, 3000);
}

// Replay delivery animation
$('#btn-replay-delivery').addEventListener('click', () => {
    if (carouselInterval) { clearInterval(carouselInterval); carouselInterval = null; }
    showScreen('screen-delivery');
    startDeliveryAnimation();
});
