/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * REGLAS Y CÁLCULOS. Funciones de configuración, cotización, corte e inventario de demostración. Entradas habituales: s = estado del taller; c = configuración; m = medidas.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
export const types = [
    'Fija', 'Corredera', 'Proyectante', 'Abatible', 'Oscilobatiente', 'Guillotina'
];
export const roles = [
    'Administrador', 'Vendedor', 'Medidor', 'Instalador', 'Producción', 'Bodega', 'Administración', 'Cliente'
];
export const steps = [
    'CREADA', 'ANTICIPO_OK', 'DESPIECE_APROBADO', 'EN_CORTE', 'EN_ARMADO', 'CONTROL_CALIDAD', 'TERMINADA', 'DESPACHADA', 'INSTALADA', 'RECEPCIONADA', 'CERRADA'
];
/*
 * Interrumpe la operación con un mensaje si una condición de negocio no se cumple.
 * Parámetros: ok, message.
 */
export function ensure(ok, message) {
    if (!ok)
        throw new Error(message);
}
/*
 * Convierte y valida un número finito dentro del rango permitido.
 * Parámetros: x, min, max.
 */
export function number(x, min = 0, max = 1e9) {
    const n = Number(x);
    ensure(Number.isFinite(n) && n >= min && n <= max, 'Valor numérico fuera de rango.');
    return n;
}
export const /*
 * Genera un identificador aleatorio único.
 */
uuid = () => crypto.randomUUID(), /*
 * Obtiene la fecha actual en formato ISO UTC.
 */
now = () => new Date().toISOString();
/*
 * Construye el estado inicial vacío con catálogo y parámetros de demostración, no valores industriales certificados.
 * Parámetros: ninguno; utiliza el contexto del módulo.
 */
export function defaultState() {
    return {
        revision: 0, requests: [], visits: [], quotes: [], payments: [], stock: [], retals: [], purchases: [], movements: [], claims: [], waste: [], plans: [], conflicts: [], members: [], settings: {
            company: 'Ventexa · taller de pruebas', rut: 'Sin configurar', address: 'San Fernando', quoteDays: 15, actDays: 30, band: 15, margin: 30, advance: 50, hour: 14000, installHour: 16000, consumables: 6000, removal: 25000, finish: 18000, scaffold: 45000, adjust: 35000, minGlass: .5, kerf: 3, edge: 10, retalMin: 300, uf: 0, ufDate: '', leadDays: 5, capacity: 12, productionValidated: false, qc: [
                'Medidas', 'Escuadra', 'Vidrio sin daños', 'Apertura y cierre', 'Sellado'
            ], warranty: {
                Perfil: 24, Vidrio: 12, Herrajes: 12, Instalación: 6
            }, zones: {
                'San Fernando': 12000, 'Chimbarongo': 16000, 'Nancagua': 18000, 'Santa Cruz': 24000
            }
        }, catalog: {
            lines: [
                {
                    id: 'alu', name: 'Aluminio · línea de prueba', supplier: 'Proveedor por validar', material: 'Aluminio', depth: 70, u: 3.2, air: 'Sin certificar', colors: [
                        'Blanco', 'Negro', 'Bronce'
                    ], types, price: 8500, gap: 5, glassDeduction: 70, maxArea: 3, margin: 30
                }, {
                    id: 'pvc', name: 'PVC · línea de prueba', supplier: 'Proveedor por validar', material: 'PVC', depth: 70, u: 1.8, air: 'Sin certificar', colors: [
                        'Blanco', 'Negro'
                    ], types: types.filter(t => t !== 'Guillotina'), price: 12000, gap: 5, glassDeduction: 70, maxArea: 2.8, margin: 32
                }
            ], glass: [
                {
                    id: 'mono', name: 'Monolítico 6 mm', thickness: 6, chamber: 0, lowE: false, color: 'Incoloro', u: 5.7, safety: false, price: 42000
                }, {
                    id: 'lam', name: 'Laminado 3+3', thickness: 6, chamber: 0, lowE: false, color: 'Incoloro', u: 5.5, safety: true, price: 62000
                }, {
                    id: 'temp', name: 'Templado 6 mm', thickness: 6, chamber: 0, lowE: false, color: 'Incoloro', u: 5.7, safety: true, price: 58000
                }, {
                    id: 'dvh', name: 'Termopanel 4/12/4 Low-E', thickness: 8, chamber: 12, lowE: true, color: 'Incoloro', u: 1.8, safety: false, price: 74000
                }
            ], hardware: [
                {
                    id: 'standard', name: 'Set estándar de prueba', capacity: 80, price: 18000, types
                }, {
                    id: 'reinforced', name: 'Set reforzado de prueba', capacity: 120, price: 32000, types
                }
            ], rules: types.map(t => ({
                type: t, minW: 300, maxW: 3500, minH: 300, maxH: 3000, maxSlender: 5, minThickness: 6, maxAreaThin: 2, highInstall: 3000, highMinThickness: 8, hours: t === 'Fija' ? 1 : 2, minLeaves: t === 'Fija' ? 1 : 2, maxLeaves: t === 'Fija' ? 4 : 4
            }))
        }, teams: [
            {
                id: 'team1', name: 'Daniel · medición', skills: [
                    'Medición'
                ], zones: [
                    'San Fernando', 'Chimbarongo', 'Nancagua', 'Santa Cruz'
                ], start: 9, end: 18, days: [
                    1, 2, 3, 4, 5
                ]
            }, {
                id: 'team2', name: 'Cuadrilla instalación', skills: [
                    'Medición', 'Instalación', 'Servicio'
                ], zones: [
                    'San Fernando', 'Chimbarongo', 'Nancagua', 'Santa Cruz'
                ], start: 9, end: 18, days: [
                    1, 2, 3, 4, 5
                ]
            }
        ], estimated: {}, official: {}, orders: [], audit: []
    };
}
/*
 * Exige tres anchos y tres altos y elige el mínimo de cada grupo para el vano.
 * Parámetros: m.
 */
