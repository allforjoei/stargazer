
const canvas = document.getElementById("garden");
const ctx = canvas.getContext("2d");

const HEIGHT = 420;
const RAMP = " .,:;irsXA253hMHGS#9B&@";

const PALETTES = [
    [[55, 12, 90], [105, 35, 170], [165, 105, 225], [225, 205, 255]],
    [[65, 15, 115], [125, 55, 195], [190, 135, 245], [240, 220, 255]],
    [[75, 20, 100], [145, 65, 180], [210, 145, 225], [255, 215, 240]],
    [[45, 15, 85], [100, 45, 155], [175, 125, 220], [230, 210, 255]]
];

const flowers = [
    { x: 0, y: 1.0, z: 0.3, size: 1.0, palette: 0, phase: 0 },
    { x: -1.45, y: 0.35, z: -0.3, size: 0.78, palette: 1, phase: 1.4 },
    { x: 1.45, y: 0.35, z: -0.3, size: 0.78, palette: 2, phase: 2.8 },
    { x: -0.65, y: 1.8, z: -0.8, size: 0.68, palette: 3, phase: 4.1 },
    { x: 0.75, y: -0.05, z: 0.6, size: 0.68, palette: 1, phase: 5.2 }
];

let width = 650;
let height = HEIGHT;
let cols = 90;
let rows = 38;
let cellW = 7;
let cellH = 11;

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width || 650;
    height = HEIGHT;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.max(45, Math.floor(width / 7));
    rows = Math.floor(height / 11);
    cellW = width / cols;
    cellH = height / rows;

    ctx.font = `${Math.max(8, cellH * 0.95)}px monospace`;
    ctx.textBaseline = "top";
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function mix(a, b, t) {
    return a + (b - a) * t;
}

function paletteColor(palette, amount) {
    const stops = PALETTES[palette];
    const t = Math.max(0, Math.min(1, amount));

    for (let i = 0; i < stops.length - 1; i++) {
        const a = i / (stops.length - 1);
        const b = (i + 1) / (stops.length - 1);

        if (t <= b) {
            const local = (t - a) / (b - a);
            const c1 = stops[i];
            const c2 = stops[i + 1];

            return `rgb(${Math.round(mix(c1[0], c2[0], local))},${Math.round(mix(c1[1], c2[1], local))},${Math.round(mix(c1[2], c2[2], local))})`;
        }
    }

    return "rgb(230,210,255)";
}

function rotateY(p, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return {
        x: p.x * c + p.z * s,
        y: p.y,
        z: -p.x * s + p.z * c
    };
}

function rotateZ(p, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return {
        x: p.x * c - p.y * s,
        y: p.x * s + p.y * c,
        z: p.z
    };
}

let chars;
let colors;
let depths;

function clearGrid() {
    const total = cols * rows;
    chars = new Array(total).fill(" ");
    colors = new Array(total).fill("#ffffff");
    depths = new Array(total).fill(-Infinity);
}

function plot(point, color, brightness, spin) {
    const rotated = rotateY(point, spin);

    const cameraDistance = 8;
    const depth = cameraDistance - rotated.z;

    if (depth <= 0.5) return;

    const focal = Math.min(cols, rows * 2.1) * 1.8;

    const sx = cols / 2 + focal * rotated.x / depth;
    const sy = rows / 2 - focal * rotated.y / depth / 2.1;

    const gx = Math.floor(sx);
    const gy = Math.floor(sy);

    if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) return;

    const index = gy * cols + gx;

    if (rotated.z > depths[index]) {
        depths[index] = rotated.z;

        const level = Math.max(0, Math.min(1, brightness));
        const charIndex = Math.floor(level * (RAMP.length - 1));

        chars[index] = RAMP[charIndex];
        colors[index] = color;
    }
}

