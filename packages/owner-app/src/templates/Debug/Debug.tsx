import { Label, Input, Select, ActionButton, Times, t, Plus } from '@youfoundation/common-app';
import useAuth from '../../hooks/auth/useAuth';
import { useRef, useState } from 'react';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { stringifyToQueryParams } from '@youfoundation/js-lib/helpers';

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

  const isDebug = (localStorage && localStorage.getItem('debug') === '1') || import.meta.env.DEV;
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

        <RecordsEntry title="Headers" records={headers || {}} setRecords={setHeaders} />
        <RecordsEntry title="Params" records={params || {}} setRecords={setParams} />

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

const RecordsEntry = ({
  title,
  records,
  setRecords,
}: {
  title: string;
  records: Record<string, string>;
  setRecords: (newRecords: Record<string, string>) => void;
}) => {
  const keyInput = useRef<HTMLInputElement>(null);
  const valueInput = useRef<HTMLInputElement>(null);

  const keys = Object.keys(records);
  const newRecords = { ...records };

  const [newkey, setNewKey] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');

  return (
    <>
      <div className="relative mb-5 mt-2 rounded-lg border p-3">
        <h2 className="absolute -top-4 left-3 inline bg-page-background italic">{title}</h2>

        <div className="mb-2 flex flex-row items-center gap-4 font-semibold">
          <div className="w-2/5 flex-grow">{t('Key')}</div>
          <div className="w-2/5 flex-grow">{t('Value')}</div>
          <div className="w-8"></div>
        </div>

        {keys?.map((key, index) => (
          <div key={index} className="flex flex-row items-center gap-4">
            <div className="w-2/5 flex-grow">{key}</div>
            <div className="w-2/5 flex-grow">{records[key]}</div>
            <div>
              <ActionButton
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700"
                onClick={() => {
                  delete newRecords[key];
                  setRecords(newRecords);
                }}
                icon={Times}
                size="square"
                type="secondary"
              />
            </div>
          </div>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();

            newRecords[newkey] = newValue;
            setRecords(newRecords);
            setNewKey('');
            if (keyInput.current) keyInput.current.value = '';
            setNewValue('');
            if (valueInput.current) valueInput.current.value = '';
          }}
        >
          <div className="flex flex-row items-center gap-4">
            <div className="w-2/5 flex-grow">
              <Input
                id="key"
                name="key"
                onChange={(e) => setNewKey(e.target.value)}
                ref={keyInput}
                defaultValue={newkey}
              />
            </div>
            <div className="w-2/5 flex-grow">
              <Input
                id="value"
                name="value"
                onChange={(e) => setNewValue(e.target.value)}
                ref={valueInput}
                defaultValue={newValue}
              />
            </div>
            <div>
              <ActionButton type="secondary" icon={Plus} size="square" className="mb-2 mt-auto" />
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default Debug;
