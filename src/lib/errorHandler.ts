// Tratamento de erros centralizado.
// - `logError`: sempre loga com contexto no console (útil para debug).
// - `notifyError`: mostra toast pt-BR discreto (sonner) + loga.
// - `withRetry`: reexecuta uma promise até 2x com backoff exponencial.
// - `safeAsync`: envolve uma função async, retornando `fallback` em caso de erro.
// - `invokeEdge`: wrapper para supabase.functions.invoke com retry + notificação.
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ErrorContext = string;

function extractMessage(err: unknown): string {
  if (!err) return "Erro desconhecido";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    if (typeof anyErr.message === "string") return anyErr.message as string;
    try { return JSON.stringify(err); } catch { return String(err); }
  }
  return String(err);
}

export function logError(context: ErrorContext, err: unknown, extra?: Record<string, unknown>): void {
  // Sempre no console para debug, com prefixo padronizado.
  // eslint-disable-next-line no-console
  console.error(`[${context}]`, extractMessage(err), { error: err, ...(extra || {}) });
}

export function notifyError(context: ErrorContext, err: unknown, userMessage?: string): void {
  logError(context, err);
  const msg = userMessage || traduzirErro(extractMessage(err));
  try { toast.error(msg); } catch { /* toast pode não estar montado */ }
}

// Mensagens em pt-BR para erros comuns.
function traduzirErro(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror")) return "Falha de conexão. Verifique sua internet.";
  if (m.includes("timeout") || m.includes("abort")) return "Tempo esgotado. Tente novamente.";
  if (m.includes("permission") || m.includes("not allowed")) return "Permissão negada.";
  if (m.includes("not found") || m.includes("404")) return "Recurso não encontrado.";
  if (m.includes("jwt") || m.includes("unauthorized") || m.includes("401")) return "Sessão expirada. Faça login novamente.";
  if (m.includes("row-level security") || m.includes("policy")) return "Sem permissão para esta ação. Entre novamente e tente de novo.";
  if (m.includes("duplicate key") || m.includes("unique")) return "Este item já existe.";
  return raw.length > 160 ? "Ocorreu um erro. Tente novamente." : raw;
}

/** Mensagem pt-BR amigável para falhas de envio de arquivo (imagens/áudios). */
export function mensagemUpload(err: unknown): string {
  const raw = extractMessage(err);
  const m = raw.toLowerCase();
  if (m.includes("row-level security") || m.includes("policy") || m.includes("unauthorized") || m.includes("403")) {
    return "Sem permissão para enviar este arquivo. Entre novamente e tente de novo.";
  }
  if (m.includes("payload too large") || m.includes("413") || m.includes("exceeded the maximum")) {
    return "Arquivo muito grande. Escolha um menor.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror")) {
    return "Falha de conexão ao enviar. Verifique sua internet.";
  }
  if (m.includes("already exists") || m.includes("duplicate")) {
    return "Já existe um arquivo com esse nome. Tente novamente.";
  }
  return "Não foi possível enviar o arquivo. Tente novamente.";
}

export interface RetryOptions {
  retries?: number;      // tentativas extras (padrão 2)
  baseDelayMs?: number;  // delay inicial (padrão 400ms)
  shouldRetry?: (err: unknown) => boolean;
}

/** Executa `fn` com até `retries` retentativas e backoff exponencial. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 2, baseDelayMs = 400, shouldRetry } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      if (shouldRetry && !shouldRetry(err)) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Roda uma função async e devolve `fallback` em caso de erro (loga sempre). */
export async function safeAsync<T>(context: ErrorContext, fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (err) { logError(context, err); return fallback; }
}

/** Chama uma edge function com retry + tradução de erro. */
export async function invokeEdge<T = unknown>(
  name: string,
  body?: unknown,
  opts: RetryOptions & { silent?: boolean } = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const result = await withRetry(async () => {
      const res = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
      if (res.error) throw res.error;
      return res.data as T;
    }, opts);
    return { data: result, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(extractMessage(err));
    if (!opts.silent) notifyError(`edge:${name}`, error);
    else logError(`edge:${name}`, error);
    return { data: null, error };
  }
}

/** Instala listeners globais para erros não capturados. Idempotente. */
let globalInstalled = false;
export function installGlobalErrorHandlers(): void {
  if (globalInstalled || typeof window === "undefined") return;
  globalInstalled = true;
  window.addEventListener("error", (evt) => {
    // Ignora erros de recursos (img, script) sem message útil.
    if (!evt.message) return;
    logError("window.error", evt.error || evt.message, { source: evt.filename, line: evt.lineno });
  });
  window.addEventListener("unhandledrejection", (evt) => {
    logError("unhandledrejection", evt.reason);
  });
}
