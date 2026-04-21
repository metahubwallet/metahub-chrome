import SdkError from '@/lib/sdkError';
import { getAuthorizations } from './identityHandler';
import type { Payload } from '@/lib/messages/message';

export async function requestAvailableKeys(payload: Payload) {
  if (!payload.chainId) {
    throw SdkError.noNetwork();
  }

  const authorizations = await getAuthorizations(payload.domain, payload.chainId);
  return Array.from(new Set(authorizations.map((x) => x.publicKey)));
}
