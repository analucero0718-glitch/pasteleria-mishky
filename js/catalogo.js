const TODOS = "Todas";
const CLAVE_CARRITO = "mishky_carrito_v1";

let productos = [];
let categoriaActiva = TODOS;
let ultimoElementoFocado = null;
let carrito = cargarCarrito();
let temporizadorAviso = null;

// Referencias al DOM
const grilla = document.getElementById("grilla");
const estado = document.getElementById("estado");
const avisoCarrito = document.getElementById("aviso-carrito");
const contFiltros = document.getElementById("filtros");
const buscador = document.getElementById("buscador");
const ordenSelect = document.getElementById("orden");
const chkDisponibles = document.getElementById("solo-disponibles");
const plantilla = document.getElementById("plantilla-tarjeta");

// Referencias Modal
const modal = document.getElementById("modal-producto");
const modalImg = document.getElementById("modal-img");
const modalCategoria = document.getElementById("modal-categoria");
const modalNombre = document.getElementById("modal-nombre");
const modalDescripcion = document.getElementById("modal-descripcion");
const modalPrecio = document.getElementById("modal-precio");
const modalStock = document.getElementById("modal-stock");
const btnCerrarModal = document.getElementById("btn-cerrar-modal");

// Referencias Carrito
const btnAbrirCarrito = document.getElementById("btn-abrir-carrito");
const btnCerrarCarrito = document.getElementById("btn-cerrar-carrito");
const panelCarrito = document.getElementById("panel-carrito");
const listaCarritoEl = document.getElementById("carrito-items");
const cantidadTotalEl = document.getElementById("carrito-cantidad-total");
const totalCarritoEl = document.getElementById("carrito-total");
const contadorCarritoEl = document.getElementById("carrito-contador");
const btnVaciarCarrito = document.getElementById("btn-vaciar-carrito");

const formatearSoles = (monto) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(monto);

function validarProducto(p) {
  const extensionesValidas = /\.(jpg|jpeg|png|webp|svg)$/i;
  const esIdValido = typeof p.id === "number" && p.id > 0;
  const esPrecioValido = typeof p.precio === "number" && p.precio > 0;
  const esStockValido = Number.isInteger(p.stock) && p.stock >= 0;
  const esCategoriaValida = typeof p.categoria === "string" && p.categoria.trim() !== "";
  const esImagenValida = typeof p.imagen === "string" && extensionesValidas.test(p.imagen);

  return esIdValido && esPrecioValido && esStockValido && esCategoriaValida && esImagenValida;
}

async function cargarProductos() {
  const res = await fetch("data/productos.json");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const datos = await res.json();

  if (!Array.isArray(datos)) throw new Error("El JSON recibido no es una lista válida.");

  const validos = [];
  const idsVistos = new Set();

  datos.forEach((p) => {
    if (validarProducto(p) && !idsVistos.has(p.id)) {
      idsVistos.add(p.id);
      validos.push(p);
    } else {
      console.warn("Producto inválido descartado:", p);
    }
  });

  return validos;
}

function obtenerCategorias(lista) {
  const cats = new Set(lista.map((p) => p.categoria));
  return [TODOS, ...Array.from(cats)];
}

function renderizarFiltros(categorias) {
  const fragmento = document.createDocumentFragment();

  categorias.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filtro";
    btn.dataset.categoria = cat;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(cat === categoriaActiva));
    btn.setAttribute("aria-pressed", String(cat === categoriaActiva));
    btn.textContent = cat;
    fragmento.append(btn);
  });

  contFiltros.replaceChildren(fragmento);
}

function actualizarContadores() {
  const textoBusqueda = buscador.value.trim().toLowerCase();
  const soloDisponibles = chkDisponibles.checked;

  const botones = contFiltros.querySelectorAll(".filtro");
  botones.forEach((btn) => {
    const cat = btn.dataset.categoria;
    const conteo = productos.filter((p) => {
      const coincideCat = cat === TODOS || p.categoria === cat;
      const coincideNombre = p.nombre.toLowerCase().includes(textoBusqueda);
      const coincideStock = !soloDisponibles || p.stock > 0;
      return coincideCat && coincideNombre && coincideStock;
    }).length;

    btn.textContent = `${cat} (${conteo})`;
  });
}

