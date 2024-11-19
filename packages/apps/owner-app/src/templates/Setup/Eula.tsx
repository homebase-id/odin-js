import { ActionButton, t, Checkbox } from '@homebase-id/common-app';
import { useEffect } from 'react';
import { useEula } from '../../hooks/eula/useEula';

export const Eula = ({ onConfirm }: { onConfirm: () => void }) => {
  const {
    isEulaSignatureRequired: { data: requiredVersion, isFetched: isEulaSignatureRequiredFetched },
    markEulaAsAccepted: { mutateAsync: doMarkEulaAsAccepted, status: markEulaAsAcceptedStatus },
  } = useEula();

  useEffect(() => {
    if (!requiredVersion && isEulaSignatureRequiredFetched) onConfirm();
  }, [requiredVersion]);

  if (!requiredVersion) return null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.reportValidity()) {
          await doMarkEulaAsAccepted(requiredVersion);

          onConfirm();
        }
      }}
    >
      <p className="text-2xl">RAVEN HOSTING FULL END-USER LICENSE AGREEMENT (EULA)</p>
      <div className="my-7 h-[50vh] overflow-auto">
        <EulaContents />
      </div>

      <div className="my-5 flex flex-row-reverse items-center gap-4">
        <label htmlFor="eula" className="mb-0">
          I have read and agree to the EULA
        </label>
        <Checkbox name="eula" id="eula" required={true} />
      </div>
      <div className="flex flex-row-reverse">
        <ActionButton state={markEulaAsAcceptedStatus}>{t('Confirm')}</ActionButton>
      </div>
    </form>
  );
};

