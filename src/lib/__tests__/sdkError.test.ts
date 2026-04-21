import { describe, it, expect } from 'vitest';
import SdkError, { ErrorCodes, ErrorTypes } from '@/lib/sdkError';

describe('SdkError', () => {
    describe('constructor', () => {
        it('sets isError to true', () => {
            const err = new SdkError('test', 'test message', 400);
            expect(err.isError).toBe(true);
        });

        it('sets type, message, and code', () => {
            const err = new SdkError('my_type', 'my message', 999);
            expect(err.type).toBe('my_type');
            expect(err.message).toBe('my message');
            expect(err.code).toBe(999);
        });

        it('defaults code to LOCKED (423) when not provided', () => {
            const err = new SdkError('test', 'test message');
            expect(err.code).toBe(ErrorCodes.LOCKED);
        });
    });

    describe('locked()', () => {
        it('has code 423', () => {
            const err = SdkError.locked();
            expect(err.code).toBe(423);
        });

        it('has type locked', () => {
            const err = SdkError.locked();
            expect(err.type).toBe(ErrorTypes.LOCKED);
        });

        it('isError is true', () => {
            expect(SdkError.locked().isError).toBe(true);
        });
    });

    describe('maliciousEvent()', () => {
        it('has code 403 (FORBIDDEN)', () => {
            const err = SdkError.maliciousEvent();
            expect(err.code).toBe(403);
        });

        it('has type malicious', () => {
            const err = SdkError.maliciousEvent();
            expect(err.type).toBe(ErrorTypes.MALICIOUS);
        });
    });

    describe('signatureError()', () => {
        it('has code 402 (NO_SIGNATURE)', () => {
            const err = SdkError.signatureError('my_sig_err', 'signature failed');
            expect(err.code).toBe(402);
        });

        it('preserves the type passed in', () => {
            const err = SdkError.signatureError('custom_type', 'msg');
            expect(err.type).toBe('custom_type');
        });
    });

    describe('requiresUpgrade()', () => {
        it('has code 426 (UPGRADE_REQUIRED)', () => {
            const err = SdkError.requiresUpgrade();
            expect(err.code).toBe(426);
        });

        it('has type upgrade_required', () => {
            const err = SdkError.requiresUpgrade();
            expect(err.type).toBe(ErrorTypes.UPGRADE_REQUIRED);
        });
    });

    describe('missingParameter()', () => {
        it('has code 400 (MISSING_PARAMETER)', () => {
            const err = SdkError.missingParameter('field is required');
            expect(err.code).toBe(400);
        });

        it('preserves the message', () => {
            const err = SdkError.missingParameter('field is required');
            expect(err.message).toBe('field is required');
        });

        it('has type missing_parameter', () => {
            const err = SdkError.missingParameter('x');
            expect(err.type).toBe(ErrorTypes.MISSING_PARAMETER);
        });
    });

    describe('noAccount()', () => {
        it('has code 410 (EMPTY_DATA)', () => {
            const err = SdkError.noAccount();
            expect(err.code).toBe(410);
        });

        it('has type empty_data', () => {
            const err = SdkError.noAccount();
            expect(err.type).toBe(ErrorTypes.EMPTY_DATA);
        });
    });

    describe('noNetwork()', () => {
        it('has code 402 (NO_SIGNATURE) via signatureError', () => {
            const err = SdkError.noNetwork();
            expect(err.code).toBe(402);
        });

        it('has type no_network', () => {
            const err = SdkError.noNetwork();
            expect(err.type).toBe('no_network');
        });
    });

    describe('usedKeyProvider()', () => {
        it('has code 402 (NO_SIGNATURE)', () => {
            const err = SdkError.usedKeyProvider();
            expect(err.code).toBe(402);
        });

        it('has type malicious', () => {
            const err = SdkError.usedKeyProvider();
            expect(err.type).toBe(ErrorTypes.MALICIOUS);
        });
    });

    describe('ErrorCodes constants', () => {
        it('MISSING_PARAMETER is 400', () => expect(ErrorCodes.MISSING_PARAMETER).toBe(400));
        it('NO_SIGNATURE is 402', () => expect(ErrorCodes.NO_SIGNATURE).toBe(402));
        it('FORBIDDEN is 403', () => expect(ErrorCodes.FORBIDDEN).toBe(403));
        it('LOCKED is 423', () => expect(ErrorCodes.LOCKED).toBe(423));
        it('UPGRADE_REQUIRED is 426', () => expect(ErrorCodes.UPGRADE_REQUIRED).toBe(426));
        it('EMPTY_DATA is 410', () => expect(ErrorCodes.EMPTY_DATA).toBe(410));
    });
});
