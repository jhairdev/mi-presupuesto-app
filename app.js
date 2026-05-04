const STORAGE_KEY = 'mi_presupuesto_app_v3';

const categorias = [
  'Hipoteca / arriendo',
  'Servicios básicos',
  'Alimentación',
  'Hijos / dependientes',
  'Educación',
  'Deudas',
  'Internet y apps',
  'Transporte / vehículo',
  'Salud / medicina',
  'Seguros',
  'Impuestos',
  'Mascotas',
  'Vestimenta',
  'Entretenimiento',
  'Cuidado personal',
  'Lavandería',
  'Ahorro / póliza',
  'Remesas / apoyo familiar',
  'Emergencias',
  'Otros'
];

const ajustePorCategoria = {
  'Alimentación': 0.15,
  'Internet y apps': 0.20,
  'Salud / medicina': 0.10,
  'Transporte / vehículo': 0.10,
  'Mascotas': 0.10,
  'Vestimenta': 0.15,
  'Entretenimiento': 0.25,
  'Cuidado personal': 0.15,
  'Lavandería': 0.10,
  'Otros': 0.20,
  'Hipoteca / arriendo': 0.00,
  'Servicios básicos': 0.00,
  'Hijos / dependientes': 0.00,
  'Educación': 0.00,
  'Deudas': 0.00,
  'Seguros': 0.00,
  'Impuestos': 0.00,
  'Ahorro / póliza': 0.00,
  'Remesas / apoyo familiar': 0.00,
  'Emergencias': 0.00
};

const ayudaCategorias = {
  'Hipoteca / arriendo': 'Pago fijo de vivienda. Normalmente no se ajusta mes a mes, pero es clave medir cuánto pesa en tus ingresos.',
  'Servicios básicos': 'Luz, agua, gas u otros servicios necesarios.',
  'Alimentación': 'Comida del mes. Conviene dividirla por semana para no gastar todo al inicio.',
  'Hijos / dependientes': 'Registra cada gasto asociado a un hijo o dependiente. Escribe su nombre para calcular su proporción.',
  'Educación': 'Escuela, universidad, cursos, útiles, matrículas o mensualidades.',
  'Deudas': 'Tarjetas, préstamos u otras cuotas. Evita reducir pagos importantes si generan intereses.',
  'Internet y apps': 'Internet, celular, streaming, apps o suscripciones.',
  'Transporte / vehículo': 'Gasolina, mantenimiento, bus, taxi o transporte mensual.',
  'Salud / medicina': 'Consultas, medicinas, gimnasio o bienestar.',
  'Seguros': 'Seguro médico, vehículo, vida u otros seguros.',
  'Impuestos': 'Pagos tributarios, prediales, matrículas u obligaciones anuales mensualizadas.',
  'Mascotas': 'Comida, veterinario, vacunas o cuidado de mascotas.',
  'Vestimenta': 'Ropa, zapatos o compras personales.',
  'Entretenimiento': 'Salidas, cine, comidas fuera, juegos o actividades recreativas.',
  'Cuidado personal': 'Peluquería, barbería, productos personales o estética.',
  'Lavandería': 'Lavado, planchado o productos de limpieza.',
  'Ahorro / póliza': 'Ahorro, inversión o póliza. No es gasto malo, pero reduce el flujo disponible.',
  'Remesas / apoyo familiar': 'Dinero enviado o apoyo económico a familiares.',
  'Emergencias': 'Fondo o gasto imprevisto importante.',
  'Otros': 'Cualquier gasto que no entre en las categorías anteriores.'
};

let state = {
  nombre: '',
  ingresos: 0,
  gastos: [],
  ajustables: []
};

function formatoMoneda(valor) {
  return Number(valor || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
}

function guardarLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

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
  } catch (error) {
    console.error('No se pudieron cargar los datos', error);
  }
}

function cargarCategorias() {
  const select = document.getElementById('categoria');
  select.innerHTML = categorias.map(categoria => `<option value="${escapeHtml(categoria)}">${escapeHtml(categoria)}</option>`).join('');
}

function mostrarPanel(index) {
  document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
  document.querySelector(`[data-panel="${index}"]`).classList.add('active');

  document.querySelectorAll('.step-pill').forEach((pill, i) => {
    pill.classList.toggle('active', i === index);
    pill.classList.toggle('done', i < index);
  });

  document.getElementById('welcomeHero').classList.toggle('hidden', index > 0);
}

function guardarInicio() {
  const nombre = document.getElementById('nombre').value.trim();
  const ingresos = parseFloat(document.getElementById('ingresos').value);

  if (!nombre) {
    alert('Ingresa tu nombre para personalizar tu presupuesto.');
    return;
  }

  if (!ingresos || ingresos <= 0) {
    alert('Ingresa tus ingresos totales del mes.');
    return;
  }

  state.nombre = nombre;
  state.ingresos = ingresos;
  guardarLocal();
  document.getElementById('tituloGastos').textContent = `Bien ${nombre}, registra tus gastos`;
  mostrarPanel(1);
  renderGastos();
}

