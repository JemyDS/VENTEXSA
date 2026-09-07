/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * PRUEBAS. Escenarios y aserciones ejecutables. Los datos de este archivo son ficticios; la ausencia de errores no sustituye una prueba física de AR.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const mf = new Miniflare({
    modules: true, scriptPath: 'dist/server/index.js', modulesRules: [
        {
            type: 'ESModule', include: [
                '**/*.js', '**/*.mjs'
            ], fallthrough: true
        }
    ], compatibilityDate: '2026-05-15', compatibilityFlags: [
        'nodejs_compat'
    ], d1Databases: [
        'DB'
    ], r2Buckets: [
        'BUCKET'
    ], serviceBindings: {
        ASSETS: () => new Response('asset', {
            status: 404
        })
    }
});
try {
    const db = await mf.getD1Database('DB');
    for (const sql of (await readFile('drizzle/0000_wakeful_toad.sql', 'utf8')).split('--> statement-breakpoint'))
        if (sql.trim())
            await db.prepare(sql).run();
    let headers = {
        'oai-authenticated-user-id': 'local-test-owner', 'oai-authenticated-user-email': 'jsalomeds@gmail.com', 'Content-Type': 'application/json'
    };
    let r = await mf.dispatchFetch('https://ventexa.test/api/state');
    assert.equal(r.status, 401);
    r = await mf.dispatchFetch('https://ventexa.test/api/state', {
        headers
    });
    let s = await r.json();
    assert.equal(r.status, 200, JSON.stringify(s));
    assert.equal(s.revision, 0);
    let op = {
        action: 'seed', payload: {}, revision: 0, operation: 'integration-seed'
    };
    r = await mf.dispatchFetch('https://ventexa.test/api/action', {
        method: 'POST', headers, body: JSON.stringify(op)
    });
    let result = await r.json();
    assert.equal(r.status, 200, JSON.stringify(result));
    r = await mf.dispatchFetch('https://ventexa.test/api/state', {
        headers
    });
    s = await r.json();
    assert.equal(s.requests.length, 5);
    assert.equal(s.revision, 1);
    assert.equal(Object.keys(s.official).length, 4);
    assert.equal(s.orders.length, 3);
    r = await mf.dispatchFetch('https://ventexa.test/api/action', {
        method: 'POST', headers, body: JSON.stringify(op)
    });
    assert.equal((await r.json()).replayed, true);
    r = await mf.dispatchFetch('https://ventexa.test/api/action', {
        method: 'POST', headers, body: JSON.stringify({
            ...op, action: 'settings', payload: {
                settings: s.settings
            }, operation: 'stale-op'
        })
    });
    assert.equal(r.status, 409);
    r = await mf.dispatchFetch('https://ventexa.test/api/document/' + s.quotes[0].id, {
        headers
    });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'application/pdf');
    assert((await r.text()).startsWith('%PDF'));
    const count = await db.prepare('SELECT COUNT(*) AS n FROM audit').first();
    assert.equal(count.n, 1);
    const form = new FormData();
    form.append('file', new File([
        Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1sAAAAASUVORK5CYII=', 'base64')
    ], 'signature.png', {
        type: 'image/png'
    }));
    const fileHeaders = {
        ...headers
    };
    delete fileHeaders['Content-Type'];
    r = await mf.dispatchFetch('https://ventexa.test/api/files', {
        method: 'POST', headers: fileHeaders, body: form
    });
    const file = await r.json();
    assert.equal(r.status, 200, JSON.stringify(file));
    r = await mf.dispatchFetch('https://ventexa.test' + file.url, {
        headers
    });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/png');
    r = await mf.dispatchFetch('https://ventexa.test/api/action', {
        method: 'POST', headers, body: JSON.stringify({
            action: 'member', payload: {
                email: 'client@example.com', role: 'Cliente'
            }, revision: 1, operation: 'add-client'
        })
    });
    assert.equal(r.status, 200);
    const clientHeaders = {
        ...headers, 'oai-authenticated-user-email': 'client@example.com', 'oai-authenticated-user-id': 'test-client'
    };
    r = await mf.dispatchFetch('https://ventexa.test/api/state', {
        headers: clientHeaders
    });
    let clientState = await r.json();
    assert.equal(clientState.requests.length, 0);
    assert.equal(clientState.orders.length, 0);
    assert.equal(clientState.catalog.lines[0].price, 0);
    assert.equal(clientState.settings.hour, undefined);
    r = await mf.dispatchFetch('https://ventexa.test' + file.url, {
        headers: clientHeaders
    });
    assert.equal(r.status, 403);
    r = await mf.dispatchFetch('https://ventexa.test/api/estimate', {
        method: 'POST', headers: clientHeaders, body: JSON.stringify({
            config: s.requests[0].vanos[0].config, measure: s.estimated[s.requests[0].vanos[0].estimatedId]
        })
    });
    const estimation = await r.json();
    assert.equal(r.status, 200, JSON.stringify(estimation));
    assert(estimation.min > 0);
    assert(estimation.max > estimation.min);
    assert.equal(estimation.cost, undefined);
    console.log('Worker integration passed: authentication, D1/R2 seed persistence, official measures, OT links, idempotency, conflict rejection, PDF endpoint and audit.');
}
finally {
    await mf.dispose();
}
