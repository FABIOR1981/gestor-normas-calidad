/*
  Capa de datos.

  Todas las funciones son async para que la interfaz no dependa de si los datos
  vienen de memoria o de Supabase. En modo "memoria" usan un objeto en RAM con
  datos de ejemplo. Al conectar Supabase se reemplazan estas funciones por
  llamadas a la base, manteniendo los mismos nombres y formas de retorno.

  Modelo:
    clientes         1 ──< clienteNormas >── N  normas
    normas           1 ──< requisitos
    evaluaciones     (cliente, requisito) → estado y observaciones
    noConformidades  (cliente, requisito) → hallazgo y acción
*/
const Persistencia = (() => {
  const estados = ["Pendiente", "Cumple", "Parcial", "No cumple", "No aplica"];

  const datos = {
    clientes: [
      { id: "c1", nombre: "Empresa Demo 1 S.A.", rut: "210000000010", rubro: "Alimentos", contacto: "Ana Pérez · 099 000 111", responsableCalidad: "Ana Pérez" },
      { id: "c2", nombre: "Empresa Demo 2 S.R.L.", rut: "210000000020", rubro: "Servicios", contacto: "Juan López · 098 000 222", responsableCalidad: "Juan López" },
    ],
    normas: [
      { id: "n1", nombre: "ISO 9001:2015", version: "2015" },
      { id: "n2", nombre: "ISO 14001:2015", version: "2015" },
    ],
    requisitos: [
      { id: "r1", normaId: "n1", codigo: "4.1", texto: "Comprensión de la organización y de su contexto", responsable: "Dirección" },
      { id: "r2", normaId: "n1", codigo: "5.2", texto: "Política de la calidad", responsable: "Dirección" },
      { id: "r3", normaId: "n1", codigo: "6.1", texto: "Acciones para abordar riesgos y oportunidades", responsable: "Calidad" },
      { id: "r4", normaId: "n1", codigo: "7.2", texto: "Competencia del personal", responsable: "RR. HH." },
      { id: "r5", normaId: "n1", codigo: "8.5", texto: "Producción y prestación del servicio", responsable: "Operaciones" },
      { id: "r6", normaId: "n2", codigo: "6.1.2", texto: "Aspectos ambientales", responsable: "Medio ambiente" },
    ],
    clienteNormas: [
      { clienteId: "c1", normaId: "n1" },
      { clienteId: "c1", normaId: "n2" },
      { clienteId: "c2", normaId: "n1" },
    ],
    evaluaciones: [
      { clienteId: "c1", requisitoId: "r1", estado: "Cumple", observaciones: "" },
      { clienteId: "c1", requisitoId: "r2", estado: "Parcial", observaciones: "Falta difusión al personal de planta" },
      { clienteId: "c1", requisitoId: "r3", estado: "No cumple", observaciones: "" },
    ],
    noConformidades: [
      { id: "nc1", clienteId: "c1", requisitoId: "r3", descripcion: "No existe registro de riesgos actualizado", accion: "Relevar riesgos por proceso", fechaLimite: "2026-12-15", creada: "2026-10-20" },
    ],
  };

  let secuencia = 100;
  const nuevoId = (prefijo) => `${prefijo}${++secuencia}`;
  const hoy = () => new Date().toISOString().slice(0, 10);
  const demora = (valor) => new Promise((resolver) => setTimeout(() => resolver(structuredClone(valor)), 60));

  const evaluacionDe = (clienteId, requisitoId) =>
    datos.evaluaciones.find((e) => e.clienteId === clienteId && e.requisitoId === requisitoId);

  return {
    estados,

    // ---------- Clientes ----------
    async obtenerClientes() {
      return demora(datos.clientes);
    },

    async crearCliente(cliente) {
      const nuevo = { id: nuevoId("c"), ...cliente };
      datos.clientes.push(nuevo);
      return demora(nuevo);
    },

    async actualizarCliente(clienteId, cambios) {
      const cliente = datos.clientes.find((c) => c.id === clienteId);
      if (!cliente) throw new Error("Cliente no encontrado");
      Object.assign(cliente, cambios);
      return demora(cliente);
    },

    // ---------- Normas ----------
    async obtenerNormas() {
      return demora(datos.normas);
    },

    async crearNorma({ nombre, version }) {
      const nueva = { id: nuevoId("n"), nombre, version: version || "" };
      datos.normas.push(nueva);
      return demora(nueva);
    },

    async obtenerRequisitos(normaId) {
      return demora(datos.requisitos.filter((r) => r.normaId === normaId));
    },

    async agregarRequisitos(normaId, requisitos) {
      const nuevos = requisitos.map((r) => ({
        id: nuevoId("r"),
        normaId,
        codigo: r.codigo,
        texto: r.texto,
        responsable: r.responsable || "",
      }));
      datos.requisitos.push(...nuevos);
      return demora(nuevos);
    },

    // ---------- Asociación cliente ↔ normas ----------
    async obtenerNormaIdsDeCliente(clienteId) {
      return demora(datos.clienteNormas.filter((cn) => cn.clienteId === clienteId).map((cn) => cn.normaId));
    },

    async obtenerNormasDeCliente(clienteId) {
      const ids = datos.clienteNormas.filter((cn) => cn.clienteId === clienteId).map((cn) => cn.normaId);
      return demora(datos.normas.filter((n) => ids.includes(n.id)));
    },

    async guardarNormasDeCliente(clienteId, normaIds) {
      datos.clienteNormas = datos.clienteNormas.filter((cn) => cn.clienteId !== clienteId);
      normaIds.forEach((normaId) => datos.clienteNormas.push({ clienteId, normaId }));
      return demora(normaIds);
    },

    // ---------- Cumplimiento ----------
    // Requisitos de la norma con el estado propio de este cliente.
    async obtenerCumplimiento(clienteId, normaId) {
      const filas = datos.requisitos
        .filter((r) => r.normaId === normaId)
        .map((r) => {
          const ev = evaluacionDe(clienteId, r.id);
          return {
            ...r,
            estado: ev ? ev.estado : "Pendiente",
            observaciones: ev ? ev.observaciones : "",
          };
        });
      return demora(filas);
    },

    async guardarEvaluacion(clienteId, requisitoId, cambios) {
      const requisito = datos.requisitos.find((r) => r.id === requisitoId);
      if (!requisito) throw new Error("Requisito no encontrado");

      let ev = evaluacionDe(clienteId, requisitoId);
      if (!ev) {
        ev = { clienteId, requisitoId, estado: "Pendiente", observaciones: "" };
        datos.evaluaciones.push(ev);
      }
      Object.assign(ev, cambios);
      return demora({ ...requisito, estado: ev.estado, observaciones: ev.observaciones });
    },

    async obtenerNoConformidades(clienteId, normaId) {
      const idsNorma = datos.requisitos.filter((r) => r.normaId === normaId).map((r) => r.id);
      return demora(
        datos.noConformidades.filter((nc) => nc.clienteId === clienteId && idsNorma.includes(nc.requisitoId))
      );
    },

    async registrarNoConformidad(clienteId, nc) {
      const nueva = { id: nuevoId("nc"), clienteId, creada: hoy(), ...nc };
      datos.noConformidades.push(nueva);
      return demora(nueva);
    },
  };
})();
