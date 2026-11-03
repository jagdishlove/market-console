"use client";

import { Component, type ReactNode } from "react";
import { report } from "@/lib/telemetry";

export class ErrorBoundary extends Component<{ label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { report("error", { widget: this.props.label, message: error.message }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="p-4 text-sm text-bad">
        {this.props.label} failed to render.{" "}
        <button className="underline" onClick={() => this.setState({ failed: false })}>Retry</button>
      </div>
    );
  }
}
