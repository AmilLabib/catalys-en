import type { Cert } from '../data/certifications'
import { useNavigate } from 'react-router-dom'
import Lapisan from "../components/Lapisan";

type Props = {
  cert: Cert | null
  onClose: () => void
}

export default function CertModal({ cert, onClose }: Props) {
  const navigate = useNavigate()
  if (!cert) return null

  return (
    <Lapisan className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-6">
            <div className="h-36 w-36 bg-white rounded-md flex items-center justify-center overflow-hidden">
              <img src={cert.logo} alt={cert.name} className="max-h-32 object-contain" onError={(e) => { ;(e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          </div>

          <div className="md:w-2/3 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{cert.name}</h2>
              </div>
              <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-medium">Deskripsi</h3>
                <p className="text-sm text-gray-700 mt-1">{cert.description ?? 'No description available.'}</p>
              </div>

              <div>
                <h3 className="font-medium">Cara Mendapatkan Sertifikasi Ini</h3>
                <p className="text-sm text-gray-700 mt-1">{cert.howToGet ?? 'Guidance not available.'}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  onClose()
                  navigate('/subscription')
                }}
                className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2"
              >
                Dapatkan dengan Catalys
                <img src="/logo.png" alt="Catalys" className="h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Lapisan>
  )
}
