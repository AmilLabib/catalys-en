// Ilustrasi 3D ringan (CSS 3D, tanpa WebGL) untuk ubin scan struk:
// kertas struk mengambang + tumpukan koin (penjualan) atau kotak kardus (pembelian).
// Gaya ada di index.css (.ilus-*). Animasi otomatis diam bila pengguna memilih kurangi gerak.

export default function IlustrasiStruk({ jenis, gelap = false }: { jenis: "penjualan" | "pembelian"; gelap?: boolean }) {
  return (
    <div className={`ilus-3d ${gelap ? "ilus-gelap" : ""}`} aria-hidden>
      <div className="ilus-putar">
        {/* kertas struk */}
        <div className="ilus-struk">
          <div className="ilus-struk-kepala" />
          <div className="ilus-baris" style={{ width: "78%" }} />
          <div className="ilus-baris" style={{ width: "62%" }} />
          <div className="ilus-baris" style={{ width: "70%" }} />
          <div className="ilus-baris" style={{ width: "54%" }} />
          <div className="ilus-struk-total">
            <span />
            <span />
          </div>
        </div>

        {jenis === "penjualan" ? (
          // tumpukan koin: lapisan bertingkat memberi kesan tebal
          <div className="ilus-koin">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} style={{ transform: `translateY(${-i * 5}px)` }} />
            ))}
            <b>Rp</b>
          </div>
        ) : (
          // kotak kardus 3D (kubus)
          <div className="ilus-kotak">
            <span className="depan" />
            <span className="belakang" />
            <span className="kanan" />
            <span className="kiri" />
            <span className="atas" />
            <span className="bawah" />
          </div>
        )}
      </div>
      <div className="ilus-bayangan" />
    </div>
  );
}
