import { useMemo } from 'react';
import i18n from '@/i18n';
import { Chain } from '@/lib/chain';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUserStore } from '@/stores/userStore';
import { http } from '@/lib/api/http';

let chainInstance: Chain | null = null;

async function pushTx(data: { signed: string }) {
  return await http.post('/cpu/pushtx', data);
}

export function getChainInstance(): Chain {
  if (!chainInstance) {
    chainInstance = new Chain({
      getWallets: () => useWalletStore.getState().wallets,
      getCurrentWallet: () => useWalletStore.getState().currentWallet(),
      getPassword: () => useUserStore.getState().password,
      getNetworks: () => useChainStore.getState().networks,
      getSelectedRpc: (chainId: string) => useChainStore.getState().selectedRpc(chainId),
      setWallet: (wallet) => useWalletStore.getState().setWallet(wallet),
      t: (key: string) => i18n.t(key),
      pushTx,
    });
  }
  return chainInstance;
}

export function useChainInstance(): Chain {
  return useMemo(() => getChainInstance(), []);
}
