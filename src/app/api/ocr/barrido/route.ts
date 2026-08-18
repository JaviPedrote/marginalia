import { createClient, getUserId } from "@/lib/supabase/server";
import { cargarSettings, intentosDeHoy, procesarCaptura } from "@/lib/ocr/procesar";
import type { Capture } from "@/lib/types";
import { NextResponse } from "next/server";

/**
 * Barrido de transcripciones huérfanas (ADR-3).
 *
 * Una captura se queda colgada cuando el móvil se apaga, se pierde la
 * cobertura o el proceso muere a media transcripción. Sin barrido, esa foto
 * se queda sin texto para siempre y nadie se entera.
 *
 * Por qué no es un cron: en el plan gratuito de Vercel los cron jobs son
 * diarios, y un cron externo cada 5 minutos necesitaría una credencial de
 * servicio para saltarse RLS. Se dispara cuando el usuario abre la app —que es
 * exactamente cuando le importa ver su texto—, corre con su propia sesión y no
 * consume ninguna ejecución programada.
 *
 * Contrapartida honesta: si nadie abre la app, nada se recupera. Aceptable
 * porque el resultado solo se mira dentro de la app.
 */

export const maxDuration = 60;

// Margen antes de dar por colgada una transcripción. Por debajo de esto, el
// barrido competiría con la llamada que todavía está en curso.
const MINUTOS_DE_GRACIA = 2;
const MAXIMO_POR_BARRIDO = 5;

export async function POST() {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "sin_sesion" }, { status: 401 });
  }

  const limite = new Date(Date.now() - MINUTOS_DE_GRACIA * 60_000).toISOString();

  const { data: colgadas } = await supabase
    .from("captures")
    .select("id, ocr_status")
    .is("deleted_at", null)
    .in("ocr_status", ["pending", "processing"])
    .lt("created_at", limite)
    .lt("ocr_attempts", 3)
    .order("created_at", { ascending: true })
    .limit(MAXIMO_POR_BARRIDO)
    .returns<Pick<Capture, "id" | "ocr_status">[]>();

  if (!colgadas?.length) {
    return NextResponse.json({ recuperadas: 0 });
  }

  let settings;
  try {
    settings = await cargarSettings(supabase);
  } catch {
    return NextResponse.json({ error: "sin_configuracion" }, { status: 500 });
  }

  // Las que se quedaron en 'processing' vuelven a 'pending': procesarCaptura
  // solo reclama filas pendientes, así que sin este paso serían intocables.
  const enProceso = colgadas.filter((c) => c.ocr_status === "processing").map((c) => c.id);
  if (enProceso.length) {
    await supabase.from("captures").update({ ocr_status: "pending" }).in("id", enProceso);
  }

  // En serie y comprobando el tope en cada vuelta: en paralelo, cinco
  // transcripciones simultáneas pueden rebasar el tope diario de golpe.
  let recuperadas = 0;
  for (const c of colgadas) {
    if ((await intentosDeHoy(supabase, userId)) >= settings.ocr_daily_limit) break;
    const r = await procesarCaptura({ supabase, settings, captureId: c.id });
    if (r.estado === "ok") recuperadas++;
  }

  return NextResponse.json({ recuperadas });
}
