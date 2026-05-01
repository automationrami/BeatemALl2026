import { describe, expect, it } from 'vitest';
import { formatDistanceKm, haversineKm } from './geo';

const KUWAIT_CITY = { lat: 29.3759, lng: 47.9774 };
const SALMIYA = { lat: 29.3394, lng: 48.0758 };
const HAWALLY = { lat: 29.3326, lng: 48.0289 };
const RIYADH = { lat: 24.7136, lng: 46.6753 };

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(KUWAIT_CITY, KUWAIT_CITY)).toBeCloseTo(0, 3);
  });

  it('computes a short Kuwait City → Salmiya distance', () => {
    // Roughly 10 km in reality; allow ±0.5 km tolerance for the spherical approximation.
    expect(haversineKm(KUWAIT_CITY, SALMIYA)).toBeGreaterThan(9);
    expect(haversineKm(KUWAIT_CITY, SALMIYA)).toBeLessThan(11);
  });

  it('computes a short Hawally → Salmiya distance', () => {
    expect(haversineKm(HAWALLY, SALMIYA)).toBeGreaterThan(4);
    expect(haversineKm(HAWALLY, SALMIYA)).toBeLessThan(6);
  });

  it('computes a long Kuwait → Riyadh distance', () => {
    // Real great-circle distance ≈ 540 km; allow ±15 km.
    const km = haversineKm(KUWAIT_CITY, RIYADH);
    expect(km).toBeGreaterThan(525);
    expect(km).toBeLessThan(555);
  });

  it('is symmetric — order of arguments does not matter', () => {
    expect(haversineKm(KUWAIT_CITY, RIYADH)).toBeCloseTo(haversineKm(RIYADH, KUWAIT_CITY), 3);
  });
});

describe('formatDistanceKm', () => {
  it('keeps one decimal under 10 km', () => {
    expect(formatDistanceKm(0.4)).toBe('0.4');
    expect(formatDistanceKm(4.72)).toBe('4.7');
    expect(formatDistanceKm(9.4)).toBe('9.4');
  });

  it('rounds to whole km at and above 10 km', () => {
    expect(formatDistanceKm(10)).toBe('10');
    expect(formatDistanceKm(10.4)).toBe('10');
    expect(formatDistanceKm(12.6)).toBe('13');
    expect(formatDistanceKm(140)).toBe('140');
  });
});
