export type OcrProvider = "kimi" | "claude";

export type OcrStatus = "pending" | "processing" | "done" | "failed" | "skipped";

export type Settings = {
  id: 1;
  ocr_provider: OcrProvider;
  ocr_model: string;
  ocr_base_url: string;
  ocr_prompt: string;
  ocr_max_tokens: number;
  ocr_daily_limit: number;
  updated_at: string;
};

export type Book = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  created_at: string;
};

export type Capture = {
  id: string;
  user_id: string;
  book_id: string;
  image_path: string | null;
  ocr_text: string | null;
  note: string | null;
  page: number | null;
  source: "photo" | "manual";
  ocr_status: OcrStatus;
  ocr_attempts: number;
  ocr_error: string | null;
  tags: string[];
  created_at: string;
};

export type Vocab = {
  id: string;
  user_id: string;
  book_id: string;
  capture_id: string | null;
  word: string;
  meaning: string | null;
  created_at: string;
};

/**
 * Catálogo de modelos que ofrece el selector de ajustes.
 *
 * DeepSeek no aparece: su API pública no acepta imágenes (verificado el
 * 18/08/2026), así que no puede transcribir. Ver ADR-4 del plan.
 */
export const MODELOS_OCR: {
  label: string;
  provider: OcrProvider;
  model: string;
  baseUrl: string;
}[] = [
  {
    label: "Kimi k2.6 · barato",
    provider: "kimi",
    model: "kimi-k2.6",
    baseUrl: "https://api.moonshot.ai/v1",
  },
  {
    label: "Kimi k2.7 code",
    provider: "kimi",
    model: "kimi-k2.7-code",
    baseUrl: "https://api.moonshot.ai/v1",
  },
  {
    label: "Kimi k3 · caro",
    provider: "kimi",
    model: "kimi-k3",
    baseUrl: "https://api.moonshot.ai/v1",
  },
  {
    label: "Claude Opus 5 · reserva",
    provider: "claude",
    model: "claude-opus-5",
    baseUrl: "https://api.anthropic.com/v1",
  },
];
