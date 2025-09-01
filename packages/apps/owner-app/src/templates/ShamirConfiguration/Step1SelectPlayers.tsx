import {
  ConnectionImage,
  ConnectionName,
  Input,
  Label, SubtleMessage,
  t,
  useAllContacts,
} from "@homebase-id/common-app";
import {ReactNode, useState} from "react";

// define type for per-player settings
export type PlayerMode = "automated" | "confirmation";

export const Step1SelectPlayers = ({
                                     addContact,
                                     removeContact,
                                     updateContactMode,
                                     defaultValue,
                                   }: {
  addContact: (newOdinId: string) => void;
  removeContact: (odinId: string) => void;
  updateContactMode: (odinId: string, mode: PlayerMode) => void;
  defaultValue: string[];
}) => {
  const [query, setQuery] = useState<string>("");

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
      .filter(
        (contact) => contact.odinId && !defaultValue.includes(contact.odinId)
      )
    : [];

  return (
    <>
      <Label>{t("Selected list")}</Label>

      <SubtleMessage className="mb-3">
        <ul className="list-disc pl-5 space-y-2 not-italic">
          <li>{t("Send automatically - The piece is sent right away during recovery.")}</li>
          <li>{t("Approve first - The connection must confirm before their piece is sent.")}</li>
        </ul>
      </SubtleMessage>
      
      {defaultValue?.length ? (
        <div className="flex-grow overflow-auto">
          {defaultValue.map((odinId, index) => (
            <SelectedConnectionItem
              key={odinId || index}
              odinId={odinId}
              onRemove={() => removeContact(odinId)}
              onModeChange={(mode) => updateContactMode(odinId, mode)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-grow items-center justify-center p-5">
          <p className="text-slate-400">
            {t("Select trusted connections from list below")}
          </p>
        </div>
      )}

      <br/>
      <hr/>
      <br/>

      <div className="flex w-full flex-col gap-2 p-5">
        <Input
          onChange={(e) => setQuery(e.target.value)}
          value={query}
          className="w-full"
          placeholder={t("Search for contacts")}
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
        <div className="flex flex-grow items-center justify-center p-5"/>
      )}
    </>
  );
};


const SelectedConnectionItem = ({
                                  odinId,
                                  onRemove,
                                  onModeChange,
                                }: {
  odinId: string;
  onRemove: () => void;
  onModeChange: (mode: PlayerMode) => void;
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 mb-2">
      {/* left side: connection info */}
      <div className="flex items-center gap-3">
        <ConnectionImage
          odinId={odinId}
          className="border border-neutral-200 dark:border-neutral-800"
          size="sm"
        />
        <ConnectionName odinId={odinId} />
      </div>

      {/* right side: controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <select
          onChange={(e) => onModeChange(e.target.value as PlayerMode)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-slate-800"
        >
          <option value="automated">{t("Send automatically")}</option>
          <option value="confirmation">{t("Approve first")}</option>
        </select>

        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 text-sm sm:text-xs sm:bg-red-500 sm:px-2 sm:py-1 sm:rounded sm:text-white sm:hover:bg-red-600">
          {t("Remove")}
        </button>
      </div>
    </div>
  );
};


export const ConnectionListItem = ({
                                     odinId,
                                     ...props
                                   }: {
  onClick: (() => void) | undefined;
  odinId: string | undefined;
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
        isActive ? "bg-slate-200 dark:bg-slate-800" : "bg-transparent"
      }`}
    >
      {children}
    </div>
  </div>
);
