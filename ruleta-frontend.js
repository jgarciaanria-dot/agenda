/* ============================================================
   RULETA - FRONTEND
   Usa CONFIG.sheets.scriptUrl (definido en config.js) —
   mismo deployment que usan guardarCita, getServicios, etc.
   ============================================================ */

/**
 * Llamar esto justo después de que guardarCita() confirme éxito.
 */
async function intentarMostrarRuleta(identificador, nombre, citaId) {
  try {
    const check = await Sheets.verificarElegibilidadRuleta(identificador);
    if (!check.elegible) {
      console.log('Ruleta no disponible:', check.motivo);
      return;
    }
    abrirModalRuleta(identificador, nombre, citaId);
  } catch (err) {
    console.error('Error verificando elegibilidad de ruleta:', err);
  }
}

function abrirModalRuleta(identificador, nombre, citaId) {
  const modal = document.getElementById('ruletaModal');
  modal.classList.add('activo');

  const btnGirar = document.getElementById('ruletaSpinBtn');
  btnGirar.onclick = () => girarRuletaUI(identificador, nombre, citaId);
}

// Mapea cada premio (tal como está en RuletaConfig) al id del segmento SVG y su ángulo central
const RULETA_SEGMENTOS = [
  { premio: '20% dto próxima visita',        id: 'segTop',    angle: 0   },
  { premio: '10% dto próxima visita',        id: 'segRight',  angle: 90  },
  { premio: 'Premio doble (2 servicios)',    id: 'segBottom', angle: 180 },
  { premio: '15% dto próxima visita',        id: 'segLeft',   angle: 270 }
  // ajustar/agregar filas aquí si cambian los premios en RuletaConfig
];

async function girarRuletaUI(identificador, nombre, citaId) {
  const btnGirar = document.getElementById('ruletaSpinBtn');
  const subtitle = document.getElementById('ruletaSubtitle');
  const wheel = document.getElementById('wheelSvg');

  btnGirar.style.pointerEvents = 'none';
  subtitle.textContent = 'Girando...';

  const resultado = await Sheets.girarRuleta(identificador, nombre, citaId);

  if (!resultado.ok) {
    subtitle.textContent = 'No se pudo completar el giro. Intenta más tarde.';
    btnGirar.style.pointerEvents = 'auto';
    return;
  }

  const seg = RULETA_SEGMENTOS.find(s => s.premio === resultado.premio) || RULETA_SEGMENTOS[0];

  // Más vueltas para que se sienta más "jugado" (10 vueltas completas + ajuste al segmento ganador)
  const finalAngle = 3600 + (360 - seg.angle) - 8;
  wheel.style.transform = 'rotate(' + finalAngle + 'deg)';

  setTimeout(() => {
    subtitle.textContent = '¡Felicidades!';
    resaltarSegmentoGanador(seg.id);
    lanzarConfetti();
    mostrarResultadoRuleta(resultado);
  }, 5500);
}

function resaltarSegmentoGanador(segId) {
  const el = document.getElementById(segId);
  if (!el) return;
  el.style.transition = 'filter 0.4s ease';
  el.style.filter = 'drop-shadow(0 0 8px #E3C077) brightness(1.4)';
  setTimeout(() => { el.style.filter = 'none'; }, 1400);
}

function lanzarConfetti() {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;
  const colors = ['#E3C077', '#C9A24B', '#F5F1E6'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    const size = 5 + Math.random() * 4;
    p.style.position = 'absolute';
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = (10 + Math.random() * 80) + '%';
    p.style.top = '-10px';
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    p.style.opacity = '0.95';
    p.style.transition = 'transform 1.8s cubic-bezier(0.25,0.46,0.45,0.94), opacity 1.8s ease';
    layer.appendChild(p);
    requestAnimationFrame(() => {
      const fall = 380 + Math.random() * 100;
      const drift = (Math.random() - 0.5) * 80;
      const rot = Math.random() * 540;
      p.style.transform = 'translate(' + drift + 'px,' + fall + 'px) rotate(' + rot + 'deg)';
      p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 2000);
  }
}

function mostrarResultadoRuleta(resultado) {
  const resultCard = document.getElementById('ruletaResultCard');
  const resultText = document.getElementById('ruletaResultText');

  resultText.textContent = resultado.esPremioReal
    ? 'Ganaste: ' + resultado.premio + (resultado.codigoCanje ? ' — Código: ' + resultado.codigoCanje : '')
    : resultado.premio;

  resultCard.style.opacity = '1';
  resultCard.style.transform = 'scale(1)';
}
