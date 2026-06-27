const sharp = require('sharp');
const path = require('path');

// Face crop coordinates [left, top, width, height]
const crops = [
    {
        // Sarthak (you) — from pink selfie (PM_2), he's upper left, big face close to camera
        src: path.join(__dirname, '..', 'WhatsApp_Image_2026-06-26_at_11_26_30_PM_2-1782498389800.jpeg'),
        out: path.join(__dirname, 'assets', 'avatars', 'you-s.png'),
        crop: { left: 300, top: 500, width: 1300, height: 1300 },
        borderColor: '#A8D4F0', // sky blue
    },
    {
        // Wife (A) — from Rome selfie, she's bottom center-right
        src: path.join(__dirname, '..', 'WhatsApp_Image_2026-06-26_at_11_26_30_PM-1782498389808.jpeg'),
        out: path.join(__dirname, 'assets', 'avatars', 'you-a.png'),
        crop: { left: 900, top: 1700, width: 1100, height: 1100 },
        borderColor: '#A8D8C8', // mint
    },
    {
        // Friend S — from cafe seated photo (already done, keeping)
        src: path.join(__dirname, '..', 'WhatsApp_Image_2026-06-26_at_11_40_06_PM_1.jpeg'),
        out: path.join(__dirname, 'assets', 'avatars', 'friend-s.png'),
        crop: { left: 900, top: 1550, width: 950, height: 950 },
        borderColor: '#FF7F7F', // coral
    },
    {
        // Friend A — from pastry solo photo
        src: path.join(__dirname, '..', 'WhatsApp_Image_2026-06-26_at_11_40_06_PM_2.jpeg'),
        out: path.join(__dirname, 'assets', 'avatars', 'friend-a.png'),
        crop: { left: 500, top: 700, width: 1200, height: 1200 },
        borderColor: '#C8A8E8', // lavender
    },
];

async function createAvatar({ src, out, crop, borderColor }) {
    const size = 400;
    const borderWidth = 12;
    const innerSize = size - borderWidth * 2;

    // Crop face region
    const face = await sharp(src)
        .extract(crop)
        .resize(innerSize, innerSize, { fit: 'cover' })
        .toBuffer();

    // Create circular mask
    const circleMask = Buffer.from(
        `<svg width="${innerSize}" height="${innerSize}">
            <circle cx="${innerSize/2}" cy="${innerSize/2}" r="${innerSize/2}" fill="white"/>
        </svg>`
    );

    // Apply circular mask
    const circularFace = await sharp(face)
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .png()
        .toBuffer();

    // Create border circle background
    const borderBg = Buffer.from(
        `<svg width="${size}" height="${size}">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${borderColor}"/>
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="white" opacity="0.3"/>
        </svg>`
    );

    // Composite: border bg + circular face on top
    await sharp(borderBg)
        .composite([{
            input: circularFace,
            top: borderWidth,
            left: borderWidth,
        }])
        .png()
        .toFile(out);

    console.log(`✓ Created: ${path.basename(out)}`);
}

async function main() {
    for (const config of crops) {
        try {
            await createAvatar(config);
        } catch (err) {
            console.error(`✗ Failed ${path.basename(config.out)}:`, err.message);
        }
    }
}

main();
