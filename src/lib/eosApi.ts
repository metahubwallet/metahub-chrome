import {
    APIClient,
    ABI,
    Blob,
    Action,
    Transaction,
    SignedTransaction,
    Serializer,
    PublicKey,
    Bytes,
} from '@wharfkit/antelope';
import { Auth } from '@/types/account';
import { Chain } from '@/lib/chain';
import { Permission, PermissionLevel, KeyWeight } from '@/types/eos';
import { ErrorCode } from '@/utils/errorCode';

// ---------------------------------------------------------------------------
// ABI cache helpers — kept inline to avoid circular imports
// ---------------------------------------------------------------------------

import { CacheABI } from '@/types/settings';

let _localCache: { get: (key: string, def: any) => Promise<any>; set: (key: string, val: any) => Promise<void> } | null = null;

export function setLocalCache(cache: typeof _localCache) {
    _localCache = cache;
}

const getCachedABI = async (chainId: string, contract: string): Promise<CacheABI | null> => {
    if (!_localCache) return null;
    const cachedAbis = (await _localCache.get('cachedAbis', [])) as CacheABI[];
    const cachedAbi = cachedAbis.find((x) => x.chainId === chainId && x.contract === contract);
    return cachedAbi ?? null;
};

const setCacheABI = async (abi: CacheABI) => {
    if (!_localCache) return;
    const cachedAbis = (await _localCache.get('cachedAbis', [])) as CacheABI[];
    const index = cachedAbis.findIndex(
        (x) => x.chainId === abi.chainId && x.contract === abi.contract
    );
    if (index >= 0) {
        cachedAbis[index] = abi;
    } else {
        cachedAbis.push(abi);
    }
    await _localCache.set('cachedAbis', cachedAbis);
};

const getContractAbi = async (client: APIClient, chainId: string, contract: string) => {
    const cachedABI = await getCachedABI(chainId, contract);
    const nowTime = new Date().getTime();

    if (
        cachedABI &&
        cachedABI.abi &&
        Array.isArray(cachedABI.raw) &&
        cachedABI.expire &&
        cachedABI.expire > nowTime
    ) {
        const accountInfo = await client.v1.chain.get_account(contract);
        const codeUpdateTime = new Date(
            (accountInfo as any).last_code_update + 'Z'
        ).getTime();
        if (cachedABI.updated > codeUpdateTime) {
            const raw = Uint8Array.from(cachedABI.raw);
            const abi = ABI.from(new Blob(raw));
            return { abi, raw };
        }
    }

    console.log('fetch abi', contract);
    const rawAbiResponse = await client.v1.chain.get_raw_abi(contract);
    const raw: Uint8Array = rawAbiResponse.abi.array;
    const abi = ABI.from(rawAbiResponse.abi);

    const savableAbi: CacheABI = {
        chainId,
        contract,
        abi,
        raw: Array.from(raw),
        updated: nowTime,
        expire: nowTime + 86400 * 1000,
    };
    await setCacheABI(savableAbi);
    return { abi, raw };
};

// ---------------------------------------------------------------------------
// Transaction input shape
// ---------------------------------------------------------------------------

export interface ActionInput {
    account: string;
    name: string;
    authorization: Array<{ actor: string; permission: string }>;
    data: Record<string, any>;
}

