import { X } from "lucide-react";
import Lapisan from "../components/Lapisan";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  wide = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!isOpen) return null;
  return (
    <Lapisan className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </Lapisan>
  );
}
