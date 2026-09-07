/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * PRUEBAS. Escenarios y aserciones ejecutables. Los datos de este archivo son ficticios; la ausencia de errores no sustituye una prueba física de AR.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, uuid, dims, cut, pack1D, pack2D, slots } from '../lib/domain.mjs';
import { execute, digest } from '../lib/actions.mjs';
import { quotePDF } from '../lib/pdf.mjs';
const admin = {
    role: 'Administrador', email: 'test@example.com', ip: '127.0.0.1'
}, photo = i => '/api/file/test-' + i, c = {
    type: 'Corredera', line: 'alu', color: 'Blanco', glass: 'mono', hardware: 'standard', leaves: 2, sill: 1000, workHeight: 1800, intervention: 'Retiro completo', comuna: 'San Fernando'
};
async function base() {
    let s = defaultState();
    await execute(s, 'seed', {}, admin);
    return s;
}
async function make(s) {
    let res = await execute(s, 'draft', {
        client: 'Prueba', phone: '0', address: 'Ficticia', comuna: 'San Fernando', vanos: [
            {
                name: 'Vano', config: c, measure: {
                    w: [
                        1500, 1498, 1501
                    ], h: [
                        1200, 1202, 1201
                    ], tapeConfirmed: true
                }, photos: [
                    photo(1)
                ]
            }
        ]
    }, admin);
    let r = s.requests.find(r => r.id === res.requestId);
    await execute(s, 'estimate', {
        requestId: r.id
    }, admin);
    return r;
}
const official = () => ({
    w: [
        1490, 1488, 1492
    ], h: [
        1190, 1192, 1191
    ], d1: 1910, d2: 1918, technician: 'Técnico', instrument: 'Huincha manual', wall: 'Albañilería', level: 'Correcto', access: 'Normal', sillCondition: 'Bueno', lintelCondition: 'Bueno', jambCondition: 'Bueno', photos: [
        photo(2), photo(3), photo(4)
    ], signature: photo(5)
});
test('Core flow: official-only -> signed quote -> payment -> reserved cut -> installation -> receipt', async () => {
    let s = await base(), r = await make(s), v = r.vanos[0];
    await assert.rejects(() => execute(s, 'quote', {
        requestId: r.id
    }, admin), /acta/);
    await execute(s, 'measure', {
        requestId: r.id, vanoId: v.id, measure: official()
    }, admin);
    const first = v.officialId;
    await execute(s, 'measure', {
        requestId: r.id, vanoId: v.id, measure: {
            ...official(), w: [
                1489, 1487, 1491
            ]
        }
    }, admin);
    assert(s.official[first]);
    assert.notEqual(v.officialId, first);
    await execute(s, 'quote', {
        requestId: r.id, discount: 0
    }, admin);
    let q = s.quotes.at(-1);
    assert.equal(q.total, q.net + q.iva);
    assert.equal(q.lines[0].parts.escuadria, 35000);
    const a = quotePDF(q), b = quotePDF(q);
    assert.equal(await digest(a), await digest(b));
    await execute(s, 'accept', {
        requestId: r.id, signature: photo(6)
    }, admin);
    assert.equal(r.acceptance.hash, await digest(a));
    let o = s.orders.at(-1);
    assert.equal(o.vanos[0].officialId, v.officialId);
    assert.equal(o.vanos[0].cut.w, 1477);
    await assert.rejects(() => execute(s, 'approve', {
        orderId: o.id
    }, admin), /anticipo/);
    await execute(s, 'payment', {
        orderId: o.id, amount: Math.ceil(o.total / 2), reference: 'PAY-1'
    }, admin);
    await assert.rejects(() => execute(s, 'payment', {
        orderId: o.id, amount: 1, reference: 'PAY-1'
    }, admin), /Referencia/);
    await execute(s, 'plan', {
        orderIds: [
            o.id
        ]
    }, admin);
    await execute(s, 'approve', {
        orderId: o.id
    }, admin);
    assert.equal(o.state, 'DESPIECE_APROBADO');
    await assert.rejects(() => execute(s, 'measure', {
        requestId: r.id, vanoId: v.id, measure: official()
    }, admin), /congeladas/);
    await execute(s, 'advance', {
        orderId: o.id
    }, admin);
    assert.equal(o.state, 'EN_CORTE');
    await execute(s, 'advance', {
        orderId: o.id
    }, admin);
    await execute(s, 'advance', {
        orderId: o.id
    }, admin);
    await assert.rejects(() => execute(s, 'advance', {
        orderId: o.id, qc: []
    }, admin), /calidad/);
    await execute(s, 'advance', {
        orderId: o.id, qc: s.settings.qc
    }, admin);
    await execute(s, 'advance', {
        orderId: o.id, fragility: true
    }, admin);
    await assert.rejects(() => execute(s, 'install', {
        orderId: o.id, vanos: [
            {
                id: v.id, before: photo(7), after: photo(7)
            }
        ]
    }, admin), /fotograf/);
    await execute(s, 'install', {
        orderId: o.id, vanos: [
            {
                id: v.id, before: photo(7), after: photo(8)
            }
        ]
    }, admin);
    await execute(s, 'observation', {
        orderId: o.id, text: 'Ajustar', owner: 'Equipo', due: '2026-12-01'
    }, admin);
    await assert.rejects(() => execute(s, 'receipt', {
        orderId: o.id, signature: photo(9)
    }, admin), /observaciones/);
    await execute(s, 'resolve', {
        orderId: o.id, id: o.observations[0].id
    }, admin);
    await execute(s, 'receipt', {
        orderId: o.id, signature: photo(9)
    }, admin);
    await execute(s, 'close', {
        orderId: o.id
    }, admin);
    assert.equal(o.state, 'CERRADA');
    assert.equal(o.warranty.length, 4);
});
test('Guillotine packing fits, preserves all pieces, does not overlap, uses suitable retal', () => {
    let parts = [
        {
            id: 'a', w: 1000, h: 1100
        }, {
            id: 'b', w: 1100, h: 900
        }, {
            id: 'c', w: 800, h: 700
        }, {
            id: 'd', w: 2000, h: 1800
        }
    ], s = pack2D(parts, 3, 10, [
        {
            id: 'ret', w: 1200, h: 1200
        }
    ]);
    assert.equal(s[0].retalId, 'ret');
    assert.equal(s.flatMap(x => x.pieces).length, 4);
    for (let b of s)
        for (let p of b.pieces) {
            assert(p.x >= 0 && p.y >= 0 && p.x + p.w <= b.w && p.y + p.h <= b.h);
            for (let q of b.pieces)
                if (q.id !== p.id)
                    assert(p.x + p.w <= q.x || q.x + q.w <= p.x || p.y + p.h <= q.y || q.y + q.h <= p.y);
        }
});
test('1D kerf and retal accounting', () => {
    let p = pack1D([
        {
            id: 'a', w: 1400
        }, {
            id: 'b', w: 1400
        }, {
            id: 'c', w: 2000
        }
    ], 3, [
        {
            id: 'r', w: 2100
        }
    ]);
    assert.equal(p[0].retalId, 'r');
    assert.equal(p[0].remaining, 97);
    assert(p.every(b => b.remaining >= 0));
    assert.equal(p.flatMap(x => x.parts).length, 3);
});
test('Authorization, official act signatures and safety checks', async () => {
    let s = await base();
    await assert.rejects(() => execute(s, 'settings', {
        settings: s.settings
    }, {
        role: 'Vendedor'
    }), /rol/);
    assert.throws(() => cut(s, c, {
        w: [
            1, 1, 1
        ], h: [
            1, 1, 1
        ]
    }), /oficial/);
    let r = await make(s), m = official();
    m.photos = [
        photo(1)
    ];
    await assert.rejects(() => execute(s, 'measure', {
        requestId: r.id, vanoId: r.vanos[0].id, measure: m
    }, admin), /fotograf/);
    await assert.rejects(() => execute(s, 'quote', {
        requestId: s.requests[1].id, discount: 20
    }, {
        role: 'Vendedor', email: 'v@example.com'
    }), /10%/);
});
test('Immutable quote snapshots and expiration', async () => {
    let s = await base(), r = s.requests[1];
    await execute(s, 'quote', {
        requestId: r.id
    }, admin);
    let q = s.quotes.at(-1), old = structuredClone(q);
    s.settings.company = 'Changed company';
    await execute(s, 'quote', {
        requestId: r.id
    }, admin);
    assert.deepEqual(q, old);
    s.quotes.at(-1).expires = '2000-01-01';
    await assert.rejects(() => execute(s, 'accept', {
        requestId: r.id, signature: photo(1)
    }, admin), /vencida/);
});
test('Scheduling rejects overlaps and incompatible teams', async () => {
    let s = await base(), r = s.requests[0];
    const first = slots(s, r, 'Medición', 'team1', '2026-09-07')[0];
    await execute(s, 'schedule', {
        requestId: r.id, type: 'Medición', teamId: 'team1', ...first
    }, admin);
    await assert.rejects(() => execute(s, 'schedule', {
        requestId: r.id, type: 'Medición', teamId: 'team1', ...first
    }, admin), /ocupado/);
    assert.throws(() => slots(s, r, 'Instalación', 'team1', '2026-09-07'), /compatible/);
});
test('Partial purchase receiving and stock reservation limits', async () => {
    let s = await base(), material = s.stock[0];
    await execute(s, 'purchase', {
        supplier: 'Prueba', materialId: material.id, qty: 3, unitCost: 100
    }, admin);
    let p = s.purchases.at(-1), before = material.qty;
    await execute(s, 'receive', {
        id: p.id, qty: 2
    }, admin);
    assert.equal(p.status, 'Parcial');
    assert.equal(material.qty, before + 2);
    await execute(s, 'receive', {
        id: p.id, qty: 1
    }, admin);
    assert.equal(p.status, 'Recibida');
    await assert.rejects(() => execute(s, 'receive', {
        id: p.id, qty: 1
    }, admin), /disponible/);
});
test('3D geometry has exact closed dimensions in meters; perspective maps all four corners', async () => {
    const { geometry, homography, project } = await import('../client/visual-core.mjs');
    const THREE = await import('three');
    for (let type of [
        'Fija', 'Corredera', 'Proyectante', 'Abatible', 'Oscilobatiente', 'Guillotina'
    ]) {
        let scene = geometry({
            ...c, type
        }, 1500, 1200, false), box = new THREE.Box3().setFromObject(scene), size = new THREE.Vector3();
        box.getSize(size);
        assert(Math.abs(size.x - 1.5) < 1e-6);
        assert(Math.abs(size.y - 1.2) < 1e-6);
        assert(scene.children.length);
    }
    const pts = [
        {
            x: 30, y: 50
        }, {
            x: 520, y: 20
        }, {
            x: 470, y: 400
        }, {
            x: 70, y: 420
        }
    ], h = homography(pts);
    for (let [i, [u, v]] of [
        [
            0, 0
        ], [
            1, 0
        ], [
            1, 1
        ], [
            0, 1
        ]
    ].entries()) {
        let p = project(h, u, v);
        assert(Math.abs(p.x - pts[i].x) < 1e-6);
        assert(Math.abs(p.y - pts[i].y) < 1e-6);
    }
    assert.throws(() => homography([
        {
            x: 0, y: 0
        }, {
            x: 1, y: 0
        }, {
            x: 2, y: 0
        }, {
            x: 3, y: 0
        }
    ]));
});
test('Exports valid GLB and USDZ with metric units and vertical anchoring', async () => {
    const { geometry } = await import('../client/visual-core.mjs');
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const { USDZExporter } = await import('three/addons/exporters/USDZExporter.js');
    const { unzipSync, strFromU8 } = await import('three/addons/libs/fflate.module.js');
    globalThis.FileReader = class {
        readAsArrayBuffer(blob) {
            blob.arrayBuffer().then(value => {
                this.result = value;
                this.onloadend?.();
            });
        }
        readAsDataURL(blob) {
            blob.arrayBuffer().then(value => {
                this.result = 'data:' + blob.type + ';base64,' + Buffer.from(value).toString('base64');
                this.onloadend?.();
            });
        }
    };
    const scene = geometry(c, 1500, 1200, false), glb = await new GLTFExporter().parseAsync(scene, {
        binary: true
    });
    assert.equal(new DataView(glb).getUint32(0, true), 0x46546c67);
    assert.equal(new DataView(glb).getUint32(4, true), 2);
    const usdz = await new USDZExporter().parseAsync(scene, {
        quickLookCompatible: true, ar: {
            anchoring: {
                type: 'plane'
            }, planeAnchoring: {
                alignment: 'vertical'
            }
        }
    });
    const entries = unzipSync(new Uint8Array(usdz)), text = Object.entries(entries).filter(([k]) => k.endsWith('.usda')).map(([k, v]) => strFromU8(v)).join('\n');
    assert(text.includes('metersPerUnit = 1'));
    assert(text.includes('alignment = "vertical"'));
    assert(Object.keys(entries).some(k => k.endsWith('.usda')));
    delete globalThis.FileReader;
});
