/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * PRUEBAS. Escenarios y aserciones ejecutables. Los datos de este archivo son ficticios; la ausencia de errores no sustituye una prueba física de AR.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, Vector3, Euler } from 'three';
import { wallPlacement } from '../client/ar-core.mjs';
import { editPrompt, editImage } from '../lib/image-edit.mjs';
const config = {
    c: {
        type: 'Corredera', color: 'Blanco', leaves: 2
    }, w: 1500, h: 1200
}, points = [
    {
        x: .2, y: .2
    }, {
        x: .8, y: .2
    }, {
        x: .8, y: .8
    }, {
        x: .2, y: .8
    }
];
test('AR rejects floor, ceiling, tilted surface, distant hit and invalid pose', () => {
    for (const angle of [
        0, Math.PI, Math.PI / 4
    ]) {
        const m = new Matrix4().makeRotationX(angle);
        assert.equal(wallPlacement(m.elements, {
            x: 0, y: 1, z: 2
        }), null);
    }
    const wall = new Matrix4().makeRotationX(Math.PI / 2);
    wall.setPosition(0, 0, -8);
    assert.equal(wallPlacement(wall.elements, {
        x: 0, y: 0, z: 0
    }), null);
    assert.equal(wallPlacement([
        NaN
    ], {}), null);
});
test('AR keeps window up vertical for either normal of walls at multiple angles', () => {
    for (const angle of [
        0, .6, 1.5, -1.2
    ])
        for (const flip of [
            1, -1
        ]) {
            const m = new Matrix4().makeRotationY(angle).multiply(new Matrix4().makeRotationX(flip * Math.PI / 2));
            m.setPosition(0, 1, 0);
            const camera = {
                x: Math.sin(angle) * 2, y: 1, z: Math.cos(angle) * 2
            };
            const hit = wallPlacement(m.elements, camera);
            assert(hit);
            const up = new Vector3(0, 1, 0).applyEuler(new Euler(0, hit.yaw, 0));
            assert(up.distanceTo(new Vector3(0, 1, 0)) < 1e-9);
            const front = new Vector3(0, 0, 1).applyEuler(new Euler(0, hit.yaw, 0));
            assert(front.dot(new Vector3(camera.x, 0, camera.z)) > 1.99);
        }
});
test('AI prompt requires valid bounded configuration and noncrossed opening', () => {
    assert.match(editPrompt(config, points), /FIRST room photograph/);
    assert.throws(() => editPrompt({
        ...config, w: 0
    }, points));
    assert.throws(() => editPrompt(config, [
        points[0], points[2], points[1], points[3]
    ]));
    assert.throws(() => editPrompt(config, points.map(p => ({
        ...p, x: 2
    }))));
});
test('AI sends original, guide and mask to real edits contract and decodes output', async () => {
    const photo = new Blob([
        new Uint8Array([
            137, 80, 78, 71, 13, 10, 26, 10
        ])
    ], {
        type: 'image/png'
    });
    const bytes = await editImage({
        key: 'test-key', photo, guide: photo, mask: photo, prompt: editPrompt(config, points), fetcher: async (url, options) => {
            assert.equal(url, 'https://api.openai.com/v1/images/edits');
            assert.equal(options.headers.Authorization, 'Bearer test-key');
            assert.equal(options.body.getAll('image[]').length, 2);
            assert.equal(options.body.get('mask').type, 'image/png');
            assert.equal(options.body.get('model'), 'gpt-image-1.5');
            return Response.json({
                data: [
                    {
                        b64_json: 'iVBORw0KGgo='
                    }
                ]
            });
        }
    });
    assert.equal(bytes[0], 137);
    await assert.rejects(() => editImage({
        key: 'x', photo, guide: photo, mask: photo, prompt: 'x', fetcher: async () => new Response('secret detail', {
            status: 401
        })
    }), /credencial válida/);
    await assert.rejects(() => editImage({
        key: 'x', photo, guide: photo, mask: photo, prompt: 'x', fetcher: async () => Response.json({
            data: []
        })
    }), /imagen válida/);
});
test('Quick Look uses its wall anchor basis without rotating the preview geometry', async () => {
    const { quickLookGeometry, geometry } = await import('../client/visual-core.mjs');
    const preview = geometry(config.c, 1500, 1200), wall = quickLookGeometry(config.c, 1500, 1200);
    assert.equal(preview.children[0].rotation.x, 0);
    const front = new Vector3(0, 0, 1).transformDirection(wall.children[0].matrixWorld);
    assert(front.distanceTo(new Vector3(0, 1, 0)) < 1e-9);
    const up = new Vector3(0, 1, 0).transformDirection(wall.children[0].matrixWorld);
    assert(up.distanceTo(new Vector3(0, 0, -1)) < 1e-9);
});
