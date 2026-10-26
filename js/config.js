/*
  Configuración de la app.

  MODO:
    "memoria"  → datos de prueba en el navegador (se pierden al recargar).
    "supabase" → datos reales en Supabase (requiere URL y clave pública).

  Cuando se conecte Supabase, cambiar MODO y completar SUPABASE_URL y SUPABASE_ANON_KEY.
  La clave anon es pública por diseño: la seguridad real depende de las políticas RLS.
*/
const CONFIG = {
  MODO: "memoria",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};
