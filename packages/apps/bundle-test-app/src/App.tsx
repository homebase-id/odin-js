import { useEffect, useMemo, useState } from 'react';
import {
  BundleTokenClient,
  createEccPair,
  exportBundlePublicKey,
  finalizeBundleAuthentication,
  getBundleAuthorizeUrl,
  getV2AuthContext,
  logoutBundleToken,
  RedactedOdinContextV2,
  withV2Errors,
} from '@homebase-id/js-lib/auth';
import { buildManifest, PRIMARY_APP, SAMPLE_APPS } from './sampleApps';

// ---------------------------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------------------------

const KEY = {
  identity: 'bundle-test:identity',
  selected: 'bundle-test:selected-apps',
  privateKey: 'bundle-test:private-key',
  state: 'bundle-test:state',
  token: 'bundle-test:token',
};

interface StoredToken {
  identity: string;
  clientAuthToken: string;
  sharedSecret: string;
  obtainedAt: number;
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

const ECDH = { name: 'ECDH', namedCurve: 'P-384' };

const bytesToBase64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const base64ToBytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

const savePrivateKey = async (key: CryptoKey) =>
  localStorage.setItem(KEY.privateKey, bytesToBase64(await crypto.subtle.exportKey('pkcs8', key)));

const loadPrivateKey = async () => {
  const stored = localStorage.getItem(KEY.privateKey);
  if (!stored) return undefined;
  return crypto.subtle.importKey('pkcs8', base64ToBytes(stored), ECDH, true, ['deriveKey', 'deriveBits']);
};

const normalizeIdentity = (value: string) =>
  value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();

/** The token id: the first 16 bytes of the portable token, as a .NET Guid (mixed endian). */
const tokenIdOf = (clientAuthToken: string) => {
  const bytes = base64ToBytes(clientAuthToken);
  if (bytes.length < 16) return '?';
  const hex = (b: number[]) => b.map((x) => x.toString(16).padStart(2, '0')).join('');
  const a = Array.from(bytes.slice(0, 16));
  return [
    hex(a.slice(0, 4).reverse()),
    hex(a.slice(4, 6).reverse()),
    hex(a.slice(6, 8).reverse()),
    hex(a.slice(8, 10)),
    hex(a.slice(10, 16)),
  ].join('-');
};

const describeError = (error: unknown) => {
  if (error instanceof Error) {
    const extra = (error as { status?: number; errorCode?: string; data?: unknown });
    return JSON.stringify(
      { message: error.message, status: extra.status, errorCode: extra.errorCode, data: extra.data },
      null,
      2
    );
  }
  return String(error);
};

// ---------------------------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------------------------

let handledRedirect = false;

export const App = () => {
  const [identity, setIdentity] = useState(() => localStorage.getItem(KEY.identity) ?? '');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>(() =>
    readJson(KEY.selected, SAMPLE_APPS.map((a) => a.appId))
  );
  const [token, setToken] = useState<StoredToken | undefined>(() => readJson(KEY.token, undefined));
  const [friendlyName, setFriendlyName] = useState('Bundle test app');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | undefined>();
  const [actingAppId, setActingAppId] = useState('');
  const [result, setResult] = useState<{ title: string; ok: boolean; body: string } | undefined>();
  const [context, setContext] = useState<RedactedOdinContextV2 | undefined>();
  const [busy, setBusy] = useState(false);

  const origin = window.location.origin;
  const host = window.location.host;

  useEffect(() => localStorage.setItem(KEY.identity, identity), [identity]);

  // Handle the return from the owner console: /finalize (token or ?error=).
  useEffect(() => {
    // StrictMode runs effects twice in development; the exchange must only happen once.
    if (handledRedirect) return;
    handledRedirect = true;

    const params = new URLSearchParams(window.location.search);
    const clearUrl = () => window.history.replaceState({}, '', '/');

    if (window.location.pathname.startsWith('/finalize')) {
      const expectedState = localStorage.getItem(KEY.state);
      const state = params.get('state');
      const error = params.get('error');

      if (!expectedState || state !== expectedState) {
        setNotice({ ok: false, text: `State mismatch (got "${state}", expected "${expectedState}"). Ignoring this redirect.` });
        clearUrl();
        return;
      }
      localStorage.removeItem(KEY.state);

      if (error) {
        setNotice({ ok: false, text: `Bundle sign-in was not completed: ${error}` });
        localStorage.removeItem(KEY.privateKey);
        clearUrl();
        return;
      }

      const returnedIdentity = params.get('identity') ?? '';
      const publicKey = params.get('public_key') ?? '';
      const salt = params.get('salt') ?? '';

      (async () => {
        try {
          const privateKey = await loadPrivateKey();
          if (!privateKey) throw new Error('No private key stored; press Connect again.');
          const tokenIdentity = normalizeIdentity(returnedIdentity || identity);
          const credentials = await finalizeBundleAuthentication(tokenIdentity, privateKey, publicKey, salt);
          const stored: StoredToken = { identity: tokenIdentity, ...credentials, obtainedAt: Date.now() };
          writeJson(KEY.token, stored);
          setToken(stored);
          setNotice({ ok: true, text: `Got a bundle token for ${tokenIdentity}.` });
        } catch (e) {
          setNotice({ ok: false, text: `Finalize failed: ${describeError(e)}` });
        } finally {
          localStorage.removeItem(KEY.privateKey);
          clearUrl();
        }
      })();
      return;
    }

    if (params.get('error')) {
      setNotice({ ok: false, text: `Owner console returned: ${params.get('error')}` });
      clearUrl();
    }
  }, []);

  const cleanIdentity = normalizeIdentity(identity);

  const client = useMemo(
    () =>
      token
        ? new BundleTokenClient({
            hostIdentity: token.identity,
            clientAuthToken: token.clientAuthToken,
            sharedSecret: token.sharedSecret,
            actingAppId: actingAppId || undefined,
          })
        : undefined,
    [token, actingAppId]
  );

  const isSelected = (appId: string) => appId === PRIMARY_APP.appId || selectedAppIds.includes(appId);

  const toggleApp = (appId: string) => {
    if (appId === PRIMARY_APP.appId) return;
    const next = selectedAppIds.includes(appId)
      ? selectedAppIds.filter((id) => id !== appId)
      : [...selectedAppIds, appId];
    writeJson(KEY.selected, next);
    setSelectedAppIds(next);
  };

  const startBundle = async () => {
    if (!cleanIdentity) return;
    const pair = await createEccPair();
    await savePrivateKey(pair.privateKey);
    const state = crypto.randomUUID();
    localStorage.setItem(KEY.state, state);

    window.location.href = getBundleAuthorizeUrl(cleanIdentity, {
      primaryAppId: PRIMARY_APP.appId,
      // Every selected app with its manifest: new ones are installed, changed ones updated.
      apps: SAMPLE_APPS.filter((a) => isSelected(a.appId)).map((a) => ({
        appId: a.appId,
        manifest: buildManifest(a, host),
      })),
      friendlyName: friendlyName || 'Bundle test app',
      publicKey: await exportBundlePublicKey(pair.publicKey),
      redirectUri: `${origin}/finalize`,
      state,
    });
  };

  const run = async (title: string, call: () => Promise<unknown>) => {
    setBusy(true);
    try {
      const data = await call();
      setResult({ title, ok: true, body: JSON.stringify(data ?? null, null, 2) });
    } catch (e) {
      setResult({ title, ok: false, body: describeError(e) });
    } finally {
      setBusy(false);
    }
  };

  const loadContext = () =>
    client &&
    run(`GET /api/v2/auth/context (acting as ${actingName(actingAppId)})`, async () => {
      const ctx = await getV2AuthContext<RedactedOdinContextV2>(client);
      setContext(ctx);
      return ctx;
    });

  // Drives are addressed by slug. File operations on your own identity have no slug routes yet
  // (docs/slug-addressing-endpoint-map.csv: /apps/{appSlug}/drives/{driveSlug}/files/... is NOT BUILT),
  // so the slug is resolved first and the file query goes to the drive it names.
  const listAppDrives = (appId: string) => {
    const app = SAMPLE_APPS.find((a) => a.appId === appId);
    if (!client || !app) return;
    return run(`GET /api/v2/apps/${app.appSlug}/drives (acting as ${actingName(actingAppId)})`, () =>
      withV2Errors(client, async () => {
        const response = await client.createAxiosClient().get(`/apps/${app.appSlug}/drives`);
        return response.data;
      })
    );
  };

  const queryDrive = (appId: string) => {
    const app = SAMPLE_APPS.find((a) => a.appId === appId);
    if (!client || !app) return;
    const address = `/apps/${app.appSlug}/drives/${app.drive.driveSlug}`;
    return run(`${address} → query-batch (acting as ${actingName(actingAppId)})`, () =>
      withV2Errors(client, async () => {
        const axios = client.createAxiosClient();
        const drive = (await axios.get(address)).data as { targetDrive: { alias: string; type: string } };
        const query = await axios.post(`/drives/${drive.targetDrive.alias}/files/query-batch`, {
          queryParams: {},
          resultOptionsRequest: { maxRecords: 10, includeMetadataHeader: true },
        });
        return {
          [`GET /api/v2${address}`]: drive,
          [`POST /api/v2/drives/${drive.targetDrive.alias}/files/query-batch`]: query.data,
        };
      })
    );
  };

  const logout = async () => {
    if (client) {
      await run('DELETE /api/v2/bundle-tokens/current', () => logoutBundleToken(client));
    }
    localStorage.removeItem(KEY.token);
    setToken(undefined);
    setContext(undefined);
  };

  const resetAll = () => {
    Object.values(KEY).forEach((key) => localStorage.removeItem(key));
    setSelectedAppIds(SAMPLE_APPS.map((a) => a.appId));
    setToken(undefined);
    setContext(undefined);
    setResult(undefined);
    setNotice(undefined);
  };

  return (
    <>
      <h1>Bundle token test app</h1>
      <p className="muted">
        Sends the selected demo apps, each with its manifest, in one request to{' '}
        <code>/owner/bundle-tokens/authorize#p=</code>: the owner installs/updates them and gets one bundle token for
        all of them in a single consent. This app runs at <code>{origin}</code>; the primary app&apos;s
        corsHostName is <code>{host}</code>.
      </p>

      {notice ? <p className={notice.ok ? 'ok' : 'err'} style={{ whiteSpace: 'pre-wrap' }}>{notice.text}</p> : null}

      <section>
        <h2>Identity</h2>
        <input
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          placeholder="frodo.dotyou.cloud"
          size={40}
        />{' '}
        {cleanIdentity ? (
          <a href={`https://${cleanIdentity}/owner/apps-v2`} target="_blank" rel="noreferrer">
            owner console: apps-v2
          </a>
        ) : null}
      </section>

      <section>
        <h2>Step 1: Connect</h2>
        <table>
          <tbody>
            {SAMPLE_APPS.map((app) => (
              <tr key={app.appId}>
                <td>
                  <input
                    type="checkbox"
                    checked={isSelected(app.appId)}
                    disabled={app.isPrimary}
                    onChange={() => toggleApp(app.appId)}
                    id={`app-${app.key}`}
                  />
                </td>
                <td>
                  <label htmlFor={`app-${app.key}`}>
                    {app.emoji} <strong>{app.name}</strong> {app.isPrimary ? '(primary)' : ''}
                  </label>
                  <div className="muted">
                    <code>/apps/{app.appSlug}</code> · <code>{app.appId}</code>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <label>
            Friendly name: <input value={friendlyName} onChange={(e) => setFriendlyName(e.target.value)} size={30} />
          </label>{' '}
          <button disabled={!cleanIdentity} onClick={startBundle}>
            Connect
          </button>
        </p>
        <p className="muted">
          Redirects to <code>https://{cleanIdentity || '{identity}'}/owner/bundle-tokens/authorize#p=…</code> with the
          selected apps&apos; manifests and <code>redirectUri={origin}/finalize</code>. The owner may untick apps
          (never the primary).
        </p>
      </section>

      <section>
        <h2>Step 2: Token</h2>
        {token ? (
          <table>
            <tbody>
              <tr>
                <th>Identity</th>
                <td>{token.identity}</td>
              </tr>
              <tr>
                <th>Token id</th>
                <td>
                  <code>{tokenIdOf(token.clientAuthToken)}</code>
                </td>
              </tr>
              <tr>
                <th>Obtained</th>
                <td>{new Date(token.obtainedAt).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="muted">No token yet.</p>
        )}
      </section>

      <section>
        <h2>Step 3: Try it</h2>
        {client ? (
          <>
            <label>
              Acting app (<code>X-ODIN-APP-ID</code>):{' '}
              <select value={actingAppId} onChange={(e) => setActingAppId(e.target.value)}>
                <option value="">(no header: primary app)</option>
                {SAMPLE_APPS.map((app) => (
                  <option value={app.appId} key={app.appId}>
                    {app.name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ marginTop: '0.5rem' }}>
              <button disabled={busy} onClick={loadContext}>
                GET /api/v2/auth/context
              </button>
              {SAMPLE_APPS.map((app) => (
                <span key={app.appId}>
                  <button disabled={busy} onClick={() => listAppDrives(app.appId)}>
                    List /apps/{app.appSlug}/drives
                  </button>
                  <button disabled={busy} onClick={() => queryDrive(app.appId)}>
                    Query /apps/{app.appSlug}/drives/{app.drive.driveSlug}
                  </button>
                </span>
              ))}
              <button disabled={busy} onClick={logout}>
                Log out
              </button>
            </div>
            {context ? <ContextSummary context={context} /> : null}
          </>
        ) : (
          <p className="muted">Get a token first.</p>
        )}
        {result ? (
          <>
            <h3 className={result.ok ? 'ok' : 'err'}>{result.title}</h3>
            <pre>{result.body}</pre>
          </>
        ) : null}
      </section>

      <p>
        <button onClick={resetAll}>Reset this test app (clears local storage only)</button>
      </p>
    </>
  );
};

const actingName = (appId: string) =>
  appId ? SAMPLE_APPS.find((a) => a.appId === appId)?.name ?? appId : `primary (${PRIMARY_APP.name})`;

/** The drive grants in the context, labelled with the demo app whose drive it is. */
const ContextSummary = ({ context }: { context: RedactedOdinContextV2 }) => {
  const grants = (context.permissionContext?.permissionGroups ?? []).flatMap((group) => group.driveGrants ?? []);
  const keys = Array.from(
    new Set((context.permissionContext?.permissionGroups ?? []).flatMap((group) => group.permissionSet?.keys ?? []))
  );
  const nameOf = (alias: string) =>
    SAMPLE_APPS.find((a) => a.drive.alias.replace(/-/g, '') === alias.replace(/-/g, '').toLowerCase())?.name;

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <strong>Caller:</strong> <code>{String(context.caller?.odinId ?? '?')}</code> · security level{' '}
      <code>{String(context.caller?.securityLevel ?? '?')}</code>
      <table style={{ marginTop: '0.5rem' }}>
        <thead>
          <tr>
            <th>Drive</th>
            <th>Permission</th>
            <th>Storage key</th>
          </tr>
        </thead>
        <tbody>
          {grants.map((grant, index) => (
            <tr key={index}>
              <td>
                {nameOf(grant.permissionedDrive.drive.alias) ? (
                  <strong>{nameOf(grant.permissionedDrive.drive.alias)}</strong>
                ) : (
                  <code>{grant.permissionedDrive.drive.alias}</code>
                )}
              </td>
              <td>{String(grant.permissionedDrive.permission)}</td>
              <td>{grant.hasStorageKey ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <strong>Permission keys:</strong> {keys.length ? keys.join(', ') : 'none'}
      </div>
    </div>
  );
};
