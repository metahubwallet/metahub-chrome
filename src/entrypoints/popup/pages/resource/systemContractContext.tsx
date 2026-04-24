import * as React from 'react';
import { localCache } from '@/utils/cache';

const STORAGE_KEY = 'resourceSystemToken';

export type SystemContract = 'eosio' | 'core.vaulta';
export type TokenContract = 'eosio.token' | 'core.vaulta';
export type SystemContractToken = 'EOS' | 'A';

interface TokenProfile {
  symbol: SystemContractToken;
  contract: SystemContract;
  tokenContract: TokenContract;
}

const TOKEN_PROFILES: Record<SystemContractToken, TokenProfile> = {
  EOS: { symbol: 'EOS', contract: 'eosio', tokenContract: 'eosio.token' },
  A: { symbol: 'A', contract: 'core.vaulta', tokenContract: 'core.vaulta' },
};

interface SystemContractContextValue extends TokenProfile {
  token: SystemContractToken;
  setToken: (token: SystemContractToken) => void;
}

const SystemContractContext = React.createContext<SystemContractContextValue>({
  token: 'EOS',
  ...TOKEN_PROFILES.EOS,
  setToken: () => {},
});

export const SystemContractProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = React.useState<SystemContractToken>('EOS');

  React.useEffect(() => {
    let cancelled = false;
    localCache.get(STORAGE_KEY, 'EOS').then((stored) => {
      if (cancelled) return;
      if (stored === 'A' || stored === 'EOS') setTokenState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setToken = React.useCallback((next: SystemContractToken) => {
    setTokenState(next);
    void localCache.set(STORAGE_KEY, next);
  }, []);

  const value = React.useMemo<SystemContractContextValue>(
    () => ({ token, ...TOKEN_PROFILES[token], setToken }),
    [token, setToken]
  );
  return <SystemContractContext.Provider value={value}>{children}</SystemContractContext.Provider>;
};

export const useSystemContract = () => React.useContext(SystemContractContext);
