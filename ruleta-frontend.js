/* ============================================================
   RULETA - FRONTEND
   Reemplaza API_URL por la URL de tu deployment de Apps Script
   ============================================================ */

const RULETA_API_URL = 'https://script.google.com/macros/s/AKfycbwRvaWEm0_rIYFYnQMZ83X0f7FYEqW945nDuXZHddIB0dggrFnG0G8XUSILyGkx0a61/exec';

async function llamarBackendRuleta(accion, datos) {
  const response = await fetch(RULETA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // evita preflight OPTIONS con Apps Script
    body: JSON.stringify({ accion, ...datos })
  });
  return response.json();
}

/**
 * Llamar esto justo después de que guardarCita() confirme éxito.
 * identificador: telefono o email del cliente
 * nombre: nombre del cliente
 * citaId: el ID de la cita recién creada
 */
async function intentarMostrarRuleta(identificador, nombre, citaId) {
  try {
    const check = await llamarBackendRuleta('verificarElegibilidad', { identificador });
    if (!check.elegible) {
      console.log('Ruleta no disponible:', check.motivo);
      return; // ruleta apagada o el cliente ya participó -> no se muestra nada
    }
    abrirModalRuleta(identificador, nombre, citaId);
  } catch (err) {
    console.error('Error verificando elegibilidad de ruleta:', err);
    // Falla silenciosa: si algo falla, simplemente no se muestra la ruleta
  }
}

function abrirModalRuleta(identificador, nombre, citaId) {
  const modal = document.getElementById('ruletaModal');
  modal.classList.add('activo');

  const btnGirar = document.getElementById('ruletaSpinBtn');
  btnGirar.onclick = () => girarRuletaUI(identificador, nombre, citaId);
}

async function girarRuletaUI(identificador, nombre, citaId) {
  const btnGirar = document.getElementById('ruletaSpinBtn');
  const subtitle = document.getElementById('ruletaSubtitle');
  const wheel = document.getElementById('wheelSvg');

  btnGirar.style.pointerEvents = 'none';
  subtitle.textContent = 'Girando...';

  // Índices de segmento en el orden real del SVG (deben coincidir con RuletaConfig)
  const ordenSegmentos = [
    '20% dto próxima visita',
    '10% dto próxima visita',
    'Premio doble (2 servicios)',
    '15% dto próxima visita'
    // ajustar según los premios reales que definan al final
  ];

  const resultado = await llamarBackendRuleta('girarRuleta', { identificador, nombre, citaId });

  if (!resultado.ok) {
    subtitle.textContent = 'No se pudo completar el giro. Intenta más tarde.';
    return;
  }

  const anguloPorSegmento = 360 / ordenSegmentos.length;
  const indexGanador = ordenSegmentos.indexOf(resultado.premio);
  const anguloGanador = indexGanador >= 0 ? indexGanador * anguloPorSegmento : 0;
  const finalAngle = 1800 + (360 - anguloGanador) - (anguloPorSegmento / 2);

  wheel.style.transform = 'rotate(' + finalAngle + 'deg)';

  setTimeout(() => {
    subtitle.textContent = '¡Felicidades!';
    mostrarResultadoRuleta(resultado);
  }, 4200);
}

function mostrarResultadoRuleta(resultado) {
  const resultCard = document.getElementById('ruletaResultCard');
  const resultText = document.getElementById('ruletaResultText');

  resultText.textContent = resultado.esPremioReal
    ? 'Ganaste: ' + resultado.premio + (resultado.codigoCanje ? ' — Código: ' + resultado.codigoCanje : '')
    : resultado.premio;

  resultCard.style.opacity = '1';
  resultCard.style.transform = 'scale(1)';

  // TODO: aquí se puede llamar la función de confetti dorado ya probada en la demo
}
