const STORAGE_KEY = 'mi_presupuesto_app_v5';
const $ = (id) => document.getElementById(id);

const categorias = [
  'Hipoteca / arriendo','Servicios básicos','Alimentación','Hijos / dependientes','Educación','Deudas',
  'Internet y apps','Transporte / vehículo','Salud / medicina','Seguros','Impuestos','Mascotas','Vestimenta',
  'Entretenimiento','Cuidado personal','Lavandería','Ahorro / póliza','Remesas / apoyo familiar','Emergencias','Otros'
];

const ajustePorCategoria = {
  'Alimentación': .15,
  'Internet y apps': .20,
  'Salud / medicina': .10,
  'Transporte / vehículo': .10,
  'Mascotas': .10,
  'Vestimenta': .15,
  'Entretenimiento': .25,
  'Cuidado personal': .15,
  'Lavandería': .10,
  'Otros': .20
};

const ayudaCategorias = {
  'Hipoteca / arriendo': 'Pago fijo de vivienda. Normalmente no se ajusta mes a mes.',
  'Servicios básicos': 'Luz, agua, gas u otros servicios necesarios.',
  'Alimentación': 'Comida del mes. Conviene dividirla por semana.',
  'Hijos / dependientes': 'Registra cada gasto asociado a un hijo o dependiente y escribe su nombre.',
  'Educación': 'Escuela, universidad, cursos, útiles o matrículas.',
  'Deudas': 'Tarjetas, préstamos u otras cuotas.',
  'Internet y apps': 'Internet, celular, streaming, apps o suscripciones.',
  'Transporte / vehículo': 'Gasolina, mantenimiento, bus, taxi o transporte mensual.',
  'Salud / medicina': 'Consultas, medicinas, gimnasio o bienestar.',
  'Seguros': 'Seguro médico, vehículo, vida u otros seguros.',
  'Impuestos': 'Pagos tributarios u obligaciones mensualizadas.',
  'Mascotas': 'Comida, veterinario o cuidado de mascotas.',
  'Vestimenta': 'Ropa, zapatos o compras personales.',
  'Entretenimiento': 'Salidas, cine, comidas fuera o actividades recreativas.',
  'Cuidado personal': 'Peluquería, barbería o productos personales.',
  'Lavandería': 'Lavado, planchado o productos de limpieza.',
  'Ahorro / póliza': 'Ahorro, inversión o póliza.',
  'Remesas / apoyo familiar': 'Dinero enviado o apoyo económico a familiares.',
  'Emergencias': 'Fondo o gasto imprevisto importante.',
  'Otros': 'Cualquier gasto que no entre en las categorías anteriores.'
};

let state = { nombre: '', ingresos: 0, gastos: [], ajustables: [] };
let audioContext;

function setText(id, text) { if ($(id)) $(id).textContent = text; }
function setHtml(id, html) { if ($(id)) $(id).innerHTML = html; }
function formatoMoneda(valor) { return Number(valor || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' }); }
function vibrar(ms = 70) { if (navigator.vibrate) navigator.vibrate(ms); }

function sonidoCheck() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + .08);
    gain.gain.setValueAtTime(.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.18, audioContext.currentTime + .02);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .16);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + .18);
  } catch (e) {}
}

function mostrarToast(mensaje, tipo = 'ok') {
  let box = $('toastBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastBox';
    box.className = 'toast-box';
    document.body.appendChild(box);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  box.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 20);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, 2300);
}

function guardarLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function cargarLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state = {
      nombre: data.nombre || '',
      ingresos: Number(data.ingresos || 0),
      gastos: Array.isArray(data.gastos) ? data.gastos : [],
      ajustables: Array.isArray(data.ajustables) ? data.ajustables : []
    };
  } catch (e) { console.error(e); }
}

