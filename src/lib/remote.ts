import axios from 'axios';
import { APIClient } from '@wharfkit/antelope';
import { Balance, Coin } from '@/types/tokens';

const hyperionApis = {
    eos: 'https://eos.hyperion.eosrio.io', //https://api.eossweden.org/v2
    bos: 'https://api.bossweden.org',
    wax: 'https://wax.eosrio.io',
    telos: 'https://telos.eosrio.io', // https://mainnet.telos.net/v2
    proton: 'https://proton.cryptolions.io',
    kylin: 'https://kylin.eossweden.org',
    jungle: 'https://jungle.eossweden.org',
    jungle3: 'https://jungle3.eosrio.io',
    'bos-test': 'https://tst.bossweden.org',
    'telos-test': 'https://testnet.telos.net',
    'wax-test': 'https://testnet.wax.pink.gg',
    'proton-test': 'https://testnet.protonchain.com',
};

type hyperionKey =
    | 'eos'
    | 'bos'
    | 'wax'
    | 'telos'
    | 'proton'
    | 'kylin'
    | 'jungle'
    | 'jungle3'
    | 'bos-test'
    | 'telos-test'
    | 'wax-test'
    | 'proton-test';

export { hyperionApis };

export const isSupportChain = (chainName: string) => {
    return hyperionApis[chainName as hyperionKey] ? true : false;
};

export const getEndpoints = async (chainName: string) => {
    try {
        let res = await axios.get(
            `https://cdn.jsdelivr.net/gh/metahubwallet/chain-rpcs@master/${chainName}-rpcs.json`
        );
        return res ? res.data : [];
    } catch (e) {
        return [];
    }
};

const queryKeyAccountsAt = async (publicKey: string, endpoint: string): Promise<string[]> => {
    const client = new APIClient({ url: endpoint });
    const result = await client.v1.chain.get_accounts_by_authorizers({ keys: [publicKey] });
    const accounts = (result as any).accounts.map((a: any) => a.account_name.toString()) as string[];
    return Array.from(new Set(accounts));
};

// Try default endpoint first; if get_accounts_by_authorizers is unavailable,
// ping the alternatives, sort by latency, and try each until one succeeds.
export const queryKeyAccountsWithFallback = async (
    publicKey: string,
    defaultEndpoint: string,
    alternativeEndpoints: string[],
): Promise<string[]> => {
    if (defaultEndpoint) {
        try {
            return await queryKeyAccountsAt(publicKey, defaultEndpoint);
        } catch (e) {
            console.warn('get_accounts_by_authorizers failed on default endpoint', e);
        }
    }

    const candidates = Array.from(
        new Set(alternativeEndpoints.filter((ep) => ep && ep !== defaultEndpoint))
    );
    if (candidates.length === 0) return [];

    const pings = await Promise.all(
        candidates.map(async (url) => {
            const start = Date.now();
            try {
                await Promise.race([
                    new APIClient({ url }).v1.chain.get_info(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
                ]);
                return { url, latency: Date.now() - start };
            } catch {
                return { url, latency: Infinity };
            }
        })
    );
    const sorted = pings
        .filter((x) => x.latency !== Infinity)
        .sort((a, b) => a.latency - b.latency);

    for (const { url } of sorted) {
        try {
            return await queryKeyAccountsAt(publicKey, url);
        } catch {
            // try next
        }
    }

    return [];
};

export const getBalanceList = async (
    account: string,
    tokens: Coin[],
    chainApi: { getCurrencyBalance: (contract: string, account: string, symbol: string) => Promise<string> },
    onBlanceInquired: Function
) => {
    try {
        const balances = [] as Balance[];
        for (const t of tokens) {
            const balance = await chainApi.getCurrencyBalance(t.contract, account, t.symbol);
            const amount = balance ? parseFloat(balance.split(' ')[0]) : 0;
            const item: Balance = { ...t, amount };
            balances.push(item);
            if (typeof onBlanceInquired === 'function') {
                onBlanceInquired(item);
            }
        }
        return balances;
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const getBpInfo = async () => {
    return { data: [], code: 1, msg: '' };
};

export const getTransactionList = async (chain: string, data: any) => {
    try {
        if (!hyperionApis[chain as hyperionKey]) return [];

        let url =
            hyperionApis[chain as hyperionKey] +
            '/v2/history/get_actions?' +
            new URLSearchParams(data).toString();
        let res = await axios.get(url);
        const actions = res.data && res.data.actions ? res.data.actions : [];
        return actions.map((i: any) => {
            const quantity: string = i.act.data.quantity ?? '';
            const symbol = quantity.includes(' ') ? quantity.split(' ')[1] : '';
            let action = {} as any;
            action.trx_id = i.trx_id;
            action.block_num = i.block_num;
            action.timestamp = i.timestamp;
            action.receiver = i.act.data.to;
            action.sender = i.act.data.from;
            action.quantity = quantity;
            action.memo = i.act.data.memo;
            action.contract = i.act.account;
            action.symbol = symbol;
            return action;
        });

    } catch (e) {
        console.error(e);
        return [];
    }
};
