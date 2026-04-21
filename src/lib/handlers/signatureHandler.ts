import { Buffer } from 'buffer';
import { Serializer, Transaction } from '@wharfkit/antelope';
import { localCache } from '@/utils/cache';
import SdkError from '@/lib/sdkError';
import { signature } from '@/lib/keyring';
import { md5, isV3Encrypted, decryptV3, makeKeySalt, legacyDecrypt, legacyMd5, legacyPassword1 } from '@/utils/crypto';
import { createWindow, getPassword } from './windowManager';
import { getAuthorizations } from './identityHandler';
import { parseEosjsRequest, buildSigningBuffer, buildSmoothTransaction, rebuildSerializedTx, fetchTapos, materializeTransactArgs, deserializeTransactionWithActions } from './abiHandler';
import { api } from '@/lib/api';
import type { Wallet } from '@/types/wallet';
import type { WhiteItem } from '@/types/settings';
import type { Auth } from '@/types/account';
import type {
  LegacySignaturePayload,
  SignaturePayload,
  ArbitrarySignaturePayload,
  SignatureResult,
} from '@/lib/messages/message';

interface NewPayload {
  chainId: string;
  domain: string;
  actions: any[];
  dataKeys: any[];
  authorization: Auth;
  encryptText: string;
}

function taposMissing(bytes: number[]): boolean {
  try {
    const decoded: any = Serializer.decode({
      data: Uint8Array.from(bytes),
      type: Transaction,
    });
    const expiration = String(decoded.expiration);
    const refNum = Number(decoded.ref_block_num);
    const refPrefix = Number(decoded.ref_block_prefix);
    return expiration === '1970-01-01T00:00:00' || (refNum === 0 && refPrefix === 0);
  } catch {
    return false;
  }
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

async function resolveActionAccount(
  domain: string,
  chainId: string,
  actions: any[]
): Promise<{ account: any; authorization: Auth }> {
  const auths = actions[0].authorization;
  const authorization = auths[auths.length - 1];
  const authorizations = await getAuthorizations(domain, chainId);
  const account = authorizations.find(
    (x) =>
      x.name === String(authorization.actor) &&
      x.authority === String(authorization.permission)
  );
  if (!account) {
    throw SdkError.signatureError('signature_rejected', 'you have no permission for this operation');
  }
  return { account, authorization };
}

async function tryWhitelistAutoSign(
  payload: { chainId: string; domain: string },
  newPayload: NewPayload,
  account: any,
  applyTapos: () => Promise<void>,
  getSerializedTx?: () => number[] | undefined
): Promise<string | null> {
  if (newPayload.actions.length === 0) return null;

  const whitelist = (await localCache.get('whitelist', [])) as WhiteItem[];
  let allMatch = true;
  for (const action of newPayload.actions) {
    const hash = md5(
      [payload.domain, payload.chainId, account.name, account.authority, action.account, action.name].join('-')
    );
    const wli = whitelist.find((x) => x.hash === hash);
    if (wli) {
      for (const key in action.data) {
        const value = action.data[key];
        if (wli.properties[key] !== '*' && wli.properties[key] !== value) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) break;
    } else {
      allMatch = false;
    }
  }
  if (!allMatch) return null;

  const locked = (await getPassword()) === '';
  if (locked) {
    const result = await createWindow('unlock', 500, 450, null);
    if (!result || !result.unlock) {
      throw SdkError.signatureError('signature_rejected', 'User rejected the signature request');
    }
  }
  const privateKey = await getPrivateKey(payload.chainId, account.publicKey);
  await applyTapos();
  const bytes = getSerializedTx?.();
  if (!bytes) {
    throw SdkError.signatureError('bad_args', 'missing serializedTransaction for whitelist auto-sign');
  }
  return signature(buildSigningBuffer(payload.chainId, bytes), privateKey);
}

async function promptAndSaveWhitelist(newPayload: NewPayload): Promise<void> {
  let windowHeight = 440;
  if (newPayload.actions.length > 0) windowHeight = 530;
  if (newPayload.actions.length > 1) windowHeight = 620;

  for (const action of newPayload.actions) {
    const keys: string[] = [];
    for (const key in action.data) keys.push(key);
    newPayload.dataKeys.push(keys);
  }

  const result = await createWindow('transaction', 600, windowHeight, newPayload);
  if (!result || !result.approve) {
    throw SdkError.signatureError('signature_rejected', 'User rejected the signature request');
  }

  if (result.whitelist && result.whitelist.length > 0) {
    const whitelist = (await localCache.get('whitelist', [])) as WhiteItem[];
    for (const whitelistRow of result.whitelist) {
      const index = whitelist.findIndex((x) => x.hash === whitelistRow.hash);
      if (index === -1) whitelist.push(whitelistRow);
      else whitelist.splice(index, 1, whitelistRow);
    }
    await localCache.set('whitelist', JSON.stringify(whitelist), 86400 * 365);
  }
}

async function finalizeSignature(
  payload: { chainId: string; domain: string },
  newPayload: NewPayload,
  account: any,
  applyTapos: () => Promise<void>,
  arbitrary: boolean,
  getSerializedTx?: () => number[] | undefined,
  getBuiltTransaction?: () => any
): Promise<SignatureResult> {
  const enrich = () => getBuiltTransaction ? {
    transaction: getBuiltTransaction(),
    serializedTransaction: getSerializedTx?.(),
  } : {};

  const autoSig = await tryWhitelistAutoSign(payload, newPayload, account, applyTapos, getSerializedTx);
  if (autoSig) return { signatures: [autoSig], ...enrich() };

  await promptAndSaveWhitelist(newPayload);

  const privateKey = await getPrivateKey(payload.chainId, account.publicKey);

  if (!arbitrary && getSerializedTx) {
    const wallets = (await localCache.get('wallets', [])) as Wallet[];
    const wallet = wallets.find(
      (w) => w.name === account.name && w.chainId === payload.chainId
    );

    if (wallet?.smoothMode) {
      await applyTapos();
      const bytes = getSerializedTx();
      if (!bytes) {
        throw SdkError.signatureError('bad_args', 'missing serializedTransaction for smooth mode');
      }
      console.log('[Metahub] smooth-mode firing: pushing via respay');
      return await signSmooth(payload.chainId, bytes, privateKey, getBuiltTransaction?.());
    }
    console.log('[Metahub] smooth-mode NOT firing — signing original bytes');
  }

  await applyTapos();
  let payloadToSign: string | Buffer;
  if (arbitrary) {
    payloadToSign = newPayload.encryptText;
  } else {
    const bytes = getSerializedTx?.();
    if (!bytes) {
      throw SdkError.signatureError('bad_args', 'missing serializedTransaction');
    }
    payloadToSign = buildSigningBuffer(payload.chainId, bytes);
  }
  const sig = signature(payloadToSign, privateKey, arbitrary);
  return { signatures: [sig], ...enrich() };
}

// ─── Entry points ───────────────────────────────────────────────────────────

export async function requestLegacySignature(
  payload: LegacySignaturePayload
): Promise<SignatureResult> {
  if (!payload.chainId) throw SdkError.noNetwork();
  if (!payload.serializedTransaction) {
    throw SdkError.signatureError('bad_args', 'missing serializedTransaction');
  }

  const newPayload: NewPayload = {
    chainId: payload.chainId,
    domain: payload.domain,
    actions: [],
    dataKeys: [],
    authorization: { actor: '', permission: '' } as Auth,
    encryptText: '',
  };

  const parsed = await parseEosjsRequest(payload.chainId, payload.serializedTransaction);
  newPayload.actions = parsed.actions;
  let decodedTx: any = parsed.transaction;

  let needsTapos = taposMissing(payload.serializedTransaction);
  const applyTapos = async () => {
    if (!needsTapos) return;
    needsTapos = false;
    const tapos = await fetchTapos(payload.chainId);
    payload.serializedTransaction = rebuildSerializedTx(payload.serializedTransaction!, tapos);
    // Re-decode so the enriched return reflects the rebuilt TAPOS.
    decodedTx = await deserializeTransactionWithActions(
      payload.chainId,
      Uint8Array.from(payload.serializedTransaction)
    );
  };

  const { account, authorization } = await resolveActionAccount(
    payload.domain,
    payload.chainId,
    newPayload.actions
  );
  newPayload.authorization = authorization;

  return finalizeSignature(
    payload,
    newPayload,
    account,
    applyTapos,
    false,
    () => payload.serializedTransaction,
    () => decodedTx,
  );
}

export async function requestSignature(
  payload: SignaturePayload
): Promise<SignatureResult> {
  if (!payload.chainId) throw SdkError.noNetwork();
  if (!payload.transactArgs) {
    throw SdkError.signatureError('bad_args', 'missing transactArgs');
  }

  const materialized = await materializeTransactArgs(payload.chainId, payload);
  let serializedTx = materialized.serializedTransaction;
  let decodedTx = materialized.transaction;

  let needsTapos = taposMissing(serializedTx);
  const applyTapos = async () => {
    if (!needsTapos) return;
    needsTapos = false;
    const tapos = await fetchTapos(
      payload.chainId,
      payload.options?.expireSeconds,
      payload.options?.blocksBehind
    );
    serializedTx = rebuildSerializedTx(serializedTx, tapos);
    // Re-decode so the enriched return reflects the real TAPOS, not sentinels.
    decodedTx = await deserializeTransactionWithActions(
      payload.chainId,
      Uint8Array.from(serializedTx),
      materialized.resolvedAbis
    );
  };

  const { account, authorization } = await resolveActionAccount(
    payload.domain,
    payload.chainId,
    decodedTx.actions
  );
  const newPayload: NewPayload = {
    chainId: payload.chainId,
    domain: payload.domain,
    actions: decodedTx.actions,
    dataKeys: [],
    authorization,
    encryptText: '',
  };

  return finalizeSignature(
    payload,
    newPayload,
    account,
    applyTapos,
    false,
    () => serializedTx,
    () => decodedTx,
  );
}

async function signSmooth(
  chainId: string,
  rawSerialized: number[],
  privateKey: string,
  builtTransaction?: any
): Promise<SignatureResult> {
  const originalSerialized = Uint8Array.from(rawSerialized);
  const { serializedTransaction, buffer, transaction } = await buildSmoothTransaction(
    chainId,
    originalSerialized
  );
  const userSig = signature(buffer, privateKey);

  const signedTrx = { ...transaction, signatures: [userSig] };

  let pushResp: any;
  try {
    pushResp = await api.resource.pushTx({ signed: JSON.stringify(signedTrx) });
  } catch (err: any) {
    throw new SdkError('push_tx_failed', err?.message || 'network error', 500);
  }
  const serverSig = pushResp?.result?.signature;
  if (!serverSig) {
    const msg = pushResp?.message || 'unknown error';
    throw new SdkError(
      'push_tx_failed',
      msg.indexOf('reach free cpu') !== -1 ? 'Your available resources have been exhausted.' : msg,
      400
    );
  }

  return {
    signatures: [serverSig, userSig],
    serializedTransaction: Array.from(serializedTransaction),
    ...(builtTransaction ? { transaction: builtTransaction } : {}),
  };
}

export async function getPrivateKey(chainId: string, publicKey: string): Promise<string> {
  const wallets = (await localCache.get('wallets', [])) as Wallet[];
  let encryptPrivateKey = '';
  let seed = '';
  for (const wallet of wallets) {
    if (wallet.chainId === chainId) {
      const key = wallet.keys.find((x) => x.publicKey === publicKey);
      if (key) {
        encryptPrivateKey = key.privateKey;
        seed = wallet.seed;
        break;
      }
    }
  }
  let privateKey = '';
  if (encryptPrivateKey) {
    const password = await getPassword();
    if (isV3Encrypted(encryptPrivateKey)) {
      privateKey = await decryptV3(encryptPrivateKey, password, makeKeySalt(seed));
    } else {
      privateKey = legacyDecrypt(encryptPrivateKey, legacyMd5(seed + legacyPassword1(password)));
    }
  }
  if (!privateKey) {
    throw SdkError.signatureError('signature_rejected', 'The private key was not found through the account provided');
  }
  return privateKey;
}

export async function requestArbitrarySignature(
  payload: ArbitrarySignaturePayload
): Promise<SignatureResult> {
  const tooLongWord = payload.data.split(/\s+/).findIndex((x) => x.length > 12);
  if (tooLongWord >= 0) {
    throw SdkError.signatureError('signature_rejected', 'Each word cannot exceed 12 characters in length.');
  }
  if (payload.data.length === 0) {
    throw SdkError.signatureError('signature_rejected', 'String cannot be empty.');
  }
  if (payload.data.length >= 1024) {
    throw SdkError.signatureError('signature_rejected', 'String length cannot greater than 1024.');
  }

  const authorizations = await getAuthorizations(payload.domain, '*');
  const account = authorizations.find((x) => x.publicKey === payload.publicKey);
  if (!account) {
    throw SdkError.signatureError('signature_rejected', 'you have no permission for this operation');
  }
  payload.chainId = account.chainId;

  const newPayload: NewPayload = {
    chainId: payload.chainId,
    domain: payload.domain,
    actions: [],
    dataKeys: [],
    authorization: { actor: account.name, permission: account.authority },
    encryptText: payload.data,
  };

  const noopTapos = async () => {};
  return finalizeSignature(payload, newPayload, account, noopTapos, true);
}
