import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingStore } from '@/stores/settingStore';

beforeEach(() => {
    useSettingStore.setState({
        language: 'zh-CN',
        whitelist: [],
    });
});

describe('settingStore', () => {
    it('default language is zh-CN', () => {
        const { language } = useSettingStore.getState();
        expect(language).toBe('zh-CN');
    });

    it('setLang updates language to en', async () => {
        await useSettingStore.getState().setLang('en');
        expect(useSettingStore.getState().language).toBe('en');
    });

    it('setLang updates language back to zh-CN', async () => {
        useSettingStore.setState({ language: 'en' });
        await useSettingStore.getState().setLang('zh-CN');
        expect(useSettingStore.getState().language).toBe('zh-CN');
    });

    it('default whitelist is empty array', () => {
        expect(useSettingStore.getState().whitelist).toEqual([]);
    });

    it('setWhitelist updates the whitelist', async () => {
        const item = {
            chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
            domain: 'example.com',
            contract: 'eosio.token',
            action: 'transfer',
            actor: 'alice',
            permission: 'active',
            properties: {},
            hash: 'abc123',
        };
        await useSettingStore.getState().setWhitelist([item]);
        expect(useSettingStore.getState().whitelist).toHaveLength(1);
        expect(useSettingStore.getState().whitelist[0]).toEqual(item);
    });
});
