import * as React from 'react';
import { HashRouter, useRoutes, RouteObject } from 'react-router-dom';
import Providers from '@/components/Providers';
import Layout from './Layout';
import LoginPage from './LoginPage';
import UnlockPage from './UnlockPage';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'unlock',
        element: <UnlockPage />,
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
