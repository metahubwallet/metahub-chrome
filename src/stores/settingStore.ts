import { create } from 'zustand';
import { localCache } from '@/utils/cache';
import { WhiteItem } from '@/types/settings';

export type AutoLockTime = 5 | 15 | 30 | 60 | 0; // 0 = never

interface SettingState {
    language: 'zh-CN' | 'en';
    whitelist: WhiteItem[];
    autoLockTime: AutoLockTime;
}

interface SettingActions {
    init: () => Promise<void>;
    setLang: (lang: 'zh-CN' | 'en') => Promise<void>;
    setWhitelist: (list: WhiteItem[]) => Promise<void>;
    setAutoLockTime: (minutes: AutoLockTime) => Promise<void>;
}

export const useSettingStore = create<SettingState & SettingActions>((set) => ({
    language: 'zh-CN',
    whitelist: [],
    autoLockTime: 15,

    init: async () => {
        const language = (await localCache.get('language', 'zh-CN')) as 'zh-CN' | 'en';
        const whitelist = (await localCache.get('whitelist', [])) as WhiteItem[];
        const autoLockTime = (await localCache.get('autoLockTime', 15)) as AutoLockTime;
        set({ language, whitelist, autoLockTime });
    },

    setLang: async (lang: 'zh-CN' | 'en') => {
        set({ language: lang });
        await localCache.set('language', lang);
    },

    setWhitelist: async (list: WhiteItem[]) => {
        set({ whitelist: list });
        await localCache.set('whitelist', list);
    },

    setAutoLockTime: async (minutes: AutoLockTime) => {
        set({ autoLockTime: minutes });
        await localCache.set('autoLockTime', minutes);
        // Update the chrome alarm
        if (minutes > 0) {
            chrome.alarms.create('autoLock', { delayInMinutes: minutes });
        } else {
            chrome.alarms.clear('autoLock');
        }
    },
}));
