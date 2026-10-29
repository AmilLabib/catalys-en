// Menghapus semua data demo Catalys di browser ini, lalu memuat ulang ke halaman login.
// Hanya kunci milik aplikasi yang dihapus, bukan seluruh localStorage origin.
const AWALAN = ["catalys_", "inventory_", "journals_", "chartOfAccounts_", "business_sector_", "kasir_orders", "tour_shown_"];

export function resetDataDemo({ tampilkanTur = true }: { tampilkanTur?: boolean } = {}) {
  try {
    const kunci: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && AWALAN.some((a) => k.startsWith(a))) kunci.push(k);
    }
    for (const k of kunci) {
      // status tur dipertahankan bila pengguna tidak ingin melihat tur lagi
      if (!tampilkanTur && k.startsWith("tour_shown_")) continue;
      localStorage.removeItem(k);
    }
  } catch {
    // penyimpanan tidak tersedia: tetap muat ulang
  }
  // muat ulang penuh agar semua konteks mulai dari data awal (tanpa menulis ulang data lama)
  window.location.assign("/");
}
