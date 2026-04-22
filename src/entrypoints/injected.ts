import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';

export default defineUnlistedScript(() => {
  // MAIN-world scripts cannot use @/ imports; keep message type names in sync with lib/messages/types.ts.
  const MessageTypes = {
    GET_IDENTITY: 'mh_getIdentity',
    RESTORE_IDENTITY: 'mh_restoreIdentity',
    FORGET_IDENTITY: 'mh_forgetIdentity',
    REQUEST_LEGACY_SIGNATURE: 'mh_requestLegacySignature',
    REQUEST_SIGNATURE: 'mh_requestSignature',
    REQUEST_ARBITRARY_SIGNATURE: 'mh_requestArbitrarySignature',
    REQUEST_GET_VERSION: 'mh_requestGetVersion',
    REQUEST_AVAILABLE_KEYS: 'mh_requestAvailableKeys',
    REQUEST_HAS_ACCOUNT_FOR: 'mh_requestHasAccountFor',
    REQUEST_RAW_ABI: 'mh_requestRawAbi',
    REQUEST_REQUIRED_KEYS: 'mh_requestRequiredKeys',
  };

  const EMPTY_DATA_CODE = 410;

  let msgId = 0;
  const msgMap = new Map<number, (response: any) => void>();

  document.addEventListener('chromeMessageResponse', (event: any) => {
    const { id, response } = event.detail;
    const cb = msgMap.get(id);
    if (cb) {
      msgMap.delete(id);
      cb(response);
    }
  });

  const strippedHost = () => {
    const host = location.hostname;
    return host.indexOf('www.') === 0 ? host.replace('www.', '') : host;
  };

  async function requestMessage(type: string, data?: any, defaultChainId?: string): Promise<any> {
    const payload = { domain: strippedHost(), chainId: defaultChainId || '', ...(data || {}) };
    const response = await new Promise<any>((resolve) => {
      const id = ++msgId;
      msgMap.set(id, resolve);
      document.dispatchEvent(
        new CustomEvent('chromeMessageRequest', {
          detail: { id, msg: JSON.stringify({ type, payload }) },
        })
      );
    });
    if (response && response.isError) throw response;
    if (typeof response === 'undefined') {
      throw { type: 'malicious', message: 'Malicious event discarded.', code: 403, isError: true };
    }
    return response;
  }

  class Metahub {
    #identity: any = null;
    #chainId = '';
    #appName = '';
    public isExtension = true;

    constructor() {
      const fire = () => {
        document.dispatchEvent(new CustomEvent('metahubLoaded'));
        document.dispatchEvent(new CustomEvent('scatterLoaded'));
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fire, { once: true });
      } else {
        queueMicrotask(fire);
      }
    }

    public get identity() {
      return this.#identity;
    }
    
    public set identity(_id: any) {
      // scatter compat: allow assignment without effect
    }

    public isMetahub() {
      return true;
    }

    public getVersion() {
      return requestMessage(MessageTypes.REQUEST_GET_VERSION, undefined, this.#chainId);
    }

    public login(payload: any = {}) {
      if (!payload.appName && this.#appName) payload.appName = this.#appName;
      if (!payload.chainId && this.#chainId) payload.chainId = this.#chainId;
      return this.getIdentity(payload);
    }

    public hasAccountFor(network: any) {
      return requestMessage(MessageTypes.REQUEST_HAS_ACCOUNT_FOR, { network }, this.#chainId);
    }

    public async getIdentity(params: any) {
      this.#identity = await requestMessage(MessageTypes.GET_IDENTITY, params, this.#chainId);
      return this.#identity;
    }

    public async logout(accounts?: string | string[]) {
      this.#identity = await requestMessage(
        MessageTypes.FORGET_IDENTITY,
        { accounts: Array.isArray(accounts) ? accounts : [accounts] },
        this.#chainId
      );
      return this.#identity;
    }

    public forgetIdentity(accounts?: string | string[]) {
      return this.logout(accounts);
    }

    public async getIdentityFromPermissions() {
      try {
        return await requestMessage(
          MessageTypes.RESTORE_IDENTITY,
          undefined,
          this.#chainId
        );
      } catch (e: any) {
        if (e?.code === EMPTY_DATA_CODE) return null;
        throw e;
      }
    }

    public async getArbitrarySignature(publicKey: string, data: string): Promise<string> {
      const res = await requestMessage(
        MessageTypes.REQUEST_ARBITRARY_SIGNATURE,
        { publicKey, data },
        this.#chainId
      );
      return res.signatures[0];
    }

    public async requestSignature(
      args: any,
      options?: {
        chainId?: string;
        abis?: Record<string, any>;
        expireSeconds?: number;
        blocksBehind?: number;
        requiredKeys?: string[];
      }
    ): Promise<{
      signatures: string[];
      transaction: any;
      serializedTransaction: number[];
    }> {
      const chainId = options?.chainId || this.#chainId;

      const result = await requestMessage(
        MessageTypes.REQUEST_SIGNATURE,
        { chainId, transactArgs: args, options },
        chainId
      );
      return {
        signatures: result.signatures,
        transaction: result.transaction,
        serializedTransaction: result.serializedTransaction,
      };
    }

    public requestRawAbi(account: string, chainId: string) {
      return requestMessage(MessageTypes.REQUEST_RAW_ABI, { account, chainId }, this.#chainId);
    }

    public requestRequiredKeys(transaction: any, availableKeys: string[]) {
      return requestMessage(
        MessageTypes.REQUEST_REQUIRED_KEYS,
        { transaction, availableKeys },
        this.#chainId
      );
    }

    // Scatter compat stubs — dApps feature-detect these; keep as no-ops.
    public async useIdentity() {}
    public async authenticate() {}
    public async requestTransfer() {}
    public async createTransaction() {}
    public async suggestNetwork() {}
    public async addToken() {}

    public eosHook(network: any) {
      return this.#buildSignatureProvider(network.chainId);
    }

    public eos(network: any, Api: any, options: { rpc: any; [k: string]: any } = { rpc: null }) {
      if (!Api) throw new Error('eos(): Api constructor is required');
      if (!options?.rpc) throw new Error('eos(): options.rpc is required');
      const chainId = network?.chainId || this.#chainId;
      return new Api({
        ...options,
        signatureProvider: this.#buildSignatureProvider(chainId),
        chainId,
      });
    }

    #buildSignatureProvider(chainId: string) {
      return {
        getAvailableKeys: async () =>
          requestMessage(MessageTypes.REQUEST_AVAILABLE_KEYS, { chainId }, chainId),
        sign: async (args: any) => {
          const params: any = {
            chainId: args.chainId,
            requiredKeys: [],
            serializedTransaction: Array.from(args.serializedTransaction),
            serializedContextFreeData: args.serializedContextFreeData
              ? Array.from(args.serializedContextFreeData)
              : [],
            abis: [],
          };
          const inputBytesLen = params.serializedTransaction.length;
          console.log('[Metahub eosHook] sign: input bytes length=', inputBytesLen);
          const result = await requestMessage(MessageTypes.REQUEST_LEGACY_SIGNATURE, params, chainId);
          const hasTransformed = Array.isArray(result.serializedTransaction)
            && result.serializedTransaction.length > 0;
          console.log('[Metahub eosHook] sign: result', {
            sigCount: result.signatures?.length,
            transformedBytesLen: hasTransformed ? result.serializedTransaction.length : '(same as input)',
            bytesDiffer: hasTransformed && result.serializedTransaction.length !== inputBytesLen,
          });
          return {
            signatures: result.signatures,
            serializedTransaction: hasTransformed
              ? new Uint8Array(result.serializedTransaction)
              : args.serializedTransaction,
            serializedContextFreeData: args.serializedContextFreeData,
          };
        },
      };
    }

    async connect(pluginName: string, opts: any) {
      if (pluginName) this.#appName = pluginName;
      if (opts?.network?.chainId) this.#chainId = opts.network.chainId;
      else if (opts?.chainId) this.#chainId = opts.chainId;
      return true;
    }
  }

  const metahub = new Metahub();
  (window as any).metahub = metahub;

  try {
    let _ScatterJS: any;
    Object.defineProperty(window, 'ScatterJS', {
      get: () => _ScatterJS,
      set: (s) => {
        if (s) {
          s.scatter = metahub;
          _ScatterJS = s;
        }
      },
      configurable: false,
    });
  } catch {
    // ScatterJS already defined; dApps can reach us via window.metahub / window.scatter.
  }

  try {
    Object.defineProperty(window, 'scatter', {
      get: () => metahub,
      set: () => {},
      configurable: false,
    });
  } catch {
    // window.scatter already defined; skip.
  }
});
