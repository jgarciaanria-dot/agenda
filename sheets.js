const Sheets = {
  async initSheet() {},

  async guardarCita(cita) {
    try {
      // Enviamos como GET con datos en base64 — más confiable con Apps Script
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify(cita))));
      const url = CONFIG.sheets.scriptUrl + '?action=guardar&data=' + encodeURIComponent(payload);
      await fetch(url, { method: 'GET', mode: 'no-cors' });
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
  }
};
