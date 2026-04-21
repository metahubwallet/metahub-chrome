import * as React from 'react';
import { HashRouter, useRoutes, RouteObject } from 'react-router-dom';
import Providers from '@/components/Providers';
import Layout from '../auth/Layout';
import TransactionPage from './TransactionPage';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <TransactionPage />,
      },
    ],
  },
];

const AppRoutes: React.FC = () => {
  const element = useRoutes(routes);
  return element;
};

const App: React.FC = () => {
  return (
    <Providers>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </Providers>
  );
};

export default App;