function prepararBloquesExtra() {
  const panelResumen = document.querySelector('[data-panel="2"]');
  if (panelResumen && !$('chartCategorias')) {
    panelResumen.insertAdjacentHTML('beforeend', `
      <div class="weekly-box chart-card">
        <span class="tag">Distribución de gastos</span>
        <canvas id="chartCategorias" width="280" height="280"></canvas>
        <div id="leyendaCategorias" class="legend-list"></div>
      </div>
      <div class="weekly-box">
        <span class="tag">Control semanal</span>
        <div class="item-title" id="viewSemanal">$0.00 por semana</div>
        <div class="item-sub">Este es el aproximado que podrías usar por semana después de tus gastos registrados.</div>
      </div>
      <div class="btn-row app-actions">
        <button class="btn-secondary" onclick="mostrarPanel(1)">Editar gastos</button>
        <button class="btn-secondary" onclick="volverInicio()">Volver al inicio</button>
        <button class="btn-danger" onclick="borrarDatos()">Borrar datos</button>
      </div>
    `);
  }

  const panelFinal = document.querySelector('[data-panel="4"]');
  if (panelFinal && !$('finalResumenBox')) {
    panelFinal.insertAdjacentHTML('afterbegin', `
      <div id="finalResumenBox" class="summary-grid">
        <div class="summary-card"><span>Gasto actual</span><strong id="finalGastoActual">$0.00</strong></div>
        <div class="summary-card"><span>Gasto sugerido</span><strong id="finalGastoSugerido">$0.00</strong></div>
        <div class="summary-card"><span>Nuevo saldo</span><strong id="finalSaldo">$0.00</strong></div>
      </div>
      <div class="weekly-box">
        <span class="tag">Límite semanal sugerido</span>
        <div class="item-title" id="finalSemanal">$0.00 por semana</div>
      </div>
      <div class="btn-row app-actions">
        <button class="btn-primary" onclick="mostrarPanel(1)">Editar gastos</button>
        <button class="btn-secondary" onclick="volverInicio()">Volver al inicio</button>
        <button class="btn-danger" onclick="borrarDatos()">Borrar datos</button>
      </div>
    `);
  }
}

function cargarCategorias() {
  if (!$('categoria')) return;
  $('categoria').innerHTML = categorias.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function mostrarPanel(index) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.querySelector(`[data-panel="${index}"]`);
  if (panel) panel.classList.add('active');

  document.querySelectorAll('.step-pill').forEach((pill, i) => {
    pill.classList.toggle('active', i === index);
    pill.classList.toggle('done', i < index);
  });

  if ($('welcomeHero')) $('welcomeHero').classList.toggle('hidden', index > 0);
}

function guardarInicio() {
  const nombre = $('nombre')?.value.trim() || '';
  const ingresos = parseFloat($('ingresos')?.value || 0);

  if (!nombre) { mostrarToast('Ingresa tu nombre.', 'error'); return; }
  if (!ingresos || ingresos <= 0) { mostrarToast('Ingresa tus ingresos del mes.', 'error'); return; }

  state.nombre = nombre;
  state.ingresos = ingresos;
  guardarLocal();
  setText('tituloGastos', `Bien ${nombre}, registra tus gastos`);
  vibrar(50);
  mostrarToast('Datos iniciales guardados');
  mostrarPanel(1);
  renderGastos();
}

function actualizarAyudaCategoria() {
  const categoria = $('categoria')?.value || '';
  const texto = ayudaCategorias[categoria] || '';
  setText('ayudaCategoria', texto);
  setText('explicacionCategoria', texto);
  if ($('dependienteBox')) $('dependienteBox').classList.toggle('hidden', categoria !== 'Hijos / dependientes');
}

function agregarGasto() {
  const categoria = $('categoria')?.value || 'Otros';
  const monto = parseFloat($('montoGasto')?.value || 0);
  const detalle = $('detalleGasto')?.value.trim() || categoria;
  const dependiente = $('dependiente')?.value.trim() || '';

  if (!monto || monto <= 0) { mostrarToast('Ingresa un monto válido.', 'error'); return; }
  if (categoria === 'Hijos / dependientes' && !dependiente) { mostrarToast('Escribe el nombre del dependiente.', 'error'); return; }

  state.gastos.push({ id: Date.now(), categoria, detalle, monto, dependiente: categoria === 'Hijos / dependientes' ? dependiente : '' });

  if ($('montoGasto')) $('montoGasto').value = '';
  if ($('detalleGasto')) $('detalleGasto').value = '';
  if ($('dependiente')) $('dependiente').value = '';
  guardarLocal();
  vibrar(45);
  mostrarToast('Gasto agregado');
  renderGastos();
}

