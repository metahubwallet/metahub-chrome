import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Buffer } from 'buffer';
import {
  Serializer,
  Transaction,
  Action,
  Name,
  PermissionLevel,
  Bytes,
  ABI,
} from '@wharfkit/antelope';
import { buildSmoothTransaction, fetchTapos, deserializeTransactionWithActions, materializeTransactArgs } from '../abiHandler';
import type { TransactArgsPayload } from '@/lib/messages/message';

vi.mock('../networkHandler', () => ({
  getEndPoint: vi.fn(async () => 'https://mock-endpoint.example'),
}));

vi.mock('@/lib/eosApi', () => ({
  setLocalCache: vi.fn(),
}));

vi.mock('@/utils/cache', () => ({
  localCache: { get: vi.fn(), set: vi.fn() },
}));

const mockGetInfo = vi.fn();
const mockGetBlock = vi.fn();
const mockGetRawAbi = vi.fn();

vi.mock('@wharfkit/antelope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wharfkit/antelope')>();
  class APIClient {
    v1 = {
      chain: {
        get_info: mockGetInfo,
        get_block: mockGetBlock,
        get_raw_abi: mockGetRawAbi,
      },
    };
    constructor(_: any) {}
  }
  return { ...actual, APIClient };
});

describe('buildSmoothTransaction', () => {
  const chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';

  // Hand-rolled `eosio.token::transfer` action with already-encoded data so we don't need ABI lookup.
  function makeOriginalSerialized(): Uint8Array {
    const userAction = Action.from({
      account: Name.from('eosio.token'),
      name: Name.from('transfer'),
      authorization: [PermissionLevel.from({ actor: 'alice', permission: 'active' })],
      data: Bytes.from(new Uint8Array(0)),
    });
    const tx = Transaction.from({
      expiration: '2026-04-16T10:00:00',
      ref_block_num: 1,
      ref_block_prefix: 2,
      max_net_usage_words: 0,
      max_cpu_usage_ms: 0,
      delay_sec: 0,
      context_free_actions: [],
      actions: [userAction],
      transaction_extensions: [],
    });
    return Serializer.encode({ object: tx }).array;
  }

  it('prepends metahubpower::noop and preserves the user action', async () => {
    const original = makeOriginalSerialized();
    const { serializedTransaction } = await buildSmoothTransaction(chainId, original);

    const decoded = Serializer.decode({ data: serializedTransaction, type: Transaction }) as any;
    expect(decoded.actions).toHaveLength(2);

    const noop = decoded.actions[0];
    expect(String(noop.account)).toBe('metahubpower');
    expect(String(noop.name)).toBe('noop');
    expect(noop.authorization).toHaveLength(1);
    expect(String(noop.authorization[0].actor)).toBe('1stbillpayer');
    expect(String(noop.authorization[0].permission)).toBe('cosign');
    expect(Array.from(noop.data.array)).toEqual([]);

    const userAction = decoded.actions[1];
    expect(String(userAction.account)).toBe('eosio.token');
    expect(String(userAction.name)).toBe('transfer');
    expect(userAction.authorization).toHaveLength(1);
    expect(String(userAction.authorization[0].actor)).toBe('alice');
    expect(String(userAction.authorization[0].permission)).toBe('active');
  });

  it('returns signing buffer = chainId + serializedTransaction + 32 zero bytes', async () => {
    const original = makeOriginalSerialized();
    const { serializedTransaction, buffer } = await buildSmoothTransaction(chainId, original);

    const expected = Buffer.concat([
      Buffer.from(chainId, 'hex'),
      Buffer.from(serializedTransaction),
      Buffer.from(new Uint8Array(32)),
    ]);
    expect(buffer.equals(expected)).toBe(true);
  });

  it('preserves the original TAPOS header fields', async () => {
    const original = makeOriginalSerialized();
    const originalDecoded = Serializer.decode({ data: original, type: Transaction }) as any;
    const { serializedTransaction } = await buildSmoothTransaction(chainId, original);
    const transformedDecoded = Serializer.decode({ data: serializedTransaction, type: Transaction }) as any;

    expect(String(transformedDecoded.expiration)).toBe(String(originalDecoded.expiration));
    expect(Number(transformedDecoded.ref_block_num)).toBe(Number(originalDecoded.ref_block_num));
    expect(Number(transformedDecoded.ref_block_prefix)).toBe(Number(originalDecoded.ref_block_prefix));
  });
});