export function dims(m) {
    ensure(m && Array.isArray(m.w) && Array.isArray(m.h) && m.w.length === 3 && m.h.length === 3, 'Se requieren tres anchos y tres altos.');
    [
        ...m.w, ...m.h
    ].forEach(v => number(v, 1, 12000));
    return {
        w: Math.min(...m.w), h: Math.min(...m.h)
    };
}
/*
 * Resuelve las referencias al perfil, vidrio, herraje y regla de la tipología seleccionada.
 * Parámetros: s, c.
 */
export function configItems(s, c) {
    let l = s.catalog.lines.find(x => x.id === c.line), g = s.catalog.glass.find(x => x.id === c.glass), h = s.catalog.hardware.find(x => x.id === c.hardware), r = s.catalog.rules.find(x => x.type === c.type);
    ensure(l && g && h && r, 'La configuración contiene elementos que ya no existen en el catálogo.');
    return {
        l, g, h, r
    };
}
/*
 * Comprueba compatibilidades y límites del catálogo de prueba; acumula condiciones de riesgo y rechaza combinaciones no admitidas.
 * Parámetros: s, c, m, confirmed.
 */
export function validate(s, c, m, confirmed = false) {
    const { w, h } = dims(m), v = configItems(s, c), n = number(c.leaves, 1, 4), a = w * h / 1e6 / n, errors = [];
    ensure([
        'Retiro completo', 'Marco existente', 'Solo vidrio'
    ].includes(c.intervention), 'Tipo de intervención inválido.');
    ensure(v.l.types.includes(c.type) && v.h.types.includes(c.type) && v.l.colors.includes(c.color), 'Combinación no compatible. Cambia la línea, herraje o color.');
    ensure(n >= v.r.minLeaves && n <= v.r.maxLeaves, 'Número de hojas incompatible con la tipología.');
    if (w < v.r.minW || w > v.r.maxW || h < v.r.minH || h > v.r.maxH)
        ensure(confirmed, 'Medidas fuera del rango habitual. Revisa y confirma explícitamente.');
    if (a > v.l.maxArea)
        errors.push('Superficie por hoja excesiva. Aumenta las hojas o divide el vano.');
    if (a * v.g.thickness * 2.5 > v.h.capacity)
        errors.push('El vidrio supera la capacidad del herraje. Usa el set reforzado o divide las hojas.');
    if (h / (w / n) > v.r.maxSlender)
        errors.push('Hoja demasiado esbelta. Aumenta su ancho o divide su altura.');
    if ((number(c.sill, 0, 20000) < 900 || c.safetyZone) && !v.g.safety)
        errors.push('Zona de riesgo: selecciona laminado o templado.');
    if (v.g.thickness < v.r.minThickness || (a > v.r.maxAreaThin && v.g.thickness < 8) || (number(c.workHeight, 0, 30000) > v.r.highInstall && v.g.thickness < v.r.highMinThickness))
        errors.push('Espesor insuficiente para el área o altura. Usa un vidrio de mayor espesor.');
    ensure(!errors.length, errors.join(' '));
    return {
        ...v, w, h, area: a, weight: a * v.g.thickness * 2.5
    };
}
/*
 * Calcula costos de prueba, margen, descuento e IVA; devuelve total y rango estimativo. Requiere validación de fórmulas con el fabricante.
 * Parámetros: s, c, m, conditions, discount.
 */
