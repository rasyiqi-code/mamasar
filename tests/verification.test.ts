import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { can } from '../src/lib/modules/auth.ts';
import { createProductWhatsAppUrl } from '../src/lib/utils.ts';
import type { User, UMKM, Product } from '../src/lib/modules/types.ts';

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

describe('Store Verification & Fulfillment Capacity Rules', () => {
  it('distinguishes Tier 1 (MWC Verified) and Tier 2 (Mitra Resmi Konsumsi & Berizin)', () => {
    const unverifiedStore: Partial<UMKM> = {
      id: 1,
      name: 'Toko Pemula',
      is_verified: 0,
      verification_status: 'unverified',
    };

    const tier1Store: Partial<UMKM> = {
      id: 2,
      name: 'Rengginang Lorjuk Gapura',
      is_verified: 1,
      verification_status: 'verified_mwc',
      daily_capacity: '50 bungkus/hari',
      order_lead_time_days: 1,
      delivery_coverage: 'mwc_wide',
    };

    const tier2Store: Partial<UMKM> = {
      id: 3,
      name: 'Katering Berkah MWCNU',
      is_verified: 2,
      verification_status: 'verified_mitra',
      nib: '1234567890123',
      halal_cert: 'ID3511000123456',
      daily_capacity: '300 kotak/hari',
      order_lead_time_days: 2,
      max_bulk_order: 500,
      delivery_coverage: 'all_sumenep',
    };

    assert.equal(Boolean(unverifiedStore.is_verified), false);
    assert.equal(Boolean(tier1Store.is_verified), true);
    assert.equal(tier1Store.is_verified, 1);
    assert.equal(Boolean(tier2Store.is_verified), true);
    assert.equal(tier2Store.is_verified, 2);

    // Tier 2 validation: must have legality + bulk capacity
    const hasLegality = Boolean(tier2Store.nib || tier2Store.halal_cert);
    const hasBulkCapacity = Boolean(tier2Store.max_bulk_order && tier2Store.max_bulk_order >= 100);
    assert.equal(hasLegality && hasBulkCapacity, true);
  });

  it('validates prerequisites for merchant verification submission', () => {
    function validateVerificationPrerequisites(store: {
      address?: string;
      phone?: string;
      productCount: number;
    }): { valid: boolean; reason?: string } {
      if (!store.phone || store.phone.length < 9) {
        return { valid: false, reason: 'Nomor WhatsApp tidak valid.' };
      }
      if (!store.address || store.address.trim().length < 5) {
        return { valid: false, reason: 'Lengkapi alamat jelas lokasi toko fisik.' };
      }
      if (store.productCount < 2) {
        return { valid: false, reason: 'Toko wajib memiliki minimal 2 produk aktif di etalase.' };
      }
      return { valid: true };
    }

    const incomplete = validateVerificationPrerequisites({
      address: 'Jl. R',
      phone: '08123456789',
      productCount: 1,
    });
    assert.equal(incomplete.valid, false);

    const complete = validateVerificationPrerequisites({
      address: 'Jl. Raya Gapura Barat No. 12',
      phone: '08123456789',
      productCount: 3,
    });
    assert.equal(complete.valid, true);
  });

  it('enforces RBAC zone boundary for verifying stores', () => {
    const pcnu = makeUser({ id: 1, role: 'pcnu' });
    const mwcnuZone3 = makeUser({ id: 2, role: 'mwcnu', assigned_zone_id: 3 });
    const warga = makeUser({ id: 3, role: 'warga' });

    // PCNU can verify any zone
    assert.equal(can(pcnu, 'umkm:verify', { zoneId: 3 }), true);
    assert.equal(can(pcnu, 'umkm:verify', { zoneId: 9 }), true);

    // MWCNU can only verify their assigned zone
    assert.equal(can(mwcnuZone3, 'umkm:verify', { zoneId: 3 }), true);
    assert.equal(can(mwcnuZone3, 'umkm:verify', { zoneId: 9 }), false);

    // Warga cannot verify stores
    assert.equal(can(warga, 'umkm:verify', { zoneId: 3 }), false);
  });

  it('supports product-level fulfillment with distinct capacities per item', () => {
    // Single merchant can have products with very different operational constraints
    const snackProduct: Partial<Product> = {
      id: 101,
      name: 'Keripik Singkong Renyah 250g',
      stock_status: 'ready',
      order_lead_time_days: 0,
      min_order: 1,
      max_order: 200,
      delivery_coverage: 'island_delivery',
      shelf_life_notes: 'Tahan 3 bulan di kemasan rapat',
      production_capacity: '100 bungkus/hari',
    };

    const cateringProduct: Partial<Product> = {
      id: 102,
      name: 'Nasi Kotak Berkah Acara NU',
      stock_status: 'po',
      order_lead_time_days: 2,
      min_order: 25,
      max_order: 500,
      delivery_coverage: 'mwc_wide',
      shelf_life_notes: 'Konsumsi sebelum 8 jam',
      production_capacity: '500 porsi/hari',
    };

    // Ready stock item
    assert.equal(snackProduct.order_lead_time_days, 0);
    assert.equal(snackProduct.min_order, 1);
    assert.equal(snackProduct.delivery_coverage, 'island_delivery');

    // PO event catering item
    assert.equal(cateringProduct.order_lead_time_days, 2);
    assert.equal(cateringProduct.min_order, 25);
    assert.equal(cateringProduct.delivery_coverage, 'mwc_wide');

    // Test WhatsApp message creation incorporates lead time and min order
    const waUrl = createProductWhatsAppUrl({
      phone: '081234567890',
      storeName: 'Dapur Berkah NU',
      productName: cateringProduct.name!,
      price: 25000,
      zoneName: 'Gapura',
      orderLeadTimeDays: cateringProduct.order_lead_time_days,
      minOrder: cateringProduct.min_order,
      stockStatus: cateringProduct.stock_status,
    });

    const decoded = decodeURIComponent(waUrl);
    assert.match(decoded, /Estimasi PO/);
    assert.match(decoded, /H-2/);
    assert.match(decoded, /Minimal Pesan/);
    assert.match(decoded, /25 pcs\/porsi/);
    assert.match(decoded, /Dapur Berkah NU/);
  });
});
