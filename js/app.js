(() => {
  "use strict";

  // ---------- Referencias al DOM ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    // Login y encabezado
    login: $("pantalla-login"),
    formLogin: $("form-login"),
    loginEmail: $("login-email"),
    loginClave: $("login-clave"),
    loginError: $("login-error"),
    app: $("pantalla-app"),
    navegacion: $("navegacion"),
    btnSalir: $("btn-salir"),
    usuario: $("usuario-actual"),
    modo: $("modo-etiqueta"),
    avisos: $("avisos"),

    // Cumplimiento
    selectorCliente: $("selector-cliente"),
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

    // Clientes
    formCliente: $("form-cliente"),
    tablaClientes: $("tabla-clientes"),
    panelNormasCliente: $("panel-normas-cliente"),
    tituloPanelCliente: $("titulo-panel-cliente"),
    listaNormasCheck: $("lista-normas-check"),
    btnGuardarNormas: $("btn-guardar-normas"),
    btnCancelarNormas: $("btn-cancelar-normas"),

    // Normas
    formNorma: $("form-norma"),
    normaNombre: $("norma-nombre"),
    normaVersion: $("norma-version"),
    formImportar: $("form-importar"),
    importarNombre: $("importar-nombre"),
    importarVersion: $("importar-version"),
    importarArchivo: $("importar-archivo"),
    importarError: $("importar-error"),
    listaNormas: $("lista-normas"),
    panelNorma: $("panel-norma"),
    tituloNorma: $("titulo-norma"),
    subtituloNorma: $("subtitulo-norma"),
    formRequisito: $("form-requisito"),
    reqCodigo: $("req-codigo"),
    reqTexto: $("req-texto"),
    reqResponsable: $("req-responsable"),
    tablaRequisitosNorma: $("tabla-requisitos-norma"),
  };

  // ---------- Estado ----------
  const estado = {
    usuario: null,
    vista: "cumplimiento",
    clientes: [],
    normas: [],
    conteoNormas: {},          // clienteId → cantidad de normas asociadas
    clienteId: null,
    normaId: null,
    normasCliente: [],         // normas asociadas al cliente seleccionado
    cumplimiento: [],          // requisitos de la norma con el estado del cliente
    noConformidades: [],
    clienteEditandoId: null,
    clienteEditandoDatosId: null,
    normaGestionId: null,
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

  function celdaVacia(colspan, texto) {
    const fila = document.createElement("tr");
    const celda = crear("td", "vacio", texto);
    celda.colSpan = colspan;
    fila.appendChild(celda);
    return fila;
  }

  function formatearFecha(iso) {
    if (!iso) return "Sin fecha";
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  }

  // ---------- Archivos (CSV y Excel) ----------
  function parseLinea(linea, separador) {
    const celdas = [];
    let actual = "";
    let entreComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (entreComillas && linea[i + 1] === '"') { actual += '"'; i++; }
        else entreComillas = !entreComillas;
      } else if (c === separador && !entreComillas) {
        celdas.push(actual);
        actual = "";
      } else {
        actual += c;
      }
    }
    celdas.push(actual);
    return celdas.map((s) => s.trim());
  }

  async function leerFilas(archivo) {
    if (/\.xlsx$/i.test(archivo.name)) {
      if (typeof XLSX === "undefined") throw new Error("No se pudo cargar el lector de Excel. Usá un CSV.");
      const libro = XLSX.read(await archivo.arrayBuffer(), { type: "array" });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      return XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });
    }

    const texto = await archivo.text();
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lineas.length) return [];
    const separador = lineas[0].split(";").length > lineas[0].split(",").length ? ";" : ",";
    return lineas.map((l) => parseLinea(l, separador));
  }

  function filasARequisitos(filas) {
    const normalizar = (s) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const primera = filas[0] ? normalizar(filas[0][0]) : "";
    const datos = primera === "codigo" ? filas.slice(1) : filas;

    return datos
      .map((f) => ({
        codigo: String(f[0] ?? "").trim(),
        texto: String(f[1] ?? "").trim(),
        responsable: String(f[2] ?? "").trim(),
      }))
      .filter((r) => r.codigo && r.texto);
  }

  // ---------- Vistas generales ----------
  function mostrarLogin() {
    el.app.classList.add("oculto");
    el.navegacion.classList.add("oculto");
    el.login.classList.remove("oculto");
    el.btnSalir.classList.add("oculto");
    el.usuario.textContent = "";
  }

  function mostrarApp() {
    el.login.classList.add("oculto");
    el.app.classList.remove("oculto");
    el.navegacion.classList.remove("oculto");
    el.btnSalir.classList.remove("oculto");
    el.usuario.textContent = estado.usuario;
  }

  function mostrarVista(nombre) {
    estado.vista = nombre;
    document.querySelectorAll(".vista").forEach((v) => {
      v.classList.toggle("oculto", v.id !== `vista-${nombre}`);
    });
    el.navegacion.querySelectorAll("button").forEach((b) => {
      if (b.dataset.vista === nombre) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });

    if (nombre === "cumplimiento") cargarNormasDelCliente();
    if (nombre === "clientes") renderClientes();
    if (nombre === "normas") renderNormas();
  }

  // ---------- Cumplimiento ----------
  function renderResumen() {
    const total = estado.cumplimiento.length;
    const cumplen = estado.cumplimiento.filter((r) => r.estado === "Cumple").length;
    const aplicables = estado.cumplimiento.filter((r) => r.estado !== "No aplica").length;
    const pct = aplicables ? Math.round((cumplen / aplicables) * 100) : 0;

    el.totalReq.textContent = total;
    el.totalCumple.textContent = cumplen;
    el.totalNc.textContent = estado.noConformidades.length;
    el.porcentaje.textContent = `${pct}%`;
    el.anillo.setAttribute("stroke-dasharray", `${pct}, 100`);
  }

  function renderTablaCumplimiento() {
    el.tabla.replaceChildren();

    if (!estado.normasCliente.length) {
      el.tabla.appendChild(celdaVacia(5, "Este cliente no tiene normas asociadas. Asociálas desde la pestaña Clientes."));
      return;
    }
    if (!estado.normaId) {
      el.tabla.appendChild(celdaVacia(5, "Seleccioná una norma."));
      return;
    }

    const texto = el.buscar.value.trim().toLowerCase();
    const filas = estado.cumplimiento.filter(
      (r) => !texto || r.codigo.toLowerCase().includes(texto) || r.texto.toLowerCase().includes(texto)
    );

    if (!filas.length) {
      el.tabla.appendChild(celdaVacia(5, "No hay requisitos que coincidan con la búsqueda."));
      return;
    }

    filas.forEach((req) => {
      const fila = document.createElement("tr");
      fila.appendChild(crear("td", "codigo", req.codigo));
      fila.appendChild(crear("td", "texto-requisito", req.texto));
      fila.appendChild(crear("td", "", req.responsable));

      const celdaEstado = document.createElement("td");
      const selector = document.createElement("select");
      selector.className = "selector-estado";
      selector.setAttribute("aria-label", `Estado del requisito ${req.codigo}`);
      Persistencia.estados.forEach((valor) => {
        selector.appendChild(new Option(valor, valor, false, valor === req.estado));
      });
      selector.addEventListener("change", () => cambiarEstado(req.id, selector.value));
      celdaEstado.appendChild(selector);
      fila.appendChild(celdaEstado);

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

  function renderNoConformidades() {
    el.ncRequisito.replaceChildren(
      ...estado.cumplimiento.map((r) => new Option(`${r.codigo} · ${r.texto}`, r.id))
    );
    el.ncRequisito.disabled = !estado.cumplimiento.length;

    el.listaNc.replaceChildren();
    if (!estado.noConformidades.length) {
      el.listaNc.appendChild(crear("li", "meta", "No hay no conformidades registradas para esta norma."));
      return;
    }
    estado.noConformidades.forEach((nc) => {
      const req = estado.cumplimiento.find((r) => r.id === nc.requisitoId);
      const item = document.createElement("li");
      item.appendChild(crear("span", "titulo-nc", nc.descripcion));
      item.appendChild(crear(
        "span", "meta",
        `Requisito ${req ? req.codigo : "—"} · Acción: ${nc.accion || "sin definir"} · Límite: ${formatearFecha(nc.fechaLimite)}`
      ));
      el.listaNc.appendChild(item);
    });
  }

  function renderCumplimiento() {
    renderResumen();
    renderTablaCumplimiento();
    renderNoConformidades();
  }

  async function cargarNormasDelCliente() {
    if (!estado.clienteId) return;
    estado.normasCliente = await Persistencia.obtenerNormasDeCliente(estado.clienteId);

    el.selectorNorma.replaceChildren(
      ...estado.normasCliente.map((n) => new Option(n.nombre, n.id))
    );
    el.selectorNorma.disabled = !estado.normasCliente.length;

    const sigueVigente = estado.normasCliente.some((n) => n.id === estado.normaId);
    if (!sigueVigente) estado.normaId = estado.normasCliente[0] ? estado.normasCliente[0].id : null;
    if (estado.normaId) el.selectorNorma.value = estado.normaId;

    await cargarCumplimiento();
  }

  async function cargarCumplimiento() {
    if (estado.clienteId && estado.normaId) {
      const [cumplimiento, noConformidades] = await Promise.all([
        Persistencia.obtenerCumplimiento(estado.clienteId, estado.normaId),
        Persistencia.obtenerNoConformidades(estado.clienteId, estado.normaId),
      ]);
      estado.cumplimiento = cumplimiento;
      estado.noConformidades = noConformidades;
    } else {
      estado.cumplimiento = [];
      estado.noConformidades = [];
    }
    renderCumplimiento();
  }

  async function cambiarEstado(requisitoId, nuevoEstado) {
    try {
      const actualizado = await Persistencia.guardarEvaluacion(estado.clienteId, requisitoId, { estado: nuevoEstado });
      Object.assign(estado.cumplimiento.find((r) => r.id === requisitoId), actualizado);
      renderResumen();
      aviso("Estado actualizado");
    } catch (error) {
      aviso("No se pudo guardar el estado");
      console.error(error);
    }
  }

  async function guardarObservacion(requisitoId, texto) {
    try {
      const actualizado = await Persistencia.guardarEvaluacion(estado.clienteId, requisitoId, {
        observaciones: texto.trim(),
      });
      Object.assign(estado.cumplimiento.find((r) => r.id === requisitoId), actualizado);
      aviso("Observación guardada");
    } catch (error) {
      aviso("No se pudo guardar la observación");
      console.error(error);
    }
  }

  // ---------- Clientes ----------
  async function cargarClientes() {
    estado.clientes = await Persistencia.obtenerClientes();
    const conteos = await Promise.all(
      estado.clientes.map((c) => Persistencia.obtenerNormaIdsDeCliente(c.id))
    );
    estado.conteoNormas = {};
    estado.clientes.forEach((c, i) => { estado.conteoNormas[c.id] = conteos[i].length; });

    el.selectorCliente.replaceChildren(
      ...estado.clientes.map((c) => new Option(c.nombre, c.id))
    );
    if (!estado.clienteId || !estado.clientes.some((c) => c.id === estado.clienteId)) {
      estado.clienteId = estado.clientes[0] ? estado.clientes[0].id : null;
    }
    if (estado.clienteId) el.selectorCliente.value = estado.clienteId;
  }

  function renderClientes() {
    el.tablaClientes.replaceChildren();

    if (!estado.clientes.length) {
      el.tablaClientes.appendChild(celdaVacia(6, "Todavía no hay clientes cargados."));
      return;
    }

    estado.clientes.forEach((c) => {
      const fila = document.createElement("tr");
      fila.appendChild(crear("td", "texto-requisito", c.nombre));
      fila.appendChild(crear("td", "codigo", c.rut));
      fila.appendChild(crear("td", "", c.rubro));
      fila.appendChild(crear("td", "", c.responsableCalidad));
      fila.appendChild(crear("td", "", String(estado.conteoNormas[c.id] || 0)));

      const celdaAccion = document.createElement("td");
      const boton = crear("button", "boton-fantasma", "Normas");
      boton.type = "button";
      boton.addEventListener("click", () => abrirPanelNormas(c));
      const botonEditar = crear("button", "boton-fantasma", "Editar");
      botonEditar.type = "button";
      botonEditar.addEventListener("click", () => editarCliente(c));
      celdaAccion.append(boton, botonEditar);
      fila.appendChild(celdaAccion);

      el.tablaClientes.appendChild(fila);
    });
  }

  async function abrirPanelNormas(cliente) {
    estado.clienteEditandoId = cliente.id;
    el.tituloPanelCliente.textContent = `Normas de ${cliente.nombre}`;

    const asociadas = new Set(await Persistencia.obtenerNormaIdsDeCliente(cliente.id));
    el.listaNormasCheck.replaceChildren();

    if (!estado.normas.length) {
      el.listaNormasCheck.appendChild(crear("p", "ayuda", "Primero cargá normas en la pestaña Normas."));
    }

    estado.normas.forEach((n) => {
      const etiqueta = document.createElement("label");
      etiqueta.className = "opcion-check";
      const casilla = document.createElement("input");
      casilla.type = "checkbox";
      casilla.value = n.id;
      casilla.checked = asociadas.has(n.id);
      etiqueta.appendChild(casilla);
      etiqueta.appendChild(crear("span", "", n.version ? `${n.nombre} (${n.version})` : n.nombre));
      el.listaNormasCheck.appendChild(etiqueta);
    });

    el.panelNormasCliente.classList.remove("oculto");
    el.panelNormasCliente.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cerrarPanelNormas() {
    estado.clienteEditandoId = null;
    el.panelNormasCliente.classList.add("oculto");
  }

  async function guardarNormasDelCliente() {
    const seleccionadas = [...el.listaNormasCheck.querySelectorAll("input[type=checkbox]:checked")]
      .map((c) => c.value);
    const clienteId = estado.clienteEditandoId;

    try {
      await Persistencia.guardarNormasDeCliente(clienteId, seleccionadas);
      cerrarPanelNormas();
      await cargarClientes();
      renderClientes();
      aviso("Normas del cliente actualizadas");
    } catch (error) {
      aviso("No se pudieron guardar las normas");
      console.error(error);
    }
  }

  function editarCliente(cliente) {
    estado.clienteEditandoDatosId = cliente.id;
    $("cli-nombre").value = cliente.nombre || "";
    $("cli-contacto").value = cliente.contacto || "";
    $("cli-rut").value = cliente.rut || "";
    $("cli-rubro").value = cliente.rubro || "";
    $("cli-responsable").value = cliente.responsableCalidad || "";

    $("titulo-form-cliente").textContent = `Editar ${cliente.nombre}`;
    $("btn-guardar-cliente").textContent = "Guardar cambios";
    $("btn-cancelar-edicion").classList.remove("oculto");
    el.formCliente.scrollIntoView({ behavior: "smooth", block: "center" });
    $("cli-nombre").focus();
  }

  function cancelarEdicionCliente() {
    estado.clienteEditandoDatosId = null;
    el.formCliente.reset();
    $("titulo-form-cliente").textContent = "Nuevo cliente";
    $("btn-guardar-cliente").textContent = "Guardar cliente";
    $("btn-cancelar-edicion").classList.add("oculto");
  }

  $("btn-cancelar-edicion").addEventListener("click", cancelarEdicionCliente);

  // ---------- Normas ----------
  async function cargarNormas() {
    estado.normas = await Persistencia.obtenerNormas();
  }

  function renderNormas() {
    el.listaNormas.replaceChildren();

    if (!estado.normas.length) {
      el.listaNormas.appendChild(crear("li", "meta", "Todavía no hay normas cargadas."));
    }

    estado.normas.forEach((n) => {
      const item = document.createElement("li");
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "norma-item";
      if (n.id === estado.normaGestionId) boton.setAttribute("aria-current", "true");
      boton.appendChild(crear("span", "titulo-nc", n.nombre));
      boton.appendChild(crear("span", "meta", n.version ? `Versión ${n.version}` : "Sin versión"));
      boton.addEventListener("click", () => abrirNorma(n.id));
      item.appendChild(boton);
      el.listaNormas.appendChild(item);
    });

    if (estado.normaGestionId) renderPanelNorma();
  }

  async function abrirNorma(normaId) {
    estado.normaGestionId = normaId;
    renderNormas();
  }

  async function renderPanelNorma() {
    const norma = estado.normas.find((n) => n.id === estado.normaGestionId);
    if (!norma) {
      el.panelNorma.classList.add("oculto");
      return;
    }

    el.tituloNorma.textContent = norma.nombre;
    el.subtituloNorma.textContent = norma.version ? `Versión ${norma.version}` : "";
    el.panelNorma.classList.remove("oculto");

    const requisitos = await Persistencia.obtenerRequisitos(norma.id);
    el.tablaRequisitosNorma.replaceChildren();

    if (!requisitos.length) {
      el.tablaRequisitosNorma.appendChild(celdaVacia(3, "Esta norma todavía no tiene requisitos."));
      return;
    }

    requisitos.forEach((r) => {
      const fila = document.createElement("tr");
      fila.appendChild(crear("td", "codigo", r.codigo));
      fila.appendChild(crear("td", "texto-requisito", r.texto));
      fila.appendChild(crear("td", "", r.responsable));
      el.tablaRequisitosNorma.appendChild(fila);
    });
  }

  // ---------- Carga general ----------
  async function cargarTodo() {
    await Promise.all([cargarClientes(), cargarNormas()]);
    mostrarVista(estado.vista);
  }

  // ---------- Eventos: acceso y navegación ----------
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
    await cargarTodo();
  });

  el.btnSalir.addEventListener("click", () => {
    estado.usuario = null;
    mostrarLogin();
  });

  el.navegacion.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-vista]");
    if (boton) mostrarVista(boton.dataset.vista);
  });

  // ---------- Eventos: cumplimiento ----------
  el.selectorCliente.addEventListener("change", async () => {
    estado.clienteId = el.selectorCliente.value;
    estado.normaId = null;
    await cargarNormasDelCliente();
  });

  el.selectorNorma.addEventListener("change", async () => {
    estado.normaId = el.selectorNorma.value;
    await cargarCumplimiento();
  });

  el.buscar.addEventListener("input", renderTablaCumplimiento);

  el.formNc.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const nueva = {
      requisitoId: el.ncRequisito.value,
      descripcion: el.ncDescripcion.value.trim(),
      accion: el.ncAccion.value.trim(),
      fechaLimite: el.ncFecha.value,
    };
    if (!nueva.requisitoId || !nueva.descripcion) return;

    try {
      const creada = await Persistencia.registrarNoConformidad(estado.clienteId, nueva);
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

  // ---------- Eventos: clientes ----------
  el.formCliente.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const cliente = {
      nombre: $("cli-nombre").value.trim(),
      contacto: $("cli-contacto").value.trim(),
      rut: $("cli-rut").value.trim(),
      rubro: $("cli-rubro").value.trim(),
      responsableCalidad: $("cli-responsable").value.trim(),
    };

    try {
      if (estado.clienteEditandoDatosId) {
        const actualizado = await Persistencia.actualizarCliente(estado.clienteEditandoDatosId, cliente);
        cancelarEdicionCliente();
        await cargarClientes();
        renderClientes();
        aviso(`Cambios guardados en ${actualizado.nombre}`);
        return;
      }

      const creado = await Persistencia.crearCliente(cliente);
      el.formCliente.reset();
      await cargarClientes();
      estado.clienteId = creado.id;
      renderClientes();
      aviso("Cliente guardado. Ahora asociale sus normas.");
      abrirPanelNormas(creado);
    } catch (error) {
      aviso("No se pudo guardar el cliente");
      console.error(error);
    }
  });

  el.btnGuardarNormas.addEventListener("click", guardarNormasDelCliente);
  el.btnCancelarNormas.addEventListener("click", cerrarPanelNormas);

  // ---------- Eventos: normas ----------
  el.formNorma.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    try {
      const creada = await Persistencia.crearNorma({
        nombre: el.normaNombre.value.trim(),
        version: el.normaVersion.value.trim(),
      });
      el.formNorma.reset();
      await cargarNormas();
      estado.normaGestionId = creada.id;
      renderNormas();
      aviso("Norma creada. Ahora agregá sus requisitos.");
    } catch (error) {
      aviso("No se pudo crear la norma");
      console.error(error);
    }
  });

  el.formImportar.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    el.importarError.textContent = "";

    const archivo = el.importarArchivo.files[0];
    if (!archivo) return;

    try {
      const requisitos = filasARequisitos(await leerFilas(archivo));
      if (!requisitos.length) {
        el.importarError.textContent = "No encontré requisitos. Revisá que tenga las columnas codigo, requisito y responsable.";
        return;
      }

      const norma = await Persistencia.crearNorma({
        nombre: el.importarNombre.value.trim(),
        version: el.importarVersion.value.trim(),
      });
      await Persistencia.agregarRequisitos(norma.id, requisitos);

      el.formImportar.reset();
      await cargarNormas();
      estado.normaGestionId = norma.id;
      renderNormas();
      aviso(`Se importaron ${requisitos.length} requisitos`);
    } catch (error) {
      el.importarError.textContent = error.message || "No se pudo leer el archivo.";
      console.error(error);
    }
  });

  el.formRequisito.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!estado.normaGestionId) return;
    try {
      await Persistencia.agregarRequisitos(estado.normaGestionId, [{
        codigo: el.reqCodigo.value.trim(),
        texto: el.reqTexto.value.trim(),
        responsable: el.reqResponsable.value.trim(),
      }]);
      el.formRequisito.reset();
      renderPanelNorma();
      aviso("Requisito agregado");
    } catch (error) {
      aviso("No se pudo agregar el requisito");
      console.error(error);
    }
  });

  // ---------- Informe ----------
  function metricaInforme(valor, etiqueta) {
    const caja = crear("div", "metrica");
    caja.appendChild(crear("span", "", String(valor)));
    caja.appendChild(crear("small", "", etiqueta));
    return caja;
  }

  function generarInforme() {
    const cliente = estado.clientes.find((c) => c.id === estado.clienteId);
    const norma = estado.normasCliente.find((n) => n.id === estado.normaId);
    if (!cliente || !norma) {
      aviso("Elegí un cliente y una norma para generar el informe");
      return;
    }

    const contar = (e) => estado.cumplimiento.filter((r) => r.estado === e).length;
    const aplicables = estado.cumplimiento.length - contar("No aplica");
    const cumplen = contar("Cumple");
    const pct = aplicables ? Math.round((cumplen / aplicables) * 100) : 0;
    const fecha = new Date().toLocaleDateString("es-UY", { day: "2-digit", month: "long", year: "numeric" });

    $("informe-titulo").textContent = `Informe de cumplimiento · ${norma.nombre}`;
    $("informe-fecha").textContent = `Emitido el ${fecha}`;

    const datos = $("informe-datos");
    datos.replaceChildren();
    [
      ["Cliente", cliente.nombre],
      ["RUT", cliente.rut],
      ["Rubro", cliente.rubro],
      ["Contacto", cliente.contacto],
      ["Responsable de calidad", cliente.responsableCalidad],
      ["Norma", norma.version ? `${norma.nombre} (${norma.version})` : norma.nombre],
    ].forEach(([etiqueta, valor]) => {
      datos.appendChild(crear("dt", "", etiqueta));
      datos.appendChild(crear("dd", "", valor || "—"));
    });

    const resumen = $("informe-resumen");
    resumen.replaceChildren(
      metricaInforme(`${pct}%`, "Cumplimiento"),
      metricaInforme(cumplen, "Cumplen"),
      metricaInforme(contar("Parcial"), "Parciales"),
      metricaInforme(contar("No cumple"), "No cumplen"),
      metricaInforme(contar("Pendiente"), "Pendientes"),
      metricaInforme(contar("No aplica"), "No aplican")
    );

    const clases = {
      "Cumple": "estado-cumple",
      "Parcial": "estado-parcial",
      "No cumple": "estado-no-cumple",
      "No aplica": "estado-no-aplica",
      "Pendiente": "estado-pendiente",
    };
    const tabla = $("informe-tabla");
    tabla.replaceChildren();
    if (!estado.cumplimiento.length) {
      tabla.appendChild(celdaVacia(5, "La norma no tiene requisitos."));
    }
    estado.cumplimiento.forEach((r) => {
      const fila = document.createElement("tr");
      fila.appendChild(crear("td", "codigo", r.codigo));
      fila.appendChild(crear("td", "texto-requisito", r.texto));
      fila.appendChild(crear("td", "", r.responsable));
      const celdaEstado = document.createElement("td");
      celdaEstado.appendChild(crear("span", `estado ${clases[r.estado] || ""}`, r.estado));
      fila.appendChild(celdaEstado);
      fila.appendChild(crear("td", "", r.observaciones || "—"));
      tabla.appendChild(fila);
    });

    const lista = $("informe-nc");
    lista.replaceChildren();
    if (!estado.noConformidades.length) {
      lista.appendChild(crear("li", "meta", "No hay no conformidades abiertas."));
    }
    estado.noConformidades.forEach((nc) => {
      const req = estado.cumplimiento.find((r) => r.id === nc.requisitoId);
      const item = document.createElement("li");
      item.appendChild(crear("span", "titulo-nc", nc.descripcion));
      item.appendChild(crear(
        "span", "meta",
        `Requisito ${req ? req.codigo : "—"} · Acción: ${nc.accion || "sin definir"} · Límite: ${formatearFecha(nc.fechaLimite)}`
      ));
      lista.appendChild(item);
    });

    $("informe-firma-nombre").textContent = cliente.responsableCalidad || "";
    $("informe-elaborado-texto").textContent = $("informe-elaborado-por").value.trim();

    mostrarVista("informe");
    window.scrollTo(0, 0);
  }

  $("btn-informe").addEventListener("click", generarInforme);
  $("btn-volver-informe").addEventListener("click", () => mostrarVista("cumplimiento"));
  $("btn-imprimir").addEventListener("click", () => {
    $("informe-elaborado-texto").textContent = $("informe-elaborado-por").value.trim();
    window.print();
  });

  // ---------- Inicio ----------
  el.modo.textContent =
    CONFIG.MODO === "memoria"
      ? "Modo prueba · datos en memoria"
      : "Conectado a Supabase";
  mostrarLogin();
})();
