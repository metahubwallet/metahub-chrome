import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { useSettingStore } from '@/stores/settingStore';
import { WhiteItem } from '@/types/settings';

type ActorMap = Record<string, Record<string, WhiteItem[]>>;

const WhiteListDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const domain = searchParams.get('domain') || '';

  const whitelist = useSettingStore((s) => s.whitelist);
  const setWhitelist = useSettingStore((s) => s.setWhitelist);

  const buildActorMap = (list: WhiteItem[]): ActorMap => {
    const byActor: Record<string, WhiteItem[]> = {};
    for (const item of list) {
      if (item.domain !== domain) continue;
      if (!byActor[item.actor]) byActor[item.actor] = [];
      byActor[item.actor].push(item);
    }

    const result: ActorMap = {};
    for (const actor of Object.keys(byActor)) {
      const byContract: Record<string, WhiteItem[]> = {};
      for (const item of byActor[actor]) {
        if (!byContract[item.contract]) byContract[item.contract] = [];
        byContract[item.contract].push(item);
      }
      result[actor] = byContract;
    }
    return result;
  };

  const whiteActors = buildActorMap(whitelist);

  const handleDelete = (items: WhiteItem[]) => {
    const itemStrings = items.map((i) => JSON.stringify(i));
    const newList = whitelist.filter((w) => !itemStrings.includes(JSON.stringify(w)));
    setWhitelist(newList);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={`${t('setting.whitelist')}${t('wallet.detail')}`} />

      <div className="flex-1 overflow-y-auto px-4">
        {Object.entries(whiteActors).map(([actorKey, whiteLists]) => (
          <div key={actorKey} className="w-full">
            <div className="h-[50px] bg-[#FAFAFE] text-gray-700 text-sm flex justify-between items-center px-4 mt-3 rounded-2xl border border-[#E9D8FD]">
              <span>{t('setting.accountName')}</span>
              <span className="font-semibold">{actorKey}</span>
            </div>

            {Object.entries(whiteLists).map(([contractKey, whiteList]) => (
              <div key={contractKey}>
                <div className="h-9 px-4 mt-2 text-gray-800 text-base flex justify-between items-center">
                  <span>{contractKey}</span>
                  <span
                    className="text-xs text-primary border border-primary px-2 py-0.5 rounded-full cursor-pointer"
                    onClick={() => handleDelete(whiteList)}
                  >
                    {t('setting.whiteListCancel2')}
                  </span>
                </div>

                {whiteList.map((whiteItem, index) => (
                  <div
                    key={index}
                    className="mb-2 bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] px-3 pt-3"
                  >
                    <div className="flex justify-between items-center text-xs text-gray-700 mb-1">
                      <span>{whiteItem.action}</span>
                      <span
                        className="text-primary border border-primary px-2 py-0.5 rounded-full cursor-pointer"
                        onClick={() => handleDelete([whiteItem])}
                      >
                        {t('setting.whiteListCancel')}
                      </span>
                    </div>

                    {Object.entries(whiteItem.properties || {}).map(([propKey, propVal]) => (
                      <div
                        key={propKey}
                        className="text-xs text-gray-500 text-right break-words my-2 last:pb-3"
                      >
                        {propKey}: {propVal}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhiteListDetailPage;
