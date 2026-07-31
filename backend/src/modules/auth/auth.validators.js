const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'الاسم قصير جدًا').max(120),
    email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+?966|0)?5\d{8}$/, 'رقم جوال سعودي غير صالح')
      .optional()
      .or(z.literal('')),
    // 8 أحرف على الأقل، تجمع بين حروف وأرقام — يوازن بين الأمان وسهولة الاستخدام
    password: z
      .string()
      .min(8, 'كلمة المرور يجب ألا تقل عن 8 أحرف')
      .regex(/[a-zA-Z]/, 'يجب أن تحتوي كلمة المرور على حرف واحد على الأقل')
      .regex(/[0-9]/, 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل'),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
    password: z.string().min(1, 'كلمة المرور مطلوبة'),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = { registerSchema, loginSchema };
