import { Buffer } from 'buffer';
import EOSApi from '@/lib/eosApi';
import { isV3Encrypted, decryptV3, makeKeySalt, legacyDecrypt, legacyMd5, legacyPassword1 } from '@/utils/crypto';
import { Permission, PermissionLevel } from '@/types/eos';
import { signature } from '@/lib/keyring';
import { PublicKey } from '@wharfkit/antelope';
import { Wallet } from '@/types/wallet';
import { ErrorCode } from '@/utils/errorCode';

/**
 * Dependencies that the Chain class needs to access wallet and network state.
 * Pass these in via the constructor rather than importing from stores directly,
 * keeping the Chain class framework-agnostic.
 */
export interface ChainDeps {
    /** Return all wallets */
    getWallets: () => Wallet[];
    /** Return the currently selected wallet */
    getCurrentWallet: () => Wallet;
    /** Return the decryption password */
    getPassword: () => string;
    /** Return the selected RPC endpoint for a given chainId */
    getSelectedRpc: (chainId: string) => string;
    /** Persist a wallet after mutation */
    setWallet: (wallet: Wallet) => void;
    /** Optional: return all configured networks (not used by Chain internally, but available for hooks) */
    getNetworks?: () => any[];
    /** Optional: translate error strings. Falls back to a raw message if omitted. */
    t?: (key: string) => string;
    /** Optional: push a signed transaction via smooth-mode proxy */
    pushTx?: (data: { signed: string }) => Promise<any>;
}

export class Chain {
    private apis: { [key: string]: EOSApi } = {};
    private deps: ChainDeps;

    constructor(deps: ChainDeps) {
        this.deps = deps;
    }

    async getPrivateKeyByPublicKey(publicKey: string) {
        for (const wallet of this.deps.getWallets()) {
            for (const key of wallet.keys) {
                if (key.publicKey === publicKey) {
                    return this.decryptKey(key.privateKey, wallet.seed);
                }
            }
        }
        return '';
    }

    async getPrivateKeyByAuthorization(chainId: string, auth: string) {
        let authorization: any = {};
        if (typeof auth === 'string') {
            const as = auth.split('@');
            authorization = {
                actor: as[0],
                permission: as[1] ? as[1] : 'active',
            };
        }

        const wallet = this.deps.getWallets().find(
            (x) => x.chainId === chainId && x.name === authorization.actor
        );

        if (wallet) {
            for (const key of wallet.keys) {
                if (key.permissions.indexOf(authorization.permission) >= 0) {
                    return this.decryptKey(key.privateKey, wallet.seed);
                }
            }
        }
        return false;
    }

    private async decryptKey(encryptedKey: string, walletSeed: string): Promise<string> {
        const password = this.deps.getPassword();
        if (isV3Encrypted(encryptedKey)) {
            return decryptV3(encryptedKey, password, makeKeySalt(walletSeed));
        }
        return legacyDecrypt(encryptedKey, legacyMd5(walletSeed + legacyPassword1(password)));
    }

    getPublicKeyByPermission(chainId: string, actor: string, permission: string) {
        const wallet = this.deps.getWallets().find(
            (x) => x.chainId === chainId && x.name === actor
        );

        if (wallet) {
            for (const key of wallet.keys) {
                if (key.permissions.indexOf(permission) >= 0) {
                    return key.publicKey;
                }
            }
        }
        return null;
    }

    currentAccount() {
        return this.deps.getCurrentWallet();
    }

    getApi(chainId: string = '') {
        if (chainId === '') {
            const current = this.deps.getCurrentWallet();
            chainId = current.chainId;
        }
        if (typeof this.apis[chainId] === 'undefined') {
            this.apis[chainId] = new EOSApi(
                chainId,
                this.deps.getSelectedRpc(chainId),
                this,
                this.deps.pushTx
            );
        }
        return this.apis[chainId];
    }

    getAuth() {
        const currentAccount = this.currentAccount();
        return this.getMaxPermission(currentAccount.name, currentAccount.chainId);
    }

    getMaxPermission(name: string, chainId: string, parent?: string): PermissionLevel {
        const wallet = this.deps.getWallets().find(
            (x) => x.chainId === chainId && x.name === name
        );
        if (!wallet) {
            return {
                actor: name,
                permission: 'unknown',
            };
        }
        const permissions = wallet.keys.flatMap((x) => x.permissions);
        let perm = '';
        if (permissions.includes('owner')) {
            perm = 'owner';
        } else if (parent && permissions.includes(parent)) {
            perm = parent;
        } else if (permissions.includes('active')) {
            perm = 'active';
        } else {
            perm = permissions[0] ?? 'active';
        }
        return {
            actor: name,
            permission: perm,
        };
    }

