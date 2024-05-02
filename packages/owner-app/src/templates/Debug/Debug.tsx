import {
  Label,
  Input,
  Select,
  ActionButton,
  Times,
  t,
  Plus,
  DictionaryEditor,
} from '@youfoundation/common-app';
import { useAuth } from '../../hooks/auth/useAuth';
import { useRef, useState } from 'react';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { hasDebugFlag, stringifyToQueryParams } from '@youfoundation/js-lib/helpers';

const Debug = () => {
  const dotYouClient = useAuth().getDotYouClient();
  const [url, setUrl] = useState<string>('/circles/definitions/list');
  const [isPost, setIsPost] = useState<boolean>(false);

  const [headers, setHeaders] = useState<Record<string, string> | undefined>(undefined);
  const [params, setParams] = useState<Record<string, string> | undefined>(undefined);

  const [outputText, setOutputText] = useState<string>('');
  const addToOutput = (text: string) => setOutputText((oldVal) => oldVal + text);

  const doRequest = async () => {
    const client = dotYouClient.createAxiosClient({ headers });
    addToOutput(`Requesting ${isPost ? 'POST' : 'GET'} ${url}\n`);
    const result = isPost
      ? await client.post(url, params).catch((data) => data.response)
      : await client
          .get(`${url}?${params ? stringifyToQueryParams(params) : ''}`)
          .catch((data) => data.response);

    addToOutput(`Status: ${result.status}\n`);
    addToOutput(JSON.stringify(result.data || result.statusText, null, 2));
    addToOutput('\n-----------------\n');
  };

  const isDebug = hasDebugFlag();
  if (!isDebug) return null;

  return (
    <>
      <div className="flex min-h-full flex-col">
        <PageMeta title="Debug" />
        <div className="mb-5 flex flex-row gap-2">
          <div className="">
            <Label className="font-semibold">Type:</Label>
            <Select
              className="h-[2.625rem]"
              defaultValue={isPost ? 'post' : 'get'}
              onChange={(e) => setIsPost(e.target.value === 'post')}
            >
              <option value="get">GET</option>
              <option value="post">POST</option>
            </Select>
          </div>
          <div className="flex-grow">
            <Label className="font-semibold">Api path:</Label>
            <Input type="text" onChange={(e) => setUrl(e.currentTarget.value)} defaultValue={url} />
          </div>
        </div>

        <DictionaryEditor title="Headers" defaultValue={headers || {}} onChange={setHeaders} />
        <DictionaryEditor title="Params" defaultValue={params || {}} onChange={setParams} />

        <div className="flex flex-row-reverse justify-between">
          <ActionButton onClick={doRequest}>Send</ActionButton>
          <ActionButton onClick={() => setOutputText('')} icon={Times} type="secondary">
            Clear
          </ActionButton>
        </div>

        <hr className="my-10" />

        <textarea value={outputText} readOnly className="min-h-[20rem] w-full flex-grow" />
      </div>
    </>
  );
};

export default Debug;