const EulaContents = () => {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg">
        <small className="block text-sm">Version: 1.1 October 21, 2024</small>
      </p>

      <p>
        By using the Software hosted by Raven Hosting, you acknowledge that you have read,
        understood, and agreed to these Terms of Service.
      </p>
      <p className="text-xl">1. Introduction</p>
      <p>
        Welcome to Raven Hosting (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). These Terms
        of Service (&quot;Agreement&quot;) govern your use of the Homebase software applications
        (&quot;Software&quot;) hosted on our servers. The Software, licensed under the AGPLv3,
        includes a suite of self-sovereign identity tools, secure communication platforms, personal
        storage, and social media applications such as chat, photos, and feed apps.
      </p>
      <p>
        By accessing or using the Software on our servers, you (&quot;you&quot; or &quot;user&quot;)
        acknowledge that you have read, understood, and agree to be bound by this Agreement. If you
        do not agree with any part of these terms, you must not use the Software hosted by Raven
        Hosting.
      </p>
      <p className="text-xl">2. Grant of Service</p>
      <p>
        Subject to the terms and conditions of this Agreement, Raven Hosting grants you the right to
        access and use the Software on our servers for both commercial and non-commercial purposes,
        without any geographical limitations. This grant is contingent upon your compliance with all
        applicable laws and the restrictions outlined in Section 3.
      </p>
      <p>
        Please note that while the Software is licensed under the AGPLv3 and freely available, this
        Agreement governs your use of the Software specifically on Raven Hosting&apos;s servers.
      </p>
      <p className="text-xl">3. Restrictions and Forbidden Use</p>
      <p>
        You agree not to use the Software hosted by Raven Hosting for any illegal activities or any
        activities prohibited under this Agreement. Prohibited uses include, but are not limited to:
      </p>
      <p className="text-lg">Illegal Content and Activities:</p>
      <ul className="list-outside list-disc pl-4">
        <li>
          Storage, distribution, or solicitation of child pornography, revenge porn, snuff content,
          or any other illegal material.
        </li>
        <li>Committing or aiding in fraud, money laundering, or any financial crimes.</li>
        <li>
          Distribution, sale, or production of illicit or illegal drugs and trafficking or promotion
          of illegal goods.
        </li>
        <li>Supporting, promoting, or engaging in terrorist activities.</li>
        <li>
          Infringing upon third-party intellectual property rights, including copyrights,
          trademarks, patents, or trade secrets.
        </li>
        <li>Any other activities prohibited by applicable law.</li>
      </ul>
      <p className="text-lg">Prohibited Content Specific to Raven Hosting:</p>
      <ul className="list-outside list-disc pl-4">
        <li>Storage, sharing, or distribution of pornographic material of any kind.</li>
        <li>
          Any activities deemed inappropriate or not aligned with Raven Hosting&apos;s interests, at
          our sole discretion.
        </li>
      </ul>
      <p className="text-xl">4. Privacy and Security</p>
      <p>
        The Software is designed to enhance your privacy and security. Your data is stored on our
        servers and secured with zero-knowledge encryption, meaning we cannot decrypt or access your
        data. Please note that public content, such as posts made public, is not encrypted.
      </p>
      <p className="text-lg">Data Responsibility:</p>
      <p>
        We do not collect, store, or have access to any personal or private information or content
        that you generate or share using the Software.
      </p>
      <p className="text-lg">Authentication Credentials:</p>
      <p>
        You are solely responsible for safeguarding your private keys, passwords, and any other
        authentication methods associated with your use of the Software.
      </p>
      <p className="text-lg">Data Loss:</p>
      <p>
        If you lose your Homebase password and recovery key, your data and content will be
        irretrievable. We are not responsible for any loss resulting from your failure to securely
        manage your authentication credentials.
      </p>
      <p className="text-xl">5. Suspension of Service</p>
      <p>
        Raven Hosting reserves the right to suspend or restrict your access to the Software hosted
        on our servers if we reasonably believe that such action is necessary to:
      </p>
      <ul className="list-outside list-disc pl-4">
        <li>Investigate suspected violations of this Agreement or illegal activities.</li>
        <li>
          Comply with legal obligations or requests from law enforcement or other governmental
          entities.
        </li>
        <li>
          Protect the security, integrity, or functionality of our services and infrastructure.
        </li>
        <li>Prevent harm to us, our users, or the public.</li>
      </ul>
      <p>
        We will make reasonable efforts to notify you of any suspension or restriction unless
        prohibited by law or if providing notice could compromise an investigation.
      </p>
      <p className="text-xl">6. Disclaimer of Warranties and Limitation of Liability</p>
      <p className="text-lg">&quot;As Is&quot; Provision:</p>
      <p>
        The Software is provided &quot;as is&quot; and &quot;as available,&quot; without any
        warranties, express or implied, including but not limited to warranties of merchantability
        or fitness for a particular purpose.
      </p>
      <p className="text-lg">Alpha/Beta State Acknowledgment:</p>
      <p>
        You acknowledge that the Software is in an alpha or beta state and may contain errors or
        bugs that could lead to software crashes or data loss. Regular data backups are your
        responsibility.
      </p>
      <p className="text-lg">Limitation of Liability:</p>
      <p>
        To the fullest extent permitted by law, Raven Hosting shall not be liable for any direct,
        indirect, incidental, special, or consequential damages arising from your use or inability
        to use the Software hosted on our servers.
      </p>
      <p className="text-lg">Maximum Liability:</p>
      <p>
        In no event shall Raven Hosting&apos;s total liability exceed the amount you have paid for
        the use of the Software in the twelve (12) months preceding the claim.
      </p>
      <p className="text-xl">7. Cryptographic Notice</p>
      <p>
        The Software includes cryptographic features. The use, import, or export of encryption
        software may be regulated or prohibited in your country or jurisdiction. Before using the
        Software, you are responsible for complying with any laws and regulations concerning
        encryption software. Raven Hosting is not liable for any legal consequences arising from
        your use of the Software&apos;s cryptographic features.
      </p>
      <p className="text-xl">8. Indemnification</p>
      <p>
        You agree to indemnify, defend, and hold harmless Raven Hosting and its affiliates from any
        claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising
        from:
      </p>
      <ul className="list-outside list-disc pl-4">
        <li>Your unauthorized or prohibited use of the Software hosted on our servers.</li>
        <li>Your breach of any term of this Agreement.</li>
        <li>Any claim that your use of the Software has directly caused harm to a third party.</li>
      </ul>
      <p>
        We will provide you with prompt written notice of any such claim and cooperate with you, at
        your expense, in the defense of such matters. You will have control over the defense or
        settlement of any claim, subject to our reasonable approval.
      </p>
      <p className="text-xl">9. Termination</p>
      <p className="text-lg">9.1 Duration and Termination</p>
      <p>
        This Agreement commences upon your acceptance and remains in effect until terminated as
        outlined in this section.
      </p>
      <p className="text-lg">9.2 Termination by Raven Hosting</p>
      <p>
        We reserve the right to terminate this Agreement and your access to the Software hosted on
        our servers under the following conditions:
      </p>
      <ul className="list-outside list-disc pl-4">
        <li>
          <strong>Immediate Termination for Breach:</strong> If you violate any terms of this
          Agreement, your rights under this Agreement will terminate immediately without notice. You
          must cease using the Software hosted by Raven Hosting.
        </li>
        <li>
          <strong>Conclusion of Beta Phase:</strong> We may terminate this Agreement upon reasonable
          notice if we decide to conclude the Software&apos;s alpha or beta phase. If the Software
          transitions to a new phase, you may be offered a new license agreement applicable to that
          phase.
        </li>
        <li>
          <strong>End of License Period:</strong> If applicable, we may terminate this Agreement at
          the end of a current license period by providing you with reasonable prior notice.
        </li>
      </ul>
      <p className="text-lg">9.3 Obligations Upon Termination</p>
      <p>
        Upon termination, you must immediately cease all use of the Software hosted on our servers.
        Any ongoing obligations under this Agreement will continue to apply to you.
      </p>
      <p className="text-lg">9.4 Survival of Terms</p>
      <p>
        Termination does not affect any rights or obligations accrued prior to the termination date.
        Provisions concerning limitations of liability, indemnification, and governing law shall
        survive termination.
      </p>
      <p className="text-xl">10. Miscellaneous</p>
      <p className="text-lg">10.1 Entire Agreement</p>
      <p>
        This Agreement constitutes the entire agreement between you and Raven Hosting regarding the
        use of the Software hosted on our servers and supersedes all prior agreements or
        understandings.
      </p>
      <p className="text-lg">10.2 Severability</p>
      <p>
        If any provision of this Agreement is found to be invalid or unenforceable, that provision
        will be enforced to the maximum extent permissible, and the remaining provisions will remain
        in full force and effect.
      </p>
      <p className="text-lg">10.3 Headings</p>
      <p>
        Headings are for reference purposes only and do not limit the scope or extent of any
        section.
      </p>
      <p className="text-lg">10.4 Waiver</p>
      <p>
        Our failure to enforce any right or provision of this Agreement will not constitute a waiver
        of such right or provision unless acknowledged and agreed to by us in writing.
      </p>
      <p className="text-lg">10.5 Notices</p>
      <p>
        All notices under this Agreement shall be made by email or other communication channels
        specified by Raven Hosting. It is your responsibility to provide us with your current
        contact information and to update us promptly if it changes. Notices will be deemed given
        when sent to the most recent contact information you have provided
      </p>
    </div>
  );
};
