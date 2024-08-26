import { Label, Input, ActionButton } from '@homebase-id/common-app';
import { useState } from 'react';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { importRemotePublicEccKey } from '@homebase-id/js-lib/auth';
import { hasDebugFlag } from '@homebase-id/js-lib/helpers';

const EccDebug = () => {
  const [keyData, setKeyData] = useState<string>('');

  const [outputText, setOutputText] = useState<string>('');
  const addToOutput = (text: string) => setOutputText((oldVal) => oldVal + text);

  const doRequest = async () => {
    const importedRemotePublicKey = await importRemotePublicEccKey(keyData);

    addToOutput('imported ' + importedRemotePublicKey);
    addToOutput('\n-----------------\n');
  };

  const isDebug = hasDebugFlag();
  if (!isDebug) return null;

  return (
    <>
      <div className="flex min-h-full flex-col">
        <PageMeta title="Debug" />
        <div className="mb-5 flex flex-row gap-2">
          <div className="flex-grow">
            <Label className="font-semibold">Key Data:</Label>
            <Input
              type="text"
              onChange={(e) => setKeyData(e.currentTarget.value)}
              defaultValue={keyData}
            />
          </div>
        </div>

        <div className="flex flex-row-reverse justify-between">
          <ActionButton onClick={doRequest}>Send</ActionButton>
        </div>

        <hr className="my-10" />

        <textarea value={outputText} readOnly className="min-h-[20rem] w-full flex-grow" />
      </div>
    </>
  );
};

export default EccDebug;
