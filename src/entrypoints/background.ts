import { defineBackground } from 'wxt/utils/define-background';
import { Message } from '@/lib/messages/message';
import * as MessageTypes from '@/lib/messages/types';
import { getIdentity, restoreIdentity, forgetIdentity } from '@/lib/handlers/identityHandler';
import { requestLegacySignature, requestSignature, requestArbitrarySignature } from '@/lib/handlers/signatureHandler';
import { requestAddNetwork } from '@/lib/handlers/networkHandler';
import { requestAvailableKeys } from '@/lib/handlers/accountHandler';
import { requestRawAbi, requestRequiredKeys } from '@/lib/handlers/abiHandler';
import { requestGetVersion } from '@/lib/handlers/versionHandler';
import { closeWindow } from '@/lib/handlers/windowManager';
import { localCache } from '@/utils/cache';

export default defineBackground(() => {
  console.log('MetaHub background loaded');

  chrome.windows.onRemoved.addListener((windowId) => {
    closeWindow(windowId);
  });

  chrome.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return true;
    if (typeof request === 'string') request = JSON.parse(request);
    const message = Message.fromJson(request);
    if (message.payload && !message.payload.domain) {
      message.payload.domain = 'localhost';
    }
    dispenseMessage(sendResponse, message);
    return true;
  });

  // Auto-lock: clear password from session storage on alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoLock') {
      chrome.storage.session.remove(['password']);
    }
  });

  // Initialize auto-lock alarm from saved setting
  initAutoLock();

  localCache.upgrade();
});

async function initAutoLock() {
  const autoLockTime = (await localCache.get('autoLockTime', 15)) as number;
  if (autoLockTime > 0) {
    chrome.alarms.create('autoLock', { delayInMinutes: autoLockTime });
  }
}

async function dispenseMessage(sendResponse: Function, message: Message<any>) {
  console.log('[Metahub] dispenseMessage request:', message.type, message.payload);
  let response;
  try {
    switch (message.type) {
      case MessageTypes.GET_IDENTITY:
        response = await getIdentity(message.payload);
        break;
      case MessageTypes.RESTORE_IDENTITY:
        response = await restoreIdentity(message.payload);
        break;
      case MessageTypes.FORGET_IDENTITY:
        response = await forgetIdentity(message.payload);
        break;
      case MessageTypes.REQUEST_AVAILABLE_KEYS:
        response = await requestAvailableKeys(message.payload);
        break;
      case MessageTypes.REQUEST_SIGNATURE:
        response = await requestSignature(message.payload);
        break;
      case MessageTypes.REQUEST_LEGACY_SIGNATURE:
        response = await requestLegacySignature(message.payload);
        break;
      case MessageTypes.REQUEST_ARBITRARY_SIGNATURE:
        response = await requestArbitrarySignature(message.payload);
        break;
      case MessageTypes.REQUEST_ADD_NETWORK:
        response = await requestAddNetwork(message.payload);
        break;
      case MessageTypes.REQUEST_GET_VERSION:
        response = await requestGetVersion();
        break;
      case MessageTypes.REQUEST_RAW_ABI:
        response = await requestRawAbi(message.payload);
        break;
      case MessageTypes.REQUEST_REQUIRED_KEYS:
        response = await requestRequiredKeys(message.payload);
        break;
    }
  } catch (err: any) {
    console.error('[Metahub] dispenseMessage error:', message.type, err);
    response = {
      isError: true,
      type: err?.type || 'error',
      message: err?.message || String(err),
      code: err?.code || 500,
    };
  }
  console.log('[Metahub] dispenseMessage response:', message.type, response);
  sendResponse(response);
}

