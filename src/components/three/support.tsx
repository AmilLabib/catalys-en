import { Component, type ReactNode } from "react";

// 3D is only shown when the browser supports WebGL and the user hasn't
// chosen "reduce motion" in their system settings.
export function canRender3D() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// If the 3D scene fails to load (e.g. a graphics driver problem),
// show the static version instead of an empty page.
export class ErrorBoundary3D extends Component<{ fallback: ReactNode; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}
