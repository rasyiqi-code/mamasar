import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

function isPrivateIpv4(addr: string): boolean {
  const parts = addr.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (AWS metadata & CGN)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  return false;
}

function isPrivateIpv6(addr: string): boolean {
  const low = addr.toLowerCase();
  if (low === '::1' || low === '::') return true; // loopback / unspecified
  if (low.startsWith('fc') || low.startsWith('fd')) return true; // fc00::/7 unique-local
  if (low.startsWith('fe8') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb')) return true; // fe80::/10 link-local
  if (low.startsWith('::ffff:') && isPrivateIpv4(low.slice(7))) return true; // IPv4-mapped
  return false;
}

function isReservedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === 'localhost.localdomain' || h === '0.0.0.0') return true;
  return h.endsWith('.localhost') || h.endsWith('.local');
}

/**
 * Prevent SSRF: only allow http/https URL toward public internet hosts.
 * Rejects private/loopback/link-local IP literals and resolves
 * DNS to reject hosts that resolve to private ranges (e.g. 169.254.169.254).
 */
export async function isSafeOutboundUrl(urlString: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const hostname = url.hostname;
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) return !isPrivateIpv4(hostname) && hostname !== '0.0.0.0';
  if (ipVersion === 6) return !isPrivateIpv6(hostname);

  if (isReservedHostname(hostname)) return false;

  try {
    const { address } = await lookup(hostname, { family: 0, verbatim: true });
    const version = isIP(address);
    if (version === 4) return !isPrivateIpv4(address);
    if (version === 6) return !isPrivateIpv6(address);
    return false;
  } catch {
    return false;
  }
}
