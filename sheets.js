const Sheets = {
  async initSheet() {},

  async guardarCita(cita) {
    try {
      const params = new URLSearchParams({
        action: 'guardar',
        nombre: cita.nombre || '',
        telefono: cita.telefono || '',
        correo: cita.correo || '',
        servicio: cita.servicio || '',
        categoria: cita.categoria || '',
        precioTotal: cita.precioTotal || 0,
        fecha: cita.fecha || '',
        hora: cita.hora || '',
        duracionMin: cita.duracionMin || 60,
        comprobante: cita.comprobante || 'Sin abono',
        nota: cita.nota || '',
        abonoMonto: cita.abonoMonto || 0,
        abonoTipo: cita.abonoTipo || ''
      });
      const url = CONFIG.sheets.scriptUrl + '?' + params.toString();
      await fetch(url, { mode: 'no-cors' });
    } catch (e) {
      console.error('Error guardando cita:', e);
    }
  },

  async getHorasOcupadas(fecha) {
    try {
      const url = CONFIG.sheets.scriptUrl + '?action=horas&fecha=' + encodeURIComponent(fecha);
      const res = await fetch(url);
      const data = await res.json();
      return data.citas || [];
    } catch (e) {
      console.error('Error consultando horas:', e);
      return [];
    }
  },

  async getServicios() {
    try {
      const url = CONFIG.sheets.scriptUrl + '?action=getServicios';
      const res = await fetch(url);
      const data = await res.json();
      return data.servicios || [];
    } catch (e) {
      console.error('Error cargando servicios:', e);
      return [];
    }
  },

  async guardarServicios(servicios) {
    try {
      await fetch(CONFIG.sheets.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'guardarServicios', servicios: JSON.stringify(servicios)})
      });
    } catch (e) {
      console.error('Error guardando servicios:', e);
    }
  }
};
