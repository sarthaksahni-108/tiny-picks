// Animation utilities

function confetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const particles = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 2,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.1,
        });
    }

    let frame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y += p.speed;
            p.x += Math.sin(p.angle) * 0.5;
            p.angle += p.spin;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        frame++;
        if (frame < 300) {
            requestAnimationFrame(animate);
        } else {
            canvas.style.display = 'none';
        }
    }
    animate();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fadeIn(element, duration = 500) {
    element.classList.remove('hidden');
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
        element.style.opacity = '1';
    });
}

function fadeOut(element, duration = 500) {
    return new Promise(resolve => {
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';
        setTimeout(() => {
            element.classList.add('hidden');
            resolve();
        }, duration);
    });
}

function typeText(element, text, speed = 50) {
    return new Promise(resolve => {
        element.textContent = '';
        let i = 0;
        const interval = setInterval(() => {
            element.textContent += text[i];
            i++;
            if (i >= text.length) {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

// Animate package moving along a track
function animatePackage(packageEl, duration = 3000) {
    return new Promise(resolve => {
        packageEl.classList.add('moving');
        setTimeout(() => {
            packageEl.classList.remove('moving');
            packageEl.classList.add('arrived');
            resolve();
        }, duration);
    });
}
