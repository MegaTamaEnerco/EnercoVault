'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ICompanyConfig, DEFAULT_COMPANY_CONFIG } from '@/lib/company-config-types';

interface CompanyConfigContextType {
  config: ICompanyConfig;
  updateLocalConfig: (newConfig: ICompanyConfig) => void;
  refresh: () => Promise<void>;
}

const CompanyConfigContext = createContext<CompanyConfigContextType>({
  config: DEFAULT_COMPANY_CONFIG,
  updateLocalConfig: () => {},
  refresh: async () => {},
});

export function CompanyConfigProvider({
  initialConfig,
  children,
}: {
  initialConfig?: ICompanyConfig;
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<ICompanyConfig>(
    initialConfig || DEFAULT_COMPANY_CONFIG
  );

  const refresh = async () => {
    try {
      const res = await fetch('/api/system/company-config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
      }
    } catch {
      // ignore network errors
    }
  };

  useEffect(() => {
    if (!initialConfig) {
      refresh();
    }
  }, [initialConfig]);

  return (
    <CompanyConfigContext.Provider
      value={{ config, updateLocalConfig: setConfig, refresh }}
    >
      {children}
    </CompanyConfigContext.Provider>
  );
}

export function useCompanyConfig() {
  return useContext(CompanyConfigContext);
}
