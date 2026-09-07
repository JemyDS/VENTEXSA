/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * MOTOR DE OPERACIONES. Recibe s = estado, action = nombre de operación, p = datos enviados y actor = usuario autenticado. Primero autoriza, después valida y modifica el estado.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { quotePDF } from './pdf.mjs';
import { ensure, number, uuid, now, defaultState, roles, types, dims, validate, price, cut, makePlans, steps, slots, emptyRects } from './domain.mjs';
const permissions = {
    editDraft: [
        'Vendedor', 'Cliente'
    ], material: [
        'Bodega'
    ], create: [
        'Vendedor', 'Cliente'
    ], draft: [
        'Vendedor', 'Cliente'
    ], estimate: [
        'Vendedor', 'Cliente'
    ], schedule: [
        'Vendedor', 'Medidor', 'Instalador'
    ], visit: [
        'Medidor', 'Instalador'
    ], measure: [
        'Medidor', 'Instalador'
    ], quote: [
        'Vendedor'
    ], accept: [
        'Vendedor', 'Cliente'
    ], reject: [
        'Vendedor', 'Cliente'
    ], payment: [
        'Administración'
    ], approve: [
        'Producción'
    ], advance: [
        'Producción', 'Instalador'
    ], piece: [
        'Producción'
    ], waste: [
        'Producción'
    ], plan: [
        'Producción'
    ], install: [
        'Instalador'
    ], observation: [
        'Instalador'
    ], resolve: [
        'Instalador'
    ], receipt: [
        'Instalador'
    ], close: [
        'Administración'
    ], stock: [
        'Bodega'
    ], purchase: [
        'Bodega'
    ], receive: [
        'Bodega'
    ], claim: [
        'Vendedor', 'Instalador'
    ], service: [
        'Vendedor', 'Instalador'
    ], changeMeasure: [
        'Producción'
    ]
};
/*
 * Verifica el permiso del rol antes de ejecutar cualquier acción. El administrador tiene acceso general.
 * Parámetros: actor, action.
 */
export function authorize(actor, action) {
    ensure(actor.role === 'Administrador' || permissions[action]?.includes(actor.role), 'Tu rol no permite esta acción.');
}
const /*
 * Exige una referencia a una firma ya almacenada; no acepta una imagen sin guardar.
 */
signature = s => ensure(typeof s === 'string' && s.startsWith('/api/file/'), 'Falta la firma guardada del cliente.');
const /*
 * Comprueba cantidad mínima, referencias guardadas y que no se repita la misma referencia.
 */
photos = (p, min) => ensure(Array.isArray(p) && p.length >= min && new Set(p).size >= min && p.every(v => typeof v === 'string' && v.startsWith('/api/file/')), 'Faltan fotografías diferentes para completar el registro.');
/*
 * Localiza una solicitud y limita al cliente a las solicitudes cuyo propietario coincide con su cuenta.
 * Parámetros: s, id, actor.
 */
export function findRequest(s, id, actor) {
    let r = s.requests.find(x => x.id === id);
    ensure(r, 'Solicitud no encontrada.');
    if (actor.role === 'Cliente')
        ensure(r.owner === actor.email, 'No tienes acceso a esta solicitud.');
    return r;
}
export const /*
 * Devuelve el acta oficial referenciada por el vano, si existe.
 */
currentOfficial = (s, v) => v.officialId ? s.official[v.officialId] : null;
/*
 * Exige actas oficiales vigentes y crea una instantánea de precios y condiciones para que cambios posteriores no alteren esa versión.
 * Parámetros: s, r, discount.
 */
function createQuote(s, r, discount) {
    let lines = r.vanos.map(v => {
        const o = currentOfficial(s, v);
        ensure(o && o.signed, 'Falta un acta oficial firmada por vano.');
        ensure(Date.now() - Date.parse(o.at) <= s.settings.actDays * 864e5, 'El acta de medición venció. Realiza un nuevo levantamiento.');
        return {
            vanoId: v.id, name: v.name, config: structuredClone(v.config), officialId: o.id, measure: dims(o), ...price(s, v.config, o, o, discount)
        };
    });
    const q = {
        id: uuid(), requestId: r.id, company: {
            name: s.settings.company, rut: s.settings.rut, address: s.settings.address
        }, client: {
            name: r.client, address: r.address, comuna: r.comuna
        }, advance: s.settings.advance, uf: s.settings.uf, ufDate: s.settings.ufDate, version: s.quotes.filter(q => q.requestId === r.id).length + 1, at: now(), expires: new Date(Date.now() + s.settings.quoteDays * 864e5).toISOString(), lines, discount, net: lines.reduce((a, l) => a + l.net, 0), iva: lines.reduce((a, l) => a + l.iva, 0), total: lines.reduce((a, l) => a + l.total, 0), cost: lines.reduce((a, l) => a + l.cost, 0)
    };
    s.quotes.push(q);
    r.quoteId = q.id;
    r.status = 'COTIZACION_FIRME';
    return q;
}
/*
 * Obtiene un hash SHA-256 del contenido para comprobación de integridad; no es una firma digital certificada.
 * Parámetros: data.
 */
