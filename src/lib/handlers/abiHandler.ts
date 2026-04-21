import {
  APIClient,
  ABI,
  Serializer,
  Transaction,
  Action,
  Name,
  PermissionLevel,
  Bytes,
  TimePoint,
} from '@wharfkit/antelope';
import { Buffer } from 'buffer';
import { eosChainId } from '@/utils/network';
import { getEndPoint } from './networkHandler';
import { setLocalCache } from '@/lib/eosApi';
import { localCache } from '@/utils/cache';
import SdkError from '@/lib/sdkError';
import type {
  AccountPayload,
  RequiredKeysPayload,
  TransactArgsPayload,
  TransactArgsActionInput,
  TransactArgsTransactionInput,
} from '@/lib/messages/message';

async function tempClient(chainId: string = eosChainId): Promise<APIClient> {
  let endpoint = await getEndPoint(chainId);
  if (!endpoint) {
    // Fallback: lookup from supportNetworks
    const { supportNetworks } = await import('@/utils/network');
    const network = supportNetworks.find((n) => n.chainId === chainId);
    endpoint = network?.endpoint || 'https://eos.greymass.com';
  }
  setLocalCache(localCache as any);
  return new APIClient({ url: endpoint, fetch: globalThis.fetch.bind(globalThis) });
}