export function price(s, c, m, conditions = {}, discount = 0) {
    const { w, h, l, g, r } = validate(s, c, m, !!m.confirmed);
    let a = w * h / 1e6, parts = {
        vidrio: Math.max(a, s.settings.minGlass) * g.price, perfil: c.intervention === 'Solo vidrio' ? 0 : 2 * (w + h) / 1000 * l.price, herrajes: c.intervention === 'Solo vidrio' ? 0 : configItems(s, c).h.price, consumibles: s.settings.consumables, fabricacion: r.hours * s.settings.hour, instalacion: 2 * s.settings.installHour * (conditions.access === 'Difícil' ? 1.5 : 1) * (conditions.wall === 'Hormigón' ? 1.2 : 1), retiro: c.intervention === 'Retiro completo' ? s.settings.removal : 0, terminaciones: conditions.finish ? s.settings.finish : 0, andamio: number(c.workHeight, 0, 30000) > 3000 ? s.settings.scaffold : 0, traslado: s.settings.zones[c.comuna] ?? 12000, escuadria: Math.abs((m.d1 || 0) - (m.d2 || 0)) > 6 ? s.settings.adjust : 0
    };
    const cost = Object.values(parts).reduce((a, b) => a + b, 0), net = Math.round(cost / (1 - number(l.margin ?? s.settings.margin, 1, 80) / 100) * (1 - number(discount, 0, 30) / 100)), iva = Math.round(net * .19), total = net + iva;
    return {
        parts, cost, net, iva, total, min: Math.round(total * (1 - s.settings.band / 100)), max: Math.round(total * (1 + s.settings.band / 100))
    };
}
/*
 * Genera piezas desde un acta oficial firmada y aplica las deducciones del catálogo. El despiece es demostrativo y no cubre fichas industriales completas por tipología.
 * Parámetros: s, c, o.
 */
