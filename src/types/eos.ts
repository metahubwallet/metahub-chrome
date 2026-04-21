// types/eos.ts
// Local type definitions for EOS chain data structures.
// These replace the types previously imported from eosjs/dist/eosjs-rpc-interfaces.

export interface PermissionLevel {
    actor: string;
    permission: string;
}

export interface KeyWeight {
    key: string;
    weight: number;
}

export interface PermissionLevelWeight {
    permission: PermissionLevel;
    weight: number;
}

export interface WaitWeight {
    wait_sec: number;
    weight: number;
}

export interface Authority {
    threshold: number;
    keys: KeyWeight[];
    accounts: PermissionLevelWeight[];
    waits: WaitWeight[];
}

export interface Permission {
    perm_name: string;
    parent: string;
    required_auth: Authority;
}
