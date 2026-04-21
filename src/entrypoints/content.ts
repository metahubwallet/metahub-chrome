import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    console.log('[Metahub] content script loaded');
    // Inject the MAIN world script via <script> tag for reliable injection
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    // Message relay: page ↔ background
    document.addEventListener('chromeMessageRequest', (event: any) => {
      const data = event.detail;
      chrome.runtime.sendMessage(data.msg, (response) => {
        document.dispatchEvent(
          new CustomEvent('chromeMessageResponse', {
            detail: { id: data.id, response },
          })
        );
      });
    });
  },
});
