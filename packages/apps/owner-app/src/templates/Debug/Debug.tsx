import {
  Label,
  Input,
  Select,
  ActionButton,
  t,
  Textarea,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { Times } from '@homebase-id/common-app/icons';
import { useEffect, useState } from 'react';
import { PageMeta } from '@homebase-id/common-app';
import {
  hasDebugFlag,
  jsonStringify64,
  stringifyToQueryParams,
  tryJsonParse,
} from '@homebase-id/js-lib/helpers';

const STORAGE_KEY = 'debug-draft';
interface DefaulValue {
  url: string;
  isPost: boolean;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

const Debug = () => {
  const odinClient = useOdinClientContext();

  const defaultValues = tryJsonParse<DefaulValue>(window.localStorage.getItem(STORAGE_KEY) || '');

  const [url, setUrl] = useState<string>(defaultValues.url || '/circles/definitions/list');
  const [isPost, setIsPost] = useState<boolean>(defaultValues.isPost);

  const [headers, setHeaders] = useState<Record<string, string> | undefined>(defaultValues.headers);
  const [params, setParams] = useState<Record<string, string> | undefined>(defaultValues.params);

  const [outputText, setOutputText] = useState<string>('');
  const addToOutput = (text: string) => setOutputText((oldVal) => oldVal + text);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      jsonStringify64({
        url,
        isPost,
        headers,
        params,
      })
    );
  }, [url, isPost, headers, params]);

  const doRequest = async () => {
    const client = odinClient.createAxiosClient({ headers });
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

  const defaultHeaders = headers
    ? Object.keys(headers)
        .map((key) => `${key}: ${headers[key]}`)
        .join('\n')
    : '';
  const defaultParams = params
    ? Object.keys(params)
        .map((key) => `${key}: ${params[key]}`)
        .join('\n')
    : '';

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

        <div>
          <Label>{t('Headers')}</Label>
          <Textarea
            title="Headers"
            defaultValue={defaultHeaders}
            placeholder="key: value"
            onChange={(e) => {
              const val = e.currentTarget.value;
              setHeaders(getDictionaryFromText(val));
            }}
          />
        </div>
        <div>
          <Label>{t('Data')}</Label>
          <Textarea
            title="Params"
            defaultValue={defaultParams}
            placeholder="key: value"
            onChange={(e) => {
              const val = e.currentTarget.value;
              setParams(getDictionaryFromText(val));
            }}
          />
        </div>

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

const getDictionaryFromText = (text: string) => {
  return text.split('\n').reduce(
    (acc, line) => {
      const [key, value] = line.split(':');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    },
    {} as Record<string, string>
  );
};

export default Debug;
