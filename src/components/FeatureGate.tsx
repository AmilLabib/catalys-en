import { useAccount } from "../context/AccountContext";
import { IsiAkses } from "../context/AksesContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { FEATURES, type FeatureKey } from "../config/access";

// Penjaga rute: fitur di luar peran atau paket akun aktif menampilkan penjelasan
// yang sama dengan popup akses, lengkap dengan tombol pindah akun / upgrade.
export default function FeatureGate({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
}) {
  const { alasanTerkunci } = useAccount();
  if (!alasanTerkunci(feature)) return <>{children}</>;
  return <Terkunci feature={feature} />;
}

function Terkunci({ feature }: { feature: FeatureKey }) {
  usePageTitle(FEATURES[feature].label);
  return (
    <div className="card-elegant max-w-md mx-auto mt-16 p-8">
      <IsiAkses feature={feature} />
    </div>
  );
}
