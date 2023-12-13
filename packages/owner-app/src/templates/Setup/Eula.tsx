import { ActionButton, t } from '@youfoundation/common-app';
import { useEffect } from 'react';
import Checkbox from '../../components/Form/Checkbox';
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
      <p className="text-2xl">HOMEBASE FULL END-USER LICENSE AGREEMENT (EULA)</p>
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
        <small className="block text-sm">Version: October 15, 2023</small>
      </p>
      <p>Essential quick points of the EULA:</p>
      <ul className="list-outside list-disc pl-4">
        <li>
          <em className="font-medium not-italic">Free Use:</em> Individuals, educational
          institutions, and organizations with less than 50 members can use Homebase at no cost for
          managing their own personal or academic identities.
        </li>
        <li>
          <em className="font-medium not-italic">Data Ownership: </em>The data you create with
          Homebase belongs to you and only you.
        </li>
        <li>
          <em className="font-medium not-italic">No Lawsuits: </em>By using this software, you agree
          that you will not sue us or hold us responsible for any losses or damages that come from
          using Homebase.
        </li>
        <li>
          <em className="font-medium not-italic">Illegal Content: </em>You agree not to distribute
          content that is universally regarded as illegal and extremely harmful: child pornography,
          revenge porn, and snuff. Violating this provision will result in the immediate, permanent
          termination of your rights to use Homebase. In addition, you agree to pay a penalty of
          $1,000,000 USD to Homebase for each violation of this term.
        </li>
      </ul>
      <p>
        Some of the points listed above supplement the terms in the Additional Legal Details below.
        Such supplemental points provide additional information not covered in the Additional Legal
        Details but remain equally binding.
      </p>
      <p>
        If your identity is hosted by a hosting company, be sure to read their terms and conditions.{' '}
      </p>
      <p>
        Please refer to Homebase&quot;s Hosting User License Agreement (HULA) for your general
        rights when someone else is hosting your identity.
      </p>
      <p>
        Please refer to Homebase&quot;s Open-Source License Agreement (OSLA) if you wish to inspect,
        use, modify or distribute the source code.
      </p>
      <p className="text-xl">Additional Legal Details</p>
      <p>
        This End-User License Agreement (&quot;Agreement&quot;) is a legal agreement between you
        (&quot;User&quot; or &quot;You&quot;) and Homebase and its developers (&quot;Licensor&quot;,
        &quot;Us&quot;, or &quot;We&quot;) regarding your use of Homebase, a fully self-sovereign
        identity, secure communication, secure personal storage and social media application
        (&quot;Software&quot;).
      </p>
      <p className="text-xl">1. GRANT OF LICENSE</p>
      <p>
        Subject to the terms and conditions of this Agreement, the Licensor grants You a limited,
        non-exclusive, non-transferable, and non-sublicensable right to download, install, and use
        the Software on a computer, device, a cloud system, or other system owned or controlled by
        You.
      </p>
      <p className="text-xl">2. RESTRICTIONS</p>
      <p>
        You may not redistribute, sublicense, lease, sell, or rent the Software. You may not
        disassemble, decompile, reverse engineer, or attempt to discover any source code or
        underlying ideas or algorithms of the Software. You may not modify or create derivative
        works of the Software.
      </p>
      <p className="text-xl">3. NO LICENSOR CONTROL</p>
      <p>You acknowledge and agree that:</p>
      <ul className="list-outside list-disc pl-4">
        <li>
          The Software is decentralized and operates without oversight or control by the Licensor.
        </li>
        <li>
          You are solely responsible for how You use the Software and any content You access, share,
          or disseminate through it.
        </li>
        <li>
          The Licensor has no ability to access, view, control, restrict or retrieve User data or
          content within the Software.
        </li>
      </ul>
      <p className="text-xl">4. PRIVACY AND SECURITY</p>
      <p>
        The Software is designed to provide enhanced privacy and security to its users. The Licensor
        does not collect, store, or have access to any personal or private information or content
        you generate or share through the Software.
      </p>
      <p>You acknowledge and agree that:</p>
      <ul className="list-outside list-disc pl-4">
        <li>
          The privacy of storage and communication within the Software is a feature intended to
          enhance your personal security.
        </li>
        <li>
          You are solely responsible for the safekeeping and confidentiality of private keys,
          passwords, or any other authentication methods associated with your use of the Software.
        </li>
        <li>
          The Licensor is not responsible for any loss, damage, or unauthorized access resulting
          from your failure to securely manage and maintain your private keys, passwords, or other
          authentication credentials.
        </li>
        <li>
          If you lose your Homebase password and recovery-key, then your data is lost forever.
        </li>
      </ul>
      <p className="text-xl">5. FEES</p>
      <p>
        Individuals, educational institutions, and organizations with less than 50 members can use
        Homebase at no cost for managing their own personal or academic identities.
      </p>
      <p>
        Non-educational organizations with 50 members or more are required to pay an annual fee of
        $12 per member to Homebase. This fee helps support the maintenance and development of the
        non-profit open-source Homebase software. Failure to pay due fees will result in a doubling
        of the fees for each year they remain overdue.
      </p>
      <p className="text-xl">6. ALPHA STATE WARNING</p>
      <p>You acknowledge and agree that:</p>
      <ul className="list-outside list-disc pl-4">
        <li>
          The Software is in alpha state, which means it will contain errors, bugs, or issues that
          might lead to software crashes or data loss.
        </li>
        <li>The Software may not function as intended or might not function at all.</li>
        <li>It is crucial to regularly backup any data or content you deem important.</li>
      </ul>
      <p className="text-xl">7. LIMITATION OF LIABILITY</p>
      <p>
        The Licensor shall not be liable for any direct losses or damages arising from or related to
        Your use or inability to use the Software. This encompasses, without limitation:
      </p>
      <ul className="list-outside list-disc pl-4">
        <li>Damage to property or hardware.</li>
        <li>Loss of data.</li>
        <li>Work stoppage.</li>
        <li>Computer failure or malfunction.</li>
        <li>Claims by third parties.</li>
      </ul>
      <p>
        The Licensor shall also not be liable for any indirect, special, incidental, or
        consequential damages arising out of Your use or inability to use the Software, even if
        advised of the possibility of such damages. This encompasses, without limitation:
      </p>
      <ul className="list-outside list-disc pl-4">
        <li>Loss of goodwill.</li>
        <li>Loss of revenue or anticipated profits.</li>
        <li>Loss of business.</li>
        <li>Loss of opportunity or investment.</li>
        <li>Any and all other commercial damages or losses.</li>
      </ul>
      <p className="text-xl">8. FORBIDDEN USES</p>
      <p>
        Illegal Activities: You may not use the Software for any illegal or unauthorized activities.
        Examples of such activities include, but are not limited to:
      </p>
      <ul className="list-outside list-disc pl-4">
        <li>Fraud or financial crimes.</li>
        <li>Distribution or production of illicit drugs.</li>
        <li>Trafficking or promotion of illegal goods.</li>
        <li>Any other activities prohibited by applicable law.</li>
      </ul>
      <p>
        Violation of Third Party IPR: You are strictly prohibited from using the Software in a
        manner that infringes, violates, or misappropriates any third-party intellectual property
        rights, including but not limited to:
      </p>
      <ul className="list-outside list-disc pl-4">
        <li>Copyrights.</li>
        <li>Trademarks.</li>
        <li>Patents.</li>
        <li>Trade secrets.</li>
      </ul>

      <p className="text-xl">9. CRYPTOGRAPHIC NOTICE</p>
      <p>
        This distribution includes cryptographic software. The country in which you currently reside
        may have restrictions on the import, possession, use, and/or re-export to another country,
        of encryption software. BEFORE using any encryption software, please check your
        country&quot;s laws, regulations and policies concerning the import, possession, or use, and
        re-export of encryption software, to see if this is permitted. See http://www.wassenaar.org/
        for more information.
      </p>

      <p className="text-xl">10. INDEMNIFICATION</p>
      <p>
        You, the licensee, agree to indemnify, defend, and hold harmless the Licensor from and
        against any claims or damages arising from:
      </p>
      <ul className="list-outside list-disc pl-4">
        <li>Your use of and access to the Software.</li>
        <li>Your violation of any term of this Agreement.</li>
        <li>Any claim that Your use of the Software caused damage to a third party.</li>
      </ul>
      <p className="text-xl">11. DISCLAIMER OF WARRANTIES</p>
      <p>
        The Software is provided &quot;as is&quot; and &quot;as available&quot;, without warranty of
        any kind, express or implied, including but not limited to the warranties of
        merchantability, fitness for a particular purpose, or non-infringement.
      </p>
      <p className="text-xl">12. TERMINATION AND TRANSITION</p>
      <p>
        Your license to use the Software is effective until terminated. It will terminate
        automatically if you fail to comply with any of its terms. Additionally, the Licensor
        reserves the right to terminate this Agreement, with reasonable notice, upon the decision to
        conclude the Software&quot;s alpha phase.
      </p>
      <p>
        Should the Software transition to a subsequent phase, whether it be another trial, testing,
        or production stage, at the Licensor&quot;s full discretion, You may be offered a new
        license agreement on standard terms for that phase or version of the Software.
      </p>
      <p>
        Upon termination for any reason, you must immediately cease using the Software and delete
        all copies.
      </p>
      <p className="text-xl">13. INTELLECTUAL PROPERTY RIGHTS (IPR)</p>
      <p>You acknowledge and agree that:</p>
      <ul className="list-outside list-disc pl-4">
        <li>
          All intellectual property rights in and to the Software, including but not limited to
          patents, copyrights, trademarks, service marks, trade secrets, and any other proprietary
          rights, belong exclusively to the Licensor.
        </li>
        <li>The Licensor reserves all rights not expressly granted to You in this Agreement.</li>
        <li>
          The Software is licensed, not sold, to You. Your license confers no title to, or ownership
          in, the Software, and is not a sale of any rights in the Software.
        </li>
      </ul>
      <p className="text-xl">14. GOVERNING LAW</p>
      <p>
        This Agreement shall be governed by, and construed in accordance with, the laws of Denmark,
        without regard to its conflict of laws principles. The Parties agree that any disputes
        arising out of or in connection with this Agreement, including any question regarding its
        existence, validity, or termination, shall be subject to the exclusive jurisdiction of the
        courts of Denmark. Any and all legal proceeding shall be held in Danish.
      </p>
      <p className="text-lg">International Application</p>
      <p>
        The Parties agree that this Agreement applies internationally and that regardless of their
        place of residence, organization, or location of access to the Software, they will be
        subject to the laws and jurisdiction specified above.
      </p>
      <p>
        By using the Software, you explicitly and unconditionally consent to be governed by the laws
        and courts of Denmark, in Danish, regardless of your country of origin, language, residence,
        or location. If you do not agree with this clause, you are not permitted to use the
        Software.
      </p>
      <p className="text-xl">15. ENTIRE AGREEMENT</p>
      <p>
        This Agreement constitutes the entire agreement between the parties concerning the subject
        matter hereof and supersedes all prior and contemporaneous agreements and communications,
        whether oral or written.
      </p>
      <p>
        If any provision of this Agreement is found by a court of competent jurisdiction to be
        invalid, illegal, or unenforceable, that provision shall be limited or eliminated to the
        minimum extent necessary so that this Agreement shall otherwise remain in full force and
        effect and enforceable.
      </p>
      <p>
        By downloading, installing, or using the Software, you agree to be bound by the terms and
        conditions of this Agreement. If you do not agree to these terms, do not download, install,
        or use the Software.
      </p>
    </div>
  );
};
