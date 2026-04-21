import { localCache } from '@/utils/cache';
import type { Network } from '@/types/settings';
import type { Payload } from '@/lib/messages/message';

export async function getEndPoint(chainId: string): Promise<string> {
  const selectedRpcs = await localCache.get('selectedRpcs', {});
  let endpoint = selectedRpcs[chainId];

  if (!endpoint) {
    const networks = (await localCache.get('networks', [])) as Network[];
    const network = networks.find((x) => x.chainId === chainId);
    endpoint = network ? network.endpoint : '';
  }
  return endpoint;
}

export async function getEosInfo(chainId: string) {
  const endpoint = await getEndPoint(chainId);
  const response = await fetch(endpoint + '/v1/chain/get_info');
  const result = await response.json();
  return result;
}

export async function requestAddNetwork(_payload: Payload) {
  // empty handler - not implemented
}