    getErrorMsg(e: any) {
        const t = this.deps.t ?? ((key: string) => key);
        if (e) {
            if (e.json && e.json.error) {
                e = e.json.error;
            }
            if (e.name) {
                if (e.name === 'tx_cpu_usage_exceeded' || e.name === 'leeway_deadline_exception') {
                    return t('public.resourceCPULimit');
                }
                if (e.name === 'tx_net_usage_exceeded') {
                    return t('public.resourceNetLimit');
                }
                if (e.name === 'ram_usage_exceeded') {
                    return t('public.resourceLimitRam');
                }
            }
            if (e.details) {
                const msg = e.details[0].message;
                if (msg.indexOf('first transfer must be EOS') > -1) {
                    return t('error.firstNeedEOS');
                }
                return msg;
            }
            let msg = e.message;
            if (msg) {
                if (msg.indexOf('reach free cpu') !== -1) return t('error.cpuTimeLimit');
                return msg;
            }
        }
        return t('public.requestHttpEndpointTimeout');
    }

    authorityProvider(chainId: string) {
        return {
            getRequiredKeys: async ({
                transaction,
                availableKeys,
            }: {
                transaction: { actions: { authorization: { actor: string; permission: string }[] }[] };
                availableKeys: string[];
            }) => {
                const permissions = new Set();
                for (let action of transaction.actions) {
                    for (let auth of action.authorization)
                        permissions.add(auth.actor + '-' + auth.permission);
                }

                let keys: string[] = [];
                permissions.forEach((p: any) => {
                    const [actor, perm] = p.split('-');
                    const key = this.getPublicKeyByPermission(chainId, actor, perm);
                    if (key) keys.push(key);
                });

                const requiredKeys = keys.filter((x) => availableKeys.includes(x));
                return requiredKeys;
            },
        };
    }

    signatureProvider(chainId: string) {
        return {
            getAvailableKeys: async () => {
                const keys = this.currentAccount().keys.map((x: any) => x.publicKey);
                return keys;
            },

            // { chainId, requiredKeys, serializedTransaction, serializedContextFreeData, abis }
            sign: async (transaction: any) => {
                const trxBuf =
                    typeof transaction.serializedTransaction === 'string'
                        ? Buffer.from(transaction.serializedTransaction, 'hex')
                        : Buffer.from(transaction.serializedTransaction);
                const buffer = Buffer.concat([
                    Buffer.from(transaction.chainId, 'hex'),
                    trxBuf,
                    Buffer.from(new Uint8Array(32)), // todo: serializedContextFreeData
                ]);

                const signatures = await Promise.all(
                    transaction.requiredKeys.map(async (pub: string) => {
                        const privateKey = await this.getPrivateKeyByPublicKey(pub);
                        return signature(buffer, privateKey);
                    })
                );

                return {
                    signatures,
                    serializedTransaction: transaction.serializedTransaction,
                };
            },
        };
    }

    findLocalAccount(account: string, chainId: string) {
        let wallets = this.deps.getWallets();
        for (let index = 0; index < wallets.length; index++) {
            let wallet = wallets[index];
            if (wallet.name === account && wallet.chainId === chainId) {
                return wallets[index];
            }
        }
    }

    async fetchPermissions(account: string, chainId: string) {
        const t = this.deps.t ?? ((key: string) => key);
        let result = { code: ErrorCode.OK, permissions: [] as Permission[], msg: '' };

        const index = this.deps.getWallets().findIndex((item) => {
            return item.name === account && item.chainId === chainId;
        });
        const wallet = this.deps.getWallets()[index];

        try {
            const accinfo = await this.getApi(chainId).getAccount(account);
            if (!accinfo) throw new Error('fetch account error');
            result.permissions = accinfo.permissions as unknown as Permission[];

            const toLegacy = (k: any): string => {
                try { return PublicKey.from(String(k)).toLegacyString(); } catch { return String(k); }
            };

            for (const key of wallet.keys) {
                let permissions = new Set<string>();
                const walletKeyLegacy = toLegacy(key.publicKey);
                for (const perm of accinfo.permissions) {
                    const match = perm.required_auth.keys.some((x: any) => toLegacy(x.key) === walletKeyLegacy);
                    if (match) permissions.add(String(perm.perm_name));
                }
                key.permissions = Array.from(permissions) as any;
            }

            this.deps.setWallet(wallet);
        } catch (e) {
            result.code = ErrorCode.HTTP_END_POINT_ERROR;
            result.msg = t('public.requestHttpEndpointTimeout');
            return result;
        }
        return result;
    }

    /** Invalidate the cached EosApi instance for a given chainId (e.g. after endpoint change) */
    resetApi(chainId: string) {
        delete this.apis[chainId];
    }
}
