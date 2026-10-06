import { useState } from 'react';

// Where the owner adds the records. Plain data on purpose: third-party UIs change, so this
// stays easy to patch. Facts checked against each provider's docs (Oct 2026); every one of
// them takes the host relative to the zone ("@", "www", "_dmarc"), so no per-provider host
// formatting is needed.
export interface DnsProvider {
  id: string;
  name: string;
  dnsUrl?: string;
  // Can a BIND zone file be imported in the web UI? `addsRecords`: it imports into a zone
  // that already has records, adding to them - so the file carries only what is missing,
  // since Route 53 and GoDaddy reject the whole import if any record already exists.
  // Without it the import only suits a new zone; an existing one gets the records by hand.
  zoneImport?: { step: string; addsRecords: boolean };
  // Adding the records by hand. The import step, when the download is offered, goes in
  // after the first step.
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
    zoneImport: {
      step: 'Fastest: Import and Export > Import DNS records, and upload the zone file below.',
      addsRecords: true,
    },
    steps: [
      'Open your domain, then DNS > Records.',
      'Click Add record for each record below.',
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
    zoneImport: {
      step: 'Fastest: Actions > Import Zone File, and upload the zone file below.',
      addsRecords: true,
    },
    steps: [
      'Open your domain, then DNS.',
      'Click Add New Record for each record below ("@" is the root domain).',
    ],
    dsHint: 'Domain > DNS > DNSSEC > DS Records (shown when not using GoDaddy nameservers).',
    nameserverHint:
      "Open your domain, then DNS > Nameservers > Change Nameservers > I'll use my own nameservers.",
  },
  {
    id: 'porkbun',
    name: 'Porkbun',
    dnsUrl: 'https://porkbun.com/account/domainsSpeedy',
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
    zoneImport: {
      step: 'Fastest: Import zone file, and paste the zone file below.',
      addsRecords: true,
    },
    steps: [
      'Hosted zones > open your zone.',
      'Create record for each record below. Leave the name empty for the root domain ("@").',
    ],
    dsHint:
      'Registered domains > your domain > DNSSEC keys > Add. For a subdomain, add a DS record in the parent hosted zone.',
    nameserverHint: 'Registered domains > your domain > Actions > Edit name servers.',
  },
  {
    id: 'hetzner',
    name: 'Hetzner',
    dnsUrl: 'https://console.hetzner.cloud/',
    // ponytail: import documented only when creating a zone; switch addsRecords on if an
    // existing-zone import that keeps current records turns up
    zoneImport: {
      step: 'Fastest: import the zone file below when adding the zone.',
      addsRecords: false,
    },
    steps: ['Cloud Console > DNS > Zones.', 'Open the zone and add each record below.'],
    dsHint: 'Add the DS record at the registrar where your domain is registered.',
  },
  {
    id: 'ovh',
    name: 'OVHcloud',
    dnsUrl: 'https://www.ovh.com/manager/#/web/domain',
    // Text mode is the whole zone: pasting over it would delete every other record
    zoneImport: {
      step: 'Fastest: Edit in text mode, add the record lines from the zone file below at the end (not the $ORIGIN and $TTL lines), and save.',
      addsRecords: true,
    },
    steps: ['Domain names > your domain > DNS zone.', 'Add an entry for each record below.'],
    // ponytail: OVH asks for the DNSKEY public key, which the health check does not return
    dsHint:
      'Domain > DS records (with external nameservers). OVH asks for the public key rather than the digest - copy it from your DNS host.',
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    dnsUrl: 'https://cloud.digitalocean.com/networking/domains',
    steps: [
      'Networking > Domains > your domain.',
      'Add each record below. Use "@" for the root domain.',
    ],
    dsHint: 'DigitalOcean DNS does not support DNSSEC.',
  },
  {
    id: 'other',
    name: 'Other',
    steps: [
      'Open the DNS settings at your registrar or DNS host.',
      'Add each record below. "@" means the root domain.',
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
