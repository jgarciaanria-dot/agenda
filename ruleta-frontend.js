/* ============================================================
   RULETA - FRONTEND
   Usa CONFIG.sheets.scriptUrl (definido en config.js) —
   mismo deployment que usan guardarCita, getServicios, etc.
   ============================================================ */

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
  const wheel = document.getElementById('wheelSvg');
  const btnGirar = document.getElementById('ruletaSpinBtn');
  const subtitle = document.getElementById('ruletaSubtitle');
  const resultCard = document.getElementById('ruletaResultCard');

  // Reinicia el estado por si el modal ya se usó antes en esta misma sesión
  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';
  void wheel.offsetWidth; // fuerza reflow para que la próxima transición sí anime
  wheel.style.transition = 'transform 5.5s cubic-bezier(0.12, 0.85, 0.15, 1)';

  btnGirar.style.pointerEvents = 'auto';
  subtitle.textContent = 'Una sola oportunidad por cliente';
  resultCard.style.opacity = '0';
  resultCard.style.transform = 'scale(.9)';

  modal.classList.add('activo');
  btnGirar.onclick = () => girarRuletaUI(identificador, nombre, citaId);
}

// Debe coincidir EXACTAMENTE (texto "premio") con las filas de RuletaConfig.
// 6 segmentos de 60° c/u, en el mismo orden que la hoja.
const RULETA_SEGMENTOS = [
  { id: 'seg1', premio: '20% dto próxima visita',     angle: 30  },
  { id: 'seg2', premio: '15% dto próxima visita',     angle: 90  },
  { id: 'seg3', premio: '10% dto próxima visita',     angle: 150 },
  { id: 'seg4', premio: 'Premio doble (2 servicios)', angle: 210 },
  { id: 'seg5', premio: 'Sigue jugando',              angle: 270 },
  { id: 'seg6', premio: 'Gracias por participar',     angle: 330 }
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

  const seg = RULETA_SEGMENTOS.find(s => s.premio === resultado.premio);
  if (!seg) {
    console.error('Premio devuelto por el backend no coincide con ningún segmento del SVG:', resultado.premio, '— revisa RuletaConfig vs RULETA_SEGMENTOS');
  }
  const segFinal = seg || RULETA_SEGMENTOS[0];

  const finalAngle = 3600 + (360 - segFinal.angle) - 8;
  wheel.style.transform = 'rotate(' + finalAngle + 'deg)';

  setTimeout(() => {
    subtitle.textContent = '¡Felicidades!';
    resaltarSegmentoGanador(segFinal.id);
    lanzarConfetti();
    mostrarResultadoRuleta(resultado);
  }, 5500);
}

function resaltarSegmentoGanador(segId) {
  const el = document.getElementById(segId);
  if (!el) return;
  el.style.transition = 'filter 0.4s ease';
  el.style.filter = 'drop-shadow(0 0 10px #F0DDAE) brightness(1.4)';
  setTimeout(() => { el.style.filter = 'none'; }, 1600);
}

function lanzarConfetti() {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;
  const colors = ['#FFD700', '#FFC933', '#FFE9A8', '#F5B942'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    const size = 6 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.position = 'absolute';
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.background = color;
    p.style.left = (5 + Math.random() * 90) + '%';
    p.style.top = '-14px';
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    p.style.opacity = '1';
    p.style.boxShadow = '0 0 6px ' + color + ', 0 0 12px rgba(255,215,0,0.6)';
    p.style.transition = 'transform 2.4s cubic-bezier(0.25,0.46,0.45,0.94), opacity 2.4s ease';
    layer.appendChild(p);
    requestAnimationFrame(() => {
      const fall = 420 + Math.random() * 160;
      const drift = (Math.random() - 0.5) * 110;
      const rot = Math.random() * 640;
      p.style.transform = 'translate(' + drift + 'px,' + fall + 'px) rotate(' + rot + 'deg)';
      p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 2600);
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
