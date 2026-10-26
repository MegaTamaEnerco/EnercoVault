import { connectDB } from './db';
import { SystemSetting } from '@/models/SystemSetting';
import { ICompanyConfig, DEFAULT_COMPANY_CONFIG } from './company-config-types';

export type { ICompanyConfig };
export { DEFAULT_COMPANY_CONFIG };

/**
 * Get current active company profile & branding configuration
 */
export async function getCompanyConfig(): Promise<ICompanyConfig> {
  try {
    await connectDB();
    const doc = await SystemSetting.findOne({ key: 'company_config' }).lean();
    if (doc && doc.value) {
      return {
        ...DEFAULT_COMPANY_CONFIG,
        ...(doc.value as Partial<ICompanyConfig>),
      };
    }
  } catch (err) {
    console.warn('Failed to load company config, using default settings:', err);
  }
  return DEFAULT_COMPANY_CONFIG;
}

/**
 * Update company profile & secondary information
 */
export async function updateCompanyConfig(
  config: Partial<ICompanyConfig>,
  userId?: string
): Promise<ICompanyConfig> {
  await connectDB();
  const current = await getCompanyConfig();

  const merged: ICompanyConfig = {
    ...current,
    companyName: (config.companyName !== undefined && config.companyName.trim()) ? config.companyName.trim() : current.companyName,
    systemName: (config.systemName !== undefined && config.systemName.trim()) ? config.systemName.trim() : current.systemName,
    tagline: (config.tagline !== undefined && config.tagline.trim()) ? config.tagline.trim() : current.tagline,
    headerSubtext: (config.headerSubtext !== undefined && config.headerSubtext.trim()) ? config.headerSubtext.trim() : current.headerSubtext,
    copyrightText: (config.copyrightText !== undefined && config.copyrightText.trim()) ? config.copyrightText.trim() : current.copyrightText,
    officeLocation: config.officeLocation !== undefined ? config.officeLocation.trim() : current.officeLocation,
    websiteUrl: config.websiteUrl !== undefined ? config.websiteUrl.trim() : current.websiteUrl,
    logoUrl: config.logoUrl !== undefined ? config.logoUrl.trim() : current.logoUrl,
  };

  await SystemSetting.findOneAndUpdate(
    { key: 'company_config' },
    { $set: { value: merged, updatedBy: userId } },
    { upsert: true, returnDocument: 'after' }
  );

  return merged;
}