function eliminarGasto(id) {
  state.gastos = state.gastos.filter(g => g.id !== id);
  state.ajustables = state.ajustables.filter(x => x !== id);
  guardarLocal();
  mostrarToast('Gasto eliminado');
  renderGastos();
}

function renderGastos() {
  if (!$('listaGastos')) return;
  if (!state.gastos.length) return setHtml('listaGastos', '<div class="empty">Aún no has agregado gastos.</div>');

  setHtml('listaGastos', state.gastos.map(g => `
    <div class="expense-item">
      <div>
        <div class="item-title">${escapeHtml(g.categoria)}</div>
        <div class="item-sub">${escapeHtml(g.detalle)}${g.dependiente ? ' · ' + escapeHtml(g.dependiente) : ''}</div>
      </div>
      <div style="text-align:right;">
        <div class="amount">${formatoMoneda(g.monto)}</div>
        <button class="btn-danger" style="padding:8px 10px; margin-top:8px; font-size:12px;" onclick="eliminarGasto(${g.id})">Eliminar</button>
      </div>
    </div>`).join(''));
}

function terminarGastos() {
  if (!state.gastos.length) { mostrarToast('Agrega al menos un gasto mensual.', 'error'); return; }
  guardarLocal();
  renderResumen();
  sonidoCheck();
  vibrar(80);
  mostrarToast('Resumen generado');
  mostrarPanel(2);
}

function getResumen() {
  const ingresos = Number(state.ingresos || 0);
  const gastos = state.gastos.reduce((t, g) => t + Number(g.monto || 0), 0);
  return { ingresos, gastos, saldo: ingresos - gastos, semanal: (ingresos - gastos) / 4 };
}

function renderResumen() {
  const r = getResumen();
  setText('mensajeResumen', `${state.nombre}, este es tu resultado mensual.`);
  setText('viewIngresos', formatoMoneda(r.ingresos));
  setText('viewGastos', formatoMoneda(r.gastos));
  setText('viewSaldo', formatoMoneda(r.saldo));
  if ($('viewSaldo')) $('viewSaldo').style.color = r.saldo >= 0 ? 'var(--success)' : 'var(--danger)';
  setText('viewSemanal', `${formatoMoneda(Math.max(r.semanal, 0))} por semana`);
  renderDependientes(r);
  renderGraficoCategorias();
}

function renderDependientes(resumen) {
  const gastosDep = state.gastos.filter(g => g.categoria === 'Hijos / dependientes');
  const total = gastosDep.reduce((t, g) => t + Number(g.monto || 0), 0);
  const porNombre = {};
  gastosDep.forEach(g => porNombre[g.dependiente || 'Sin nombre'] = (porNombre[g.dependiente || 'Sin nombre'] || 0) + Number(g.monto || 0));

  if ($('bloqueDependientes')) $('bloqueDependientes').classList.toggle('hidden', total === 0);
  if (!$('resumenDependientes')) return;
  if (!total) return setHtml('resumenDependientes', '');

  setHtml('resumenDependientes', Object.entries(porNombre).map(([nombre, monto]) => `
    <div class="result-item">
      <div><div class="item-title">${escapeHtml(nombre)}</div><div class="item-sub">${((monto / total) * 100).toFixed(1)}% del gasto familiar · ${resumen.ingresos ? ((monto / resumen.ingresos) * 100).toFixed(1) : 0}% de ingresos</div></div>
      <div class="amount">${formatoMoneda(monto)}</div>
    </div>`).join(''));
}

function resumenPorCategoria() {
  const data = {};
  state.gastos.forEach(g => data[g.categoria] = (data[g.categoria] || 0) + Number(g.monto || 0));
  return data;
}

function renderGraficoCategorias() {
  const canvas = $('chartCategorias');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = resumenPorCategoria();
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((t, [, v]) => t + v, 0);
  const colors = ['#8b7cf6','#ffd6e7','#d9f7ec','#dff3ff','#ffe2cf','#ece7ff','#2f9e74','#e45b78','#d9902f','#77808b'];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!total) return;

  let start = -Math.PI / 2;
  entries.forEach(([cat, value], i) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(140, 140);
    ctx.arc(140, 140, 105, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    start += angle;
  });

  ctx.beginPath();
  ctx.arc(140, 140, 58, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdfb';
  ctx.fill();
  ctx.fillStyle = '#263238';
  ctx.font = 'bold 18px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(formatoMoneda(total), 140, 145);

  setHtml('leyendaCategorias', entries.map(([cat, value], i) => `
    <div class="legend-item"><span style="background:${colors[i % colors.length]}"></span><strong>${escapeHtml(cat)}</strong><em>${((value / total) * 100).toFixed(1)}%</em></div>
  `).join(''));
}