export function cut(s, c, o) {
    ensure(o?.signed && o.id, 'Solo se puede fabricar desde un acta oficial firmada.');
    const { w, h, l } = validate(s, c, o, !!o.confirmed), gap = c.intervention === 'Solo vidrio' ? 0 : l.gap, fw = w - gap * 2, fh = h - gap * 2, n = c.leaves, gd = c.intervention === 'Solo vidrio' ? 0 : l.glassDeduction;
    const pieces = [];
    for (let i = 0; i < n; i++) {
        const gw = Math.floor(fw / n - gd), gh = fh - gd;
        ensure(gw > 0 && gh > 0, 'Deducción incompatible con el vano.');
        pieces.push({
            id: uuid(), kind: 'glass', name: 'Vidrio ' + (i + 1), w: gw, h: gh, material: c.glass, angle: 90, state: 'Pendiente'
        });
    }
    if (c.intervention !== 'Solo vidrio') {
        [
            fw, fw, fh, fh, ...(n > 1 ? [
                fh, fh
            ] : [])
        ].forEach((len, i) => pieces.push({
            id: uuid(), kind: 'profile', name: 'Perfil ' + (i + 1), w: len, h: 0, material: c.line + '-' + c.color, angle: 45, state: 'Pendiente'
        }));
    }
    return {
        w: fw, h: fh, gap, glassDeduction: gd, pieces
    };
}
/*
 * Distribuye largos de perfil en barras con una heurística de mayor a menor; descuenta el ancho del corte y aprovecha retales. No garantiza el óptimo global.
 * Parámetros: parts, kerf, retals.
 */
export function pack1D(parts, kerf = 3, retals = []) {
    const bins = [], pending = [
        ...parts
    ].sort((a, b) => b.w - a.w);
    for (const p of pending) {
        ensure(p.w + kerf <= 6000, 'Pieza mayor a una barra de 6000 mm.');
        let b = bins.find(x => x.remaining >= p.w + kerf);
        if (!b) {
            let r = retals.find(x => !bins.some(b => b.retalId === x.id) && x.w >= p.w + kerf);
            b = {
                id: uuid(), length: r?.w || 6000, remaining: r?.w || 6000, retalId: r?.id || null, parts: []
            };
            bins.push(b);
        }
        b.parts.push({
            ...p, x: b.length - b.remaining
        });
        b.remaining -= p.w + kerf;
    }
    return bins;
}
// Binary guillotine partition: every split runs across its entire remaining rectangle.
/*
 * Distribuye vidrios con particiones de guillotina, giro de piezas, borde y ancho de corte. Es una heurística, no una garantía de óptimo global.
 * Parámetros: parts, kerf, edge, retals.
 */
export function pack2D(parts, kerf = 3, edge = 10, retals = []) {
    let sheets = retals.map(r => ({
        id: uuid(), w: r.w, h: r.h, retalId: r.id, pieces: [], cuts: [], root: {
            x: 0, y: 0, w: r.w, h: r.h
        }
    }));
    /*
     * Busca recursivamente un rectángulo libre donde quepa la pieza, con o sin giro.
     * Parámetros: node, p.
     */
    function locate(node, p) {
        if (node.children) {
            for (let child of node.children) {
                const f = locate(child, p);
                if (f)
                    return f;
            }
            return null;
        }
        if (node.piece)
            return null;
        return p.w <= node.w && p.h <= node.h ? {
            node, w: p.w, h: p.h, rotated: false
        } : p.h <= node.w && p.w <= node.h ? {
            node, w: p.h, h: p.w, rotated: true
        } : null;
    }
    for (const p of [
        ...parts
    ].sort((a, b) => b.w * b.h - a.w * a.h)) {
        let sheet, place;
        for (let x of sheets) {
            place = locate(x.root, p);
            if (place) {
                sheet = x;
                break;
            }
        }
        if (!place) {
            const r = retals.find(x => !sheets.some(s => s.retalId === x.id) && ((p.w <= x.w && p.h <= x.h) || (p.h <= x.w && p.w <= x.h)));
            sheet = {
                id: uuid(), w: r?.w || 3210, h: r?.h || 2250, retalId: r?.id || null, pieces: [], cuts: [], root: {
                    x: r ? 0 : edge, y: r ? 0 : edge, w: (r?.w || 3210) - (r ? 0 : edge * 2), h: (r?.h || 2250) - (r ? 0 : edge * 2)
                }
            };
            sheets.push(sheet);
            place = locate(sheet.root, p);
            ensure(place, 'Una pieza no cabe en la plancha disponible.');
        }
        const { node, w, h, rotated } = place;
        sheet.pieces.push({
            ...p, x: node.x, y: node.y, w, h, rotated
        });
        const children = [];
        if (node.w > w + kerf) {
            sheet.cuts.push({
                axis: 'X', position: node.x + w, from: node.y, to: node.y + node.h
            });
            children.push({
                x: node.x + w + kerf, y: node.y, w: node.w - w - kerf, h: node.h
            });
        }
        if (node.h > h + kerf) {
            sheet.cuts.push({
                axis: 'Y', position: node.y + h, from: node.x, to: node.x + w
            });
            children.push({
                x: node.x, y: node.y + h + kerf, w, h: node.h - h - kerf
            });
        }
        node.piece = p.id;
        node.children = children;
    }
    return sheets.filter(s => s.pieces.length);
}
/*
 * Recorre la partición del plan y devuelve los rectángulos libres.
 * Parámetros: node.
 */
