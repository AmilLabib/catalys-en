import { useAccount } from "../context/AccountContext";
import { AccessContent } from "../context/AccessContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { FEATURES, type FeatureKey } from "../config/access";

// Route guard: features outside the active account's role or plan show the same
// explanation as the access popup, complete with switch-account / upgrade buttons.
export default function FeatureGate({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
}) {
  const { lockReason } = useAccount();
  if (!lockReason(feature)) return <>{children}</>;
  return <Locked feature={feature} />;
}

function Locked({ feature }: { feature: FeatureKey }) {
  usePageTitle(FEATURES[feature].label);
  return (
    <div className="card-elegant max-w-md mx-auto mt-16 p-8">
      <AccessContent feature={feature} />
    </div>
  );
}
