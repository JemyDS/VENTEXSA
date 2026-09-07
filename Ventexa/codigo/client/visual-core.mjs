/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * GEOMETRÍA Y FOTOMONTAJE. Incluye modelo paramétrico en metros y transformación en perspectiva de cuatro esquinas.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import * as THREE from 'three';
/*
 * Construye marcos, vidrios, hojas y herrajes con Three.js. Convierte milímetros a metros; la ventana está en XY y su frente mira hacia +Z.
 * Parámetros: c, w, h, opened.
 */
export function geometry(c, w, h, opened = false) {
    const scene = new THREE.Scene(), root = new THREE.Group();
    scene.add(root);
    const W = w / 1000, H = h / 1000, D = (c.depth || 70) / 1000, T = .045, n = +c.leaves || 1, color = {
        Blanco: 0xf4f4ef, Negro: 0x26323a, Bronce: 0x886e4f
    }[c.color] || 0xf4f4ef;
    const frameMat = new THREE.MeshStandardMaterial({
        color, metalness: .3, roughness: .4
    }), glassMat = new THREE.MeshStandardMaterial({
        color: 0x9bc7d4, transparent: true, opacity: .35, metalness: .1, roughness: .12
    });
    /*
     * Añade una pieza rectangular a un grupo con dimensiones, posición y material.
     * Parámetros: group, bw, bh, bd, x, y, z, mat.
     */
    function box(group, bw, bh, bd, x, y, z, mat) {
        let mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
        mesh.position.set(x, y, z);
        group.add(mesh);
    }
    box(root, W, T, D, 0, (H - T) / 2, 0, frameMat);
    box(root, W, T, D, 0, -(H - T) / 2, 0, frameMat);
    box(root, T, H - 2 * T, D, -(W - T) / 2, 0, 0, frameMat);
    box(root, T, H - 2 * T, D, (W - T) / 2, 0, 0, frameMat);
    for (let i = 0; i < n; i++) {
        let horizontal = c.type === 'Guillotina', sw = horizontal ? W - 2 * T : (W - 2 * T) / n, sh = horizontal ? (H - 2 * T) / n : H - 2 * T, x = horizontal ? 0 : -W / 2 + T + sw * (i + .5), y = horizontal ? -H / 2 + T + sh * (i + .5) : 0, g = new THREE.Group();
        root.add(g);
        g.position.set(x, y, .02);
        const pivot = new THREE.Group();
        g.add(pivot);
        box(pivot, sw - 2 * T, sh - 2 * T, (c.thickness || 6) / 1000, 0, 0, 0, glassMat);
        box(pivot, sw, T, D, 0, (sh - T) / 2, 0, frameMat);
        box(pivot, sw, T, D, 0, -(sh - T) / 2, 0, frameMat);
        box(pivot, T, sh - 2 * T, D, -(sw - T) / 2, 0, 0, frameMat);
        box(pivot, T, sh - 2 * T, D, (sw - T) / 2, 0, 0, frameMat);
        if (c.type !== 'Fija') {
            box(pivot, .012, .10, .022, sw / 2 - .03, 0, .055, frameMat);
            if (opened) {
                if (c.type === 'Corredera')
                    g.position.x += i === 0 ? sw * .7 : 0;
                else if (c.type === 'Guillotina')
                    g.position.y += i === 0 ? sh * .45 : 0;
                else if (c.type === 'Proyectante' || c.type === 'Oscilobatiente') {
                    g.position.y = sh / 2;
                    pivot.position.y = -sh / 2;
                    g.rotation.x = -.35;
                }
                else {
                    let sign = c.direction === 'Derecha' ? -1 : 1;
                    g.position.x = x - sign * sw / 2;
                    pivot.position.x = sign * sw / 2;
                    g.rotation.y = -sign * Math.PI / 3;
                }
            }
        }
    }
    root.updateMatrixWorld(true);
    return scene;
}
// 8-unknown projective transform, unit square -> four photo corners.
/*
 * Resuelve ocho coeficientes que proyectan el cuadrado unidad sobre cuatro esquinas de una fotografía.
 * Parámetros: points.
 */