export function emptyRects(node) {
    if (node.children)
        return node.children.flatMap(emptyRects);
    return node.piece ? [] : [
        {
            x: node.x, y: node.y, w: node.w, h: node.h
        }
    ];
}
/*
 * Agrupa piezas por material, elige el algoritmo de corte y calcula aprovechamiento.
 * Parámetros: s, orders.
 */
export function makePlans(s, orders) {
    const groups = {};
    for (const o of orders)
        for (const v of o.vanos)
            for (const p of v.cut.pieces) {
                let k = p.kind + ':' + p.material;
                (groups[k] ??= []).push({
                    ...p, orderId: o.id, vano: v.name
                });
            }
    return Object.entries(groups).map(([material, parts]) => {
        const [kind, key] = material.split(':'), retals = s.retals.filter(r => r.material === key && r.kind === kind && !r.reserved && !r.used);
        const layouts = kind === 'glass' ? pack2D(parts, s.settings.kerf, s.settings.edge, retals) : pack1D(parts, s.settings.kerf, retals);
        let used = parts.reduce((a, p) => a + (kind === 'glass' ? p.w * p.h : p.w), 0), all = layouts.reduce((a, b) => a + (kind === 'glass' ? b.w * b.h : b.length), 0);
        return {
            id: uuid(), material: key, kind, layouts, used, all, utilization: all ? used / all * 100 : 0, orderIds: orders.map(o => o.id), at: now()
        };
    });
}
/*
 * Calcula bloques libres según habilidades, comuna, días y horarios; excluye solapamientos.
 * Parámetros: s, request, type, teamId, from, days.
 */
export function slots(s, request, type, teamId, from, days = 14) {
    let t = s.teams.find(t => t.id === teamId);
    ensure(t && t.skills.includes(type) && t.zones.includes(request.comuna), 'Cuadrilla no compatible con el servicio o comuna.');
    const duration = type === 'Medición' ? 60 : type === 'Servicio' ? 120 : request.vanos.length * 120, out = [];
    for (let d = 0; d < days; d++) {
        let dt = new Date(from + 'T12:00:00Z');
        dt.setUTCDate(dt.getUTCDate() + d);
        if (!t.days.includes(dt.getUTCDay()))
            continue;
        let day = dt.toISOString().slice(0, 10);
        for (let minute = t.start * 60; minute + duration <= t.end * 60; minute += 60) {
            if (!s.visits.some(v => v.teamId === teamId && v.day === day && ![
                'No realizada', 'Cancelada'
            ].includes(v.status) && minute < v.minute + v.duration && minute + duration > v.minute)) {
                out.push({
                    day, minute, duration, priority: s.visits.some(v => v.day === day && v.comuna === request.comuna) ? 1 : 0
                });
            }
        }
    }
    return out.sort((a, b) => a.day.localeCompare(b.day) || b.priority - a.priority || a.minute - b.minute);
}
