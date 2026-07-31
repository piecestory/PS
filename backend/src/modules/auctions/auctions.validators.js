const { z } = require('zod');

const placeBidSchema = z.object({
  body: z.object({
    amount: z.number().positive('قيمة المزايدة يجب أن تكون أكبر من صفر'),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

const createAuctionSchema = z.object({
  body: z.object({
    lotCode: z.string().min(2).max(30),
    titleAr: z.string().min(2).max(200),
    titleEn: z.string().max(200).optional(),
    categoryAr: z.string().min(2).max(120),
    categoryEn: z.string().max(120).optional(),
    descriptionAr: z.string().max(4000).optional(),
    descriptionEn: z.string().max(4000).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    icon: z.string().max(60).optional(),
    startPrice: z.number().positive(),
    status: z.enum(['LIVE', 'UPCOMING', 'CLOSED']).default('UPCOMING'),
    endsAt: z.string().datetime().or(z.string().min(1)),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = { placeBidSchema, createAuctionSchema };
