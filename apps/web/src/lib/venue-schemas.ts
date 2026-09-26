import { z } from 'zod';

/** 'HH:MM', 24-hour, Kuwait local time. */
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const gameSeats = z.object({
  gameSlug: z.string().min(1).max(40),
  seatsCount: z.number().int().min(1).max(100),
});

/** Fields a venue application and a venue edit share (V-01 / V-03). */
const venueFields = {
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(3).max(200),
  phoneNumber: z.string().trim().min(6).max(20),
  email: z.string().trim().email().max(120).optional().nullable().or(z.literal('')),
  description: z.string().trim().max(1000).optional().nullable(),
  games: z.array(gameSeats).min(1).max(20),
  hourlyRateKwd: z.number().gt(0).max(100),
  opensAtTime: hhmm.optional().nullable(),
  closesAtTime: hhmm.optional().nullable(),
  isOpen24h: z.boolean().default(false),
  cancellationWindowHours: z.number().int().min(0).max(72),
  acceptsWalkIns: z.boolean().default(true),
};

export const venueApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  venueName: z.string().trim().min(2).max(80),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .default('KW'),
  ...venueFields,
});

export const venueUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  ...venueFields,
  isActive: z.boolean(),
});

export const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(500).optional().nullable(),
});