export function homography(points) {
    if (points.length !== 4)
        throw Error('Marca las cuatro esquinas.');
    const turns = points.map((p, i) => {
        const q = points[(i + 1) % 4], r = points[(i + 2) % 4];
        return (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x);
    });
    if (turns.some(x => Math.abs(x) < 1e-6) || !(turns.every(x => x > 0) || turns.every(x => x < 0)))
        throw Error('Marca las esquinas en orden, sin cruzarlas.');
    let a = [], b = [];
    [
        [
            0, 0
        ], [
            1, 0
        ], [
            1, 1
        ], [
            0, 1
        ]
    ].forEach(([u, v], i) => {
        const { x, y } = points[i];
        a.push([
            u, v, 1, 0, 0, 0, -u * x, -v * x
        ]);
        b.push(x);
        a.push([
            0, 0, 0, u, v, 1, -u * y, -v * y
        ]);
        b.push(y);
    });
    for (let col = 0; col < 8; col++) {
        let pivot = col;
        for (let i = col + 1; i < 8; i++)
            if (Math.abs(a[i][col]) > Math.abs(a[pivot][col]))
                pivot = i;
        if (Math.abs(a[pivot][col]) < 1e-9)
            throw Error('Las cuatro esquinas no forman un vano válido.');
        [
            a[col], a[pivot]
        ] = [
            a[pivot], a[col]
        ];
        [
            b[col], b[pivot]
        ] = [
            b[pivot], b[col]
        ];
        let f = a[col][col];
        for (let j = col; j < 8; j++)
            a[col][j] /= f;
        b[col] /= f;
        for (let i = 0; i < 8; i++)
            if (i !== col) {
                let f = a[i][col];
                for (let j = col; j < 8; j++)
                    a[i][j] -= f * a[col][j];
                b[i] -= f * b[col];
            }
    }
    return [
        ...b, 1
    ];
}
/*
 * Aplica la homografía a una coordenada del dibujo para obtener su posición en la foto.
 * Parámetros: H, u, v.
 */
export function project(H, u, v) {
    const d = H[6] * u + H[7] * v + 1;
    return {
        x: (H[0] * u + H[1] * v + H[2]) / d, y: (H[3] * u + H[4] * v + H[5]) / d
    };
}
/*
 * Dibuja foto, marcadores y una guía en perspectiva mediante canvas; no utiliza IA.
 * Parámetros: canvas, img, points, c.
 */
export function compose(canvas, img, points, c) {
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    points.forEach((p, i) => {
        ctx.fillStyle = '#e68825';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '16px sans-serif';
        ctx.fillText(String(i + 1), p.x + 12, p.y);
    });
    if (points.length !== 4)
        return;
    const H = homography(points);
    /*
     * Proyecta y rellena una región del dibujo dentro del vano seleccionado.
     * Parámetros: corners, fill.
     */
    function polygon(corners, fill) {
        ctx.beginPath();
        corners.forEach(([u, v], i) => {
            let p = project(H, u, v);
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
    }
    polygon([
        [
            0, 0
        ], [
            1, 0
        ], [
            1, 1
        ], [
            0, 1
        ]
    ], '#86bdd45c');
    let col = {
        Blanco: '#f5f6ee', Negro: '#25343d', Bronce: '#8c704e'
    }[c.color] || '#fff', t = .025;
    for (let r of [
        [
            [
                0, 0
            ], [
                1, 0
            ], [
                1, t
            ], [
                0, t
            ]
        ], [
            [
                0, 1 - t
            ], [
                1, 1 - t
            ], [
                1, 1
            ], [
                0, 1
            ]
        ], [
            [
                0, 0
            ], [
                t, 0
            ], [
                t, 1
            ], [
                0, 1
            ]
        ], [
            [
                1 - t, 0
            ], [
                1, 0
            ], [
                1, 1
            ], [
                1 - t, 1
            ]
        ]
    ])
        polygon(r, col);
    for (let i = 1; i < (+c.leaves || 1); i++) {
        let u = i / c.leaves;
        polygon(c.type === 'Guillotina' ? [
            [
                0, u - t / 2
            ], [
                1, u - t / 2
            ], [
                1, u + t / 2
            ], [
                0, u + t / 2
            ]
        ] : [
            [
                u - t / 2, 0
            ], [
                u + t / 2, 0
            ], [
                u + t / 2, 1
            ], [
                u - t / 2, 1
            ]
        ], col);
    }
}
/*
 * Prepara una copia para el anclaje vertical de Quick Look: el frente +Z pasa a +Y. Su comportamiento físico sigue pendiente de validación en iPhone.
 * Parámetros: c, w, h, opened.
 */
export function quickLookGeometry(c, w, h, opened = false) {
    const scene = geometry(c, w, h, opened);
    scene.children[0].rotation.x = -Math.PI / 2;
    scene.updateMatrixWorld(true);
    return scene;
}
