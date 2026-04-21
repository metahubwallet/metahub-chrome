import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { md5 } from '@/utils/crypto';
import { Auth } from '@/types/account';
import { WhiteItem } from '@/types/settings';
import logoImg from '@/assets/images/logo@2x.png';

interface Action {
  account: string;
  name: string;
  authorization: Auth[];
  data: Record<string, any>;
}

interface Payload {
  domain: string;
  chainId: string;
  actions: Action[];
  dataKeys: string[][];
  encryptText: string;
  authorization: Auth;
}

const TransactionPage: React.FC = () => {
  const { t } = useTranslation();
  const [payload, setPayload] = React.useState<Payload>({
    domain: '',
    chainId: '',
    actions: [],
    dataKeys: [],
    encryptText: '',
    authorization: { actor: '', permission: '' },
  });
  const [checked, setChecked] = React.useState(false);
  const [actionsChecked, setActionsChecked] = React.useState<string[]>([]);
  const [type, setType] = React.useState<'transaction' | 'signature'>(
    'transaction'
  );
  const [tabs, setTabs] = React.useState<string[]>([]);
  const [actionsJson, setActionsJson] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const init = async () => {
      const { windowParams } = (await chrome.storage.session.get([
        'windowParams',
      ])) as { windowParams?: any };
      if (
        windowParams &&
        windowParams.domain &&
        windowParams.chainId
      ) {
        const p: Payload = {
          domain: windowParams.domain,
          chainId: windowParams.chainId,
          actions: windowParams.actions || [],
          dataKeys: windowParams.dataKeys || [],
          encryptText: windowParams.encryptText || '',
          authorization: windowParams.authorization || {
            actor: '',
            permission: '',
          },
        };
        setPayload(p);

        if (p.encryptText) {
          setType('signature');
        } else {
          const newTabs: string[] = [];
          const newJson: string[] = [];
          for (const act of p.actions) {
            newTabs.push('property');
            newJson.push(JSON.stringify(act.data, null, '    '));
          }
          setTabs(newTabs);
          setActionsJson(newJson);

          if (p.actions.length === 1) {
            const keys = Object.keys(p.actions[0].data);
            setActionsChecked(keys);
          }
        }
      } else {
        toast.warning(t('public.paramsError'));
      }
    };
    init();
  }, [t]);

  const handleCheckedChange = (newChecked: boolean) => {
    if (newChecked && payload.actions.length > 1) {
      toast.warning(t('auth.canNotAdd'));
      setChecked(false);
      return;
    }
    setChecked(newChecked);
  };

  const onTabChange = (index: number, tab: string) => {
    setTabs((prev) => {
      const next = [...prev];
      next[index] = tab;
      return next;
    });
  };

  const toggleActionChecked = (key: string) => {
    setActionsChecked((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key]
    );
  };

  const onSubmit = async () => {
    setLoading(true);
    const whitelist: WhiteItem[] = [];
    if (type === 'transaction' && checked) {
      for (const action of payload.actions) {
        const properties: Record<string, string> = {};
        for (const key in payload.actions[0].data) {
          properties[key] = actionsChecked.includes(key)
            ? '*'
            : String(payload.actions[0].data[key]);
        }
        const item: WhiteItem = {
          domain: payload.domain,
          chainId: payload.chainId,
          contract: action.account,
          action: action.name,
          actor: payload.authorization.actor,
          permission: payload.authorization.permission,
          properties,
          hash: '',
        };
        item.hash = md5(
          [
            item.domain,
            item.chainId,
            item.actor,
            item.permission,
            item.contract,
            item.action,
          ].join('-')
        );
        whitelist.push(item);
      }
    }

    await chrome.storage.session.set({
      windowResult: { approve: true, whitelist },
    });
    window.close();
  };

  const onClose = () => {
    window.close();
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div
        className="flex flex-col gap-1.5 px-5 pt-7 pb-3"
        style={{
          flexBasis: '110px',
          background: 'linear-gradient(to bottom, #F6DDFF, #F7F4FF)',
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="logo"
            className="w-11 h-11 object-contain"
          />
          <div className="flex flex-col gap-1">
            <div className="text-[22px] font-bold text-gray-800 leading-7">
              {type === 'transaction'
                ? t('auth.executionContract')
                : t('auth.requestSignature')}
            </div>
            <div className="text-sm text-gray-800">{payload.domain}</div>
          </div>
        </div>
        <div className="flex justify-end text-[13px] text-gray-500">
          {String(payload.authorization.actor)}@{String(payload.authorization.permission)}
        </div>
      </div>

      {/* Transaction content */}
      {type === 'transaction' && (
        <div className="flex-1 overflow-y-auto px-5">
          {payload.actions.map((action, index) => (
            <div key={index}>
              {/* Action tag + tab toggle */}
              <div className="flex justify-between items-center h-[70px]">
                <div
                  className="flex items-center gap-1 h-[30px] px-2.5 rounded-lg border border-[#E9D8FD]"
                  style={{ backgroundColor: '#F5F0FF' }}
                >
                  <svg className="w-3.5 h-3.5 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M10 13l-2 2 2 2" />
                    <path d="M14 17l2-2-2-2" />
                  </svg>
                  <span className="text-xs font-semibold text-[#7C3AED]">
                    {String(action.account)} → {String(action.name)}
                  </span>
                </div>
                <div className="relative flex w-[160px] h-[30px] bg-gray-100 rounded-[15px] text-xs">
                  {/* Sliding indicator */}
                  <div
                    className="absolute top-0 h-full w-1/2 rounded-[15px] transition-transform duration-300 ease-in-out"
                    style={{
                      background: 'linear-gradient(135deg, #D500F9, #8F2BFF)',
                      transform: tabs[index] === 'json' ? 'translateX(100%)' : 'translateX(0)',
                    }}
                  />
                  <button
                    className={`relative z-10 flex-1 text-center leading-[30px] font-medium cursor-pointer border-0 bg-transparent transition-colors duration-300 ${
                      tabs[index] === 'property' ? 'text-white' : 'text-[#7C3AED]'
                    }`}
                    onClick={() => onTabChange(index, 'property')}
                  >
                    {t('auth.property')}
                  </button>
                  <button
                    className={`relative z-10 flex-1 text-center leading-[30px] font-medium cursor-pointer border-0 bg-transparent transition-colors duration-300 ${
                      tabs[index] === 'json' ? 'text-white' : 'text-[#7C3AED]'
                    }`}
                    onClick={() => onTabChange(index, 'json')}
                  >
                    JSON
                  </button>
                </div>
              </div>

              {/* Property view */}
              {tabs[index] === 'property' && (
                <div
                  className="rounded-xl p-5 text-sm border border-[#E9D8FD]"
                  style={{
                    background: 'linear-gradient(to bottom, #F3EEFE, #FAFAFE 50%, #F9FAFB)',
                  }}
                >
                  <div className="flex flex-col gap-3">
                    {(payload.dataKeys[index] || Object.keys(action.data)).map(
                      (key) => (
                        <div
                          key={key}
                          className="flex items-start"
                        >
                          <div className="min-w-[75px] font-bold text-gray-800 flex items-center">
                            {checked ? (
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={actionsChecked.includes(key)}
                                  onChange={() => toggleActionChecked(key)}
                                  className="accent-primary"
                                />
                                {key}
                              </label>
                            ) : (
                              <span>{key}</span>
                            )}
                          </div>
                          <div className="flex-1 pl-4 text-gray-800 break-all">
                            {String(action.data[key])}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* JSON view */}
              {tabs[index] === 'json' && (
                <div
                  className="rounded-xl py-4 px-5 text-sm border border-[#E9D8FD] overflow-hidden"
                  style={{
                    background: 'linear-gradient(to bottom, #F3EEFE, #FAFAFE 50%, #F9FAFB)',
                  }}
                >
                  <pre className="font-mono text-xs text-gray-500 whitespace-pre-wrap break-all leading-5 m-0">
                    {actionsJson[index]}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Signature content */}
      {type === 'signature' && (
        <div className="flex-1 px-5 overflow-y-auto">
          <div className="flex items-center h-[70px]">
            <div
              className="flex items-center gap-1 h-[30px] px-2.5 rounded-lg border border-[#E9D8FD]"
              style={{ backgroundColor: '#F5F0FF' }}
            >
              <svg className="w-3.5 h-3.5 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
                <path d="M14 3v4a2 2 0 0 0 2 2h4" />
                <path d="M8 13h.01" /><path d="M16 13h.01" /><path d="M12 17h.01" />
              </svg>
              <span className="text-xs font-semibold text-[#7C3AED]">
                {t('auth.textSignature')}
              </span>
            </div>
          </div>
          <div
            className="rounded-xl p-5 text-sm border border-[#E9D8FD] break-all"
            style={{ background: 'linear-gradient(to bottom, #F3EEFE, #FAFAFE 50%, #F9FAFB)' }}
          >
            {payload.encryptText}
          </div>
        </div>
      )}

      {/* Whitelist */}
      {payload.actions.length > 0 && (
        <div className="mt-4 px-5 h-11 flex flex-col justify-center">
          <label className="flex items-center gap-2 h-[22px] text-sm text-gray-700 cursor-pointer">
            <span
              className={`inline-flex items-center justify-center w-4 h-4 rounded-[3px] border-2 border-[#7C3AED] ${
                checked ? 'bg-[#7C3AED]' : 'bg-transparent'
              }`}
              onClick={() => handleCheckedChange(!checked)}
            >
              {checked && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span onClick={() => handleCheckedChange(!checked)} className="cursor-pointer">
              {t('auth.joinWhitelist')}
            </span>
          </label>
          <div className="text-xs text-[#9CA3AF] leading-snug">
            {t('auth.whitelistTip')}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-5 px-5" style={{ flexBasis: '90px' }}>
        <button
          className="flex-1 h-[50px] rounded-[28px] text-sm font-medium border border-[#7C3AED] text-[#7C3AED] cursor-pointer bg-white hover:bg-[#7C3AED]/5 transition-all"
          onClick={onClose}
        >
          {t('auth.cancel')}
        </button>
        <button
          className="flex-1 h-[50px] rounded-[28px] text-sm font-medium text-white border-0 cursor-pointer disabled:opacity-50 transition-all"
          style={{
            background: 'linear-gradient(135deg, #D500F9, #8F2BFF)',
          }}
          disabled={loading}
          onClick={onSubmit}
        >
          {loading ? '...' : t('auth.submit')}
        </button>
      </div>
    </div>
  );
};

export default TransactionPage;
