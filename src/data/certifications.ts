export type Cert = {
  id: string
  logo: string
  name: string
  description?: string
  howToGet?: string
}

export const initialCerts: Cert[] = [
  {
    id: 'b-corporation',
    logo: '/certificate-1.png',
    name: 'B Corporation',
    description: 'Sertifikasi B Corporation memverifikasi bahwa sebuah perusahaan memenuhi standar tinggi dalam kinerja sosial dan lingkungan, akuntabilitas, serta transparansi.',
    howToGet: 'Lengkapi asesmen, capai ambang skor yang ditetapkan, dan tandatangani perjanjian B Corp. Untuk organisasi yang lebih besar, bersiaplah terhadap peninjauan dokumen dan kunjungan lokasi.'
  },
  {
    id: 'gri-standards',
    logo: '/certificate-2.png',
    name: 'Standar GRI',
    description: 'Standar GRI menyediakan bahasa bersama global bagi organisasi untuk melaporkan dampak ekonomi, lingkungan, dan sosial mereka.',
    howToGet: 'Adopsi pelaporan GRI dengan memetakan pengungkapan Anda ke Standar GRI dan terbitkan laporan keberlanjutan yang selaras dengan persyaratan GRI.'
  },
  {
    id: 'sasb',
    logo: '/certificate-3.png',
    name: 'SASB',
    description: 'SASB berfokus pada informasi keberlanjutan yang material secara finansial bagi para investor.',
    howToGet: 'Identifikasi topik material menggunakan SASB Materiality Map dan integrasikan pengungkapan tersebut ke dalam laporan untuk investor.'
  },
  {
    id: 'iso-50001',
    logo: '/certificate-4.png',
    name: 'ISO 50001',
    description: 'ISO 50001 membantu organisasi meningkatkan kinerja energi, menaikkan efisiensi energi, dan mengurangi biaya.',
    howToGet: 'Terapkan sistem manajemen energi dan dapatkan sertifikasi melalui badan sertifikasi terakreditasi setelah audit berhasil.'
  },
  {
    id: 'FSC',
    logo: '/certificate-5.png',
    name: 'FSC',
    description: 'FSC mensertifikasi pengelolaan hutan yang bertanggung jawab untuk mendukung manfaat lingkungan, sosial, dan ekonomi.',
    howToGet: 'Bekerja sama dengan badan sertifikasi untuk mengaudit pengelolaan hutan atau proses rantai pasok Anda dan memenuhi persyaratan FSC.'
  },
  {
    id: 'fairtrade',
    logo: '/certificate-6.png',
    name: 'FairTrade',
    description: 'Sertifikasi FairTrade memastikan harga yang adil dan kondisi kerja yang lebih baik bagi para produsen.',
    howToGet: 'Bermitra dengan badan sertifikasi FairTrade, penuhi kriteria di seluruh rantai pasok, dan jalani audit serta perbaikan berkelanjutan.'
  },
]