function actualizarAyudaCategoria() {
  const categoria = document.getElementById('categoria').value;
  const texto = ayudaCategorias[categoria] || '';
  document.getElementById('ayudaCategoria').textContent = texto;
  document.getElementById('explicacionCategoria').textContent = texto;
  document.getElementById('dependienteBox').classList.toggle('hidden', categoria !== 'Hijos / dependientes');
}

function agregarGasto() {
  const categoria = document.getElementById('categoria').value;
  const monto = parseFloat(document.getElementById('montoGasto').value);
  const detalle = document.getElementById('detalleGasto').value.trim() || categoria;
  const dependiente = document.getElementById('dependiente').value.trim();

  if (!monto || monto <= 0) {
    alert('Ingresa un monto válido para esta categoría.');
    return;
  }

  if (categoria === 'Hijos / dependientes' && !dependiente) {
    alert('Escribe el nombre del hijo o dependiente para calcular su proporción.');
    return;
  }

  state.gastos.push({
    id: Date.now(),
    categoria,
    detalle,
    monto,
    dependiente: categoria === 'Hijos / dependientes' ? dependiente : ''
  });

  document.getElementById('montoGasto').value = '';
  document.getElementById('detalleGasto').value = '';
  document.getElementById('dependiente').value = '';
  guardarLocal();
  renderGastos();
}

function eliminarGasto(id) {
  state.gastos = state.gastos.filter(gasto => gasto.id !== id);
  state.ajustables = state.ajustables.filter(itemId => itemId !== id);
  guardarLocal();
  renderGastos();
}