function irAjustes() { renderAjustes(); mostrarPanel(3); }

function renderAjustes() {
  if (!$('listaAjustes')) return;
  setHtml('listaAjustes', state.gastos.map(g => {
    const puede = (ajustePorCategoria[g.categoria] || 0) > 0;
    const checked = state.ajustables.includes(g.id) ? 'checked' : '';
    return `<label class="check-card"><input type="checkbox" ${checked} ${puede ? '' : 'disabled'} onchange="toggleAjustable(${g.id}, this.checked)"><div><div class="item-title">${escapeHtml(g.categoria)} · ${formatoMoneda(g.monto)}</div><div class="item-sub">${puede ? 'Puedes intentar reducir este gasto.' : 'Gasto fijo o no recomendado para ajuste.'}</div></div></label>`;
  }).join(''));
}

function toggleAjustable(id, checked) {
  if (checked && !state.ajustables.includes(id)) state.ajustables.push(id);
  if (!checked) state.ajustables = state.ajustables.filter(x => x !== id);
  guardarLocal();
  vibrar(35);
}

function calcularAjustes() { mostrarPanel(4); mostrarPlanFinal(true); sonidoCheck(); vibrar(80); mostrarToast('Plan ajustado generado'); }

function mostrarPlanFinal(conAjuste) {
  if (!conAjuste) state.ajustables = [];
  const r = getResumen();
  let gastoSugerido = 0;
  const resultados = state.gastos.map(g => {
    const pct = state.ajustables.includes(g.id) ? (ajustePorCategoria[g.categoria] || 0) : 0;
    const sugerido = Number(g.monto) * (1 - pct);
    gastoSugerido += sugerido;
    return { ...g, pct, sugerido };
  });
  const nuevoSaldo = Number(state.ingresos || 0) - gastoSugerido;
  setText('finalGastoActual', formatoMoneda(r.gastos));
  setText('finalGastoSugerido', formatoMoneda(gastoSugerido));
  setText('finalSaldo', formatoMoneda(nuevoSaldo));
  setText('finalSemanal', `${formatoMoneda(Math.max(nuevoSaldo / 4, 0))} por semana`);
  setHtml('resultadoAjustes', resultados.map(i => `<div class="result-item"><div><div class="item-title">${escapeHtml(i.categoria)}${i.dependiente ? ' · ' + escapeHtml(i.dependiente) : ''}</div><div class="item-sub">${escapeHtml(i.detalle)} · ${i.pct ? 'ajuste sugerido ' + (i.pct * 100).toFixed(0) + '%' : 'sin ajuste'}</div></div><div class="amount">${formatoMoneda(i.sugerido)}</div></div>`).join(''));
  guardarLocal();
  mostrarPanel(4);
}

function volverInicio() {
  mostrarPanel(0);
  mostrarToast('Volviste al inicio');
}

function reiniciar() { volverInicio(); }
function borrarDatos() {
  localStorage.removeItem(STORAGE_KEY);
  state = { nombre: '', ingresos: 0, gastos: [], ajustables: [] };
  cargarEnPantalla();
  setHtml('resultadoAjustes', '');
  setHtml('resumenDependientes', '');
  setHtml('leyendaCategorias', '');
  const canvas = $('chartCategorias');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  mostrarToast('Datos borrados');
  mostrarPanel(0);
}

function cargarEnPantalla() {
  if ($('nombre')) $('nombre').value = state.nombre || '';
  if ($('ingresos')) $('ingresos').value = state.ingresos || '';
  setText('tituloGastos', state.nombre ? `Bien ${state.nombre}, registra tus gastos` : 'Registra tus gastos');
  actualizarAyudaCategoria();
  renderGastos();
}

function escapeHtml(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function init() {
  prepararBloquesExtra();
  cargarCategorias();
  cargarLocal();
  cargarEnPantalla();
  if (state.nombre && state.ingresos > 0 && state.gastos.length) { renderResumen(); mostrarPanel(2); }
}

init();
