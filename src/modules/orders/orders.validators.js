const { z } = require('zod');

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^(?:\+?966|0)?5\d{8}$/, 'رقم جوال سعودي غير صالح'),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(120).optional(),
  street: z.string().trim().min(2).max(200),
  buildingNo: z.string().trim().max(30).optional(),
  additionalInfo: z.string().trim().max(300).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

const checkoutSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive().max(20),
        })
      )
      .min(1, 'السلة فارغة'),
    address: addressSchema,
    guestEmail: z.string().email().optional().or(z.literal('')),
    guestPhone: z.string().optional(),
    customerNote: z.string().max(500).optional(),
    paymentProvider: z.enum(['MOYASAR', 'TABBY', 'TAMARA']),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED', 'REFUNDED']),
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

module.exports = { checkoutSchema, updateStatusSchema, addressSchema };
