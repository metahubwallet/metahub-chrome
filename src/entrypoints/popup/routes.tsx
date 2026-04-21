import * as React from 'react';
import { RouteObject } from 'react-router-dom';
import PopupLayout from './PopupLayout';

// Lazy loaded pages
const WalletHomePage = React.lazy(() => import('@/entrypoints/popup/pages/wallet/WalletHomePage'));
const ImportKeyPage = React.lazy(() => import('@/entrypoints/popup/pages/wallet/ImportKeyPage'));
const AddTokenPage = React.lazy(() => import('@/entrypoints/popup/pages/wallet/AddTokenPage'));
const ImportProtocolPage = React.lazy(() => import('@/entrypoints/popup/pages/wallet/ImportProtocolPage'));

// Transfer
const TransferPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/transfer/TransferPage').catch(() => ({ default: () => <div>Transfer</div> }))
);
const ReceivePage = React.lazy(() =>
  import('@/entrypoints/popup/pages/transfer/ReceivePage').catch(() => ({ default: () => <div>Receive</div> }))
);
const TokenTracesPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/transfer/TokenTracesPage').catch(() => ({
    default: () => <div>Token Traces</div>,
  }))
);
const TransactionDetailPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/transfer/TransactionDetailPage').catch(() => ({
    default: () => <div>Transaction Detail</div>,
  }))
);

// Resource
const ResourcePage = React.lazy(() =>
  import('@/entrypoints/popup/pages/resource/ResourcePage').catch(() => ({ default: () => <div>Resource</div> }))
);
const RechargePage = React.lazy(() =>
  import('@/entrypoints/popup/pages/resource/RechargePage').catch(() => ({ default: () => <div>Recharge</div> }))
);

// Setting
const SettingPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/SettingPage').catch(() => ({ default: () => <div>Settings</div> }))
);
const SettingLanguagePage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/SettingLanguagePage').catch(() => ({ default: () => <div>Language</div> }))
);
const SettingNodePage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/SettingNodePage').catch(() => ({ default: () => <div>Node</div> }))
);
const NetworkManagePage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/NetworkManagePage').catch(() => ({ default: () => <div>Network Manage</div> }))
);
const NetworkSelectPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/NetworkSelectPage').catch(() => ({ default: () => <div>Network Select</div> }))
);
const NetworkAddExistsPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/NetworkAddExistsPage').catch(() => ({ default: () => <div>Add Network</div> }))
);
const NetworkAddCustomPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/NetworkAddCustomPage').catch(() => ({ default: () => <div>Add Custom Network</div> }))
);
const WalletManagePage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/WalletManagePage').catch(() => ({ default: () => <div>Wallet Manage</div> }))
);
const AccountManagePage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/AccountManagePage').catch(() => ({ default: () => <div>Account Manage</div> }))
);
const AccountDetailPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/AccountDetailPage').catch(() => ({ default: () => <div>Account Detail</div> }))
);
const AccountChangePage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/AccountChangePage').catch(() => ({ default: () => <div>Account Change</div> }))
);
const WhiteListPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/WhiteListPage').catch(() => ({ default: () => <div>Whitelist</div> }))
);
const WhiteListDetailPage = React.lazy(() =>
  import('@/entrypoints/popup/pages/setting/WhiteListDetailPage').catch(() => ({ default: () => <div>Whitelist Detail</div> }))
);

const Fallback: React.FC = () => (
  <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <PopupLayout />,
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<Fallback />}>
            <WalletHomePage />
          </React.Suspense>
        ),
      },
      {
        path: 'import-key',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <ImportKeyPage />
          </React.Suspense>
        ),
      },
      {
        path: 'add-token',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <AddTokenPage />
          </React.Suspense>
        ),
      },
      {
        path: 'import-protocol',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <ImportProtocolPage />
          </React.Suspense>
        ),
      },
      {
        path: 'transfer',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <TransferPage />
          </React.Suspense>
        ),
      },
      {
        path: 'receive',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <ReceivePage />
          </React.Suspense>
        ),
      },
      {
        path: 'token-traces/:token',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <TokenTracesPage />
          </React.Suspense>
        ),
      },
      {
        path: 'transaction-detail',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <TransactionDetailPage />
          </React.Suspense>
        ),
      },
      {
        path: 'resource',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <ResourcePage />
          </React.Suspense>
        ),
      },
      {
        path: 'resource/recharge',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <RechargePage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <SettingPage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/language',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <SettingLanguagePage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/node',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <SettingNodePage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/network-manage',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <NetworkManagePage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/network-select',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <NetworkSelectPage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/network-add',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <NetworkAddExistsPage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/network-add-custom',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <NetworkAddCustomPage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/wallet-manage',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <WalletManagePage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/account-manage',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <AccountManagePage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/account-detail',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <AccountDetailPage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/account-change',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <AccountChangePage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/whitelist',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <WhiteListPage />
          </React.Suspense>
        ),
      },
      {
        path: 'setting/whitelist-detail',
        element: (
          <React.Suspense fallback={<Fallback />}>
            <WhiteListDetailPage />
          </React.Suspense>
        ),
      },
    ],
  },
];

export default routes;