function crearTarjeta(p) {
  const clon = plantilla.content.cloneNode(true);
  const li = clon.querySelector(".tarjeta");
  const img = clon.querySelector(".tarjeta_foto img");
  const etiqueta = clon.querySelector(".etiqueta");
  const catTxt = clon.querySelector(".tarjeta_categoria");
  const nomTxt = clon.querySelector(".tarjeta_nombre");
  const descTxt = clon.querySelector(".tarjeta_descripcion");
  const precioTxt = clon.querySelector(".tarjeta_precio");
  const porcTxt = clon.querySelector(".tarjeta_porciones");
  const btnAdd = clon.querySelector(".btn-agregar");

  li.dataset.id = p.id;
  li.tabIndex = 0;

  img.src = p.imagen;
  img.srcset = `${p.imagen} 1x, ${p.imagen} 2x`;
  img.sizes = "(max-width: 600px) 100vw, 300px";
  img.alt = p.nombre;

  img.addEventListener("load", () => img.classList.add("foto-cargada"));

  if (p.destacado) {
    etiqueta.textContent = "Favorito";
    etiqueta.hidden = false;
  } else if (p.stock === 0) {
    etiqueta.textContent = "Agotado";
    etiqueta.classList.add("etiqueta--agotado");
    etiqueta.hidden = false;
    li.classList.add("tarjeta--agotado");
  }

  catTxt.textContent = p.categoria;
  nomTxt.textContent = p.nombre;
  descTxt.textContent = p.descripcion;
  precioTxt.textContent = formatearSoles(p.precio);
  porcTxt.textContent = p.porciones ? `${p.porciones} porciones` : "1 unidad";

  if (p.stock === 0) {
    btnAdd.disabled = true;
    btnAdd.textContent = "Agotado";
  }

  return clon;
}

function renderizarCatalogo() {
  grilla.setAttribute("aria-busy", "true");

  let lista = productos.filter((p) => {
    const coincideCat = categoriaActiva === TODOS || p.categoria === categoriaActiva;
    const coincideBusqueda = p.nombre.toLowerCase().includes(buscador.value.trim().toLowerCase());
    const coincideStock = !chkDisponibles.checked || p.stock > 0;
    return coincideCat && coincideBusqueda && coincideStock;
  });

  const tipoOrden = ordenSelect.value;
  const copia = lista.slice();

  if (tipoOrden === "precio-asc") {
    copia.sort((a, b) => a.precio - b.precio);
  } else if (tipoOrden === "precio-desc") {
    copia.sort((a, b) => b.precio - a.precio);
  } else if (tipoOrden === "nombre-asc") {
    copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  grilla.replaceChildren();

  if (copia.length === 0) {
    estado.textContent = "No hay productos que coincidan con los filtros.";
    grilla.removeAttribute("aria-busy");
    actualizarContadores();
    return;
  }

  const fragmento = document.createDocumentFragment();
  copia.forEach((p) => fragmento.append(crearTarjeta(p)));

  grilla.replaceChildren(fragmento);
  grilla.removeAttribute("aria-busy");

  const filtroTexto = categoriaActiva === TODOS ? "todas las categorías" : `«${categoriaActiva}»`;
  estado.textContent = `Mostrando ${copia.length} productos en ${filtroTexto}.`;

  actualizarContadores();
}

function sincronizarHash() {
  const hash = decodeURIComponent(location.hash.replace("#", "").trim());
  const categorias = obtenerCategorias(productos);

  if (hash && categorias.includes(hash)) {
    categoriaActiva = hash;
  } else {
    categoriaActiva = TODOS;
  }

  actualizarBotonesFiltro();
}

function actualizarBotonesFiltro() {
  const botones = contFiltros.querySelectorAll(".filtro");
  botones.forEach((b) => {
    const activa = b.dataset.categoria === categoriaActiva;
    b.setAttribute("aria-pressed", String(activa));
    b.setAttribute("aria-selected", String(activa));
  });
}

function cambiarCategoria(nuevaCat) {
  categoriaActiva = nuevaCat;
  actualizarBotonesFiltro();

  const nuevoHash = nuevaCat === TODOS ? "" : `#${encodeURIComponent(nuevaCat)}`;
  history.replaceState(null, "", location.pathname + nuevoHash);

  renderizarCatalogo();
}

function abrirModal(idProducto, elementoOrigen) {
  const p = productos.find((item) => item.id === Number(idProducto));
  if (!p) return;

  ultimoElementoFocado = elementoOrigen;

  modalImg.src = p.imagen;
  modalImg.alt = p.nombre;
  modalCategoria.textContent = p.categoria;
  modalNombre.textContent = p.nombre;
  modalDescripcion.textContent = p.descripcion;
  modalPrecio.textContent = formatearSoles(p.precio);
  modalStock.textContent = p.stock > 0 ? `Stock disponible: ${p.stock} unidades` : "Agotado por el momento";

  modal.showModal();
}

function cerrarModal() {
  modal.close();
  if (ultimoElementoFocado) {
    ultimoElementoFocado.focus();
  }
}

// --- CARRITO DE COMPRAS (CANTIDAD + TOTAL) ---
function limpiarAvisoCarrito() {
  clearTimeout(temporizadorAviso);
  if (!avisoCarrito) return;
  avisoCarrito.textContent = "";
  avisoCarrito.hidden = true;
}

function mostrarAvisoCarrito(mensaje) {
  if (!avisoCarrito) return;
  clearTimeout(temporizadorAviso);
  avisoCarrito.textContent = mensaje;
  avisoCarrito.hidden = false;
  temporizadorAviso = setTimeout(() => {
    limpiarAvisoCarrito();
  }, 2500);
}

function cargarCarrito() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO));
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