export async function digest(data) {
    return [
        ...new Uint8Array(await crypto.subtle.digest('SHA-256', data instanceof ArrayBuffer ? data : new TextEncoder().encode(typeof data === 'string' ? data : JSON.stringify(data))))
    ].map(x => x.toString(16).padStart(2, '0')).join('');
}
/*
 * Aplica una operación autorizada sobre el estado cargado. La ruta HTTP guarda después los cambios en D1; esta función no persiste por sí sola.
 * Parámetros: s, action, p, actor.
 */
export async function execute(s, action, p, actor) {
    authorize(actor, action);
    let result = {}, r = p.requestId ? findRequest(s, p.requestId, actor) : null, o = p.orderId ? s.orders.find(x => x.id === p.orderId) : null;
    if (p.orderId)
        ensure(o, 'OT inexistente.');
    let at = now();
    /*
     * OPERACIÓN: Crear solicitud y medidas estimadas / Conservar borrador. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'create' || action === 'draft') {
        ensure(p.client?.trim(), 'Ingresa el nombre del cliente.');
        const id = uuid();
        r = {
            id, code: 'SOL-' + String(s.requests.length + 1).padStart(4, '0'), client: p.client.slice(0, 200), rut: String(p.rut || ''), phone: String(p.phone || ''), email: String(p.email || ''), address: String(p.address || ''), comuna: String(p.comuna || 'San Fernando'), region: String(p.region || "O’Higgins"), channel: String(p.channel || 'Portal'), branch: String(p.branch || 'Principal'), owner: actor.email, at, status: 'BORRADOR', vanos: [], history: [
                {
                    at, status: 'BORRADOR'
                }
            ], notes: []
        };
        for (const v of p.vanos || []) {
            const id = uuid(), mid = uuid();
            dims(v.measure);
            s.estimated[mid] = {
                ...v.measure, id: mid, vanoId: id, at, source: 'Cliente', photos: v.photos || [], confirmed: !!v.confirmed
            };
            r.vanos.push({
                id, name: String(v.name || 'Vano'), config: v.config, estimatedId: mid
            });
        }
        s.requests.push(r);
        result = {
            requestId: r.id
        };
    }
    else /*
     * OPERACIÓN: Reemplazar datos de un borrador editable. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'editDraft') {
        ensure(r.status === 'BORRADOR', 'Solo se puede editar un borrador.');
        r.client = p.client;
        r.phone = p.phone;
        r.address = p.address;
        r.comuna = p.comuna;
        r.vanos = [];
        for (let v of p.vanos) {
            const id = uuid(), mid = uuid();
            dims(v.measure);
            s.estimated[mid] = {
                ...v.measure, id: mid, vanoId: id, at, photos: v.photos, source: 'Cliente', confirmed: !!v.confirmed
            };
            r.vanos.push({
                id, name: v.name, config: v.config, estimatedId: mid
            });
        }
        result = {
            requestId: r.id
        };
    }
    else /*
     * OPERACIÓN: Dar de alta material de inventario. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'material') {
        ensure(p.name && p.material && [
            'glass', 'profile', 'hardware', 'consumable'
        ].includes(p.kind), 'Completa el material.');
        ensure(!s.stock.some(x => x.kind === p.kind && x.material === p.material), 'Material ya registrado.');
        s.stock.push({
            id: uuid(), name: p.name, material: p.material, kind: p.kind, qty: number(p.qty, 0), min: number(p.min, 0), unitCost: number(p.unitCost, 0), reservations: []
        });
    }
    else /*
     * OPERACIÓN: Emitir rango estimado con evidencia inicial. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'estimate') {
        ensure(r.status === 'BORRADOR', 'Solo se estima un borrador.');
        ensure(r.vanos.length > 0, 'Agrega al menos un vano.');
        let min = 0, max = 0;
        for (let v of r.vanos) {
            let m = s.estimated[v.estimatedId];
            photos(m.photos, 1);
            ensure(m.tapeConfirmed, 'Confirma que la huincha aparece en la fotografía.');
            let q = price(s, v.config, m);
            min += q.min;
            max += q.max;
        }
        r.range = {
            min, max
        };
        r.status = 'ESTIMACION_ENVIADA';
    }
    else /*
     * OPERACIÓN: Asignar una visita sin solapamientos. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'schedule') {
        ensure(r.status !== 'BORRADOR', 'Emite la estimación primero.');
        const type = p.type;
        ensure([
            'Medición', 'Instalación', 'Servicio'
        ].includes(type), 'Tipo de visita inválido.');
        let earliest = new Date();
        if (type === 'Instalación') {
            ensure(s.orders.some(x => x.requestId === r.id), 'La instalación requiere OT.');
            earliest.setUTCDate(earliest.getUTCDate() + s.settings.leadDays);
        }
        const from = earliest.toISOString().slice(0, 10);
        ensure(p.day >= from, 'La fecha no respeta la anticipación mínima de fabricación.');
        let available = slots(s, r, type, p.teamId, p.day, 1);
        let slot = available.find(x => x.day === p.day && x.minute === p.minute);
        ensure(slot, 'Bloque ocupado o fuera del horario de la cuadrilla.');
        if (p.replaceId) {
            let prior = s.visits.find(v => v.id === p.replaceId && v.requestId === r.id);
            ensure(prior, 'Visita anterior inexistente.');
            prior.status = 'Cancelada';
        }
        s.visits.push({
            id: uuid(), requestId: r.id, type, teamId: p.teamId, ...slot, comuna: r.comuna, status: 'Agendada', at
        });
        if (type === 'Medición')
            r.status = 'VISITA_AGENDADA';
    }
    else /*
     * OPERACIÓN: Actualizar estado de visita. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'visit') {
        let v = s.visits.find(v => v.id === p.id);
        ensure(v, 'Visita inexistente.');
        ensure([
            'Confirmada', 'En ruta', 'Ejecutada', 'No realizada'
        ].includes(p.status), 'Estado inválido.');
        if (p.status === 'No realizada')
            ensure([
                'Cliente ausente', 'Acceso bloqueado', 'Dirección incorrecta'
            ].includes(p.reason), 'Selecciona una causal.');
        v.status = p.status;
        v.reason = p.reason;
        v.updatedAt = at;
    }
    else /*
     * OPERACIÓN: Registrar acta oficial versionada / Corregir medidas antes de corte con autorización. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'measure' || action === 'changeMeasure') {
        let v = r.vanos.find(x => x.id === p.vanoId);
        ensure(v, 'Vano inexistente.');
        let existing = s.orders.find(x => x.requestId === r.id);
        if (existing) {
            ensure(action === 'changeMeasure' && actor.role === 'Administrador', 'Medidas congeladas. Requiere autorización administrativa y nota de costo.');
            ensure(![
                'EN_CORTE', 'EN_ARMADO', 'CONTROL_CALIDAD', 'TERMINADA', 'DESPACHADA', 'INSTALADA', 'RECEPCIONADA', 'CERRADA'
            ].includes(existing.state), 'El material ya fue liberado a corte. Gestiona una nueva OT para el retrabajo.');
            number(p.changeCost, 0);
            ensure(p.reason?.trim(), 'Describe el motivo y costo del cambio.');
        }
        photos(p.measure.photos, 3);
        signature(p.measure.signature);
        dims(p.measure);
        number(p.measure.d1, 1, 20000);
        number(p.measure.d2, 1, 20000);
        ensure(p.measure.technician?.trim() && p.measure.instrument?.trim(), 'Identifica técnico e instrumento.');
        ensure(p.measure.wall && p.measure.level && p.measure.sillCondition && p.measure.lintelCondition && p.measure.jambCondition, 'Completa las condiciones del vano.');
        validate(s, v.config, p.measure, !!p.measure.confirmed);
        const id = uuid(), record = {
            ...p.measure, id, vanoId: v.id, actor: actor.email, at, signed: true, previousId: v.officialId || null
        };
        record.hash = await digest(record);
        s.official[id] = record;
        v.officialId = id;
        if (existing) {
            for (let st of s.stock)
                st.reservations = (st.reservations || []).filter(x => x.orderId !== existing.id);
            for (let rt of s.retals)
                if (rt.reserved === existing.id)
                    rt.reserved = null;
            existing.vanos = existing.vanos.map(x => x.id === v.id ? {
                ...x, officialId: id, cut: cut(s, v.config, record)
            } : x);
            existing.state = existing.advance > 0 ? 'ANTICIPO_OK' : 'CREADA';
            existing.changeNotes ??= [];
            existing.changeNotes.push({
                at, cost: p.changeCost, reason: p.reason, actor: actor.email
            });
            existing.planIds = [];
        }
        r.quoteId = null;
        r.acceptance = null;
        r.status = 'VISITA_REALIZADA';
        for (let visit of s.visits.filter(x => x.requestId === r.id && x.type === 'Medición'))
            visit.status = 'Ejecutada';
    }
    else /*
     * OPERACIÓN: Emitir cotización firme. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'quote') {
        ensure(!s.orders.some(x => x.requestId === r.id) || r.status === 'VISITA_REALIZADA', 'La cotización ya tiene OT.');
        const discount = number(p.discount || 0, 0, 30);
        ensure(discount <= 10 || actor.role === 'Administrador', 'Descuento superior al 10% requiere administrador.');
        result = {
            quoteId: createQuote(s, r, discount).id
        };
    }
    else /*
     * OPERACIÓN: Registrar aceptación y crear o actualizar OT. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'accept') {
        ensure(r.status === 'COTIZACION_FIRME', 'La cotización no está disponible para aceptación.');
        let q = s.quotes.find(q => q.id === r.quoteId);
        ensure(q && Date.parse(q.expires) >= Date.now(), 'Cotización vencida: revalida precios.');
        signature(p.signature);
        r.acceptance = {
            at, actor: actor.email, ip: actor.ip || 'No informada por la plataforma', hash: await digest(quotePDF(q)), signature: p.signature, quoteId: q.id
        };
        r.status = 'ACEPTADA';
        let prior = s.orders.find(x => x.requestId === r.id);
        if (prior) {
            prior.quoteId = q.id;
            prior.total = q.total;
        }
        else {
            ensure(s.orders.filter(x => ![
                'CERRADA', 'INSTALADA', 'RECEPCIONADA'
            ].includes(x.state)).length < s.settings.capacity, 'Capacidad de fábrica comprometida. Ajusta la planificación antes de crear otra OT.');
            s.orders.push({
                id: uuid(), code: 'OT-' + String(s.orders.length + 1).padStart(4, '0'), requestId: r.id, quoteId: q.id, total: q.total, advance: 0, state: 'CREADA', at, history: [
                    {
                        at, state: 'CREADA'
                    }
                ], vanos: r.vanos.map(v => ({
                    id: v.id, name: v.name, config: structuredClone(v.config), officialId: v.officialId, cut: cut(s, v.config, currentOfficial(s, v))
                })), observations: [], planIds: []
            });
        }
    }
    else /*
     * OPERACIÓN: Registrar rechazo. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'reject') {
        ensure(r.status === 'COTIZACION_FIRME', 'Solo se rechaza una cotización firme.');
        ensure([
            'Precio', 'Plazo', 'Otro proveedor', 'Proyecto cancelado'
        ].includes(p.reason), 'Selecciona el motivo.');
        r.status = 'RECHAZADA';
        r.lossReason = p.reason;
    }
    else /*
     * OPERACIÓN: Registrar pago manual sin duplicar referencia. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'payment') {
        const amount = number(p.amount, 1, o.total), paid = s.payments.filter(x => x.orderId === o.id && x.reconciled).reduce((a, x) => a + x.amount, 0);
        ensure(amount + paid <= o.total, 'El pago supera el saldo pendiente.');
        ensure(p.reference?.trim(), 'Ingresa referencia de transferencia o comprobante.');
        ensure(!s.payments.some(x => x.reference === p.reference), 'Referencia ya registrada.');
        s.payments.push({
            id: uuid(), orderId: o.id, at, amount, reference: p.reference, method: p.method || 'Transferencia', reconciled: true, actor: actor.email
        });
        o.advance = paid + amount;
        if (o.state === 'CREADA' && o.advance >= Math.ceil(o.total * s.settings.advance / 100))
            o.state = 'ANTICIPO_OK';
    }
    else /*
     * OPERACIÓN: Calcular planes para órdenes con anticipo. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'plan') {
        let orders = s.orders.filter(o => p.orderIds.includes(o.id));
        ensure(orders.length > 0 && orders.every(o => o.state === 'ANTICIPO_OK'), 'Planifica órdenes con anticipo registrado.');
        const plans = makePlans(s, orders);
        s.plans.push(...plans);
        for (const o of orders)
            o.planIds = plans.filter(x => x.orderIds.includes(o.id)).map(x => x.id);
        result = {
            planIds: plans.map(x => x.id)
        };
    }
    else /*
     * OPERACIÓN: Reservar materiales y aprobar despiece. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'approve') {
        ensure(o.state === 'ANTICIPO_OK', 'Se requiere anticipo confirmado.');
        ensure(o.planIds.length, 'Genera el plan de corte antes de aprobar.');
        let plans = o.planIds.map(id => s.plans.find(p => p.id === id));
        for (const plan of plans) {
            ensure(plan, 'Plan inexistente.');
            for (const layout of plan.layouts) {
                if (layout.retalId) {
                    let ret = s.retals.find(x => x.id === layout.retalId);
                    ensure(ret && !ret.used && (!ret.reserved || ret.reserved === plan.id), 'Retal reservado por otra orden.');
                    ret.reserved = plan.id;
                }
            }
            let needed = plan.layouts.filter(l => !l.retalId).length;
            let st = s.stock.find(x => x.material === plan.material && x.kind === plan.kind);
            ensure(st, 'No existe inventario para ' + plan.material);
            st.reservations ??= [];
            if (st.reservations.some(x => x.planId === plan.id))
                continue;
            ensure(st.qty - st.reservations.reduce((a, x) => a + x.qty, 0) >= needed, 'Stock insuficiente para ' + st.name);
            st.reservations.push({
                orderId: o.id, planId: plan.id, qty: needed
            });
        }
        o.state = 'DESPIECE_APROBADO';
        o.approvedBy = actor.email;
        o.approvedAt = at;
    }
    else /*
     * OPERACIÓN: Validar avance productivo y consumir reservas al entrar a corte. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'advance') {
        let i = steps.indexOf(o.state);
        ensure(i >= 2 && i < 7, 'Usa el formulario de instalación o recepción para esta etapa.');
        ensure(o.advance >= Math.ceil(o.total * s.settings.advance / 100), 'Anticipo insuficiente.');
        if (i === 5) {
            ensure(s.settings.qc.every(k => p.qc?.includes(k)), 'Completa todos los puntos del control de calidad.');
            o.quality = {
                at, checks: p.qc, actor: actor.email
            };
        }
        if (i === 6)
            ensure(p.fragility === true, 'Confirma protección y manipulación del vidrio.');
        o.state = steps[i + 1];
        if (i === 2) {
            ensure(o.planIds.every(id => s.plans.find(p => p.id === id).orderIds.every(oid => [
                'DESPIECE_APROBADO', 'EN_CORTE'
            ].includes(s.orders.find(x => x.id === oid).state))), 'Aprueba todos los despieces del lote antes de liberar el material.');
            for (const id of o.planIds) {
                const plan = s.plans.find(p => p.id === id);
                if (plan.consumed)
                    continue;
                for (let st of s.stock) {
                    let reservations = (st.reservations || []).filter(x => x.planId === id);
                    st.qty -= reservations.reduce((a, x) => a + x.qty, 0);
                    st.reservations = (st.reservations || []).filter(x => x.planId !== id);
                }
                for (let b of plan.layouts) {
                    if (b.retalId)
                        s.retals.find(x => x.id === b.retalId).used = true;
                    let remains = plan.kind === 'glass' ? emptyRects(b.root) : [
                        {
                            w: b.remaining, h: 0
                        }
                    ];
                    for (let rem of remains)
                        if (rem.w >= s.settings.retalMin && (plan.kind !== 'glass' || rem.h >= s.settings.retalMin))
                            s.retals.push({
                                id: uuid(), kind: plan.kind, material: plan.material, w: rem.w, h: rem.h, origin: o.id, location: 'Retales', at, used: false
                            });
                }
                plan.consumed = true;
                plan.consumedAt = at;
            }
        }
    }
    else /*
     * OPERACIÓN: Registrar estación y lote de una pieza. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'piece') {
        let piece = o.vanos.flatMap(v => v.cut.pieces).find(x => x.id === p.id);
        ensure(piece, 'Etiqueta no corresponde a esta OT.');
        ensure([
            'EN_CORTE', 'EN_ARMADO', 'CONTROL_CALIDAD'
        ].includes(o.state), 'La OT no está en estación de fabricación.');
        piece.state = o.state;
        piece.scannedAt = at;
        piece.actor = actor.email;
        piece.lot = String(p.lot || 'Lote ' + o.code);
    }
    else /*
     * OPERACIÓN: Registrar merma. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'waste') {
        ensure(p.cause && p.material, 'Registra material y causa de merma.');
        s.waste.push({
            id: uuid(), orderId: o.id, cause: p.cause, material: p.material, qty: number(p.qty, 1), cost: number(p.cost, 0), at, actor: actor.email
        });
    }
    else /*
     * OPERACIÓN: Documentar instalación por vano. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'install') {
        ensure(o.state === 'DESPACHADA', 'Primero despacha la OT.');
        ensure(p.vanos?.length === o.vanos.length, 'Faltan vanos.');
        for (let v of o.vanos) {
            let x = p.vanos.find(x => x.id === v.id);
            ensure(x, 'Vano no documentado.');
            photos([
                x.before, x.after
            ], 2);
        }
        o.installation = {
            at, actor: actor.email, vanos: p.vanos
        };
        o.state = 'INSTALADA';
    }
    else /*
     * OPERACIÓN: Abrir observación de instalación. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'observation') {
        ensure(o.state === 'INSTALADA', 'Observaciones disponibles después de instalar.');
        ensure(p.text?.trim() && p.owner?.trim() && p.due, 'Indica observación, responsable y plazo.');
        o.observations.push({
            id: uuid(), text: p.text, owner: p.owner, due: p.due, status: 'Abierta', at
        });
    }
    else /*
     * OPERACIÓN: Resolver observación. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'resolve') {
        let obs = o.observations.find(x => x.id === p.id);
        ensure(obs, 'Observación no encontrada.');
        obs.status = 'Resuelta';
        obs.resolvedAt = at;
        obs.resolvedBy = actor.email;
    }
    else /*
     * OPERACIÓN: Firmar recepción conforme. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'receipt') {
        ensure(o.state === 'INSTALADA', 'La OT debe estar instalada.');
        ensure(o.observations.every(x => x.status === 'Resuelta'), 'Hay observaciones abiertas.');
        signature(p.signature);
        o.receipt = {
            at, signature: p.signature, actor: actor.email, ip: actor.ip, hash: await digest({
                orderId: o.id, vanos: o.installation, observations: o.observations
            })
        };
        o.state = 'RECEPCIONADA';
    }
    else /*
     * OPERACIÓN: Cerrar orden y calcular vigencias de garantía. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'close') {
        ensure(o.state === 'RECEPCIONADA' && o.receipt, 'Falta recepción conforme.');
        ensure(o.observations.every(x => x.status === 'Resuelta'), 'Hay observaciones abiertas.');
        o.state = 'CERRADA';
        o.warranty = Object.entries(s.settings.warranty).map(([component, months]) => {
            let d = new Date();
            d.setUTCMonth(d.getUTCMonth() + number(months, 1, 120));
            return {
                component, expires: d.toISOString()
            };
        });
        o.closedAt = at;
        o.balanceDocument = {
            at, amount: o.total - Math.ceil(o.total * s.settings.advance / 100), type: 'Saldo comercial · no DTE'
        };
        s.requests.find(r => r.id === o.requestId).status = 'CERRADA';
    }
    else /*
     * OPERACIÓN: Ajustar existencias sin consumir reservas ajenas. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'stock') {
        let x = s.stock.find(x => x.id === p.id);
        ensure(x, 'Material inexistente.');
        const amount = number(p.qty, -1e5, 1e5);
        ensure(amount !== 0 && p.reason, 'Cantidad y motivo obligatorios.');
        ensure(x.qty + amount >= (x.reservations || []).reduce((a, x) => a + x.qty, 0), 'El movimiento afecta material reservado.');
        x.qty += amount;
        s.movements.push({
            id: uuid(), materialId: x.id, qty: amount, reason: p.reason, at, actor: actor.email
        });
    }
    else /*
     * OPERACIÓN: Crear orden de compra. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'purchase') {
        ensure(p.supplier?.trim(), 'Indica proveedor.');
        ensure(s.stock.some(x => x.id === p.materialId), 'Material inexistente.');
        s.purchases.push({
            id: uuid(), code: 'OC-' + (s.purchases.length + 1), supplier: p.supplier, materialId: p.materialId, qty: number(p.qty, 1, 10000), unitCost: number(p.unitCost, 1), received: 0, at, status: 'Emitida'
        });
    }
    else /*
     * OPERACIÓN: Ingresar recepción de materiales. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'receive') {
        let po = s.purchases.find(x => x.id === p.id);
        ensure(po && po.status !== 'Recibida', 'Orden de compra no disponible.');
        const qty = number(p.qty, 1, po.qty - po.received), st = s.stock.find(x => x.id === po.materialId);
        po.received += qty;
        po.status = po.received === po.qty ? 'Recibida' : 'Parcial';
        st.qty += qty;
        st.unitCost = po.unitCost;
        s.movements.push({
            id: uuid(), materialId: st.id, qty, reason: 'Recepción ' + po.code, at, actor: actor.email
        });
        if (p.updatePrice) {
            let item = (st.kind === 'glass' ? s.catalog.glass : s.catalog.lines).find(x => st.material === x.id || st.material.startsWith(x.id + '-'));
            if (item)
                item.price = st.kind === 'glass' ? po.unitCost / (3.21 * 2.25) : po.unitCost / 6;
        }
    }
    else /*
     * OPERACIÓN: Crear reclamo de garantía. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'claim') {
        ensure(o.state === 'CERRADA', 'La garantía se activa al cerrar la OT.');
        ensure(p.cause && p.text, 'Indica causa y descripción.');
        let w = o.warranty.find(x => x.component === p.component);
        s.claims.push({
            id: uuid(), orderId: o.id, component: p.component, cause: p.cause, text: p.text, covered: !!w && Date.parse(w.expires) >= Date.now(), at, status: 'Abierto', cost: 0
        });
    }
    else /*
     * OPERACIÓN: Actualizar atención del reclamo. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'service') {
        let c = s.claims.find(x => x.id === p.id);
        ensure(c, 'Reclamo inexistente.');
        c.status = p.status;
        c.cost = number(p.cost, 0);
        c.resolution = p.resolution;
        c.updatedAt = at;
    }
    else /*
     * OPERACIÓN: Validar parámetros de prueba. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'settings') {
        ensure(p.settings, 'Parámetros inválidos.');
        for (const [k, min, max] of [
            [
                'band', 1, 50
            ], [
                'margin', 1, 80
            ], [
                'quoteDays', 1, 90
            ], [
                'actDays', 1, 90
            ], [
                'advance', 1, 100
            ], [
                'kerf', 0, 20
            ], [
                'edge', 0, 100
            ], [
                'retalMin', 10, 2000
            ], [
                'leadDays', 0, 60
            ], [
                'capacity', 1, 1000
            ], [
                'uf', 0, 1e6
            ]
        ])
            number(p.settings[k], min, max);
        ensure(p.settings.qc?.length, 'El control de calidad no puede quedar vacío.');
        ensure(p.settings.productionValidated === false, 'El catálogo industrial requiere validación externa documentada antes de habilitar producción real.');
        s.settings = p.settings;
    }
    else /*
     * OPERACIÓN: Validar edición de catálogo. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'catalog') {
        ensure(p.catalog?.lines?.length && p.catalog?.glass?.length && p.catalog?.hardware?.length, 'Catálogo incompleto.');
        for (const l of p.catalog.lines) {
            number(l.price, 1);
            number(l.gap, 0, 30);
            number(l.glassDeduction, 0, 300);
            number(l.maxArea, .1, 20);
            number(l.margin, 1, 80);
            ensure(l.types.every(t => types.includes(t)) && l.colors.length, 'Tipologías o colores inválidos.');
        }
        for (let g of p.catalog.glass) {
            number(g.thickness, 1, 50);
            number(g.price, 1);
        }
        for (let h of p.catalog.hardware) {
            number(h.capacity, 1, 500);
            number(h.price, 0);
        }
        ensure(p.catalog.rules.length === types.length, 'Deben existir reglas para todas las tipologías.');
        for (let rr of p.catalog.rules) {
            number(rr.minW, 1);
            number(rr.maxW, rr.minW, 12000);
            number(rr.minH, 1);
            number(rr.maxH, rr.minH, 12000);
            number(rr.hours, .1, 48);
            number(rr.maxSlender, 1, 20);
        }
        s.catalog = p.catalog;
    }
    else /*
     * OPERACIÓN: Validar cuadrillas y horarios. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'teams') {
        ensure(p.teams?.length, 'Registra al menos una cuadrilla.');
        for (const t of p.teams) {
            number(t.start, 0, 23);
            number(t.end, t.start + 1, 24);
            ensure(t.skills.length && t.zones.length && t.days.length, 'Completa competencias, comunas y días.');
        }
        s.teams = p.teams;
    }
    else /*
     * OPERACIÓN: Asignar rol interno a un miembro. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'member') {
        ensure(roles.includes(p.role) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email), 'Email o rol inválido.');
        ensure(p.email.toLowerCase() !== actor.email, 'No puedes cambiar tu propio rol.');
        let m = s.members.find(x => x.email === p.email.toLowerCase());
        if (m)
            m.role = p.role;
        else
            s.members.push({
                email: p.email.toLowerCase(), role: p.role, branch: p.branch || 'Principal'
            });
    }
    else /*
     * OPERACIÓN: Marcar revisión de conflicto. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'resolveConflict') {
        let c = s.conflicts.find(x => x.id === p.id);
        ensure(c, 'Conflicto inexistente.');
        c.status = 'Revisado';
        c.resolution = p.resolution || 'Revisar y volver a enviar el levantamiento desde terreno.';
    }
    else /*
     * OPERACIÓN: Cargar casos ficticios una sola vez. Las condiciones ensure impiden continuar cuando falta un antecedente.
     */
    if (action === 'seed') {
        ensure(!s.requests.some(r => r.demo), 'Los datos de prueba ya están cargados.');
        seed(s, actor);
    }
    else
        throw Error('Acción no reconocida.');
    if (r && r.history?.at(-1)?.status !== r.status)
        r.history.push({
            at, status: r.status
        });
    if (o) {
        o.history ??= [];
        if (o.history.at(-1)?.state !== o.state)
            o.history.push({
                at, state: o.state
            });
    }
    return result;
}
/*
 * Carga cinco casos ficticios, inventario y retales para explorar el sistema. Las firmas e imágenes demo no constituyen evidencias reales.
 * Parámetros: s, actor.
 */
