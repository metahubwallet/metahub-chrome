import { Buffer } from 'buffer';
import { PrivateKey, PublicKey, Checksum256 } from '@wharfkit/antelope';

// 查询私钥是否正确
export function isValidPrivate(privateKey: string): boolean {
    try {
        PrivateKey.from(privateKey);
        return true;
    } catch {
        return false;
    }
}

// 私钥获取公钥
export function privateToPublic(privateKey: string): string {
    try {
        return PrivateKey.from(privateKey).toPublic().toLegacyString();
    } catch {
        return '';
    }
}

// 获取新私钥公钥
export async function getRandomKeyPair() {
    const priv = PrivateKey.generate('K1');
    const privateKey = priv.toString();
    const publicKey = priv.toPublic().toString();
    return { privateKey, publicKey };
}

// PUB_K1_ 格式转 EOS 开头格式
export function publicKeyToLegacy(publicKey: string): string {
    try {
        return PublicKey.from(publicKey).toLegacyString();
    } catch {
        return publicKey;
    }
}

// 私钥转 PVT_K1_ 新格式
export function privateKeyToNew(privateKey: string): string {
    try {
        return PrivateKey.from(privateKey).toString();
    } catch {
        return privateKey;
    }
}

// 私钥转 5 开头 WIF 旧格式
export function privateKeyToLegacy(privateKey: string): string {
    try {
        return PrivateKey.from(privateKey).toWif();
    } catch {
        return privateKey;
    }
}

// 查询公钥是否正确
export function isValidPublic(publicKey: string): boolean {
    try {
        PublicKey.from(publicKey);
        return true;
    } catch {
        return false;
    }
}

export function signature(
    data: Buffer | string,
    privateKey: string,
    arbitrary: boolean = false,
    isHash: boolean = false,
): string {
    if (!privateKey) {
        return '';
    }
    const priv = PrivateKey.from(privateKey);
    let digest: Checksum256;
    if (isHash) {
        // data is already a hex hash
        digest = Checksum256.from(data as string);
    } else {
        // hash the raw buffer (chainId + serializedTx + contextFreeData)
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as string, 'utf8');
        digest = Checksum256.hash(buf);
    }
    return priv.signDigest(digest).toString();
}
