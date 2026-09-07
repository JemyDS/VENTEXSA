/**
 * VENTEXA — COPIA DE ESTUDIO COMENTADA
 * DOCUMENTO COMERCIAL. Exporta la cotización como PDF desde una instantánea. No emite documentos tributarios electrónicos.
 * Los comentarios explican el comportamiento existente; no agregan funcionalidades.
 */
import { jsPDF } from 'jspdf';
/*
 * Genera el PDF de una instantánea de cotización; fija fecha e identificador para obtener un documento reproducible.
 * Parámetros: q.
 */
export function quotePDF(q) {
    let doc = new jsPDF();
    doc.setCreationDate(new Date(q.at));
    doc.setFileId(q.id.replaceAll('-', '').toUpperCase());
    doc.setProperties({
        title: 'Cotización ' + q.version, author: q.company.name, creator: 'Ventexa'
    });
    let y = 20;
    /*
     * Escribe texto con ajuste de línea y avance vertical en el PDF.
     * Parámetros: s, size.
     */
    function text(s, size = 11) {
        if (y > 265) {
            doc.addPage();
            y = 20;
        }
        doc.setFontSize(size);
        for (const line of doc.splitTextToSize(String(s || ''), 175)) {
            doc.text(line, 18, y);
            y += 6;
        }
    }
    const /*
     * Formatea un importe sin decimales para el PDF.
     */
    clp = n => new Intl.NumberFormat('es-CL', {
        maximumFractionDigits: 0
    }).format(n);
    text(q.company.name, 20);
    text('Cotización · versión ' + q.version, 15);
    text('RUT: ' + q.company.rut + ' · ' + q.company.address);
    y += 5;
    text(q.client.name, 14);
    text(q.client.address + ', ' + q.client.comuna);
    text('Fecha: ' + q.at.slice(0, 10) + ' · Vigencia hasta: ' + q.expires.slice(0, 10));
    y += 8;
    for (let l of q.lines) {
        text(l.name + ' · ' + l.config.type + ' · ' + l.measure.w + ' × ' + l.measure.h + ' mm', 13);
        text('Línea ' + l.config.line + ' · vidrio ' + l.config.glass + ' · color ' + l.config.color);
        text('Neto $' + clp(l.net) + ' · IVA $' + clp(l.iva) + ' · Total $' + clp(l.total));
        y += 5;
    }
    text('NETO $' + clp(q.net), 13);
    text('IVA 19% $' + clp(q.iva), 13);
    text('TOTAL $' + clp(q.total), 17);
    if (q.uf && q.ufDate === q.at.slice(0, 10))
        text('Equivalente UF ' + (q.total / q.uf).toFixed(3) + ' · valor manual del ' + q.ufDate);
    text('Anticipo ' + q.advance + '%. El saldo se documenta contra recepción conforme.');
    y += 8;
    text('Catálogo de prueba, pendiente de validación del fabricante. Este documento no es un DTE. Las integraciones tributarias y de pago no están habilitadas.');
    text('Condiciones incluidas: traslado, retiro y terminaciones según levantamiento; ajustes de escuadría si corresponden.');
    return doc.output('arraybuffer');
}