export interface TransactionInput {
    actions: ActionInput[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BLOCKS_BEHIND = 3;
const DEFAULT_EXPIRE_SECONDS = 30;
const DEFAULT_TX_OPTIONS = { blocksBehind: DEFAULT_BLOCKS_BEHIND, expireSeconds: DEFAULT_EXPIRE_SECONDS };

const SMOOTH_NOOP_CONTRACT = 'metahubpower';
const SMOOTH_NOOP_ACTION = 'noop';
const SMOOTH_NOOP_ACTOR = '1stbillpayer';
const SMOOTH_NOOP_PERMISSION = 'cosign';

// ---------------------------------------------------------------------------
// EOSApi
// ---------------------------------------------------------------------------

export default class EOSApi {
    public client: APIClient;

    constructor(
        public chainId: string,
        public endpoint: string,
        private chain: Chain,
        private pushTx?: (data: { signed: string }) => Promise<any>
    ) {
        this.client = new APIClient({ url: this.endpoint });
    }

    // --- Generic table query helper ---

    private async getTableRows<T = any>(params: {
        code: string;
        scope: string;
        table: string;
        lower_bound?: string | number;
        upper_bound?: string | number;
        limit?: number;
        key_type?: string;
    }): Promise<{ rows: T[]; more: boolean } | null> {
        try {
            return await this.client.v1.chain.get_table_rows({
                json: true,
                ...params,
            } as any);
        } catch {
            return null;
        }
    }

    // --- Query methods ---

    async getCurrencyBalance(contract: string, account: string, symbol: string) {
        try {
            const res = await this.client.v1.chain.get_currency_balance(contract, account, symbol);
            return res && res.length > 0 ? res[0].toString() : '';
        } catch {
            return '';
        }
    }

    async getREXInfo(account = '') {
        return this.getTableRows({
            code: 'eosio', scope: 'eosio', table: 'rexbal',
            lower_bound: account, limit: 1,
        });
    }

    async getEosPrice(): Promise<number> {
        // or use: swap.1dex:pools,id 9, quote_reserve/base_reserve
        const res = await this.getTableRows({
            code: 'swap.defi', scope: 'swap.defi', table: 'pairs',
            lower_bound: 12, upper_bound: 12, limit: 1,
            key_type: 'i64',
        });
        const price = parseFloat((res as any).rows[0].price0_last);
        if (!price || isNaN(price)) throw new Error('Invalid EOS price');
        return price;
    }

    async getKeyAccounts(publicKey: string) {
        try {
            const result = await this.client.v1.chain.get_accounts_by_authorizers({ keys: [publicKey] });
            const accounts = result.accounts.map((a) => a.account_name.toString());
            return Array.from(new Set(accounts));
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    async testHttpEndpoint(endpoint = '') {
        const testClient = new APIClient({ url: endpoint });
        return await testClient.v1.chain.get_info();
    }

    updateHttpEndpoint(endpoint: string) {
        this.endpoint = endpoint;
        this.client = new APIClient({ url: endpoint });
    }

    async getCurrencyStats(contract: string, symbol: string) {
        try {
            const res = await this.client.v1.chain.get_currency_stats(contract, symbol);
            return (res as any)[symbol];
        } catch {
            return null;
        }
    }

    async getRamMarket() {
        return this.getTableRows({ code: 'eosio', scope: 'eosio', table: 'rammarket' });
    }

    async getDelegatebwList(from: string) {
        try {
            const res = await this.getTableRows({ code: 'eosio', scope: from, table: 'delband' });
            return res?.rows ?? [];
        } catch {
            return [];
        }
    }

    async getPowupState() {
        try {
            const res = await this.getTableRows({
                code: 'eosio', scope: '', table: 'powup.state', limit: 1,
            });
            return res?.rows?.[0] ?? null;
        } catch {
            return null;
        }
    }

    async getAccount(account = '') {
        if (account === '') throw { code: ErrorCode.NAME_EMPTY };
        try {
            return await this.client.v1.chain.get_account(account);
        } catch {
            return null;
        }
    }

    async getRawAbi(accountName: string) {
        const { raw } = await getContractAbi(this.client, this.chainId, accountName);
        return { accountName, abi: raw };
    }

    async getAbis(contracts: string[]) {
        const abis: Record<string, ABI> = {};
        await Promise.all(
            contracts.map(async (contract) => {
                const { abi } = await getContractAbi(this.client, this.chainId, contract);
                abis[contract] = abi;
            })
        );
        return abis;
    }

    // --- Permission management ---

    makeNewPermissions(
        perms: Permission[],
        operateType: string,
        operatePerm: string,
        oldOperateKey?: string,
        newOperateKey?: string
    ) {
        const toLegacy = (k: any): string => {
            try { return PublicKey.from(String(k)).toLegacyString(); } catch { return String(k); }
        };
        const oldKeyLegacy = oldOperateKey ? toLegacy(oldOperateKey) : '';

        for (const perm of perms) {
            if (String(perm.perm_name) === String(operatePerm)) {
                const keys = perm.required_auth.keys.concat();
                switch (operateType) {
                    case 'add':
                        keys.push({ key: newOperateKey!, weight: 1 });
                        break;
                    case 'modify': {
                        const idx = keys.findIndex((x) => toLegacy(x.key) === oldKeyLegacy);
                        if (idx >= 0) keys[idx].key = newOperateKey!;
                        break;
                    }
                    case 'remove': {
                        const idx = keys.findIndex((x) => toLegacy(x.key) === oldKeyLegacy);
                        if (idx >= 0) keys.splice(idx, 1);
                        break;
                    }
                }
                if (keys.length) {
                    keys.sort((a: KeyWeight, b: KeyWeight) => String(a.key).localeCompare(String(b.key)));
                }
                perm.required_auth.keys = keys;
            }
        }
        return perms;
    }

    async updatePerms(accountName: string, perms: Permission[]) {
        const actions: ActionInput[] = perms.map((perm) => ({
            account: 'eosio',
            name: 'updateauth',
            authorization: [this.chain.getMaxPermission(accountName, this.chainId)],
            data: {
                account: accountName,
                permission: perm.perm_name,
                parent: perm.parent,
                auth: perm.required_auth,
            },
        }));
        return this.transact({ actions }, DEFAULT_TX_OPTIONS, true);
    }

    async deletePerm(accountName: string, perm: PermissionLevel) {
        return this.transact({
            actions: [{
                account: 'eosio',
                name: 'deleteauth',
                authorization: [this.chain.getMaxPermission(accountName, this.chainId)],
                data: perm,
            }],
        }, DEFAULT_TX_OPTIONS, true);
    }

    // --- Transaction action helpers ---

    private buildSingleAction(contract: string, name: string, auth: Auth, data: Record<string, any>): TransactionInput {
        return { actions: [{ account: contract, name, authorization: [auth], data }] };
    }

    async delegatebw(
        from: string, receiver: string,
        stake_net_quantity = '0.0000 EOS', stake_cpu_quantity = '0.0000 EOS',
        transfer = false, auth: Auth
    ) {
        return this.transact(
            this.buildSingleAction('eosio', 'delegatebw', auth, {
                from, receiver, stake_net_quantity, stake_cpu_quantity, transfer: transfer ? 1 : 0,
            }),
            DEFAULT_TX_OPTIONS,
        );
    }

    async undelegatebw(
        from: string, receiver: string,
        unstake_net_quantity = '0.0000 EOS', unstake_cpu_quantity = '0.0000 EOS',
        auth: Auth
    ) {
        return this.transact(
            this.buildSingleAction('eosio', 'undelegatebw', auth, {
                from, receiver, unstake_net_quantity, unstake_cpu_quantity,
            }),
            DEFAULT_TX_OPTIONS,
        );
    }

    async refund(owner: string, auth: Auth) {
        return this.transact(
            this.buildSingleAction('eosio', 'refund', auth, { owner }),
            DEFAULT_TX_OPTIONS,
        );
    }

    async powerup(params: any, auth: Auth) {
        return this.transact(
            this.buildSingleAction('eosio', 'powerup', auth, params),
            DEFAULT_TX_OPTIONS, true,
        );
    }

    async buyRam(payer: string, receiver: string, quant: string, auth: Auth) {
        return this.transact(
            this.buildSingleAction('eosio', 'buyram', auth, { payer, receiver, quant }),
            DEFAULT_TX_OPTIONS,
        );
    }

    async buyRamBytes(payer: string, receiver: string, bytes: number, auth: Auth) {
        return this.transact(
            this.buildSingleAction('eosio', 'buyrambytes', auth, { payer, receiver, bytes }),
            DEFAULT_TX_OPTIONS,
        );
    }

    async sellRam(account: string, bytes: number, auth: Auth) {
        return this.transact(
            this.buildSingleAction('eosio', 'sellram', auth, { account, bytes }),
            DEFAULT_TX_OPTIONS,
        );
    }

    async transfer(contract: string, from: string, to: string, quantity: string, memo: string, auth: Auth) {
        return this.transact(
            this.buildSingleAction(contract, 'transfer', auth, { from, to, quantity, memo }),
            DEFAULT_TX_OPTIONS,
        );
    }

    // --- Core transaction method ---

    async transact(transaction: TransactionInput, options: any = {}, ignoreCPUProxy = false) {
        const currentAccount = this.chain.currentAccount();
        let isProxy = currentAccount.smoothMode;

        // Check if this is a top-up transfer to the CPU proxy
        const firstAction = transaction.actions[0];
        if (firstAction.name === 'transfer' && firstAction.account === 'eosio.token') {
            if (firstAction.data.to === '1stbillpayer') isProxy = true;
        } else if ((typeof options.broadcast !== 'undefined' && options.broadcast === false) || ignoreCPUProxy) {
            isProxy = false;
        }

        const expireSeconds: number = options.expireSeconds ?? DEFAULT_EXPIRE_SECONDS;

        // Fetch ABIs for all contracts
        const contractNames = Array.from(new Set(transaction.actions.map((a) => a.account)));
        const abiMap: Record<string, ABI> = {};
        await Promise.all(
            contractNames.map(async (contract) => {
                const { abi } = await getContractAbi(this.client, this.chainId, contract);
                abiMap[contract] = abi;
            })
        );

        // Build transaction
        const serializedActions = transaction.actions.map((a) => Action.from(a, abiMap[a.account]));
        const info = await this.client.v1.chain.get_info();
        const txHeader = info.getTransactionHeader(expireSeconds);
        const builtTx = Transaction.from({ ...txHeader, actions: serializedActions });
        const serializedTransaction = Serializer.encode({ object: builtTx }).array;

        // Get keys
        const sigProvider = this.chain.signatureProvider(this.chainId);
        const availableKeys: string[] = await sigProvider.getAvailableKeys();
        const authProvider = this.chain.authorityProvider(this.chainId);
        const requiredKeys: string[] = await authProvider.getRequiredKeys({
            transaction: builtTx as any,
            availableKeys,
        });

        if (!isProxy) {
            return this.signAndPush(builtTx, sigProvider, requiredKeys, serializedTransaction);
        }

        // Smooth / proxy mode
        return this.signAndPushProxy(
            transaction, abiMap, txHeader, sigProvider, authProvider, availableKeys
        );
    }

    private async signAndPush(
        builtTx: Transaction, sigProvider: any, requiredKeys: string[], serializedTransaction: Uint8Array
    ) {
        const signResult = await sigProvider.sign({
            chainId: this.chainId,
            requiredKeys,
            serializedTransaction,
            serializedContextFreeData: new Uint8Array(0),
            abis: [],
        });
        const signedTx = SignedTransaction.from({ ...builtTx, signatures: signResult.signatures });
        return this.client.v1.chain.push_transaction(signedTx);
    }

    private async signAndPushProxy(
        transaction: TransactionInput, abiMap: Record<string, ABI>, txHeader: any,
        sigProvider: any, authProvider: any, availableKeys: string[]
    ) {
        // Prepend metahubpower::noop action authorized by 1stbillpayer@cosign
        const noopAction = Action.from({
            account: SMOOTH_NOOP_CONTRACT,
            name: SMOOTH_NOOP_ACTION,
            authorization: [{ actor: SMOOTH_NOOP_ACTOR, permission: SMOOTH_NOOP_PERMISSION }],
            data: Bytes.from(new Uint8Array(0)),
        });

        const userSerializedActions = transaction.actions.map((a) => Action.from(a, abiMap[a.account]));
        const proxiedSerializedActions = [noopAction, ...userSerializedActions];
        const proxiedTx = Transaction.from({ ...txHeader, actions: proxiedSerializedActions });
        const proxiedSerialized = Serializer.encode({ object: proxiedTx }).array;

        const proxiedRequiredKeys: string[] = await authProvider.getRequiredKeys({
            transaction: proxiedTx as any,
            availableKeys,
        });

        const signResult = await sigProvider.sign({
            chainId: this.chainId,
            requiredKeys: proxiedRequiredKeys,
            serializedTransaction: proxiedSerialized,
            serializedContextFreeData: new Uint8Array(0),
            abis: [],
        });

        const decodedTrx = Serializer.decode({ data: proxiedSerialized, type: Transaction }) as any;
        decodedTrx.signatures = signResult.signatures;

        if (!this.pushTx) {
            throw new Error('pushTx is not configured for smooth mode');
        }

        const res: any = await this.pushTx({ signed: JSON.stringify(decodedTrx) });
        console.log('[Metahub] pushTx response:', JSON.stringify(res));

        const serverSignature = res?.result?.signature;
        if (serverSignature) {
            const signatures = [serverSignature, ...signResult.signatures];
            const signedTx = SignedTransaction.from({ ...proxiedTx, signatures });
            try {
                return await this.client.v1.chain.push_transaction(signedTx);
            } catch (pushErr: any) {
                console.error('[Metahub] push_transaction error:', pushErr);
                throw pushErr;
            }
        }

        const msg = res?.message || 'unknown error';
        if (msg === 'success') {
            // API returned success but no signature
            throw new Error('Server returned success but no signature');
        }
        throw new Error(msg);
    }
}
