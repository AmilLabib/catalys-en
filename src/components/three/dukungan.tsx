import { Component, type ReactNode } from "react";

// 3D hanya ditampilkan bila browser mendukung WebGL dan pengguna tidak
// memilih "kurangi gerak" di pengaturan sistemnya.
export function bisa3D() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Bila adegan 3D gagal dimuat (misalnya driver grafis bermasalah),
// tampilkan versi statis alih-alih halaman kosong.
export class BatasGalat3D extends Component<{ cadangan: ReactNode; children: ReactNode }, { galat: boolean }> {
  state = { galat: false };
  static getDerivedStateFromError() {
    return { galat: true };
  }
  render() {
    return this.state.galat ? this.props.cadangan : this.props.children;
  }
}
