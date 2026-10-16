import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {WelcomeData} from '../../templates/Setup/Setup';
import {getInvitedBy, HOMEBASE_ODIN_ID} from '../../provider/setup/SetupProvider';
import {ActionButton, CheckboxToggle, t, useDotYouClientContext} from '@homebase-id/common-app';
import {Arrow} from '@homebase-id/common-app/icons';

/**
 * The wizard step after the profile: offers to connect with and follow id.homebase.id, and to connect
 * with whoever invited the identity. The choices only travel in the WelcomeData; useInit acts on them
 * once the identity is initialized.
 */
const SetupHomebaseConnect = ({
    data,
    onBack,
    onConfirm,
}: {
    data: WelcomeData;
    onBack: () => void;
    onConfirm: (data: WelcomeData) => void;
}) => {
    const [connectToHomebase, setConnectToHomebase] = useState(data.connectToHomebase);
    const [followHomebase, setFollowHomebase] = useState(data.followHomebase);
    const [connectToInviter, setConnectToInviter] = useState(data.connectToInviter);

    const dotYouClient = useDotYouClientContext();
    const {data: fetchedInvitedBy} = useQuery({
        queryKey: ['invited-by'],
        // No inviter is the safe answer if the lookup fails: the step still works without one
        queryFn: () => getInvitedBy(dotYouClient).catch(() => null),
        staleTime: Infinity,
    });
    // Homebase already has its own toggle
    const invitedBy =
        fetchedInvitedBy && fetchedInvitedBy !== HOMEBASE_ODIN_ID ? fetchedInvitedBy : undefined;

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onConfirm({...data, connectToHomebase, followHomebase, invitedBy, connectToInviter});
            }}
        >
            <p className="flex flex-col">
                {t('Say hello to Homebase')}
                <small className="text-sm text-slate-500">
                    {t(
                        'Connect with the Homebase team to chat with us right away, and follow us for news and updates. You can change either later.'
                    )}
                </small>
            </p>

            <div className="my-10 flex flex-col gap-5">
                {invitedBy ? (
                    <div className="flex flex-row items-center gap-4">
                        <div className="flex flex-col">
                            {t('Connect with')} {invitedBy}
                            <small className="text-sm text-slate-400">
                                {t('They invited you, so you can chat with them right away')}
                            </small>
                        </div>
                        <CheckboxToggle
                            id="connectToInviter"
                            className="ml-auto"
                            checked={connectToInviter}
                            onChange={(e) => setConnectToInviter(e.target.checked)}
                        />
                    </div>
                ) : null}
                <div className="flex flex-row items-center gap-4">
                    <div className="flex flex-col">
                        {t('Connect with')} {HOMEBASE_ODIN_ID}
                        <small className="text-sm text-slate-400">{t('So you can chat with us')}</small>
                    </div>
                    <CheckboxToggle
                        id="connectToHomebase"
                        className="ml-auto"
                        checked={connectToHomebase}
                        onChange={(e) => setConnectToHomebase(e.target.checked)}
                    />
                </div>
                <div className="flex flex-row items-center gap-4">
                    <div className="flex flex-col">
                        {t('Follow')} {HOMEBASE_ODIN_ID}
                        <small className="text-sm text-slate-400">{t('See our posts in your feed')}</small>
                    </div>
                    <CheckboxToggle
                        id="followHomebase"
                        className="ml-auto"
                        checked={followHomebase}
                        onChange={(e) => setFollowHomebase(e.target.checked)}
                    />
                </div>
            </div>

            <div className="mt-auto flex flex-row-reverse gap-2">
                <ActionButton icon={Arrow}>{t('Setup')}</ActionButton>
                <ActionButton
                    type="secondary"
                    onClick={(e) => {
                        // A button in a form submits it by default
                        e.preventDefault();
                        onBack();
                    }}
                >
                    {t('Back')}
                </ActionButton>
            </div>
        </form>
    );
};

export default SetupHomebaseConnect;
