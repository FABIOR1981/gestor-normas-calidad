/*
  Capa de datos.

  Todas las funciones son async para que la interfaz no dependa de si los datos
  vienen de memoria o de Supabase. En modo "memoria" usan un objeto en RAM con
  datos de ejemplo. Al conectar Supabase se agrega la rama correspondiente aquí.
*/
const Persistencia = (() => {
  const estados = ["Pendiente", "Cumple", "Parcial", "No cumple", "No aplica"];

  // Datos de ejemplo (ISO 9001:2015, cláusulas principales)
  const datos = {
    normas: [
      { id: "iso9001", nombre: "ISO 9001:2015", version: "2015" },
      { id: "iso14001", nombre: "ISO 14001:2015", version: "2015" },
    ],
    requisitos: [
      { id: "r1", normaId: "iso9001", codigo: "4.1", texto: "Comprensión de la organización y de su contexto", responsable: "Dirección", estado: "Cumple", observaciones: "" },
      { id: "r2", normaId: "iso9001", codigo: "5.2", texto: "Política de la calidad", responsable: "Dirección", estado: "Parcial", observaciones: "Falta difusión al personal de planta" },
      { id: "r3", normaId: "iso9001", codigo: "6.1", texto: "Acciones para abordar riesgos y oportunidades", responsable: "Calidad", estado: "No cumple", observaciones: "" },
      { id: "r4", normaId: "iso9001", codigo: "7.2", texto: "Competencia del personal", responsable: "RR. HH.", estado: "Cumple", observaciones: "" },
      { id: "r5", normaId: "iso9001", codigo: "8.5", texto: "Producción y prestación del servicio", responsable: "Operaciones", estado: "Pendiente", observaciones: "" },
      { id: "r6", normaId: "iso9001", codigo: "9.2", texto: "Auditoría interna", responsable: "Calidad", estado: "Pendiente", observaciones: "" },
      { id: "r7", normaId: "iso9001", codigo: "10.2", texto: "No conformidad y acción correctiva", responsable: "Calidad", estado: "No aplica", observaciones: "" },
      { id: "r8", normaId: "iso14001", codigo: "6.1.2", texto: "Aspectos ambientales", responsable: "Medio ambiente", estado: "Parcial", observaciones: "" },
    ],
    noConformidades: [
      { id: "nc1", requisitoId: "r3", descripcion: "No existe registro de riesgos actualizado", accion: "Relevar riesgos por proceso", fechaLimite: "2026-12-15", creada: "2026-10-20" },
    ],
  };

  let contadorNc = 2;

  const demora = (valor) => new Promise((resolver) => setTimeout(() => resolver(structuredClone(valor)), 80));

  return {
    estados,

    async obtenerNormas() {
      return demora(datos.normas);
    },

    async obtenerRequisitos(normaId) {
      return demora(datos.requisitos.filter((r) => r.normaId === normaId));
    },

    async guardarEvaluacion(requisitoId, cambios) {
      const requisito = datos.requisitos.find((r) => r.id === requisitoId);
      if (!requisito) throw new Error("Requisito no encontrado");
      Object.assign(requisito, cambios);
      return demora(requisito);
    },

    async obtenerNoConformidades(normaId) {
      const idsNorma = datos.requisitos.filter((r) => r.normaId === normaId).map((r) => r.id);
      return demora(datos.noConformidades.filter((nc) => idsNorma.includes(nc.requisitoId)));
    },

    async registrarNoConformidad(nc) {
      const nueva = {
        id: `nc${++contadorNc}`,
        creada: new Date().toISOString().slice(0, 10),
        ...nc,
      };
      datos.noConformidades.push(nueva);
      return demora(nueva);
    },
  };
})();
