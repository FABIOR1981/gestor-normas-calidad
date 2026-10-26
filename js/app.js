(() => {
  "use strict";

  // ---------- Referencias al DOM ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    login: $("pantalla-login"),
    formLogin: $("form-login"),
    loginEmail: $("login-email"),
    loginClave: $("login-clave"),
    loginError: $("login-error"),
    app: $("pantalla-app"),
    btnSalir: $("btn-salir"),
    usuario: $("usuario-actual"),
    modo: $("modo-etiqueta"),
    selectorNorma: $("selector-norma"),
    buscar: $("buscar-requisito"),
    totalReq: $("total-requisitos"),
    totalCumple: $("total-cumple"),
    totalNc: $("total-no-conf"),
    porcentaje: $("porcentaje"),
    anillo: $("anillo-progreso"),
    tabla: $("tabla-requisitos"),
    formNc: $("form-no-conformidad"),
    ncRequisito: $("nc-requisito"),
    ncDescripcion: $("nc-descripcion"),
    ncAccion: $("nc-accion"),
    ncFecha: $("nc-fecha-limite"),
    listaNc: $("lista-no-conformidades"),
    avisos: $("avisos"),
  };

  // ---------- Estado ----------
  const estado = {
    usuario: null,
    normas: [],
    normaId: null,
    requisitos: [],
    noConformidades: [],
  };

  const claseEstado = {
    "Cumple": "estado-cumple",
    "Parcial": "estado-parcial",
    "No cumple": "estado-no-cumple",
    "No aplica": "estado-no-aplica",
    "Pendiente": "estado-pendiente",
  };

  // ---------- Utilidades ----------
  function aviso(texto) {
    const item = document.createElement("div");
    item.className = "aviso";
    item.textContent = texto;
    el.avisos.appendChild(item);
    setTimeout(() => item.remove(), 2800);
  }

  function crear(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  }

  function formatearFecha(iso) {
    if (!iso) return "Sin fecha";
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  }

  // ---------- Vistas ----------
  function mostrarLogin() {
    el.app.classList.add("oculto");
    el.login.classList.remove("oculto");
    el.btnSalir.classList.add("oculto");
    el.usuario.textContent = "";
  }

  function mostrarApp() {
    el.login.classList.add("oculto");
    el.app.classList.remove("oculto");
    el.btnSalir.classList.remove("oculto");
    el.usuario.textContent = estado.usuario;
  }

  // ---------- Renderizado ----------
  function renderResumen() {
    const total = estado.requisitos.length;
    const cumplen = estado.requisitos.filter((r) => r.estado === "Cumple").length;
    const aplicables = estado.requisitos.filter((r) => r.estado !== "No aplica").length;
    const abiertas = estado.noConformidades.length;
    const pct = aplicables ? Math.round((cumplen / aplicables) * 100) : 0;

    el.totalReq.textContent = total;
    el.totalCumple.textContent = cumplen;
    el.totalNc.textContent = abiertas;
    el.porcentaje.textContent = `${pct}%`;
    el.anillo.setAttribute("stroke-dasharray", `${pct}, 100`);
  }

  function renderTabla() {
    const texto = el.buscar.value.trim().toLowerCase();
    const filtrados = estado.requisitos.filter(
      (r) => !texto || r.codigo.toLowerCase().includes(texto) || r.texto.toLowerCase().includes(texto)
    );

    el.tabla.replaceChildren();

    if (!filtrados.length) {
      const fila = document.createElement("tr");
      const celda = crear("td", "vacio", "No hay requisitos que coincidan con la búsqueda.");
      celda.colSpan = 5;
      fila.appendChild(celda);
      el.tabla.appendChild(fila);
      return;
    }

    filtrados.forEach((req) => {
      const fila = document.createElement("tr");

      fila.appendChild(crear("td", "codigo", req.codigo));
      fila.appendChild(crear("td", "texto-requisito", req.texto));
      fila.appendChild(crear("td", "", req.responsable));

      // Estado: selector + píldora visual
      const celdaEstado = document.createElement("td");
      const selector = document.createElement("select");
      selector.className = "selector-estado";
      selector.setAttribute("aria-label", `Estado del requisito ${req.codigo}`);
      Persistencia.estados.forEach((valor) => {
        const op = new Option(valor, valor, false, valor === req.estado);
        selector.appendChild(op);
      });
      selector.addEventListener("change", () => cambiarEstado(req.id, selector.value));
      celdaEstado.appendChild(selector);
      fila.appendChild(celdaEstado);

      // Observaciones
      const celdaObs = document.createElement("td");
      const obs = document.createElement("input");
      obs.type = "text";
      obs.className = "observacion";
      obs.value = req.observaciones || "";
      obs.placeholder = "Agregar observación";
      obs.setAttribute("aria-label", `Observaciones del requisito ${req.codigo}`);
      obs.addEventListener("change", () => guardarObservacion(req.id, obs.value));
      celdaObs.appendChild(obs);
      fila.appendChild(celdaObs);

      el.tabla.appendChild(fila);
    });
  }

  function renderSelectorRequisitos() {
    el.ncRequisito.replaceChildren();
    estado.requisitos.forEach((r) => {
      el.ncRequisito.appendChild(new Option(`${r.codigo} · ${r.texto}`, r.id));
    });
  }

  function renderNoConformidades() {
    el.listaNc.replaceChildren();

    if (!estado.noConformidades.length) {
      el.listaNc.appendChild(crear("li", "meta", "No hay no conformidades registradas."));
      return;
    }

    estado.noConformidades.forEach((nc) => {
      const req = estado.requisitos.find((r) => r.id === nc.requisitoId);
      const item = document.createElement("li");
      item.appendChild(crear("span", "titulo-nc", nc.descripcion));
      item.appendChild(crear("span", "meta", `Requisito ${req ? req.codigo : "—"} · Acción: ${nc.accion || "sin definir"} · Límite: ${formatearFecha(nc.fechaLimite)}`));
      el.listaNc.appendChild(item);
    });
  }

  function renderTodo() {
    renderResumen();
    renderTabla();
    renderSelectorRequisitos();
    renderNoConformidades();
  }

  // ---------- Carga de datos ----------
  async function cargarNormas() {
    estado.normas = await Persistencia.obtenerNormas();
    el.selectorNorma.replaceChildren(
      ...estado.normas.map((n) => new Option(n.nombre, n.id))
    );
    estado.normaId = estado.normas[0] ? estado.normas[0].id : null;
    el.selectorNorma.value = estado.normaId;
    await cargarNorma();
  }

  async function cargarNorma() {
    if (!estado.normaId) return;
    const [requisitos, noConformidades] = await Promise.all([
      Persistencia.obtenerRequisitos(estado.normaId),
      Persistencia.obtenerNoConformidades(estado.normaId),
    ]);
    estado.requisitos = requisitos;
    estado.noConformidades = noConformidades;
    renderTodo();
  }

  // ---------- Acciones ----------
  async function cambiarEstado(requisitoId, nuevoEstado) {
    try {
      const actualizado = await Persistencia.guardarEvaluacion(requisitoId, { estado: nuevoEstado });
      const req = estado.requisitos.find((r) => r.id === requisitoId);
      if (req) Object.assign(req, actualizado);
      renderResumen();
      renderTabla();
      aviso("Estado actualizado");
    } catch (error) {
      aviso("No se pudo guardar el estado");
      console.error(error);
    }
  }

  async function guardarObservacion(requisitoId, texto) {
    try {
      const actualizado = await Persistencia.guardarEvaluacion(requisitoId, { observaciones: texto.trim() });
      const req = estado.requisitos.find((r) => r.id === requisitoId);
      if (req) Object.assign(req, actualizado);
      aviso("Observación guardada");
    } catch (error) {
      aviso("No se pudo guardar la observación");
      console.error(error);
    }
  }

  // ---------- Eventos ----------
  el.formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    el.loginError.textContent = "";

    // Modo memoria: cualquier credencial sirve para probar el flujo.
    const email = el.loginEmail.value.trim();
    const clave = el.loginClave.value;
    if (!email || !clave) {
      el.loginError.textContent = "Completá correo y contraseña.";
      return;
    }

    estado.usuario = email;
    el.formLogin.reset();
    mostrarApp();
    await cargarNormas();
  });

  el.btnSalir.addEventListener("click", () => {
    estado.usuario = null;
    mostrarLogin();
  });

  el.selectorNorma.addEventListener("change", async () => {
    estado.normaId = el.selectorNorma.value;
    await cargarNorma();
  });

  el.buscar.addEventListener("input", renderTabla);

  el.formNc.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const nuevaNc = {
      requisitoId: el.ncRequisito.value,
      descripcion: el.ncDescripcion.value.trim(),
      accion: el.ncAccion.value.trim(),
      fechaLimite: el.ncFecha.value,
    };
    if (!nuevaNc.requisitoId || !nuevaNc.descripcion) return;

    try {
      const creada = await Persistencia.registrarNoConformidad(nuevaNc);
      estado.noConformidades.push(creada);
      el.formNc.reset();
      renderNoConformidades();
      renderResumen();
      aviso("No conformidad registrada");
    } catch (error) {
      aviso("No se pudo registrar la no conformidad");
      console.error(error);
    }
  });

  // ---------- Inicio ----------
  el.modo.textContent =
    CONFIG.MODO === "memoria"
      ? "Modo prueba · datos en memoria"
      : "Conectado a Supabase";
  mostrarLogin();
})();
