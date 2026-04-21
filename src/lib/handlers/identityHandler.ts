import { localCache } from '@/utils/cache';
import SdkError from '@/lib/sdkError';
import { createWindow } from './windowManager';
import type { Wallet } from '@/types/wallet';
import type { AuthAccount, AuthorizedData } from '@/types/account';
import type { Identity, IdentityAccount, LoginPayload, Payload, AccountsPayload } from '@/lib/messages/message';

export async function getIdentity(payload: LoginPayload): Promise<Identity> {
  // fill chainId
  if (!payload.chainId && payload.accounts && payload.accounts.length) {
    const network = payload.accounts[0];
    payload.chainId = network.chainId;
  }
  if (!payload.newLogin) {
    const accounts = await getAuthorizations(payload.domain, payload.chainId);
    if (accounts && accounts.length) {
      return generateIdengity(accounts);
    }
  }

  const selectedAccount: AuthAccount | undefined = await createWindow('login', 450, 630, payload);
  if (!selectedAccount) {
    throw SdkError.signatureError('identity_rejected', 'User rejected the provision of an Identity');
  }

  const account = selectedAccount!;
  account.expire = Date.now() + 86400 * 7 * 1000;

  const authorizations = (await localCache.get('authorizations', [])) as AuthorizedData[];
  let auth = authorizations.find((x) => x.domain === payload.domain) as AuthorizedData;
  if (!auth) {
    auth = { domain: payload.domain, accounts: [], actor: '', permission: '' };
    authorizations.push(auth);
  }
  const index = auth.accounts.findIndex(
    (x) => x.chainId === account.chainId && x.name === account.name && x.authority === account.authority
  );
  if (index >= 0) {
    auth.accounts.splice(index, 1);
  }
  auth.accounts.unshift(account);

  await localCache.set('authorizations', authorizations, 86400 * 30);
  const accounts = await getAuthorizations(payload.domain, payload.chainId);
  return generateIdengity(accounts);
}

export async function getAuthorizations(domain: string, chainId = '*'): Promise<IdentityAccount[]> {
  const wallets = (await localCache.get('wallets', [])) as Wallet[];
  const authorizations = (await localCache.get('authorizations', [])) as AuthorizedData[];
  const auth = authorizations.find((x) => x.domain === domain);
  if (!auth) {
    return [];
  }

  const now = Date.now();
  const filterAccounts = auth.accounts.filter((x) => {
    if (x.expire && x.expire < now) {
      return false;
    }
    const index = wallets.findIndex(
      (y) =>
        x.chainId === y.chainId &&
        x.name === y.name &&
        y.keys.findIndex((z) => z.permissions.indexOf(x.authority) >= 0) >= 0
    );
    return index >= 0;
  });
  if (auth.accounts.length !== filterAccounts.length) {
    auth.accounts = filterAccounts;
    await localCache.set('authorizations', authorizations, 86400 * 30);
  }

  const chainAccounts = chainId === '*' ? filterAccounts : filterAccounts.filter((x) => x.chainId === chainId);
  const returnAccounts: IdentityAccount[] = [];
  for (const chainAccount of chainAccounts) {
    const { expire, ...account } = Object.assign({ blockchain: 'eos', isHardware: false }, chainAccount);
    returnAccounts.push(account as IdentityAccount);
  }
  return returnAccounts;
}

export function generateIdengity(accounts: (AuthAccount | IdentityAccount)[]): Identity {
  return {
    accounts: accounts.map((x) => ({
      blockchain: 'eos',
      name: x.name,
      publicKey: x.publicKey,
      authority: x.authority,
      chainId: x.chainId,
      isHardware: false,
    })),
    kyc: false,
    name: 'default',
    publicKey: 'EOS8KAnYVnhZQ4HG8W9N8iTDpy6NDG3Y2ob48BGQbre8J1HBWt51c',
    hash: 'a7d14118a71c163f2bd0c7e6bc52ced2',
  };
}

export async function restoreIdentity(payload: Payload) {
  const accounts = await getAuthorizations(payload.domain, '*');
  if (!accounts || !accounts.length) {
    throw SdkError.noAccount();
  }
  return generateIdengity(accounts);
}

export async function forgetIdentity(payload: AccountsPayload) {
  const authorizations = (await localCache.get('authorizations', [])) as AuthorizedData[];
  const authorization = authorizations.find((x) => x.domain === payload.domain);
  if (!authorization) return generateIdengity([]);

  let deletes = authorization.accounts;
  if (payload.chainId) deletes = deletes.filter((x) => x.chainId === payload.chainId);
  if (payload.accounts) deletes = deletes.filter((x) => payload.accounts.includes(x.name));

  if (deletes.length < authorization.accounts.length) {
    deletes.map((x) => {
      const idx = authorization.accounts.indexOf(x);
      if (idx >= 0) authorization.accounts.splice(idx, 1);
    });
    await localCache.set('authorizations', authorizations, 86400 * 30);
  } else if (deletes.length === authorization.accounts.length) {
    const idx = authorizations.indexOf(authorization);
    authorizations.splice(idx, 1);
    await localCache.set('authorizations', authorizations, 86400 * 30);
  }
  return generateIdengity(authorization.accounts);
}