function guardarCarrito() {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
}

function agregarAlCarrito(idProducto) {
  const prod = productos.find((p) => p.id === Number(idProducto));
  if (!prod || prod.stock <= 0) {
    mostrarAvisoCarrito("Este producto está agotado por el momento.");
    return;
  }

  const existente = carrito.find((item) => item.id === prod.id);
  const cantActual = existente ? existente.cantidad : 0;

  if (cantActual >= prod.stock) {
    mostrarAvisoCarrito(`Solo hay ${prod.stock} unidades disponibles de «${prod.nombre}».`);
    return;
  }

  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({ id: prod.id, cantidad: 1 });
  }

  guardarCarrito();
  renderizarCarrito();
  mostrarAvisoCarrito(`Agregaste «${prod.nombre}» al carrito.`);
}

function cambiarCantidad(idProducto, delta) {
  const idx = carrito.findIndex((item) => item.id === Number(idProducto));
  if (idx === -1) return;

  const prod = productos.find((p) => p.id === Number(idProducto));
  const nuevaCant = carrito[idx].cantidad + delta;

  if (nuevaCant <= 0) {
    carrito.splice(idx, 1);
  } else if (prod && nuevaCant > prod.stock) {
    mostrarAvisoCarrito(`Máximo disponible: ${prod.stock} unidades.`);
    return;
  } else {
    carrito[idx].cantidad = nuevaCant;
  }

  guardarCarrito();
  renderizarCarrito();
}

function eliminarDelCarrito(idProducto) {
  carrito = carrito.filter((item) => item.id !== Number(idProducto));
  guardarCarrito();
  renderizarCarrito();
}