export function seed(s, actor) {
    let photo = '/assets/demo-vano.svg';
    if (!s.stock.length) {
        for (let g of s.catalog.glass)
            s.stock.push({
                id: uuid(), kind: 'glass', material: g.id, name: g.name + ' · 3210 × 2250 mm', qty: 20, min: 4, unitCost: g.price * 3.21 * 2.25, reservations: []
            });
        for (let l of s.catalog.lines)
            for (let c of l.colors)
                s.stock.push({
                    id: uuid(), kind: 'profile', material: l.id + '-' + c, name: l.material + ' ' + c + ' · 6000 mm', qty: 60, min: 12, unitCost: l.price * 6, reservations: []
                });
        s.stock.push({
            id: uuid(), kind: 'hardware', material: 'standard', name: 'Herraje estándar', qty: 30, min: 8, unitCost: 18000, reservations: []
        }, {
            id: uuid(), kind: 'consumable', material: 'seal', name: 'Sellador neutro', qty: 40, min: 10, unitCost: 4500, reservations: []
        });
    }
    for (let i = 0; i < 5; i++) {
        let rid = uuid(), vid = uuid(), eid = uuid(), oid = uuid(), c = {
            type: i === 3 ? 'Fija' : 'Corredera', line: i % 2 ? 'pvc' : 'alu', color: 'Blanco', glass: i === 2 ? 'lam' : 'mono', hardware: 'standard', leaves: i === 3 ? 1 : 2, sill: 1000, workHeight: 1800, intervention: 'Retiro completo', comuna: 'San Fernando', safetyZone: false
        };
        let e = {
            id: eid, vanoId: vid, w: [
                1500 + i * 40, 1498 + i * 40, 1502 + i * 40
            ], h: [
                1200, 1202, 1201
            ], at: now(), photos: [
                photo
            ], tapeConfirmed: true, confirmed: false, source: 'Cliente', demo: true
        };
        s.estimated[eid] = e;
        let r = {
            id: rid, code: 'SOL-' + String(s.requests.length + 1).padStart(4, '0'), client: [
                'Carolina Soto', 'Familia Rojas', 'Paula Díaz', 'Local El Roble', 'Andrés Vera'
            ][i] + ' · ejemplo', phone: '+56 9 0000 0000', address: 'Dirección ficticia ' + (100 + i), comuna: 'San Fernando', region: 'O’Higgins', channel: 'Portal', branch: 'Principal', owner: actor.email, status: i ? 'VISITA_REALIZADA' : 'ESTIMACION_ENVIADA', vanos: [
                {
                    id: vid, name: 'Living', config: c, estimatedId: eid
                }
            ], at: now(), demo: true, history: [
                {
                    at: now(), status: 'ESTIMACION_ENVIADA'
                }
            ], notes: []
        };
        let cost = price(s, c, e);
        r.range = {
            min: cost.min, max: cost.max
        };
        s.requests.push(r);
        if (i > 0) {
            s.official[oid] = {
                id: oid, vanoId: vid, w: [
                    1490 + i * 40, 1488 + i * 40, 1492 + i * 40
                ], h: [
                    1190, 1192, 1191
                ], d1: 1910, d2: 1918, at: now(), technician: 'Técnico de prueba', instrument: 'Huincha · manual', wall: 'Albañilería', level: 'Correcto', access: 'Normal', sillCondition: 'Bueno', lintelCondition: 'Bueno', jambCondition: 'Bueno', finish: true, signed: true, signature: photo, photos: [
                    photo, photo + '?2', photo + '?3'
                ], demo: true
            };
            r.vanos[0].officialId = oid;
            let q = createQuote(s, r, 0);
            if (i > 1) {
                r.status = 'ACEPTADA';
                r.acceptance = {
                    at: now(), actor: 'Cliente ficticio', signature: photo, quoteId: q.id, hash: 'DEMO'
                };
                let order = {
                    id: uuid(), code: 'OT-' + String(s.orders.length + 1).padStart(4, '0'), requestId: rid, quoteId: q.id, total: q.total, advance: Math.ceil(q.total / 2), state: i === 4 ? 'INSTALADA' : 'ANTICIPO_OK', at: now(), history: [], vanos: [
                        {
                            id: vid, name: 'Living', config: c, officialId: oid, cut: cut(s, c, s.official[oid])
                        }
                    ], observations: i === 4 ? [
                        {
                            id: uuid(), text: 'Regular cierre · ejemplo', owner: 'Cuadrilla instalación', due: new Date(Date.now() + 864e5).toISOString().slice(0, 10), status: 'Abierta', at: now()
                        }
                    ] : [], planIds: [], demo: true
                };
                if (i === 4)
                    order.installation = {
                        at: now(), vanos: [
                            {
                                id: vid, before: photo, after: photo
                            }
                        ]
                    };
                s.orders.push(order);
                s.payments.push({
                    id: uuid(), orderId: order.id, amount: order.advance, at: now(), reference: 'DEMO-' + order.id, method: 'Transferencia ficticia', reconciled: true
                });
            }
        }
    }
    s.retals.push({
        id: uuid(), material: 'mono', kind: 'glass', w: 1600, h: 1300, location: 'R-01', origin: 'Inventario de prueba', used: false
    }, {
        id: uuid(), material: 'alu-Blanco', kind: 'profile', w: 2800, h: 0, location: 'R-02', origin: 'Inventario de prueba', used: false
    });
}
