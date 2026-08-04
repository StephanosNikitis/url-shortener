import { z } from 'zod';

const shortenSchema = z.object({
    originalUrl: z.string().trim().min(1).max(2048), // cap length — prevents abuse via giant strings
});

// defensive measure in case they're ever served from the same origin.
const RESERVED_SHORT_IDS = new Set(['analytics', 'links', 'health', 'auth', 'login', 'stats', 'my-links']);

const renameSchema = z.object({
    shortId: z
        .string()
        .trim()
        .min(3, 'Custom short link must be at least 3 characters')
        .max(20, 'Custom short link must be 20 characters or fewer')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens, and underscores are allowed')
        .refine((val) => !RESERVED_SHORT_IDS.has(val.toLowerCase()), {
            message: 'That short link is reserved, please choose another',
        }),
});

const activeStatusSchema = z.object({
    isActive: z.boolean(),
});

export { shortenSchema, renameSchema, activeStatusSchema };