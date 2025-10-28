import {
  ConnectionImage,
  ConnectionName,
  Input,
  Label,
  t,
  useAllContacts,
} from "@homebase-id/common-app";
import {ReactNode, useState} from "react";
import {ConfigureTrustedConnections} from "./ConfigureTrustedConnections";
import {ShamiraPlayer} from "../../../provider/auth/ShamirProvider";


export const Step2SelectPlayers = ({
                                     addPlayer,
                                     removePlayer,
                                     players,
                                   }: {
  addPlayer: (newOdinId: string) => void;
  removePlayer: (odinId: string) => void;
  players: ShamiraPlayer[];
}) => {

  const [query, setQuery] = useState<string>("");
  const {data: contacts} = useAllContacts(true);
  const searchable = players?.map((p) => p.odinId);
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
      .filter((contact) => contact.odinId && !searchable.includes(contact.odinId))
    : [];

  return (
    <>
      <Label>{t("Selected Trusted Contacts")}</Label>
      <div className="mb-3 text-gray-400">
        Choose 3-7 trusted contacts to help recover your account. You will set security options next.
      </div>

      <div className="mb-3 text-gray-400">
        Selected: {players?.length} (3-7 recommended)
      </div>

      <ConfigureTrustedConnections
        removePlayer={removePlayer}
        trustedPlayers={players}
        showPlayerType={false}/>

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
                addPlayer(result.odinId);
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