// Convert Antelope objects to plain JS objects via JSON roundtrip
// Antelope types (Name, Asset, PermissionLevel, etc.) implement toJSON()
function toPlain(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export async function deserializeTransactionWithActions(
  chainId: string,
  buffer: Uint8Array,
  abiOverrides?: Map<string, ABI>
): Promise<any> {
  const client = await tempClient(chainId);
  const transaction = Serializer.decode({ data: buffer, type: Transaction });

  const actions = await Promise.all(
    transaction.actions.map(async (action: any) => {
      const account = String(action.account);
      const override = abiOverrides?.get(account);
      try {
        let abi: ABI;
        if (override) {
          abi = override;
        } else {
          const rawAbiResponse = await client.v1.chain.get_raw_abi(account);
          abi = ABI.from(rawAbiResponse.abi);
        }
        const decoded = Serializer.decode({ data: action.data, abi, type: String(action.name) });
        return toPlain({
          account: action.account,
          name: action.name,
          authorization: action.authorization,
          data: decoded,
        });
      } catch (e) {
        // When caller-supplied ABI doesn't decode, surface it — silent fallback hides bad caller input.
        if (override) throw e;
        return toPlain(action);
      }
    })
  );

  return { ...transaction, actions };
}

export function buildSigningBuffer(chainId: string, serializedTransaction: number[]): Buffer {
  return Buffer.concat([
    Buffer.from(chainId, 'hex'),
    Buffer.from(serializedTransaction),
    Buffer.from(new Uint8Array(32)),
  ]);
}

export async function parseEosjsRequest(
  chainId: string,
  serializedTransaction: number[] | undefined,
  abiOverrides?: Map<string, ABI>
) {
  if (!serializedTransaction) {
    throw SdkError.signatureError('bad_args', 'missing serializedTransaction');
  }
  const parsed = await deserializeTransactionWithActions(
    chainId,
    Uint8Array.from(serializedTransaction),
    abiOverrides
  );
  return {
    actions: parsed.actions,
    buffer: buildSigningBuffer(chainId, serializedTransaction),
    transaction: parsed,
  };
}

export async function requestRawAbi(payload: AccountPayload) {
  const client = await tempClient(payload.chainId);
  const rawAbiResponse = await client.v1.chain.get_raw_abi(payload.account);
  // Convert Blob to plain number array for serialization across message channels
  const abiBytes = rawAbiResponse.abi ? Array.from(rawAbiResponse.abi.array) : [];
  return { account: payload.account, abi: abiBytes };
}

export async function requestRequiredKeys(payload: RequiredKeysPayload) {
  if (payload.availableKeys.length === 1) {
    return payload.availableKeys;
  }
  // Simplified: return first available key
  return [payload.availableKeys[0]];
}

export interface TaposValues {
  expiration: string;
  ref_block_num: number;
  ref_block_prefix: number;
  delay_sec: number;
}

export async function fetchTapos(
  chainId: string,
  expireSeconds?: number,
  blocksBehind?: number
): Promise<TaposValues> {
  const client = await tempClient(chainId);
  const info = await client.v1.chain.get_info();

  if (blocksBehind === undefined) {
    const header = info.getTransactionHeader(expireSeconds ?? 30);
    return {
      expiration: String(header.expiration),
      ref_block_num: Number(header.ref_block_num),
      ref_block_prefix: Number(header.ref_block_prefix),
      delay_sec: 0,
    };
  }

  const blockNum = Number(info.head_block_num) - blocksBehind;
  const block = await client.v1.chain.get_block(blockNum);
  const headTimeMs = TimePoint.from(info.head_block_time).toMilliseconds();
  const expireMs = headTimeMs + (expireSeconds ?? 60) * 1000;
  return {
    expiration: new Date(expireMs).toISOString().replace(/\.\d+Z$/, ''),
    ref_block_num: blockNum & 0xffff, // low 16 bits per EOSIO TAPOS spec
    ref_block_prefix: Number(block.ref_block_prefix),
    delay_sec: 0,
  };
}

/**
 * Rebuild the serialized transaction with fresh TAPOS values.
 * Callers who need to sign should call buildSigningBuffer on the result.
 */
export function rebuildSerializedTx(
  serializedTransaction: number[],
  tapos: TaposValues
): number[] {
  const decoded: any = Serializer.decode({
    data: Uint8Array.from(serializedTransaction),
    type: Transaction,
  });
  const rebuilt = Transaction.from({
    expiration: tapos.expiration,
    ref_block_num: tapos.ref_block_num,
    ref_block_prefix: tapos.ref_block_prefix,
    max_net_usage_words: decoded.max_net_usage_words,
    max_cpu_usage_ms: decoded.max_cpu_usage_ms,
    delay_sec: tapos.delay_sec,
    context_free_actions: decoded.context_free_actions,
    actions: decoded.actions,
    transaction_extensions: decoded.transaction_extensions,
  });
  return Array.from(Serializer.encode({ object: rebuilt }).array);
}

const SMOOTH_NOOP_CONTRACT = 'metahubpower';
const SMOOTH_NOOP_ACTION = 'noop';
const SMOOTH_NOOP_ACTOR = '1stbillpayer';
const SMOOTH_NOOP_PERMISSION = 'cosign';

export async function buildSmoothTransaction(
  chainId: string,
  originalSerialized: Uint8Array
): Promise<{ serializedTransaction: Uint8Array; buffer: Buffer; transaction: any }> {
  const original = Serializer.decode({ data: originalSerialized, type: Transaction }) as any;

  const noopAction = Action.from({
    account: Name.from(SMOOTH_NOOP_CONTRACT),
    name: Name.from(SMOOTH_NOOP_ACTION),
    authorization: [PermissionLevel.from({ actor: SMOOTH_NOOP_ACTOR, permission: SMOOTH_NOOP_PERMISSION })],
    data: Bytes.from(new Uint8Array(0)),
  });

  const transformed = Transaction.from({
    expiration: original.expiration,
    ref_block_num: original.ref_block_num,
    ref_block_prefix: original.ref_block_prefix,
    max_net_usage_words: original.max_net_usage_words,
    max_cpu_usage_ms: original.max_cpu_usage_ms,
    delay_sec: original.delay_sec,
    context_free_actions: original.context_free_actions,
    actions: [noopAction, ...original.actions],
    transaction_extensions: original.transaction_extensions,
  });

  const serializedTransaction = Serializer.encode({ object: transformed }).array;

  const buffer = Buffer.concat([
    Buffer.from(chainId, 'hex'),
    Buffer.from(serializedTransaction),
    Buffer.from(new Uint8Array(32)),
  ]);

  return {
    serializedTransaction,
    buffer,
    transaction: JSON.parse(JSON.stringify(transformed)),
  };
}

function normalizeTransactArgs(
  input: TransactArgsPayload['transactArgs']
): { actions: TransactArgsActionInput[]; header?: Omit<TransactArgsTransactionInput, 'actions'> } {
  if (Array.isArray(input)) {
    return { actions: input };
  }
  if (input && typeof input === 'object' && Array.isArray((input as any).actions)) {
    const { actions, ...header } = input as TransactArgsTransactionInput;
    return { actions, header };
  }
  if (
    input && typeof input === 'object' &&
    'account' in input && 'name' in input &&
    'authorization' in input && 'data' in input
  ) {
    return { actions: [input as TransactArgsActionInput] };
  }
  throw SdkError.signatureError(
    'bad_args',
    'invalid transactArgs: expected Transaction | Action[] | Action'
  );
}

export async function materializeTransactArgs(
  chainId: string,
  args: TransactArgsPayload
): Promise<{
  serializedTransaction: number[];
  transaction: any;
  resolvedAbis: Map<string, ABI>;
}> {
  const { actions, header = {} } = normalizeTransactArgs(args.transactArgs);

  const resolvedAbis = new Map<string, ABI>();
  const abisInput = args.options?.abis ?? {};
  for (const [account, json] of Object.entries(abisInput)) {
    try {
      resolvedAbis.set(account, ABI.from(json));
    } catch (e: any) {
      throw SdkError.signatureError('bad_args', `invalid abi for ${account}: ${e?.message || ''}`);
    }
  }

  const client = await tempClient(chainId);

  async function abiFor(account: string): Promise<ABI> {
    const cached = resolvedAbis.get(account);
    if (cached) return cached;
    try {
      const raw = await client.v1.chain.get_raw_abi(account);
      const abi = ABI.from(raw.abi);
      resolvedAbis.set(account, abi);
      return abi;
    } catch {
      throw SdkError.signatureError('abi_unavailable', account);
    }
  }

  async function encodeAction(a: any) {
    if (!a.authorization || a.authorization.length === 0) {
      throw SdkError.signatureError('bad_args', 'action missing authorization');
    }
    const data = a.data;
    let dataBytes: Bytes;
    if (typeof data === 'string') {
      dataBytes = Bytes.from(data, 'hex');
    } else {
      const abi = await abiFor(String(a.account));
      dataBytes = Bytes.from(
        Serializer.encode({ abi, type: String(a.name), object: data }).array
      );
    }
    return Action.from({
      account: Name.from(String(a.account)),
      name: Name.from(String(a.name)),
      authorization: a.authorization.map((p: any) =>
        PermissionLevel.from({ actor: p.actor, permission: p.permission })
      ),
      data: dataBytes,
    });
  }

  const encodedActions = await Promise.all(actions.map(encodeAction));
  const encodedCfa = await Promise.all(
    (header.context_free_actions ?? []).map(encodeAction)
  );

  // Fill sentinel TAPOS when header is incomplete — the caller's applyTapos()
  // will fetch the real values and rebuild the bytes lazily (right before signing).
  const expiration = header.expiration ?? '1970-01-01T00:00:00';
  const refBlockNum = header.ref_block_num ?? 0;
  const refBlockPrefix = header.ref_block_prefix ?? 0;

  const tx = Transaction.from({
    expiration,
    ref_block_num: refBlockNum,
    ref_block_prefix: refBlockPrefix,
    max_net_usage_words: header.max_net_usage_words ?? 0,
    max_cpu_usage_ms: header.max_cpu_usage_ms ?? 0,
    delay_sec: header.delay_sec ?? 0,
    context_free_actions: encodedCfa,
    actions: encodedActions,
    transaction_extensions: (header.transaction_extensions ?? []).map(
      ([type, data]: [number, string]) => ({ type, data: Bytes.from(data, 'hex') })
    ),
  });

  const serialized = Serializer.encode({ object: tx }).array;
  const decoded = await deserializeTransactionWithActions(chainId, serialized, resolvedAbis);

  return {
    serializedTransaction: Array.from(serialized),
    transaction: decoded,
    resolvedAbis,
  };
}
