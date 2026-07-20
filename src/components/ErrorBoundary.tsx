import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { logError } from "@/lib/errorHandler";

interface Props {
  children: React.ReactNode;
  /** Nome do contexto usado nos logs (ex.: rota ou componente). */
  context?: string;
  /** Fallback customizado; se omitido, usa a tela padrão. */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary de rota/componente. Captura erros de renderização,
 * loga com contexto e mostra uma tela amigável em pt-BR com opções
 * para recarregar ou voltar para o início.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logError(`ErrorBoundary:${this.props.context || "root"}`, error, {
      componentStack: info.componentStack,
    });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    // Reinicia a rota atual sem perder navegação/histórico.
    try { window.location.reload(); } catch { /* noop */ }
  };

  private handleHome = () => {
    this.setState({ hasError: false, error: null });
    try { window.location.assign("/"); } catch { /* noop */ }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-gold/40 bg-card/70 backdrop-blur p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-gold" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Algo deu errado
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Encontramos um problema ao exibir esta tela. Você pode tentar recarregar
            ou voltar para a página inicial.
          </p>
          {this.state.error?.message && (
            <pre className="text-left text-[11px] text-muted-foreground/80 bg-muted/40 rounded-md p-3 mb-6 overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gold text-background text-sm font-medium hover:opacity-90 transition"
            >
              <RefreshCw className="w-4 h-4" /> Recarregar
            </button>
            <button
              onClick={this.handleHome}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm text-foreground hover:bg-muted/40 transition"
            >
              <Home className="w-4 h-4" /> Início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
