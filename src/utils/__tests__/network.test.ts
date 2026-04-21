import { describe, it, expect } from 'vitest';
import { supportNetworks, eosChainId, getNetworkLocalIcon } from '@/utils/network';

describe('utils/network - supportNetworks', () => {
    it('first network is EOS', () => {
        expect(supportNetworks[0].chain).toBe('eos');
        expect(supportNetworks[0].name).toBe('EOS');
    });

    it('eosChainId is exactly 64 characters', () => {
        expect(eosChainId).toHaveLength(64);
        expect(eosChainId).toMatch(/^[0-9a-f]{64}$/);
    });

    it('eosChainId matches the EOS network entry', () => {
        const eos = supportNetworks.find(n => n.chain === 'eos');
        expect(eos?.chainId).toBe(eosChainId);
    });

    it('all networks have required fields', () => {
        for (const network of supportNetworks) {
            expect(network.name).toBeTruthy();
            expect(network.chain).toBeTruthy();
            expect(network.chainId).toBeTruthy();
            expect(network.endpoint).toBeTruthy();
            expect(network.token).toBeDefined();
            expect(network.token.symbol).toBeTruthy();
            expect(network.token.contract).toBeTruthy();
            expect(typeof network.token.precision).toBe('number');
        }
    });

    it('all chainIds are 64 hex characters', () => {
        for (const network of supportNetworks) {
            expect(network.chainId).toHaveLength(64);
            expect(network.chainId).toMatch(/^[0-9a-f]{64}$/);
        }
    });
});

describe('utils/network - getNetworkLocalIcon', () => {
    it('returns a path string for eos', () => {
        const icon = getNetworkLocalIcon('eos');
        expect(typeof icon).toBe('string');
        expect(icon).toContain('eos.png');
    });

    it('returns inactive icon when active is false', () => {
        const icon = getNetworkLocalIcon('eos', false);
        expect(icon).toContain('eos-ic.png');
    });

    it('maps jungle3 to jungle icon', () => {
        const icon = getNetworkLocalIcon('jungle3');
        expect(icon).toContain('jungle.png');
    });

    it('strips -test suffix from testnet chains', () => {
        const icon = getNetworkLocalIcon('wax-test');
        expect(icon).toContain('wax.png');
    });

    it('defaults to eos icon for unknown chains', () => {
        const icon = getNetworkLocalIcon('unknownchain');
        expect(icon).toContain('eos.png');
    });

    it('defaults to eos when no chain provided', () => {
        const icon = getNetworkLocalIcon();
        expect(icon).toContain('eos.png');
    });
});
