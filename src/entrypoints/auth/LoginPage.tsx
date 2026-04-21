import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@/stores/walletStore';
import { tool } from '@/utils/tool';
import logoImg from '@/assets/images/logo@2x.png';

interface LoginAccount {
  name: string;
  permissions: string[];
  selectedPermission: string;
}

interface LoginPayload {
  domain: string;
  chainId: string;
}

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [word, setWord] = React.useState('');
  const [payload, setPayload] = React.useState<LoginPayload>({
    domain: '',
    chainId: '',
  });
  const [accounts, setAccounts] = React.useState<LoginAccount[]>([]);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  const allAccountsRef = React.useRef<LoginAccount[]>([]);

  React.useEffect(() => {
    const init = async () => {
      const { windowParams } = (await chrome.storage.session.get([
        'windowParams',
      ])) as { windowParams?: any };
      if (windowParams) {
        const domain = windowParams.domain || '';
        const chainId = windowParams.chainId || '';
        setPayload({ domain, chainId });

        const wallets = useWalletStore.getState().wallets.filter(
          (x) => x.chainId === chainId
        );
        const mapped = wallets.map((x) => {
          const permissions = x.keys.flatMap((y) => y.permissions);
          return {
            name: x.name,
            permissions,
            selectedPermission: permissions[0] || '',
          };
        });
        allAccountsRef.current = mapped;
        setAccounts(mapped);
      }
    };
    init();
  }, []);

  React.useEffect(() => {
    if (word === '') {
      setAccounts(allAccountsRef.current);
    } else {
      setAccounts(
        allAccountsRef.current.filter((account) =>
          account.name.includes(word)
        )
      );
    }
  }, [word]);

  const changePermission = (accountName: string, permission: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.name === accountName
          ? { ...acc, selectedPermission: permission }
          : acc
      )
    );
    allAccountsRef.current = allAccountsRef.current.map((acc) =>
      acc.name === accountName
        ? { ...acc, selectedPermission: permission }
        : acc
    );
    setOpenDropdown(null);
  };

  const login = async (account: LoginAccount) => {
    let publicKey = '';
    const permission = account.selectedPermission;
    const wallet = useWalletStore
      .getState()
      .wallets.find(
        (x) => x.chainId === payload.chainId && x.name === account.name
      );
    if (wallet) {
      for (const key of wallet.keys) {
        if (key.permissions.indexOf(permission) >= 0) {
          publicKey = key.publicKey;
        }
      }
    }
    if (!publicKey) {
      return;
    }

    const result = {
      name: account.name,
      publicKey,
      authority: permission,
      chainId: payload.chainId,
    };

    await chrome.storage.session.set({ windowResult: result });
    window.close();
  };

  const avatarColors = [
    ['#A855F7', '#7C3AED'],
    ['#3B82F6', '#1D4ED8'],
    ['#F59E0B', '#D97706'],
  ];

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #F7F4FF 0%, #FFFEFF 38%, #F4F7FF 100%)',
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col gap-1.5 px-6 pt-7 shrink-0"
        style={{
          height: '110px',
          background:
            'linear-gradient(to bottom, rgba(246,221,255,0.8), rgba(246,221,255,0))',
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
              {t('auth.authorizeLogin')}
            </div>
            <div className="text-sm text-gray-800">{payload.domain}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-5">
        <div className="flex items-center gap-1.5 w-full h-10 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5">
          <svg className="w-[18px] h-[18px] text-[#9CA3AF] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="text-sm bg-transparent border-0 outline-none flex-1 placeholder-[#9CA3AF]"
            placeholder={t('auth.searchAccounts')}
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />
        </div>
      </div>

      {/* Section label */}
      <div className="pt-[18px] pb-3 px-5 shrink-0">
        <div className="text-xs font-semibold text-[#9CA3AF]">
          {t('auth.selectAccount')}
        </div>
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="text-[#9CA3AF]">{t('public.noImport')}</div>
          </div>
        ) : (
          accounts.map((account, index) => {
            const [colorFrom, colorTo] = avatarColors[index % avatarColors.length];
            const firstLetter = account.name.charAt(0).toUpperCase();
            return (
              <div
                key={account.name}
                className="flex items-center gap-3 h-[71px] shrink-0 px-4 rounded-xl border border-[#E5E7EB] bg-white/40"
                style={{
                  boxShadow: '0px 1px 3px 0px rgba(255, 66, 216, 0.11)',
                }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})`,
                  }}
                >
                  <span className="text-white text-base font-bold">{firstLetter}</span>
                </div>
                {/* Account info */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-[#7C3AED] truncate">
                    {tool.briefAccount(account.name, 12, 10)}
                  </div>
                  <div className="relative">
                    <span
                      className="text-[13px] text-gray-500 cursor-pointer select-none inline-flex items-center gap-1"
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === account.name ? null : account.name
                        )
                      }
                    >
                      {account.selectedPermission}
                      <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                    {openDropdown === account.name && (
                      <div className="absolute top-6 left-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[100px]">
                        {account.permissions.map((perm) => (
                          <div
                            key={perm}
                            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-primary/5 cursor-pointer"
                            onClick={() => changePermission(account.name, perm)}
                          >
                            {perm}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Login button */}
                <button
                  className="text-xs font-semibold text-white rounded-full px-4 py-1.5 border-0 cursor-pointer shrink-0 transition-opacity hover:opacity-90"
                  style={{
                    background: 'linear-gradient(90deg, #DA00F2, #BF01FA)',
                  }}
                  onClick={() => login(account)}
                >
                  {t('auth.login')}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-1 px-5 pt-4 pb-6">
        <svg className="w-3.5 h-3.5 text-[#C4B5FD] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span className="text-xs text-[#A78BFA]">
          {t('auth.selectAccountTip')}
        </span>
      </div>
    </div>
  );
};

export default LoginPage;
