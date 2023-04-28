import { Times } from '@youfoundation/common-app';
import { useRef, useState, useEffect } from 'react';
import Input from '../../../components/Form/Input';
import Label from '../../../components/Form/Label';
import ActionButton from '../../../components/ui/Buttons/ActionButton';
import { t } from '../../../helpers/i18n/dictionary';

const Circles = ({
  pageData,
  onChange,
  setValidity,
  onNext,
}: {
  pageData: { name: string; description: string }[];
  onChange: (page: { name: string; description: string }[]) => void;
  setValidity: (isValid: boolean) => void;
  onNext: () => void;
}) => {
  // Suggest circle creation (Family, Friends, Work)
  // Provide option to set different details for each circle. "How do these circles know you?"
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setName('');
    setDescription('');
  }, [pageData]);

  return (
    <>
      <p className="flex flex-col">
        How should we organise your social circles?
        <small className="text-sm text-slate-500">
          Circles provide a way to selectively share content with only those circles for which it is
          applicable. You are in full control of who is part of which circle and as such what
          everyone can see.
        </small>
      </p>

      <ul className="mb-10">
        {pageData?.map((circle, index) => (
          <li
            key={index}
            className="my-5 flex flex-row rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
          >
            <div className="flex flex-col">
              {circle.name}
              <small className="text-sm text-slate-500">{circle.description}</small>
            </div>
            <button
              className="my-auto ml-auto p-2 hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={(e) => {
                e.preventDefault();

                const dirtyOther = [...pageData];
                dirtyOther.splice(index, 1);

                onChange(dirtyOther);

                return false;
              }}
            >
              <Times className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Add extra circle:
          setValidity(true);
          onChange([...pageData, { name: name, description: description }]);
          // onNext();
        }}
        ref={formRef}
      >
        <h2 className="mb-5 text-xl">{t('Other Circles')}</h2>
        <div className="mb-5">
          <div className="mb-5">
            <Label htmlFor="name">{t('Name')}</Label>
            <Input id="name" name="name" onChange={(e) => setName(e.target.value)} value={name} />
          </div>
          <div className="mb-5">
            <Label htmlFor="description">{t('Description')}</Label>
            <Input
              id="description"
              name="description"
              onChange={(e) => setDescription(e.target.value)}
              value={description}
            />
          </div>
          <ActionButton type="secondary" icon="plus">
            {t('Add')}
          </ActionButton>
        </div>
      </form>
      <div className="mt-10 flex flex-row-reverse">
        <ActionButton
          onClick={() => {
            setValidity(true);
            onNext();
          }}
          icon="send"
        >
          {t('Next')}
        </ActionButton>
      </div>
    </>
  );
};

export default Circles;
