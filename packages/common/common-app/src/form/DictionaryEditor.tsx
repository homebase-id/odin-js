import { useRef, useState } from 'react';
import { Input } from './Input';
import { ActionButton } from '../ui/Buttons/ActionButton';
import { t } from '../helpers/i18n/dictionary';
import { Times } from '../ui/Icons/Times';
import { Plus } from '../ui/Icons/Plus';

export const DictionaryEditor = ({
  title,
  defaultValue,
  onChange,
}: {
  title?: string;
  defaultValue: Record<string, string>;
  onChange: (newRecords: Record<string, string>) => void;
}) => {
  const keyInput = useRef<HTMLInputElement>(null);
  const valueInput = useRef<HTMLInputElement>(null);

  const keys = Object.keys(defaultValue);
  const newRecords = { ...defaultValue };

  const [newkey, setNewKey] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');

  const doAddNewRecord = () => {
    newRecords[newkey] = newValue;

    onChange(newRecords);
    setNewKey('');
    if (keyInput.current) keyInput.current.value = '';
    setNewValue('');
    if (valueInput.current) valueInput.current.value = '';
  };

  return (
    <>
      <div className="relative mb-5 mt-2 rounded-lg border p-3">
        {title ? (
          <h2 className="absolute -top-4 left-3 inline bg-page-background italic">{title}</h2>
        ) : null}

        <div className="mb-2 flex flex-row items-center gap-4 font-semibold">
          <div className="w-2/5 flex-grow">{t('Key')}</div>
          <div className="w-2/5 flex-grow">{t('Value')}</div>
          <div className="w-8"></div>
        </div>

        {keys?.map((key, index) => (
          <div key={index} className="flex flex-row items-center gap-4">
            <div className="w-2/5 flex-grow">{key}</div>
            <div className="w-2/5 flex-grow">{defaultValue[key]}</div>
            <div>
              <ActionButton
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  delete newRecords[key];
                  onChange(newRecords);
                }}
                icon={Times}
                size="square"
                type="mute"
              />
            </div>
          </div>
        ))}

        <div className="flex flex-row items-center gap-4">
          <div className="w-2/5 flex-grow">
            <Input
              id="key"
              name="key"
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doAddNewRecord();
              }}
              ref={keyInput}
              defaultValue={newkey}
              placeholder='e.g. "key"'
            />
          </div>
          <div className="w-2/5 flex-grow">
            <Input
              id="value"
              name="value"
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doAddNewRecord();
              }}
              ref={valueInput}
              defaultValue={newValue}
              placeholder='e.g. "value"'
            />
          </div>
          <div>
            <ActionButton
              type="mute"
              icon={Plus}
              size="square"
              className="mb-2 mt-auto"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                doAddNewRecord();
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