function renderizarCarrito() {
  let totalUnidades = 0;
  let totalMonto = 0;

  listaCarritoEl.replaceChildren();

  carrito.forEach((item) => {
    const prod = productos.find((p) => p.id === item.id);
    if (!prod) return;

    const subtotal = prod.precio * item.cantidad;
    totalUnidades += item.cantidad;
    totalMonto += subtotal;

    const li = document.createElement("li");
    li.className = "carrito-item";

    const thumb = document.createElement("img");
    thumb.className = "carrito-item_img";
    thumb.src = prod.imagen;
    thumb.alt = prod.nombre;

    const infoDiv = document.createElement("div");
    infoDiv.className = "carrito-item_info";

    const topRow = document.createElement("div");
    topRow.className = "carrito-item_top";

    const nombreStrong = document.createElement("strong");
    nombreStrong.className = "carrito-item_nombre";
    nombreStrong.textContent = prod.nombre;

    const btnEliminar = document.createElement("button");
    btnEliminar.type = "button";
    btnEliminar.className = "carrito-item_eliminar";
    btnEliminar.dataset.accion = "eliminar";
    btnEliminar.dataset.id = String(prod.id);
    btnEliminar.setAttribute("aria-label", `Quitar ${prod.nombre}`);
    btnEliminar.textContent = "×";

    topRow.append(nombreStrong, btnEliminar);

    const unitarioDiv = document.createElement("div");
    unitarioDiv.className = "carrito-item_unitario";
    unitarioDiv.textContent = `${formatearSoles(prod.precio)} c/u`;

    const bottomRow = document.createElement("div");
    bottomRow.className = "carrito-item_bottom";

    const controlesDiv = document.createElement("div");
    controlesDiv.className = "carrito-controles";

    const btnRestar = document.createElement("button");
    btnRestar.type = "button";
    btnRestar.dataset.accion = "restar";
    btnRestar.dataset.id = String(prod.id);
    btnRestar.setAttribute("aria-label", `Disminuir cantidad de ${prod.nombre}`);
    btnRestar.textContent = "−";

    const cantSpan = document.createElement("span");
    cantSpan.textContent = String(item.cantidad);

    const btnSumar = document.createElement("button");
    btnSumar.type = "button";
    btnSumar.dataset.accion = "sumar";
    btnSumar.dataset.id = String(prod.id);
    btnSumar.setAttribute("aria-label", `Aumentar cantidad de ${prod.nombre}`);
    btnSumar.textContent = "+";

    controlesDiv.append(btnRestar, cantSpan, btnSumar);

    const subtotalSpan = document.createElement("span");
    subtotalSpan.className = "carrito-item_subtotal";
    subtotalSpan.textContent = formatearSoles(subtotal);

    bottomRow.append(controlesDiv, subtotalSpan);
    infoDiv.append(topRow, unitarioDiv, bottomRow);
    li.append(thumb, infoDiv);
    listaCarritoEl.append(li);
  });

  if (carrito.length === 0 || totalUnidades === 0) {
    const vacioLi = document.createElement("li");
    vacioLi.className = "carrito-vacio";
    vacioLi.textContent = "Tu carrito está vacío. Agrega algún dulce del catálogo.";
    listaCarritoEl.append(vacioLi);
    limpiarAvisoCarrito();
  }

  contadorCarritoEl.textContent = String(totalUnidades);
  cantidadTotalEl.textContent = String(totalUnidades);
  totalCarritoEl.textContent = formatearSoles(totalMonto);
}

// Eventos
contFiltros.addEventListener("click", (e) => {
  const boton = e.target.closest(".filtro");
  if (!boton) return;
  cambiarCategoria(boton.dataset.categoria);
});

buscador.addEventListener("input", () => renderizarCatalogo());
ordenSelect.addEventListener("change", () => renderizarCatalogo());
chkDisponibles.addEventListener("change", () => renderizarCatalogo());

grilla.addEventListener("click", (e) => {
  const btnAdd = e.target.closest(".btn-agregar");
  if (btnAdd) {
    e.stopPropagation();
    const tarjeta = btnAdd.closest(".tarjeta");
    if (tarjeta?.dataset.id) agregarAlCarrito(tarjeta.dataset.id);
    return;
  }

  const tarjeta = e.target.closest(".tarjeta");
  if (tarjeta && tarjeta.dataset.id) {
    abrirModal(tarjeta.dataset.id, tarjeta);
  }
});

grilla.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const tarjeta = e.target.closest(".tarjeta");
    if (tarjeta && tarjeta.dataset.id) {
      abrirModal(tarjeta.dataset.id, tarjeta);
    }
  }
});

btnCerrarModal.addEventListener("click", cerrarModal);
modal.addEventListener("cancel", () => cerrarModal());

listaCarritoEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-accion]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.accion === "eliminar") {
    eliminarDelCarrito(id);
  } else {
    cambiarCantidad(id, btn.dataset.accion === "sumar" ? 1 : -1);
  }
});

btnAbrirCarrito?.addEventListener("click", () => {
  panelCarrito.hidden = !panelCarrito.hidden;
});

btnCerrarCarrito?.addEventListener("click", () => {
  panelCarrito.hidden = true;
});

btnVaciarCarrito?.addEventListener("click", () => {
  carrito = [];
  guardarCarrito();
  renderizarCarrito();
});

async function iniciar() {
  estado.classList.remove("estado--error");
  estado.textContent = "Cargando catálogo de productos...";

  try {
    productos = await cargarProductos();
    const categorias = obtenerCategorias(productos);
    renderizarFiltros(categorias);
    sincronizarHash();
    renderizarCatalogo();
    renderizarCarrito();
  } catch (error) {
    console.error(error);
    estado.classList.add("estado--error");
    estado.innerHTML = `
      <span>No se pudo cargar el catálogo. Verifique su conexión o Live Server.</span><br>
      <button class="btn-reintentar" onclick="iniciar()">Reintentar</button>
    `;
    grilla.replaceChildren();
    grilla.removeAttribute("aria-busy");
  }
}

window.addEventListener("hashchange", () => {
  sincronizarHash();
  renderizarCatalogo();
});

iniciar();