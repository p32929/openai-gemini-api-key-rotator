const KeyRotator = require('../src/keyRotator');

describe('KeyRotator', () => {
    const mockKeys = ['key1', 'key2', 'key3'];
    let rotator;

    beforeEach(() => {
        rotator = new KeyRotator(mockKeys, 'test-api');
    });

    test('should initialize with provided keys', () => {
        expect(rotator.getTotalKeysCount()).toBe(3);
        expect(rotator.apiKeys).toEqual(mockKeys);
        expect(rotator.apiType).toBe('test-api');
    });

    test('should mask api keys correctly', () => {
        expect(rotator.maskApiKey('1234567890')).toBe('1234...7890');
        expect(rotator.maskApiKey('short')).toBe('***');
        expect(rotator.maskApiKey(null)).toBe('***');
    });

    test('should update last failed key', () => {
        rotator.updateLastFailedKey('key1');
        expect(rotator.lastFailedKey).toBe('key1');
    });

    describe('RequestKeyContext', () => {
        let context;

        beforeEach(() => {
            context = rotator.createRequestContext();
        });

        test('should create a context with shuffled keys', () => {
            expect(context.apiKeys).toHaveLength(3);
            expect(context.apiKeys).toEqual(expect.arrayContaining(mockKeys));
            // Note: Shuffle might return same order, so we can't strictly assert not equal
        });

        test('should prioritize moving last failed key to end', () => {
            rotator.updateLastFailedKey('key1');
            // Create multiple contexts to ensure shuffle logic consistently moves it to end
            for (let i = 0; i < 5; i++) {
                const ctx = rotator.createRequestContext();
                const keys = ctx.apiKeys;
                expect(keys[keys.length - 1]).toBe('key1');
            }
        });

        test('should iterate through all keys', () => {
            const tried = new Set();
            let key;
            while ((key = context.getNextKey())) {
                tried.add(key);
            }
            expect(tried.size).toBe(3);
            expect(tried).toEqual(new Set(mockKeys));
        });

        test('should return null when all keys are tried', () => {
            // Consume all keys
            while (context.getNextKey()) { }

            expect(context.getNextKey()).toBeNull();
            expect(context.allKeysTried()).toBe(true);
        });

        test('should track rate limited keys', () => {
            const key1 = context.getNextKey();
            context.markKeyAsRateLimited(key1);

            const stats = context.getStats();
            expect(stats.rateLimitedKeys).toBe(1);
            expect(context.getLastFailedKey()).toBe(key1);
        });

        test('should detect when all tried keys are rate limited', () => {
            // Try and rate limit all keys
            let key;
            while ((key = context.getNextKey())) {
                context.markKeyAsRateLimited(key);
            }

            expect(context.allTriedKeysRateLimited()).toBe(true);
        });

        test('should not flag all rate limited if some succeeded (or just not marked)', () => {
            const key1 = context.getNextKey();
            context.markKeyAsRateLimited(key1);

            const key2 = context.getNextKey();
            // key2 is not marked as rate limited

            expect(context.allTriedKeysRateLimited()).toBe(false);
        });
    });
});
