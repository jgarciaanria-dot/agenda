// =========================================================
// sheets.js — Adaptador Supabase (reemplaza el backend de Apps Script)
// Mantiene los mismos nombres de función que usa index.html:
// Sheets.getServicios, Sheets.getBloqueos, Sheets.getHorasOcupadas,
// Sheets.guardarCita, Sheets.validarCupon, Sheets.marcarCuponCanjeado,
// Sheets.getPromo, Sheets.getRuletaConfig, Sheets.verificarElegibilidadRuleta,
// Sheets.initSheet
// =========================================================

// ⚠️ COMPLETA ESTOS 3 VALORES ANTES DE SUBIR A PRODUCCIÓN
const SUPABASE_URL = 'https://hokrimtsyseuqfjjvmxu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7JZShvbADW0URka-k_hjBQ_MSE0LM-V';
const BUSINESS_ID = 'ceae789b-3d46-4ab4-8a0d-f4e3615bc54e';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MESES_MAP = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

// Convierte "18 de Mayo 2026" -> "2026-05-18"
function parseFechaTexto(fechaStr) {
  const m = fechaStr.match(/(\d+)\s+de\s+(\w+)\s+(\d+)/i);
  if (!m) return null;
  const dia = parseInt(m[1]);
  const mesIdx = MESES_MAP[m[2].toLowerCase()];
  const anio = parseInt(m[3]);
  if (mesIdx === undefined) return null;
  return `${anio}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Convierte "08:00:00" (formato time de Postgres) -> "8:00" (formato que usa el sitio)
function formatHoraSitio(horaPg) {
  if (!horaPg) return '';
  const [h, m] = horaPg.split(':');
  return parseInt(h) + ':' + m;
}

const Sheets = {

  // No requiere inicialización especial con Supabase
  async initSheet() {
    return true;
  },

  // El catálogo de servicios sigue siendo el hardcodeado en index.html
  // (devolver arreglo vacío hace que el sitio use su fallback automático)
  async getServicios() {
    return [];
  },

  // Fechas y horas bloqueadas por el negocio
  async getBloqueos() {
    const { data: fechas, error: e1 } = await supabase
      .from('blocked_dates')
      .select('fecha')
      .eq('business_id', BUSINESS_ID);

    const { data: horas, error: e2 } = await supabase
      .from('blocked_hours')
      .select('fecha,hora')
      .eq('business_id', BUSINESS_ID);

    if (e1 || e2) {
      console.error('Error cargando bloqueos:', e1 || e2);
      return { dias: [], horas: {} };
    }

    const horasObj = {};
    (horas || []).forEach(h => {
      if (!horasObj[h.fecha]) horasObj[h.fecha] = [];
      horasObj[h.fecha].push(h.hora);
    });

    return {
      dias: (fechas || []).map(f => ({ fecha: f.fecha })),
      horas: horasObj
    };
  },

  // Citas ya reservadas para una fecha (para calcular disponibilidad)
  async getHorasOcupadas(fechaStr) {
    const fechaISO = parseFechaTexto(fechaStr);
    if (!fechaISO) return [];

    const { data, error } = await supabase
      .from('appointments')
      .select('hora, duracion_min')
      .eq('business_id', BUSINESS_ID)
      .eq('fecha', fechaISO)
      .neq('estado', 'cancelada');

    if (error) {
      console.error('Error consultando disponibilidad:', error);
      return [];
    }

    return (data || []).map(c => ({
      hora: formatHoraSitio(c.hora),
      duracion: c.duracion_min || 60
    }));
  },

  // Guardar una reserva nueva
  async guardarCita(cita) {
    const fechaISO = parseFechaTexto(cita.fecha);

    const { data, error } = await supabase.from('appointments').insert([{
      business_id: BUSINESS_ID,
      cliente_nombre: cita.nombre,
      cliente_telefono: cita.telefono,
      cliente_correo: cita.correo,
      nota: cita.nota,
      servicio_nombre: cita.servicio,
      categoria: cita.categoria,
      precio_total: cita.precioTotal,
      precio_es_consultar: cita.precioEsConsultar,
      fecha: fechaISO,
      hora: cita.hora,
      duracion_min: cita.duracionMin,
      comprobante: cita.comprobante,
      abono_monto: cita.abonoMonto,
      abono_tipo: cita.abonoTipo,
      metodo_pago: cita.metodoPago,
      cupon_aplicado: cita.cuponUsado,
      descuento_cupon: cita.descuentoCupon,
      precio_final: cita.precioFinal,
      cita_id_externo: cita.citaId,
      estado: 'confirmada'
    }]);

    if (error) {
      console.error('Error guardando la cita:', error);
      throw error;
    }
    return data;
  },

  // Ruleta: cargar los premios activos
  async getRuletaConfig() {
    const { data, error } = await supabase
      .from('roulette_prizes')
      .select('nombre, activo')
      .eq('business_id', BUSINESS_ID);

    if (error || !data) return { premios: [] };
    return { premios: data.map(p => ({ premio: p.nombre, activo: p.activo })) };
  },

  // Ruleta: ¿este teléfono ya participó, y está activa la ruleta?
  async verificarElegibilidadRuleta(tel) {
    const { data: yaParticipo } = await supabase
      .from('roulette_wins')
      .select('id')
      .eq('business_id', BUSINESS_ID)
      .eq('telefono', tel)
      .limit(1);

    if (yaParticipo && yaParticipo.length > 0) {
      return { elegible: false };
    }

    const { data: feat } = await supabase
      .from('business_features')
      .select('ruleta_premios')
      .eq('business_id', BUSINESS_ID)
      .single();

    return { elegible: !!(feat && feat.ruleta_premios) };
  },

  // --- FASE 2B (pendiente): promos y cupones ---
  // Por ahora quedan en modo seguro para no romper el sitio.
  async getPromo() {
    return null; // el banner de promo simplemente no aparece
  },

  async validarCupon(codigo) {
    return { valido: false, motivo: 'codigo_no_encontrado' };
  },

  async marcarCuponCanjeado(codigo) {
    return true;
  }
};
