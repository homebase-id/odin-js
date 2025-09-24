import {t} from '@homebase-id/common-app';
import {PageMeta} from '@homebase-id/common-app';
import Submenu from '../../components/SubMenu/SubMenu';
import {useParams} from 'react-router-dom';

import {NetworkVisibilitySettings} from './NetworkVisibilitySettings';
import {ReactionSettings} from './ReactionSettings';
import {SecuritySettings} from './SecuritySettings';
import {DeleteAccountSettings} from './DeleteAccountSettings';
import {Cog} from '@homebase-id/common-app/icons';
import React from "react";
import {VersionInfoSettings} from "./VersionInfoSettings";

const Settings = () => {
    const {sectionId} = useParams();
    return (
        <>
            <PageMeta icon={Cog} title={`${t('Settings')}`}/>
            <Submenu
                items={[
                    {
                        title: `Visibility of your network`,
                        path: `/owner/settings/privacy`,
                    },
                    {
                        title: `Ability to react on your public posts`,
                        path: `/owner/settings/reactions`,
                    },
                    {
                        title: `Security`,
                        path: `/owner/settings/security`,
                    },
                    {
                        title: `Version Info`,
                        path: `/owner/settings/version-info`,
                    },
                    {
                        title: `Delete account`,
                        path: `/owner/settings/delete`,
                    },
                ]}
                className="mb-4"
            />
            {(sectionId === 'privacy' || !sectionId) && <NetworkVisibilitySettings/>}
            {sectionId === 'reactions' && <ReactionSettings/>}
            {sectionId === 'security' && <SecuritySettings/>}
            {sectionId === 'version-info' && <VersionInfoSettings/>}
            {sectionId === 'delete' && <DeleteAccountSettings/>}
        </>
    );
};

export default Settings;
