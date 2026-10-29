import { Info, X } from "lucide-react";
import Overlay from "../components/Overlay";

export type AccountInfo = {
  code: string;
  name: string;
  description?: string;
  example?: string;
  normalBalance?: string;
};

// Blue "i" button used in the Chart of Accounts and Journal Entries
export function InfoButton({ onClick, label = "Account info" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 transition-colors"
    >
      <Info className="w-4 h-4" />
    </button>
  );
}

export default function AccountInfoModal({
  visible,
  onClose,
  account,
}: {
  visible: boolean;
  onClose: () => void;
  account?: AccountInfo;
}) {
  if (!visible || !account) return null;
  return (
    <Overlay className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-[min(100%,600px)] shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white shrink-0">
              <Info className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {account.code} — {account.name}
              </h3>
              {account.normalBalance && (
                <p className="text-xs font-medium text-blue-700 mt-0.5">
                  {account.normalBalance.replace("Normal:", "Normal balance:")}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-700 mt-4 leading-relaxed">
          {account.description || "No explanation for this account yet."}
        </p>
        {account.example && (
          <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 mb-1">Recording example</p>
            <p className="text-sm text-gray-800 whitespace-pre-line">{account.example}</p>
          </div>
        )}
      </div>
    </Overlay>
  );
}
