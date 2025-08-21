import {Input, Label, t} from '@homebase-id/common-app';

export const Step2OtherOptions = ({
                                    minShards,
                                    onChange,
                                  }: {
  minShards: number;
  onChange: (minShards: number) => void;
}) => {
  return (
    <>
      <Label>
        {t('Selected list')}
      </Label>

      <div className="flex w-full flex-col gap-2 p-5">
        <Label htmlFor="duration">
          {t('Minimum matching shards')}
        </Label>
        <Input
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
          placeholder={t('Set min shards')}
          value={minShards}
        />
      </div>
    </>
  );
};

