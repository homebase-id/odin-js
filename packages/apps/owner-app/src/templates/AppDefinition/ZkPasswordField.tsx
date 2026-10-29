import { Label, t } from '@homebase-id/common-app';
import { PasswordInput } from '../../components/Password/PasswordInput';

/**
 * The owner's password, asked for when an app wants drives created private and this session holds no zero-knowledge
 * master key to make their keys with (ZkPasswordNeededError).
 */
export const ZkPasswordField = ({ onChange }: { onChange: (password: string) => void }) => (
  <div className="my-6">
    <p className="mb-2 text-slate-600 dark:text-slate-400">
      {t(
        'This app asked for private drives. Enter your password to create them: only your own devices will hold their keys, not the server.'
      )}
    </p>
    <Label htmlFor="zk-password" className="text-sm leading-7 dark:text-gray-400">
      {t('Password')}
    </Label>
    <PasswordInput
      name="zk-password"
      id="zk-password"
      autoFocus
      required
      onChange={(e) => onChange(e.target.value)}
      autoComplete="current-password"
    />
  </div>
);
