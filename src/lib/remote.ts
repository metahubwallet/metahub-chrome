import axios from 'axios';
import { Balance, Coin } from '@/types/tokens';

//https://wax.greymass.com/v1
const lightApis = {
    eos: 'https://eos.light-api.net',
    wax: 'https://wax.light-api.net',
    telos: 'https://telos.light-api.net',
    proton: 'https://proton.light-api.net',
    kylin: 'https://testnet-lightapi.eosams.xeos.me',
    'telos-test': 'https://testnet-lightapi.eosams.xeos.me',
    'wax-test': 'https://testnet-lightapi.eosams.xeos.me',
    'proton-test': 'https://testnet-lightapi.eosams.xeos.me',
};

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

export type lightKey =
    | 'eos'
    | 'wax'
    | 'telos'
    | 'proton'
    | 'kylin'
    | 'telos-test'
    | 'wax-test'
    | 'proton-test';

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

export { lightApis, hyperionApis };

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

export const getKeyAccounts = async (chain: lightKey, publicKey: string) => {
    try {
        if (!lightApis[chain]) return [];

        let res = await axios.get(lightApis[chain] + '/api/key/' + publicKey);
        if (res.status === 200 && res.data) {
            const ckey = chain.replace('-', '');
            if (res.data[ckey]) {
                const accounts = res.data[ckey].accounts;
                return Object.keys(accounts);
            }
        }
    } catch (e) {
        console.error(e);
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
        // to use: http://light-api/api/account/CHAIN/ACCOUNT
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
