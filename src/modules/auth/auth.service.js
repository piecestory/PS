const repo = require('./auth.repository');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { signAccessToken, generateRefreshTokenValue, hashToken } = require('../../utils/tokens');
const { recordAudit, recentFailedLogins } = require('../../db/auditLog');
const { toDbDateTime } = require('../../utils/dates');
const { ApiError } = require('../../utils/apiResponse');
const config = require('../../config');

const MAX_FAILED_ATTEMPTS = 5;

function publicUser(u) {
  return { id: u.id, fullName: u.full_name, email: u.email, phone: u.phone, role: u.role };
}

async function register({ fullName, email, phone, password }, req) {
  if (await repo.findByEmail(email)) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'هذا البريد الإلكتروني مسجَّل مسبقًا');
  }
  const passwordHash = await hashPassword(password);
  const user = await repo.createUser({ fullName, email, phone, passwordHash });
  recordAudit({ userId: user.id, action: 'REGISTER', entityType: 'user', entityId: user.id, req });
  return issueSession(user, req);
}

async function login({ email, password }, req) {
  // حماية من هجمات القوة الغاشمة: بعد عدد محاولات فاشلة قصير، نرفض حتى مع كلمة مرور صحيحة مؤقتًا
  const failedRecently = await recentFailedLogins(email, 15);
  if (failedRecently >= MAX_FAILED_ATTEMPTS) {
    recordAudit({ action: 'LOGIN_BLOCKED', req, metadata: { email } });
    throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'محاولات دخول فاشلة كثيرة. حاول مجددًا بعد 15 دقيقة');
  }

  const user = await repo.findByEmail(email);
  const validPassword = user ? await verifyPassword(password, user.password_hash) : false;

  if (!user || !validPassword || !user.is_active) {
    recordAudit({ action: 'LOGIN_FAILED', req, metadata: { email } });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }

  recordAudit({ userId: user.id, action: 'LOGIN_SUCCESS', req });
  return issueSession(user, req);
}

/** يُصدر رمز دخول قصير + رمز تحديث طويل (يُخزَّن مُجزَّأً)، ويعيد أيضًا بيانات المستخدم العامة */
async function issueSession(user, req) {
  const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
  const refreshTokenValue = generateRefreshTokenValue();
  const expiresAt = toDbDateTime(new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000));

  await repo.saveRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshTokenValue),
    expiresAt,
    userAgent: req?.get?.('user-agent'),
    ipAddress: req?.ip,
  });

  return { user: publicUser(user), accessToken, refreshToken: refreshTokenValue };
}

/** دوران رمز التحديث: يُبطل القديم فور استخدامه ويصدر جديدًا — يقلّل أثر أي رمز مسروق */
async function refresh(refreshTokenValue, req) {
  const tokenHash = hashToken(refreshTokenValue);
  const stored = await repo.findActiveRefreshToken(tokenHash);
  if (!stored) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'الجلسة غير صالحة، يرجى تسجيل الدخول مجددًا');

  const user = await repo.findById(stored.user_id);
  if (!user || !user.is_active) throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'الحساب غير متاح');

  await repo.revokeRefreshToken(stored.id);
  return issueSession(user, req);
}

async function logout(refreshTokenValue, userId, req) {
  if (refreshTokenValue) {
    const stored = await repo.findActiveRefreshToken(hashToken(refreshTokenValue));
    if (stored) await repo.revokeRefreshToken(stored.id);
  }
  recordAudit({ userId, action: 'LOGOUT', req });
}

async function me(userId) {
  const user = await repo.findById(userId);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'المستخدم غير موجود');
  return publicUser(user);
}

module.exports = { register, login, refresh, logout, me, publicUser };
