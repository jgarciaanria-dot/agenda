const Sheets = {
  async initSheet() {
    // El Apps Script maneja la inicialización
  },

  async guardarCita(cita) {
    try {
      await fetch(CONFIG.sheets.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(cita),
        mode: 'no-cors'
      });
    } catch (e) {
      console.error('Error guardando cita:', e);
    }
  },

  async getHorasOcupadas(fecha) {
    try {
      const url = CONFIG.sheets.scriptUrl + '?horas=1&fecha=' + encodeURIComponent(fecha);
      const res = await fetch(url);
      const data = await res.json();
      // Devuelve array de {hora, duracion} para calcular traslapes
      return data.citas || [];
    } catch (e) {
      console.error('Error consultando horas:', e);
      return [];
    }
  }
};

/*
=== GOOGLE APPS SCRIPT (pegar en script.google.com) ===

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById('1p8NxajPAoxiaQnsomWNo-8P8aL_FwNjBCWT8YXz1G7c');
    var sheet = ss.getSheetByName('Citas') || ss.insertSheet('Citas');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Fecha Registro','Nombre','WhatsApp','Correo','Servicio','Categoría',
        'Precio Total','Fecha Cita','Hora','Duración (min)','Comprobante','Nota','Estado']);
    }

    sheet.appendRow([
      new Date().toLocaleString('es-PA'),
      data.nombre, data.telefono, data.correo || '',
      data.servicio, data.categoria || '',
      data.precioTotal, data.fecha, data.hora,
      data.duracionMin || 60,
      data.comprobante || 'Sin abono',
      data.nota || '', 'Confirmada'
    ]);

    // Crear evento en Google Calendar
    crearEvento(data);

    // Enviar correos
    enviarCorreoAdmin(data);
    if (data.correo) enviarCorreoCliente(data);

    return ContentService.createTextOutput(JSON.stringify({ok:true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (e.parameter.horas) {
    var fecha = e.parameter.fecha;
    var ss = SpreadsheetApp.openById('1p8NxajPAoxiaQnsomWNo-8P8aL_FwNjBCWT8YXz1G7c');
    var sheet = ss.getSheetByName('Citas');
    var citas = [];

    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][7] === fecha && data[i][12] !== 'Cancelada') {
          citas.push({ hora: data[i][8], duracion: data[i][9] || 60 });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({citas:citas}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function crearEvento(data) {
  var cal = CalendarApp.getDefaultCalendar();
  var partes = data.fecha.split(' de ');
  var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var dia = parseInt(partes[0]);
  var mes = meses.indexOf(partes[1]);
  var anio = parseInt(partes[2]);
  var hPartes = data.hora.split(':');
  var inicio = new Date(anio, mes, dia, parseInt(hPartes[0]), parseInt(hPartes[1]));
  var fin = new Date(inicio.getTime() + (data.duracionMin||60)*60000);

  cal.createEvent('💇 ' + data.servicio + ' — ' + data.nombre, inicio, fin, {
    description: 'Cliente: ' + data.nombre + '\nWhatsApp: ' + data.telefono +
      '\nServicio: ' + data.servicio + '\nPrecio: $' + data.precioTotal +
      (data.comprobante ? '\nComprobante: ' + data.comprobante : '') +
      (data.nota ? '\nNota: ' + data.nota : ''),
    sendInvites: false
  });
}

function enviarCorreoAdmin(data) {
  var asunto = '💇 Nueva cita — ' + data.servicio;
  var cuerpo = 'Nueva cita agendada en Vicelly Hair & Beauty\n\n' +
    'Nombre: ' + data.nombre + '\n' +
    'WhatsApp: ' + data.telefono + '\n' +
    'Correo: ' + (data.correo||'—') + '\n' +
    'Servicio: ' + data.servicio + '\n' +
    'Fecha: ' + data.fecha + ' · ' + data.hora + '\n' +
    'Duración: ' + (data.duracionMin||60) + ' min\n' +
    'Precio total: $' + data.precioTotal + '\n' +
    (data.comprobante && data.comprobante !== 'Sin abono' ? 'Comprobante abono: ' + data.comprobante + '\n' : '') +
    (data.nota ? 'Nota: ' + data.nota + '\n' : '') +
    '\nPolítica de cancelación: 24 horas de anticipación.';
  GmailApp.sendEmail('vicellysanchezstudio@gmail.com', asunto, cuerpo);
}

function enviarCorreoCliente(data) {
  var asunto = 'Tu cita está confirmada — Vicelly Hair & Beauty ✨';
  var cuerpo = 'Hola ' + data.nombre + ',\n\n' +
    'Tu cita ha sido confirmada. ¡Te esperamos!\n\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    'Servicio: ' + data.servicio + '\n' +
    'Fecha: ' + data.fecha + '\n' +
    'Hora: ' + data.hora + '\n' +
    'Duración aprox.: ' + (data.duracionMin||60) + ' min\n' +
    'Precio total: $' + data.precioTotal + '\n' +
    (data.comprobante && data.comprobante !== 'Sin abono' ?
      'Abono pagado: $10.00 (descontable del servicio)\n' : '') +
    '━━━━━━━━━━━━━━━━━━\n\n' +
    'Ubicación: Obarrio · Salón Plaza · Suite 113\n' +
    'Horario: Lun–Vie 8AM–4PM · Sáb 8AM–4PM\n\n' +
    '⚠️ Política de cancelación: debes cancelar con al menos 24 horas de anticipación.\n\n' +
    'Para cambios o consultas escríbenos por WhatsApp: +507 6522-4575\n\n' +
    'Con cariño,\nVicelly Sánchez Studio Hair & Beauty 💇';
  GmailApp.sendEmail(data.correo, asunto, cuerpo);
}
*/
