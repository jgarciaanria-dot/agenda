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

  if (!wheel) {
    console.error('La rueda no se generó (sin premios activos o falló la carga de RuletaConfig).');
    return;
  }

  // Reinicia el estado por si el modal ya se usó antes en esta misma sesión
  wheel.classList.remove('spinning-fast');
  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';
  void wheel.offsetWidth; // fuerza reflow para que la próxima transición sí anime

  btnGirar.style.pointerEvents = 'auto';
  subtitle.textContent = 'Una sola oportunidad por cliente';
  resultCard.style.opacity = '0';
  resultCard.style.transform = 'scale(.9)';

  modal.classList.add('activo');
  btnGirar.onclick = () => girarRuletaUI(identificador, nombre, citaId);
}

// Los segmentos ahora se generan dinámicamente desde RuletaConfig
// (ver RULETA_SEGMENTOS_ACTIVOS y construirRuedaDinamica() en index.html)

async function girarRuletaUI(identificador, nombre, citaId) {
  const btnGirar = document.getElementById('ruletaSpinBtn');
  const subtitle = document.getElementById('ruletaSubtitle');
  const wheel = document.getElementById('wheelSvg');

  if (!wheel || !RULETA_SEGMENTOS_ACTIVOS || RULETA_SEGMENTOS_ACTIVOS.length === 0) {
    subtitle.textContent = 'La ruleta no está disponible en este momento.';
    return;
  }

  btnGirar.style.pointerEvents = 'none';
  subtitle.textContent = 'Girando...';

  // Empieza a girar YA, sin esperar al servidor, para que no se sienta el delay de red
  wheel.style.transition = 'none';
  wheel.classList.add('spinning-fast');

  const resultado = await Sheets.girarRuleta(identificador, nombre, citaId);

  if (!resultado.ok) {
    wheel.classList.remove('spinning-fast');
    wheel.style.transform = 'rotate(0deg)';
    subtitle.textContent = 'No se pudo completar el giro. Intenta más tarde.';
    btnGirar.style.pointerEvents = 'auto';
    return;
  }

  const seg = RULETA_SEGMENTOS_ACTIVOS.find(s => s.premio === resultado.premio);
  if (!seg) {
    console.error('Premio devuelto por el backend no coincide con ningún segmento activo:', resultado.premio, '— revisa que esté marcado como activo en RuletaConfig');
  }
  const segFinal = seg || RULETA_SEGMENTOS_ACTIVOS[0];

  // Congela el giro rápido justo donde va (sin salto) y continúa desde ahí hacia el premio
  const currentAngle = getCurrentRotationDeg(wheel);
  wheel.classList.remove('spinning-fast');
  wheel.style.transform = 'rotate(' + currentAngle + 'deg)';
  void wheel.offsetWidth; // fuerza reflow

  const desiredMod = ((90 - segFinal.angle - 8) % 360 + 360) % 360;
  const currentMod = ((currentAngle % 360) + 360) % 360;
  const adjustment = ((desiredMod - currentMod) % 360 + 360) % 360;
  const finalAngle = currentAngle + 4320 + adjustment;

  wheel.style.transition = 'transform 6s cubic-bezier(0.215, 0.61, 0.355, 1)';
  wheel.style.transform = 'rotate(' + finalAngle + 'deg)';

  setTimeout(() => {
    subtitle.textContent = '¡Felicidades!';
    resaltarSegmentoGanador(segFinal.id);
    lanzarConfetti();
    mostrarResultadoRuleta(resultado);
  }, 6000);
}

function getCurrentRotationDeg(el) {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === 'none') return 0;
  try {
    const m = new DOMMatrixReadOnly(transform);
    let angle = Math.atan2(m.b, m.a) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  } catch (e) {
    return 0;
  }
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
