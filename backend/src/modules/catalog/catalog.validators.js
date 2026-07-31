const { z } = require('zod');

const slugRegex = /^[a-z0-9-]+$/;

const createProductSchema = z.object({
  body: z.object({
    slug: z.string().regex(slugRegex, 'الرابط المختصر يجب أن يحوي أحرفًا لاتينية صغيرة وأرقامًا وشرطات فقط'),
    categoryId: z.string().min(1),
    titleAr: z.string().min(2).max(200),
    titleEn: z.string().max(200).optional(),
    era: z.string().max(120).optional(),
    origin: z.string().max(120).optional(),
    material: z.string().max(200).optional(),
    condition: z.string().max(200).optional(),
    descriptionAr: z.string().max(4000).optional(),
    descriptionEn: z.string().max(4000).optional(),
    price: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
    oldPrice: z.number().positive().optional(),
    stock: z.number().int().min(0).default(0),
    badge: z.string().max(60).optional(),
    icon: z.string().max(60).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateProductSchema = z.object({
  body: createProductSchema.shape.body.partial().omit({ slug: true, categoryId: true }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

module.exports = { createProductSchema, updateProductSchema };
