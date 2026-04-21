import * as React from 'react';

const UnlockPage: React.FC = () => {
  React.useEffect(() => {
    const unlock = async () => {
      await chrome.storage.session.set({ windowResult: { unlock: true } });
      window.close();
    };
    unlock();
  }, []);

  return <div />;
};

export default UnlockPage;
