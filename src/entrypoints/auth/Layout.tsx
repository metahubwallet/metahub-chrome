import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { useUserStore } from '@/stores/userStore';
import AuthUnlock from './AuthUnlock';

const Layout: React.FC = () => {
  const password = useUserStore((s) => s.password);

  if (password === '') {
    return <AuthUnlock />;
  }

  return <Outlet />;
};

export default Layout;