describe('fetchTapos', () => {
  const chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';

  beforeEach(() => {
    mockGetInfo.mockReset();
    mockGetBlock.mockReset();
    mockGetRawAbi.mockReset();
  });

  it('uses LIB-based getTransactionHeader when blocksBehind undefined', async () => {
    mockGetInfo.mockResolvedValue({
      getTransactionHeader: (exp: number) => ({
        expiration: '2026-04-17T10:00:' + String(exp).padStart(2, '0'),
        ref_block_num: 111,
        ref_block_prefix: 222,
      }),
    });
    const r = await fetchTapos(chainId, 30);
    expect(r.expiration).toBe('2026-04-17T10:00:30');
    expect(r.ref_block_num).toBe(111);
    expect(r.ref_block_prefix).toBe(222);
    expect(r.delay_sec).toBe(0);
    expect(mockGetBlock).not.toHaveBeenCalled();
  });

  it('computes ref from head - blocksBehind when blocksBehind provided', async () => {
    mockGetInfo.mockResolvedValue({
      head_block_num: 0x00010000 + 5, // = 65541
      head_block_time: '2026-04-17T10:00:00.000',
    });
    mockGetBlock.mockResolvedValue({ ref_block_prefix: 0xdeadbeef });
    const r = await fetchTapos(chainId, 60, 3);
    expect(r.ref_block_num).toBe((65541 - 3) & 0xffff);
    expect(r.ref_block_prefix).toBe(0xdeadbeef);
    expect(r.expiration).toBe('2026-04-17T10:01:00');
    expect(r.delay_sec).toBe(0);
    expect(mockGetBlock).toHaveBeenCalledWith(65541 - 3);
  });

  it('defaults expireSeconds to 60 when only blocksBehind provided', async () => {
    mockGetInfo.mockResolvedValue({
      head_block_num: 100,
      head_block_time: '2026-04-17T10:00:00.000',
    });
    mockGetBlock.mockResolvedValue({ ref_block_prefix: 1 });
    const r = await fetchTapos(chainId, undefined, 3);
    expect(r.expiration).toBe('2026-04-17T10:01:00');
  });
});

describe('deserializeTransactionWithActions', () => {
  const chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';

  function makeTransferBytes(abi: ABI): Uint8Array {
    const data = Serializer.encode({
      abi,
      type: 'transfer',
      object: { from: 'alice', to: 'bob', quantity: '1.0000 EOS', memo: 'hi' },
    }).array;
    const act = Action.from({
      account: Name.from('eosio.token'),
      name: Name.from('transfer'),
      authorization: [PermissionLevel.from({ actor: 'alice', permission: 'active' })],
      data: Bytes.from(data),
    });
    const tx = Transaction.from({
      expiration: '2026-04-17T10:00:00',
      ref_block_num: 1,
      ref_block_prefix: 2,
      max_net_usage_words: 0,
      max_cpu_usage_ms: 0,
      delay_sec: 0,
      context_free_actions: [],
      actions: [act],
      transaction_extensions: [],
    });
    return Serializer.encode({ object: tx }).array;
  }

  const transferAbi = ABI.from({
    version: 'eosio::abi/1.2',
    types: [],
    structs: [
      {
        name: 'transfer',
        base: '',
        fields: [
          { name: 'from', type: 'name' },
          { name: 'to', type: 'name' },
          { name: 'quantity', type: 'asset' },
          { name: 'memo', type: 'string' },
        ],
      },
    ],
    actions: [{ name: 'transfer', type: 'transfer', ricardian_contract: '' }],
    tables: [],
    ricardian_clauses: [],
    variants: [],
  });

  beforeEach(() => {
    mockGetInfo.mockReset();
    mockGetBlock.mockReset();
    mockGetRawAbi.mockReset();
  });

  it('uses abi override when provided (no RPC)', async () => {
    const bytes = makeTransferBytes(transferAbi);
    const map = new Map<string, ABI>([['eosio.token', transferAbi]]);
    const out = await deserializeTransactionWithActions(chainId, bytes, map);
    expect(out.actions[0].account).toBe('eosio.token');
    expect(out.actions[0].data.from).toBe('alice');
    expect(out.actions[0].data.memo).toBe('hi');
    expect(mockGetRawAbi).not.toHaveBeenCalled();
  });

  it('falls back to get_raw_abi when account not in override map', async () => {
    const bytes = makeTransferBytes(transferAbi);
    mockGetRawAbi.mockResolvedValue({ abi: transferAbi.toJSON() });
    const out = await deserializeTransactionWithActions(chainId, bytes); // no overrides
    expect(out.actions[0].data.from).toBe('alice');
    expect(mockGetRawAbi).toHaveBeenCalledWith('eosio.token');
  });

  it('rethrows when caller-supplied ABI references an undefined type', async () => {
    const bytes = makeTransferBytes(transferAbi);
    const brokenAbi = ABI.from({
      version: 'eosio::abi/1.2',
      types: [],
      structs: [],
      // action claims to be of type 'undefined_type' — decode must throw
      actions: [{ name: 'transfer', type: 'undefined_type', ricardian_contract: '' }],
      tables: [],
      ricardian_clauses: [],
      variants: [],
    });
    const map = new Map<string, ABI>([['eosio.token', brokenAbi]]);
    await expect(
      deserializeTransactionWithActions(chainId, bytes, map)
    ).rejects.toBeDefined();
  });
});

