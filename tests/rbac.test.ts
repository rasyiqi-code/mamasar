import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  can,
  isMWCNU,
  isMerchant,
  isPCNU,
  isRanting,
} from '../src/lib/modules/auth.ts';
import type { User } from '../src/lib/modules/types.ts';

function makeUser(overrides: Partial<User>): User {
  return {
    id: 1,
    google_id: 'g-1',
    email: 'user@example.com',
    name: 'Test User',
    avatar_url: undefined,
    role: 'warga',
    agent_status: 'none',
    assigned_zone_id: undefined,
    agent_org: undefined,
    agent_phone: undefined,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('RBAC role helpers', () => {
  it('recognizes pcnu, mwcnu, ranting, and warga roles correctly', () => {
    const pcnu = makeUser({ role: 'pcnu' });
    const mwcnu = makeUser({ role: 'mwcnu', assigned_zone_id: 5 });
    const ranting = makeUser({ role: 'ranting', assigned_zone_id: 5 });
    const warga = makeUser({ role: 'warga' });
    const merchant = { ...warga, umkm: { id: 10 } };

    assert.equal(isPCNU(pcnu), true);
    assert.equal(isMWCNU(mwcnu), true);
    assert.equal(isRanting(ranting), true);
    assert.equal(isMerchant(warga), false);
    assert.equal(isMerchant(merchant), true);
    assert.equal(isPCNU(null), false);
    assert.equal(isMWCNU(warga), false);
  });
});

describe('can() RBAC and zone isolation matrix', () => {
  const pcnu = makeUser({ id: 1, role: 'pcnu' });
  const mwcnuZone5 = makeUser({ id: 2, role: 'mwcnu', assigned_zone_id: 5 });
  const rantingZone5 = makeUser({ id: 3, role: 'ranting', assigned_zone_id: 5 });
  const warga = { ...makeUser({ id: 4, role: 'warga' }), umkm: { id: 10 } };

  it('denies all privileged permissions to null or warga users while allowing own-store product creation', () => {
    assert.equal(can(null, 'admin:access'), false);
    assert.equal(can(null, 'product:create'), false);
    assert.equal(can(warga, 'admin:access'), false);
    assert.equal(can(warga, 'umkm:verify', { zoneId: 5 }), false);
    assert.equal(can(warga, 'events:manage', { zoneId: 5 }), false);
    assert.equal(can(warga, 'zones:manage'), false);
    assert.equal(can(warga, 'users:manage'), false);
    assert.equal(can(warga, 'product:create', { umkmId: 10 }), true);
    assert.equal(can(warga, 'product:create', { umkmId: 99 }), false);
  });

  it('grants pcnu full access across all zones', () => {
    assert.equal(can(pcnu, 'admin:access'), true);
    assert.equal(can(pcnu, 'zones:manage'), true);
    assert.equal(can(pcnu, 'users:manage'), true);
    assert.equal(can(pcnu, 'articles:manage'), true);
    assert.equal(can(pcnu, 'umkm:delete'), true);
    assert.equal(can(pcnu, 'umkm:verify', { zoneId: 12 }), true);
    assert.equal(can(pcnu, 'promotion:review', { zoneId: 12 }), true);
    assert.equal(can(pcnu, 'events:manage', { zoneId: 12 }), true);
  });

  it('isolates mwcnu to its own assigned_zone_id for verify, promotions, and events', () => {
    assert.equal(can(mwcnuZone5, 'admin:access'), true);
    assert.equal(can(mwcnuZone5, 'zones:manage'), false);
    assert.equal(can(mwcnuZone5, 'users:manage'), false);
    assert.equal(can(mwcnuZone5, 'articles:manage'), false);
    assert.equal(can(mwcnuZone5, 'umkm:delete'), false);

    assert.equal(can(mwcnuZone5, 'umkm:verify', { zoneId: 5 }), true);
    assert.equal(can(mwcnuZone5, 'umkm:verify', { zoneId: 6 }), false);
    assert.equal(can(mwcnuZone5, 'promotion:review', { zoneId: 5 }), true);
    assert.equal(can(mwcnuZone5, 'promotion:review', { zoneId: 6 }), false);
    assert.equal(can(mwcnuZone5, 'events:manage', { zoneId: 5 }), true);
    assert.equal(can(mwcnuZone5, 'events:manage', { zoneId: 6 }), false);
  });

  it('allows ranting to create verified UMKM in its own zone without verify or admin privileges', () => {
    assert.equal(can(rantingZone5, 'umkm:create_verified', { zoneId: 5 }), true);
    assert.equal(can(rantingZone5, 'umkm:create_verified', { zoneId: 7 }), false);
    assert.equal(can(rantingZone5, 'umkm:verify', { zoneId: 5 }), false);
    assert.equal(can(rantingZone5, 'events:manage', { zoneId: 5 }), false);
    assert.equal(can(rantingZone5, 'promotion:review', { zoneId: 5 }), false);
  });
});
