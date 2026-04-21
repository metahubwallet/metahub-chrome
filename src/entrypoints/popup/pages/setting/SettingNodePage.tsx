import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChainStore } from '@/stores/chainStore';
import { useEndpoints } from '@/hooks/useEndpoints';
import { getChainInstance } from '@/hooks/useChainInstance';
import { RPC } from '@/types/settings';

const SettingNodePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const chainId = searchParams.get('chainId') || '';

  const findNetwork = useChainStore((s) => s.findNetwork);
  const selectedRpcs = useChainStore((s) => s.selectedRpcs);
  const setSelectedRpc = useChainStore((s) => s.setSelectedRpc);
  const customRpcs = useChainStore((s) => s.customRpcs);
  const setCustomRpcs = useChainStore((s) => s.setCustomRpcs);

  const network = findNetwork(chainId);
  const chain = network?.chain;

  const { data: remoteEndpoints, isLoading } = useEndpoints({ chainName: chain });

  const [recommendEndpoints, setRecommendEndpoints] = React.useState<RPC[]>([]);
  const [customEndpoints, setCustomEndpoints] = React.useState<RPC[]>([]);
  const [showAddNode, setShowAddNode] = React.useState(false);
  const [userEnterUrl, setUserEnterUrl] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<RPC | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const currentSelectedRpc = selectedRpcs[chainId] || network?.endpoint || '';

  const customPingedRef = React.useRef(false);

  React.useEffect(() => {
    const saved = customRpcs[chainId];
    const endpoints = Array.isArray(saved) ? saved.map((r) => ({ ...r, delay: '' })) : [];
    setCustomEndpoints(endpoints);
    customPingedRef.current = false;
  }, [chainId, customRpcs]);

  React.useEffect(() => {
    if (remoteEndpoints && remoteEndpoints.length > 0) {
      const endpoints = remoteEndpoints.map((ep: RPC) => ({ ...ep, delay: '' }));
      setRecommendEndpoints(endpoints);
      pingEndpoints(endpoints, setRecommendEndpoints);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteEndpoints]);

  React.useEffect(() => {
    if (customEndpoints.length > 0 && !customPingedRef.current) {
      customPingedRef.current = true;
      pingEndpoints([...customEndpoints], setCustomEndpoints);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customEndpoints]);

  const pingEndpoints = async (endpoints: RPC[], setter: React.Dispatch<React.SetStateAction<RPC[]>>) => {
    const chainInstance = getChainInstance();
    const api = chainInstance.getApi(chainId);
    const results = [...endpoints];
    const maxConcurrency = 8;
    const timeout = 10000;
    let cursor = 0;

    const pingOne = async () => {
      while (cursor < results.length) {
        const i = cursor++;
        const startTime = Date.now();
        try {
          await Promise.race([
            api.testHttpEndpoint(results[i].endpoint),
            new Promise((_, reject) => setTimeout(() => reject('timeout'), timeout)),
          ]);
          results[i] = { ...results[i], delay: `${Date.now() - startTime}ms` };
        } catch {
          results[i] = { ...results[i], delay: 'timeout' };
        }
        setter([...results]);
      }
    };

    const workers = Array.from({ length: Math.min(maxConcurrency, endpoints.length) }, () => pingOne());
    await Promise.all(workers);
  };

  const handleSelectNode = (item: RPC) => {
    setSelectedRpc(chainId, item.endpoint);
    try {
      const chainInstance = getChainInstance();
      chainInstance.getApi(chainId).updateHttpEndpoint(item.endpoint);
    } catch (e: any) {
      toast.error(String(e?.message || e));
    }
  };

  const saveCustomNodes = (endpoints: RPC[]) => {
    const clean = endpoints.map(({ name, endpoint }) => ({ name, endpoint }));
    setCustomRpcs({ ...customRpcs, [chainId]: clean });
  };

  const handleDeleteClick = (item: RPC) => {
    if (item.endpoint === currentSelectedRpc) {
      toast.warning('Cannot delete the selected RPC');
      return;
    }
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const updated = customEndpoints.filter((ep) => ep.endpoint !== deleteTarget.endpoint);
    setCustomEndpoints(updated);
    saveCustomNodes(updated);
    setDeleteTarget(null);
    setShowDeleteConfirm(false);
  };

  const addCustomEndpoint = async () => {
    const url = userEnterUrl.trim();
    if (customEndpoints.some((ep) => ep.endpoint === url)) {
      toast.error('Endpoint Exists');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('Endpoint must start with http:// or https://');
      return;
    }
    const startTime = Date.now();
    try {
      const chainInstance = getChainInstance();
      await chainInstance.getApi(chainId).testHttpEndpoint(url);
    } catch (e: any) {
      toast.error(String(e?.message || e));
      return;
    }
    const delay = `${Date.now() - startTime}ms`;
    const newEndpoint: RPC = { name: 'new endpoint', endpoint: url, delay };
    const updated = [...customEndpoints, newEndpoint];
    setCustomEndpoints(updated);
    saveCustomNodes(updated);
    setUserEnterUrl('');
    setShowAddNode(false);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={network?.name || ''} />

      <div className="flex-1 overflow-y-auto pb-16 px-4">
        {isLoading && (
          <div className="text-center text-gray-400 py-6">{t('public.loading')}</div>
        )}

        {recommendEndpoints.length > 0 && (
          <>
            <div className="py-3 text-base font-medium text-[#20173C]">{t('setting.defaultNodes')}</div>
            <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] overflow-hidden">
              {recommendEndpoints.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center h-15 px-4 py-4 border-b border-[#F3E8FF] last:border-b-0 cursor-pointer hover:bg-[#F5F0FF]"
                  onClick={() => handleSelectNode(item)}
                >
                  <span className="flex-1 text-sm truncate">{item.endpoint}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-gray-400">{item.delay}</span>
                    {currentSelectedRpc === item.endpoint && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {customEndpoints.length > 0 && (
          <>
            <div className="py-3 mt-1 text-base font-medium text-[#20173C]">{t('setting.customNodes')}</div>
            <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] overflow-hidden">
              {customEndpoints.map((item) => (
                <div
                  key={item.endpoint}
                  className="flex items-center h-15 px-4 py-4 border-b border-[#F3E8FF] last:border-b-0"
                >
                  <div
                    className="flex-1 text-sm truncate cursor-pointer"
                    onClick={() => handleSelectNode(item)}
                  >
                    {item.endpoint}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-gray-400">{item.delay}</span>
                    {currentSelectedRpc === item.endpoint ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <Trash2
                        className="h-5 w-5 text-red-500 cursor-pointer"
                        onClick={() => handleDeleteClick(item)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 py-2 bg-gradient-to-t from-[#F7F4FF] to-transparent">
        <div
          className="h-12 bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white text-base font-bold rounded-[28px] flex items-center justify-center cursor-pointer hover:opacity-90"
          onClick={() => setShowAddNode(true)}
        >
          {t('setting.addNode')}
        </div>
      </div>

      {/* Add Node Dialog */}
      <ConfirmDialog
        isOpen={showAddNode}
        title={t('setting.addNode')}
        onClose={() => { setShowAddNode(false); setUserEnterUrl(''); }}
        onConfirm={addCustomEndpoint}
        confirmText={t('public.ok')}
        cancelText={t('public.cancel')}
      >
        <Input
          placeholder={t('setting.inputNodeAddress')}
          value={userEnterUrl}
          onChange={(e) => setUserEnterUrl(e.target.value)}
        />
      </ConfirmDialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('public.tip')}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        confirmText={t('public.ok')}
        cancelText={t('public.cancel')}
      >
        <p>{t('setting.confirmDelete')}</p>
      </ConfirmDialog>
    </div>
  );
};

export default SettingNodePage;