describe('materializeTransactArgs', () => {
  const chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';

  const transferAbiJson = {
    version: 'eosio::abi/1.2',
    types: [],
    structs: [
      {
        name: 'transfer',
        base: '',
        fields: [
          { name: 'from', type: 'name' },
          { name: 'to', type: 'name' },
          { name: 'quantity', type: 'asset' },
          { name: 'memo', type: 'string' },
        ],
      },
    ],
    actions: [{ name: 'transfer', type: 'transfer', ricardian_contract: '' }],
    tables: [],
    ricardian_clauses: [],
    variants: [],
  };

  beforeEach(() => {
    mockGetInfo.mockReset();
    mockGetBlock.mockReset();
    mockGetRawAbi.mockReset();
  });

  it('serializes object action data using abi override and header TAPOS', async () => {
    const args: TransactArgsPayload = {
      transactArgs: {
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: { from: 'alice', to: 'bob', quantity: '1.0000 EOS', memo: 'hi' },
          },
        ],
        expiration: '2026-04-17T10:00:00',
        ref_block_num: 1,
        ref_block_prefix: 2,
      },
      options: {
        abis: { 'eosio.token': transferAbiJson },
      },
    };
    const r = await materializeTransactArgs(chainId, args);
    expect(r.serializedTransaction).toBeInstanceOf(Array);
    expect(r.serializedTransaction.length).toBeGreaterThan(0);
    expect(r.transaction.actions[0].data.from).toBe('alice');
    expect(r.transaction.actions[0].data.memo).toBe('hi');
    expect(String(r.transaction.expiration)).toBe('2026-04-17T10:00:00');
    expect(r.resolvedAbis.has('eosio.token')).toBe(true);
    expect(mockGetInfo).not.toHaveBeenCalled();
  });

  it('treats string action data as already-serialized hex', async () => {
    const args: TransactArgsPayload = {
      transactArgs: {
        actions: [
          {
            account: 'noop',
            name: 'noop',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: '', // empty hex
          },
        ],
        expiration: '2026-04-17T10:00:00',
        ref_block_num: 1,
        ref_block_prefix: 2,
      },
      options: {},
    };
    const r = await materializeTransactArgs(chainId, args);
    expect(r.serializedTransaction.length).toBeGreaterThan(0);
  });

  it('fills sentinel TAPOS when header missing (applyTapos fetches lazily)', async () => {
    const args: TransactArgsPayload = {
      transactArgs: [
        {
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{ actor: 'alice', permission: 'active' }],
          data: { from: 'alice', to: 'bob', quantity: '1.0000 EOS', memo: '' },
        },
      ],
      options: { abis: { 'eosio.token': transferAbiJson } },
    };
    const r = await materializeTransactArgs(chainId, args);
    expect(String(r.transaction.expiration)).toBe('1970-01-01T00:00:00');
    expect(Number(r.transaction.ref_block_num)).toBe(0);
    expect(Number(r.transaction.ref_block_prefix)).toBe(0);
    expect(mockGetInfo).not.toHaveBeenCalled();
  });

  it('throws abi_unavailable when ABI missing both override and RPC', async () => {
    mockGetRawAbi.mockRejectedValue(new Error('no abi'));

    const args: TransactArgsPayload = {
      transactArgs: {
        actions: [
          {
            account: 'unknown.acct',
            name: 'doit',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: { x: 1 },
          },
        ],
        expiration: '2026-04-17T10:00:00',
        ref_block_num: 1,
        ref_block_prefix: 2,
      },
      options: {},
    };
    await expect(materializeTransactArgs(chainId, args)).rejects.toMatchObject({
      isError: true,
      type: 'abi_unavailable',
    });
  });

  it('resolves mixed ABI sources in a multi-action tx and caches RPC result', async () => {
    mockGetRawAbi.mockImplementation(async (account: string) => {
      if (account === 'eosio.token') return { abi: transferAbiJson };
      // other.acct has hex data, but the display-phase decoder will still look it up.
      // Return a minimal ABI so decoding doesn't throw.
      return { abi: { version: 'eosio::abi/1.2', types: [], structs: [{ name: 'ping', base: '', fields: [] }], actions: [{ name: 'ping', type: 'ping', ricardian_contract: '' }], tables: [], ricardian_clauses: [], variants: [] } };
    });
    const args: TransactArgsPayload = {
      transactArgs: {
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: { from: 'alice', to: 'bob', quantity: '1.0000 EOS', memo: 'rpc' },
          },
          {
            account: 'other.acct',
            name: 'ping',
            authorization: [{ actor: 'alice', permission: 'active' }],
            data: '', // hex string — encoding phase skips ABI lookup
          },
        ],
        expiration: '2026-04-17T10:00:00',
        ref_block_num: 1,
        ref_block_prefix: 2,
      },
      options: {}, // no overrides — forces RPC for eosio.token
    };
    const r = await materializeTransactArgs(chainId, args);
    expect(r.transaction.actions).toHaveLength(2);
    expect(r.transaction.actions[0].data.memo).toBe('rpc');
    expect(r.resolvedAbis.has('eosio.token')).toBe(true); // cached after RPC encode step
    expect(mockGetRawAbi).toHaveBeenCalledWith('eosio.token');
  });
});
