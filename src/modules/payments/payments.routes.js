const router = require('express').Router();
const { z } = require('zod');
const controller = require('./payments.controller');
const validate = require('../../middleware/validate');
const { attachUserIfPresent } = require('../../middleware/auth');

const initiateSchema = z.object({
  body: z.object({ orderId: z.string().min(1), provider: z.enum(['MOYASAR', 'TABBY', 'TAMARA']) }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

router.post('/', attachUserIfPresent, validate(initiateSchema), controller.initiate);
router.get('/confirm/:reference', controller.confirm);

// نقاط استقبال الويبهوك من كل بوابة — تحميها توقيعات كل مزوّد الخاصة بدل الجلسة/CSRF (انظر middleware/csrf.js)
router.post('/webhooks/:provider', controller.webhook);

module.exports = router;
