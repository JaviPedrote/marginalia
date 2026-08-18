/**
 * Lectura validada de las variables de entorno públicas.
 *
 * Sin esto, un .env.local incompleto revienta dentro de @supabase/ssr con un
 * error genérico de URL inválida y cuesta diez minutos entender qué falta.
 * El DoD del §8 exige que el proyecto sea reproducible desde cero: eso incluye
 * que el fallo por configuración diga exactamente qué configurar.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. ` +
        `Copia .env.example a .env.local y rellénala con los valores del ` +
        `proyecto de Supabase (Project Settings → API).`
    );
  }
  return value;
}

export function supabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ),
  };
}