function renderGastos() {
  const lista = document.getElementById('listaGastos');
  if (!state.gastos.length) {
    lista.innerHTML = '<div class="empty">Aún no has agregado gastos mensuales.</div>';
    return;
  }

  lista.innerHTML = state.gastos.map(gasto => {
    const sub = gasto.dependiente
      ? `${escapeHtml(gasto.detalle)} · ${escapeHtml(gasto.dependiente)}`
      : escapeHtml(gasto.detalle);

    return `
      <div class="expense-item">
        <div>
          <div class="item-title">${escapeHtml(gasto.categoria)}</div>
          <div class="item-sub">${sub}</div>
        </div>
        <div style="text-align:right;">
          <div class="amount">${formatoMoneda(gasto.monto)}</div>
          <button class="btn-danger" style="padding:8px 10px; margin-top:8px; font-size:12px;" onclick="eliminarGasto(${gasto.id})">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function terminarGastos() {
  if (!state.gastos.length) {
    alert('Agrega al menos un gasto mensual.');
    return;
  }
  guardarLocal();
  renderResumen();
  mostrarPanel(2);
}

function getResumen() {
  const ingresos = Number(state.ingresos || 0);
  const gastos = state.gastos.reduce((total, gasto) => total + Number(gasto.monto || 0), 0);
  const saldo = ingresos - gastos;
  return { ingresos, gastos, saldo, semanal: saldo / 4 };
}

function getResumenDependientes() {
  const gastosHijos = state.gastos.filter(gasto => gasto.categoria === 'Hijos / dependientes');
  const totalHijos = gastosHijos.reduce((total, gasto) => total + Number(gasto.monto || 0), 0);
  const porDependiente = {};

  gastosHijos.forEach(gasto => {
    const nombre = gasto.dependiente || 'Sin nombre';
    porDependiente[nombre] = (porDependiente[nombre] || 0) + Number(gasto.monto || 0);
  });

  return { totalHijos, porDependiente };
}

function renderResumen() {
  const resumen = getResumen();
  document.getElementById('mensajeResumen').textContent = `${state.nombre}, este es tu resultado mensual.`;
  document.getElementById('viewIngresos').textContent = formatoMoneda(resumen.ingresos);
  document.getElementById('viewGastos').textContent = formatoMoneda(resumen.gastos);
  document.getElementById('viewSaldo').textContent = formatoMoneda(resumen.saldo);
  document.getElementById('viewSaldo').style.color = resumen.saldo >= 0 ? 'var(--success)' : 'var(--danger)';
  document.getElementById('viewSemanal').textContent = `${formatoMoneda(Math.max(resumen.semanal, 0))} por semana`;

  renderDependientes(resumen);
}

function renderDependientes(resumen) {
  const bloque = document.getElementById('bloqueDependientes');
  const contenedor = document.getElementById('resumenDependientes');
  const { totalHijos, porDependiente } = getResumenDependientes();

  if (!totalHijos) {
    bloque.classList.add('hidden');
    contenedor.innerHTML = '';
    return;
  }

  bloque.classList.remove('hidden');
  contenedor.innerHTML = Object.entries(porDependiente).map(([nombre, monto]) => {
    const porcentajeHijos = totalHijos ? (monto / totalHijos) * 100 : 0;
    const porcentajeIngresos = resumen.ingresos ? (monto / resumen.ingresos) * 100 : 0;
    return `
      <div class="result-item">
        <div>
          <div class="item-title">${escapeHtml(nombre)}</div>
          <div class="item-sub">${porcentajeHijos.toFixed(1)}% del gasto en hijos · ${porcentajeIngresos.toFixed(1)}% de ingresos</div>
        </div>
        <div class="amount">${formatoMoneda(monto)}</div>
      </div>
    `;
  }).join('');
}

function irAjustes() {
  renderAjustes();
  mostrarPanel(3);
}

function renderAjustes() {
  const lista = document.getElementById('listaAjustes');
  lista.innerHTML = state.gastos.map(gasto => {
    const puedeAjustar = (ajustePorCategoria[gasto.categoria] || 0) > 0;
    const checked = state.ajustables.includes(gasto.id) ? 'checked' : '';
    const texto = puedeAjustar
      ? `Puedes intentar reducir aproximadamente ${(ajustePorCategoria[gasto.categoria] * 100).toFixed(0)}%.`
      : 'Esta categoría normalmente no conviene ajustarla desde aquí.';

    return `
      <label class="check-card">
        <input type="checkbox" value="${gasto.id}" ${checked} ${puedeAjustar ? '' : 'disabled'} onchange="toggleAjustable(${gasto.id}, this.checked)" />
        <div>
          <div class="item-title">${escapeHtml(gasto.categoria)} · ${formatoMoneda(gasto.monto)}</div>
          <div class="item-sub">${escapeHtml(gasto.detalle)}. ${texto}</div>
        </div>
      </label>
    `;
  }).join('');
}

function toggleAjustable(id, checked) {
  if (checked && !state.ajustables.includes(id)) state.ajustables.push(id);
  if (!checked) state.ajustables = state.ajustables.filter(itemId => itemId !== id);
  guardarLocal();
}

function calcularAjustes() {
  mostrarPanel(4);
  document.getElementById('loading').classList.add('active');
  document.getElementById('planFinal').style.display = 'none';
  setTimeout(() => mostrarPlanFinal(true), 850);
}

function mostrarPlanFinal(conAjuste) {
  if (!conAjuste) state.ajustables = [];

  const resumen = getResumen();
  let gastoSugerido = 0;
  const resultados = state.gastos.map(gasto => {
    const esAjustable = state.ajustables.includes(gasto.id);
    const porcentaje = esAjustable ? (ajustePorCategoria[gasto.categoria] || 0) : 0;
    const sugerido = Math.max(Number(gasto.monto) * (1 - porcentaje), 0);
    gastoSugerido += sugerido;
    return { ...gasto, esAjustable, porcentaje, sugerido };
  });

  const nuevoSaldo = Number(state.ingresos || 0) - gastoSugerido;
  document.getElementById('loading').classList.remove('active');
  document.getElementById('planFinal').style.display = 'block';
  document.getElementById('mensajeFinal').textContent = `${state.nombre}, aquí tienes una guía con gastos fijos, ajustables y familiares.`;
  document.getElementById('finalGastoActual').textContent = formatoMoneda(resumen.gastos);
  document.getElementById('finalGastoSugerido').textContent = formatoMoneda(gastoSugerido);
  document.getElementById('finalSaldo').textContent = formatoMoneda(nuevoSaldo);
  document.getElementById('finalSaldo').style.color = nuevoSaldo >= 0 ? 'var(--success)' : 'var(--danger)';
  document.getElementById('finalSemanal').textContent = `${formatoMoneda(Math.max(nuevoSaldo / 4, 0))} por semana`;

  document.getElementById('resultadoAjustes').innerHTML = resultados.map(item => `
    <div class="result-item">
      <div>
        <div class="item-title">${escapeHtml(item.categoria)}${item.dependiente ? ` · ${escapeHtml(item.dependiente)}` : ''}</div>
        <div class="item-sub">${escapeHtml(item.detalle)} · ${item.esAjustable ? `ajuste sugerido ${(item.porcentaje * 100).toFixed(0)}%` : 'sin ajuste sugerido'}</div>
      </div>
      <div class="amount">${formatoMoneda(item.sugerido)}</div>
    </div>
  `).join('');

  guardarLocal();
  mostrarPanel(4);
}

function reiniciar() {
  mostrarPanel(0);
}

function borrarDatos() {
  if (!confirm('¿Seguro que quieres borrar todos los datos guardados?')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = { nombre: '', ingresos: 0, gastos: [], ajustables: [] };
  cargarEnPantalla();
  renderGastos();
  mostrarPanel(0);
}

function cargarEnPantalla() {
  document.getElementById('nombre').value = state.nombre || '';
  document.getElementById('ingresos').value = state.ingresos || '';
  document.getElementById('tituloGastos').textContent = state.nombre ? `Bien ${state.nombre}, registra tus gastos` : 'Registra tus gastos';
  actualizarAyudaCategoria();
  renderGastos();
}

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function init() {
  cargarCategorias();
  cargarLocal();
  cargarEnPantalla();
  if (state.nombre && state.ingresos > 0 && state.gastos.length) {
    renderResumen();
    mostrarPanel(2);
  }
}

init();
