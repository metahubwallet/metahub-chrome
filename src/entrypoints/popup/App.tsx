import * as React from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import Providers from '@/components/Providers';
import { routes } from './routes';
import '@/i18n'; // Initialize i18n

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
