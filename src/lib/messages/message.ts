import SdkError from '@/lib/sdkError';

const strippedHost = () => {
    let host = location.hostname;
    // Replacing www. only if the domain starts with it.
    if (host.indexOf('www.') === 0) host = host.replace('www.', '');
    return host;
};

export interface ChainNetwork {
    blockchain: string;
    chainId: string;
    host: string;
    port: number;
    protocol: string;
}

export interface IdentityAccount {
    blockchain: string;
    name: string;
    publicKey: string;
    authority: string;
    chainId: string;
    isHardware: boolean;
};

export interface Identity {
    accounts: IdentityAccount[],
    kyc: boolean;
    name: string;
    publicKey: string;
    hash: string;
};

export interface Transaction {
    expiration?: string;
    ref_block_num?: number;
    ref_block_prefix?: number;
    max_net_usage_words?: number;
    max_cpu_usage_ms?: number;
    delay_sec?: number;
    context_free_actions?: any[];
    context_free_data?: Uint8Array;
    actions: any[];
    transaction_extensions?: [number, string][];
    resource_payer?: any;
}

export interface SignaturePayloadArgs {
    chainId: string;
    requiredKeys: string[];
    serializedTransaction: Uint8Array;
    serializedContextFreeData?: Uint8Array;
    abis: any[];
}

export interface Payload {
    domain: string;
    chainId: string;
}

export interface NetworkPayload extends Payload {
    network: ChainNetwork;
}

export interface LoginPayload extends Payload {
    appName?: string;
    newLogin?: boolean;
    network: ChainNetwork,
    accounts?: ChainNetwork[];
}

export interface AccountPayload extends Payload {
    account: string;
}

export interface AccountsPayload extends Payload {
    accounts: string[];
}

export interface RequiredKeysPayload extends Payload {
    transaction: any;
    availableKeys: string[];
}


export interface LegacySignaturePayload extends Payload {
    chainId: string;
    // eosjs-style signing path (wharfkit / eosHook(...).sign).
    requiredKeys?: string[];
    serializedTransaction?: number[];
    serializedContextFreeData?: number[];
    abis?: any[];
}

export interface SignaturePayload extends Payload, TransactArgsPayload {
    chainId: string;
}

export interface ArbitrarySignaturePayload extends Payload {
    publicKey: string;
    data: string;
}

export interface BufferSignaturePayload extends Payload {
    buffer: Buffer;
}

export interface SmoothPushTxPayload extends Payload {
    signed: string;
}

export interface SignatureResult {
    signatures: string[];
    /** Smooth-mode / transactArgs path: final tx bytes for the dApp to broadcast. */
    serializedTransaction?: number[];
    /** transactArgs path: TAPOS-filled decoded transaction (plain JSON) for display / verification. */
    transaction?: any;
}

export interface ChainInfoResult {
    server_version: string,
    chain_id: string,
    head_block_num: number,
    last_irreversible_block_num: number,
    last_irreversible_block_id: string,
    head_block_id: string,
    head_block_time: string,
    head_block_producer: string,
    virtual_block_cpu_limit: number,
    virtual_block_net_limit: number,
    block_cpu_limit: number,
    block_net_limit: number,
    server_version_string: string,
    fork_db_head_block_num: number,
    fork_db_head_block_id: string,
    server_full_version_string: string,
    total_cpu_weight: string,
    total_net_weight: string,
    earliest_available_block_num: number,
    last_irreversible_block_time: string,
}


interface MessageWraper {
    id: number;
    response: string;
  }

let msgId: number = 0;
const msgMap = new Map<number, (response: string) => void>();

export const watchBackgroundMessages = () => {
    document.addEventListener('chromeMessageResponse', (event: any) => {
        const data: MessageWraper = event.detail;
        const callback = msgMap.get(data.id);
        msgMap.delete(data.id);
        callback!(data.response);
    });
}

export const sendMessageToBackground = (msg: any) => {
    return new Promise<any>((resolve) => {
        const _msgId = ++msgId;
        msgMap.set(_msgId, resolve);
        document.dispatchEvent(new CustomEvent("chromeMessageRequest", { detail: {id: _msgId, msg: JSON.stringify(msg)} }));
    });
}

export interface TransactArgsActionInput {
    account: string;
    name: string;
    authorization: Array<{ actor: string; permission: string }>;
    data: Record<string, any> | string;
}

export interface TransactArgsTransactionInput {
    actions: TransactArgsActionInput[];
    expiration?: string;
    ref_block_num?: number;
    ref_block_prefix?: number;
    max_net_usage_words?: number;
    max_cpu_usage_ms?: number;
    delay_sec?: number;
    context_free_actions?: TransactArgsActionInput[];
    transaction_extensions?: [number, string][];
}

export type TransactArgsInput =
    | TransactArgsTransactionInput
    | TransactArgsActionInput[]
    | TransactArgsActionInput;

export interface TransactArgsOptions {
    abis?: Record<string, any>;
    expireSeconds?: number;
    blocksBehind?: number;
    requiredKeys?: string[];
}

export interface TransactArgsPayload {
    transactArgs: TransactArgsInput;
    options?: TransactArgsOptions;
}

export type Result = SignatureResult | Identity | ChainInfoResult | string[];
export class Message<T extends Payload> {
    public type: string;
    public payload: T;

    constructor() {
        this.type = '';
        this.payload = {
            domain: '',
            chainId: '',
        } as T;
    }

    static placeholder<T extends Payload>() {
        return new Message<T>();
    }

    static fromJson(json: Object) {
        const m = new Message<Payload>();
        return Object.assign(m, json);
    }

    async request(): Promise<Result> {
        // reset domain
        this.payload.domain = strippedHost();
        const response = await sendMessageToBackground(this);
        if (response && response.isError) {
            throw response;
        } else {
            if (typeof response === 'undefined') {
                throw SdkError.maliciousEvent();
            } else {
                return response;
            }
        }
    }
}
