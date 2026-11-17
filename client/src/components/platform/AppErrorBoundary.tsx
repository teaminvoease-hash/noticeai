import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="auth-panel" role="alert">
        <h1 className="auth-title">This page could not load</h1>
        <p className="auth-subtitle">
          A connection problem or a newer application version may have
          interrupted this page. Reload to reopen your workspace. Previously
          saved requests remain in your account; unsaved changes may need to be
          entered again.
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Reload workspace
        </Button>
      </main>
    );
  }
}
