import {
  ConnectionImage,
  ConnectionName,
  Input, Label,
  t,
  useAllContacts,
} from '@homebase-id/common-app';
import {ReactNode, useState} from 'react';

export const SelectPlayers = ({
                                addContact,
                                defaultValue,
                              }: {
  addContact: (newOdinId: string) => void;
  removeContact: (odinId: string) => void;
  defaultValue: string[];
}) => {
  const [query, setQuery] = useState<string | undefined>(undefined);

  const {data: contacts} = useAllContacts(true);

  const contactResults = contacts
    ? contacts
      .map((dsr) => dsr.fileMetadata.appData.content)
      .filter(
        (contact) =>
          contact.odinId &&
          (!query ||
            contact.odinId?.includes(query) ||
            contact.name?.displayName?.includes(query))
      )
      .filter((contact) => contact.odinId && !defaultValue.includes(contact.odinId))
    : [];

  return (
    <>
      <div className="flex w-full flex-col gap-2 p-5">
        <Input
          onChange={(e) => setQuery(e.target.value)}
          defaultValue={query}
          className="w-full"
          placeholder={t('Search for contacts')}
        />
      </div>

      {/*selection list */}
      {contactResults?.length ? (
        <div className="flex-grow overflow-auto">
          {contactResults.map((result, index) => (
            <ConnectionListItem
              odinId={result.odinId as string}
              isActive={false}
              key={result.odinId || index}
              onClick={() => {
                if (!result.odinId) return;
                addContact(result.odinId);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-grow items-center justify-center p-5">
          <p className="text-slate-400">{t('No contacts found')}</p>
        </div>
      )}

      {/*the selected list*/}

      <hr/>
      <Label>
        {t('Selected list')}
      </Label>

      {defaultValue?.length ? (
        <div className="flex-grow overflow-auto">
          {defaultValue.map((odinId, index) => (
            <ConnectionListItem
              odinId={odinId as string}
              isActive={false}
              key={odinId || index}
              onClick={() => {
                if (!odinId) return;
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-grow items-center justify-center p-5">
          <p className="text-slate-400">{t('Select players from list below')}</p>
        </div>
      )}
    </>
  );
};


export const ConnectionListItem = ({
                                     odinId,
                                     conversationId,
                                     ...props
                                   }: {
  onClick: (() => void) | undefined;
  odinId: string | undefined;
  conversationId?: string;
  isActive: boolean;
}) => {
  return (
    <ListItemWrapper {...props}>
      <ConnectionImage
        odinId={odinId}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <ConnectionName odinId={odinId}/>
    </ListItemWrapper>
  );
};

const ListItemWrapper = ({
                           onClick,
                           isActive,
                           children,
                         }: {
  onClick: (() => void) | undefined;
  isActive: boolean;
  children: ReactNode;
}) => (
  <div className="group px-2">
    <div
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-row items-center gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-primary/20 ${
        isActive ? 'bg-slate-200 dark:bg-slate-800' : 'bg-transparent'
      }`}
    >
      {children}
    </div>
  </div>
);
