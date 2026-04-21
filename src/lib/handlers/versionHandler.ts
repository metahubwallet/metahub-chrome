export async function requestGetVersion() {
  const manifestData = chrome.runtime.getManifest();
  const clientVersion = manifestData.version;
  return 'Metahub ' + clientVersion;
}