function drawPetal(flower, petalAngle, time, spin, tier) {
    const sway = Math.sin(time * 0.0018 + flower.phase) * 0.06;

    const angle = petalAngle + sway + tier * 0.15;
    const scale = flower.size;

    for (let ui = 1; ui <= 32; ui++) {
        const u = ui / 32;

        const spread = 0.30 + 1.12 * (0.85 + 0.15 * Math.sin(time * 0.001 + flower.phase));
        const radial = spread * u;

        const petalWidth =
            0.31 *
            Math.pow(Math.sin(Math.PI * u), 0.75) *
            (1 - 0.60 * u);

        const ridge = 0.105 * Math.sin(Math.PI * u);
        const curl = 0.30 * Math.pow(Math.max(0, u - 0.68), 2) * 5;

        for (let vi = -12; vi <= 12; vi++) {
            const v = vi / 12;

            const side = v * petalWidth;
            const x = radial * Math.cos(angle) - side * Math.sin(angle);
            const y = radial * Math.sin(angle) + side * Math.cos(angle);

            const z =
                ridge * (1 - v * v) +
                curl +
                0.055 * Math.sin(v * Math.PI * 2) * u;

            let point = {
                x: flower.x + x * scale,
                y: flower.y + y * scale,
                z: flower.z + z * scale
            };

            point = rotateZ(point, Math.sin(time * 0.001 + flower.phase) * 0.025);

            const edge = 1 - Math.abs(v) * 0.5;
            const brightness = Math.min(1, 0.18 + 0.72 * edge + 0.10 * Math.sin(u * 15));

            const color = paletteColor(
                flower.palette,
                Math.min(1, 0.15 + u * 0.65 + (1 - Math.abs(v)) * 0.2)
            );

            plot(point, color, brightness, spin);
        }
    }
}

function drawStamen(flower, time, spin) {
    const scale = flower.size;

    for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 2 / 5 + time * 0.0002;
        const length = 0.38 * scale;

        for (let j = 0; j <= 12; j++) {
            const t = j / 12;

            const point = {
                x: flower.x + Math.cos(angle) * length * t,
                y: flower.y + Math.sin(angle) * length * t,
                z: flower.z + 0.15 + 0.05 * t
            };

            plot(point, "#f4c96b", 0.85, spin);
        }

        const tip = {
            x: flower.x + Math.cos(angle) * length,
            y: flower.y + Math.sin(angle) * length,
            z: flower.z + 0.20
        };

        plot(tip, "#ffe19a", 1, spin);
    }
}

function drawStem(flower, time, spin) {
    const baseX = flower.x * 0.12;
    const baseY = -2.15;
    const sway = Math.sin(time * 0.001 + flower.phase) * 0.08;

    for (let i = 0; i <= 35; i++) {
        const t = i / 35;

        const point = {
            x: mix(baseX, flower.x, t) + sway * t,
            y: mix(baseY, flower.y - 0.15, t),
            z: mix(-0.15, flower.z - 0.15, t)
        };

        plot(point, "#57965c", 0.65, spin);
    }

    // Leaves
    for (let side = -1; side <= 1; side += 2) {
        for (let leaf = 0; leaf < 2; leaf++) {
            const start = 0.24 + leaf * 0.25;
            const direction = side * (0.55 + leaf * 0.15);

            for (let i = 0; i <= 18; i++) {
                const u = i / 18;

                for (let j = -5; j <= 5; j++) {
                    const v = j / 5;
                    const leafWidth = 0.20 * Math.sin(Math.PI * u);

                    const point = {
                        x: baseX + (flower.x - baseX) * start +
                           direction * u + v * leafWidth,
                        y: baseY + (flower.y - baseY) * start +
                           0.35 * Math.sin(Math.PI * u),
                        z: -0.1 + 0.12 * Math.sin(Math.PI * u)
                    };

                    plot(point, "#68a66b", 0.55 + 0.25 * (1 - Math.abs(v)), spin);
                }
            }
        }
    }
}

function drawStars(time) {
    for (let i = 0; i < 65; i++) {
        const x = (i * 137.5) % cols;
        const y = (i * 83.7) % rows;
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(time * 0.0015 + i));

        const index = Math.floor(y) * cols + Math.floor(x);

        if (index >= 0 && index < chars.length && depths[index] === -Infinity) {
            chars[index] = pulse > 0.75 ? "✦" : "·";
            colors[index] = `rgba(215,185,255,${pulse})`;
        }
    }
}

function render(time) {
    clearGrid();

    // Faster continuous bouquet rotation
    const spin = time * 0.0009;

    // Stems first, then flowers
    flowers.forEach(flower => {
        drawStem(flower, time, spin);
    });

    flowers.forEach(flower => {
        for (let tier = 0; tier < 2; tier++) {
            for (let petal = 0; petal < 3; petal++) {
                const angle =
                    petal * (Math.PI * 2 / 3) +
                    tier * (Math.PI / 3);

                drawPetal(flower, angle, time, spin, tier);
            }
        }

        drawStamen(flower, time, spin);
    });

    drawStars(time);

    ctx.fillStyle = "#080b12";
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const index = y * cols + x;
            const char = chars[index];

            if (char !== " ") {
                ctx.fillStyle = colors[index];
                ctx.fillText(char, x * cellW, y * cellH);
            }
        }
    }

    requestAnimationFrame(render);
}

requestAnimationFrame(render);