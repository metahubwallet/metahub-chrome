import { describe, it, expect } from 'vitest';
import { powerup } from '@/lib/powerup';

describe('powerup', () => {
    it('returns correct payer and receiver', () => {
        const result = powerup('alice', 'bob', '1.0000 EOS');
        expect(result.payer).toBe('alice');
        expect(result.receiver).toBe('bob');
    });

    it('calculates cpu_frac from cpuQuantity amount', () => {
        const result = powerup('alice', 'alice', '1.0000 EOS');
        expect(result.cpu_frac).toBeGreaterThan(0);
        expect(Number.isInteger(result.cpu_frac)).toBe(true);
    });

    it('calculates net_frac from netQuantity amount', () => {
        const result = powerup('alice', 'alice', '', '1.0000 EOS');
        expect(result.net_frac).toBeGreaterThan(0);
        expect(Number.isInteger(result.net_frac)).toBe(true);
    });

    it('max_payment is calculated correctly with format "X.XXXX EOS"', () => {
        const result = powerup('alice', 'alice', '1.0000 EOS', '1.0000 EOS');
        expect(result.max_payment).toMatch(/^\d+\.\d{4} EOS$/);
        const amount = parseFloat(result.max_payment.split(' ')[0]);
        expect(amount).toBeGreaterThan(0);
    });

    it('uses default powupState when none provided', () => {
        const result = powerup('alice', 'alice', '1.0000 EOS');
        // default state has powerup_days = 1
        expect(result.days).toBe(1);
        // should still produce valid results
        expect(result.cpu_frac).toBeGreaterThan(0);
        expect(result.max_payment).toMatch(/^\d+\.\d{4} EOS$/);
    });

    it('days comes from powupState.powerup_days', () => {
        const customState = {
            version: 0,
            net: {
                version: 0,
                weight: '95454029146410',
                weight_ratio: '10000000000000',
                assumed_stake_weight: '964182112590',
                initial_weight_ratio: '1000000000000000',
                target_weight_ratio: '10000000000000',
                initial_timestamp: '2021-02-24T03:31:31',
                target_timestamp: '2021-04-08T08:08:08',
                exponent: '2.00000000000000000',
                decay_secs: 86400,
                min_price: '2500.0000 EOS',
                max_price: '75000.0000 EOS',
                utilization: '61231951534',
                adjusted_utilization: '76422565604',
                utilization_timestamp: '2022-08-24T07:01:36',
            },
            cpu: {
                version: 0,
                weight: '381816116585640',
                weight_ratio: '10000000000000',
                assumed_stake_weight: '3856728450360',
                initial_weight_ratio: '1000000000000000',
                target_weight_ratio: '10000000000000',
                initial_timestamp: '2021-02-24T03:31:31',
                target_timestamp: '2021-04-08T08:08:08',
                exponent: '2.00000000000000000',
                decay_secs: 86400,
                min_price: '2500.0000 EOS',
                max_price: '75000.0000 EOS',
                utilization: '17169999664732',
                adjusted_utilization: '21599474228273',
                utilization_timestamp: '2022-08-24T07:01:36',
            },
            powerup_days: 7,
            min_powerup_fee: '0.0001 EOS',
        };
        const result = powerup('alice', 'alice', '1.0000 EOS', '', customState);
        expect(result.days).toBe(7);
    });

    it('zero CPU quantity results in 0 cpu_frac', () => {
        const result = powerup('alice', 'alice', '', '1.0000 EOS');
        expect(result.cpu_frac).toBe(0);
    });

    it('zero NET quantity results in 0 net_frac', () => {
        const result = powerup('alice', 'alice', '1.0000 EOS', '');
        expect(result.net_frac).toBe(0);
    });

    it('max_payment is 0.0000 EOS when both quantities are empty', () => {
        const result = powerup('alice', 'alice', '', '');
        expect(result.max_payment).toBe('0.0000 EOS');
    });
});
