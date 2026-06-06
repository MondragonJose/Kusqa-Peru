/**
 * ErrorBoundary — React Error Boundary clásico
 * Captura errores de render en componentes hijos (no errores de TanStack Router loaders).
 * Fallback UI consistente con diseño KUSQA.
 */

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-6">
            {/* Icono de error */}
            <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>

            {/* Título y mensaje */}
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">Algo salió mal</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Estamos teniendo problemas para cargar esta sección. Tu progreso está seguro.
              </p>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Intentar de nuevo
              </button>
              <Link
                to="/app"
                className="border border-border px-4 py-2 rounded-xl font-semibold hover:bg-accent transition-colors"
              >
                Volver al inicio
              </Link>
            </div>

            {/* Detalle técnico solo en dev */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Ver detalles técnicos
                </summary>
                <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-auto text-left">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
