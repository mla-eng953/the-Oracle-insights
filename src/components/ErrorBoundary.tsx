import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="glass-strong max-w-md rounded-xl p-6 text-center">
          <h1 className="text-lg font-semibold mb-2">Something went sideways.</h1>
          <p className="text-sm text-muted-foreground mb-4">{this.state.error.message}</p>
          <Button onClick={() => location.reload()} variant="gold">Reload</Button>
        </div>
      </div>
    );
  }
}
