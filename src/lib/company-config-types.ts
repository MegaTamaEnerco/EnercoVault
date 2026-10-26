export interface ICompanyConfig {
  companyName: string;
  systemName: string;
  tagline: string;
  headerSubtext: string;
  copyrightText: string;
  officeLocation?: string;
  websiteUrl?: string;
  logoUrl?: string;
}

export const DEFAULT_COMPANY_CONFIG: ICompanyConfig = {
  companyName: 'PT Enerco Persada Indonesia',
  systemName: 'Enerco Vault',
  tagline: 'Sistem Pengendalian Dokumen Terpadu (IMS)',
  headerSubtext: 'SISTEM MANAJEMEN QHSE & LEGALITAS',
  copyrightText: '© 2026 PT Enerco Persada Indonesia. Hak Cipta Dilindungi Undang-Undang.',
  officeLocation: 'Jakarta, Indonesia',
  websiteUrl: 'https://enerco.co.id',
  logoUrl: '',
};
