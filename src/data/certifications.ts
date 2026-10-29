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
    description: 'B Corporation certification verifies that a company meets high standards of social and environmental performance, accountability, and transparency.',
    howToGet: 'Complete the assessment, reach the required score threshold, and sign the B Corp agreement. Larger organizations should prepare for document reviews and site visits.'
  },
  {
    id: 'gri-standards',
    logo: '/certificate-2.png',
    name: 'GRI Standards',
    description: 'The GRI Standards provide a shared global language for organizations to report their economic, environmental, and social impacts.',
    howToGet: 'Adopt GRI reporting by mapping your disclosures to the GRI Standards and publish a sustainability report aligned with GRI requirements.'
  },
  {
    id: 'sasb',
    logo: '/certificate-3.png',
    name: 'SASB',
    description: 'SASB focuses on sustainability information that is financially material to investors.',
    howToGet: 'Identify material topics using the SASB Materiality Map and integrate those disclosures into investor reports.'
  },
  {
    id: 'iso-50001',
    logo: '/certificate-4.png',
    name: 'ISO 50001',
    description: 'ISO 50001 helps organizations improve energy performance, increase energy efficiency, and reduce costs.',
    howToGet: 'Implement an energy management system and get certified by an accredited certification body after a successful audit.'
  },
  {
    id: 'FSC',
    logo: '/certificate-5.png',
    name: 'FSC',
    description: 'FSC certifies responsible forest management that supports environmental, social, and economic benefits.',
    howToGet: 'Work with a certification body to audit your forest management or supply chain processes and meet FSC requirements.'
  },
  {
    id: 'fairtrade',
    logo: '/certificate-6.png',
    name: 'FairTrade',
    description: 'FairTrade certification ensures fair prices and better working conditions for producers.',
    howToGet: 'Partner with a FairTrade certification body, meet the criteria across the supply chain, and undergo audits and continuous improvement.'
  },
]
