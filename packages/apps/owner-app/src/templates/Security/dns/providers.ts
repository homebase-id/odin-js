import { useState } from 'react';

// Where the owner adds the records. Plain data on purpose: third-party UIs change, so this
// stays easy to patch. Facts checked against each provider's docs (Oct 2026); every one of
// them takes the host relative to the zone ("@", "www", "_dmarc"), so no per-provider host
// formatting is needed.
export interface DnsProvider {
  id: string;
  name: string;
  dnsUrl?: string;
  // Can a BIND zone file be uploaded in the web UI? Decides whether the download is the
  // primary action or the fallback.
  supportsZoneImport: boolean;
  steps: string[];
  // Where the DS record goes, for the DNSSEC block
  dsHint: string;
  // Where to switch a registered domain to custom nameservers; absent = generic wording
  nameserverHint?: string;
}

export const DNS_PROVIDERS: DnsProvider[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    dnsUrl: 'https://dash.cloudflare.com/?to=/:account/:zone/dns/records',
    supportsZoneImport: true,
    steps: [
      'Open your domain, then DNS > Records.',
      'Fastest: Import and Export > Import DNS records, and upload the zone file below.',
      'Or click Add record for each record below.',
      'Set Proxy status to "DNS only" (grey cloud) on every record.',
    ],
    dsHint:
      'If Cloudflare is your registrar, the DS record is added automatically once DNSSEC is enabled. Otherwise add it at your registrar.',
    nameserverHint:
      'Cloudflare Registrar does not allow custom nameservers, so a domain registered there cannot be delegated to Homebase. Add the records instead, or transfer the domain to another registrar.',
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    dnsUrl: 'https://ap.www.namecheap.com/domains/list/',
    supportsZoneImport: false,
    steps: [
      'Domain List > Manage next to your domain > Advanced DNS.',
      'Under Host Records, click Add New Record for each record below.',
      'Paste the Host (use "@" for the root domain) and the Value, then save with the checkmark.',
    ],
    dsHint:
      'Domain List > Manage > Advanced DNS > DNSSEC (shown when using custom nameservers): enter Key Tag, Algorithm, Digest Type and Digest.',
    nameserverHint: 'Domain List > Manage next to your domain > Nameservers > Custom DNS.',
  },
  {
    id: 'godaddy',
    name: 'GoDaddy',
    dnsUrl: 'https://dcc.godaddy.com/control/portfolio',
    supportsZoneImport: true,
    steps: [
      'Open your domain, then DNS.',
      'Fastest: Actions > Import Zone File, and upload the zone file below.',
      'Or click Add New Record for each record below ("@" is the root domain).',
    ],
    dsHint: 'Domain > DNS > DNSSEC > DS Records (shown when not using GoDaddy nameservers).',
    nameserverHint:
      "Open your domain, then DNS > Nameservers > Change Nameservers > I'll use my own nameservers.",
  },
  {
    id: 'porkbun',
    name: 'Porkbun',
    dnsUrl: 'https://porkbun.com/account/domainsSpeedy',
    supportsZoneImport: false,
    steps: [
      'Domain Management > DNS next to your domain.',
      'Add each record below. Leave Host empty for the root domain ("@").',
    ],
    dsHint: 'Domain Management > Details > DNSSEC > Add: enter the four DS fields.',
    nameserverHint: 'Domain Management > Details > Authoritative Nameservers > Edit.',
  },
  {
    id: 'squarespace',
    name: 'Squarespace',
    dnsUrl: 'https://account.squarespace.com/domains',
    supportsZoneImport: false,
    steps: [
      'Domains > your domain > DNS > DNS Settings.',
      'Under Custom Records, click Add record for each record below ("@" is the root domain).',
    ],
    dsHint: 'DNS > DNSSEC (only with custom nameservers): add the DS record fields.',
    nameserverHint: 'Domains > your domain > DNS > Domain nameservers > Use custom nameservers.',
  },
  {
    id: 'route53',
    name: 'Route 53',
    dnsUrl: 'https://console.aws.amazon.com/route53/v2/hostedzones',
    supportsZoneImport: true,
    steps: [
      'Hosted zones > open your zone.',
      'Fastest: Import zone file, and paste the zone file below.',
      'Or Create record for each record below. Leave the name empty for the root domain ("@").',
    ],
    dsHint:
      'Registered domains > your domain > DNSSEC keys > Add. For a subdomain, add a DS record in the parent hosted zone.',
    nameserverHint: 'Registered domains > your domain > Actions > Edit name servers.',
  },
  {
    id: 'hetzner',
    name: 'Hetzner',
    dnsUrl: 'https://console.hetzner.cloud/',
    supportsZoneImport: true,
    steps: [
      'Cloud Console > DNS > Zones.',
      'Fastest: import the zone file below when adding the zone.',
      'Or open the zone and add each record below.',
    ],
    dsHint: 'Add the DS record at the registrar where your domain is registered.',
  },
  {
    id: 'ovh',
    name: 'OVHcloud',
    dnsUrl: 'https://www.ovh.com/manager/#/web/domain',
    supportsZoneImport: true,
    steps: [
      'Domain names > your domain > DNS zone.',
      'Fastest: Edit in text mode, and paste the zone file below.',
      'Or Add an entry for each record below.',
    ],
    // ponytail: OVH asks for the DNSKEY public key, which the health check does not return
    dsHint:
      'Domain > DS records (with external nameservers). OVH asks for the public key rather than the digest - copy it from your DNS host.',
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    dnsUrl: 'https://cloud.digitalocean.com/networking/domains',
    supportsZoneImport: false,
    steps: [
      'Networking > Domains > your domain.',
      'Add each record below. Use "@" for the root domain.',
    ],
    dsHint: 'DigitalOcean DNS does not support DNSSEC.',
  },
  {
    id: 'other',
    name: 'Other',
    supportsZoneImport: false,
    steps: [
      'Open the DNS settings at your registrar or DNS host.',
      'Add each record below. "@" means the root domain. If it offers a zone file import, use the zone file below.',
    ],
    dsHint: 'Registrars usually have a separate DNSSEC section where the DS record is entered.',
  },
];

const STORAGE_KEY = 'dns-provider';
// Generic steps suit anyone who has not picked yet, better than whichever provider is listed first
const FALLBACK_ID = 'other';
const otherProvider = DNS_PROVIDERS.find((p) => p.id === FALLBACK_ID) as DnsProvider;

// The chosen provider, remembered per browser - a convenience, so storage failing is fine
export const useDnsProvider = () => {
  const [id, setId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || FALLBACK_ID;
    } catch {
      return FALLBACK_ID;
    }
  });
  const select = (next: string) => {
    setId(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable: the choice just isn't remembered
    }
  };
  const provider = DNS_PROVIDERS.find((p) => p.id === id) ?? otherProvider;
  return { provider, select };
};
