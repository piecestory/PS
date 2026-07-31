const authService = require('./auth.service');
const config = require('../../config');
const { ok } = require('../../utils/apiResponse');

function accessCookieOpts() {
  return {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.crossSiteCookies ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  };
}
function refreshCookieOpts() {
  return {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.crossSiteCookies ? 'none' : 'lax',
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    path: '/api/auth', // يُرسَل فقط لمسارات المصادقة، يقلّص فرص تسريبه
  };
}

function setSessionCookies(res, { accessToken, refreshToken }) {
  res.cookie('access_token', accessToken, accessCookieOpts());
  res.cookie('refresh_token', refreshToken, refreshCookieOpts());
}
function clearSessionCookies(res) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

async function register(req, res) {
  const { user, accessToken, refreshToken } = await authService.register(req.body, req);
  setSessionCookies(res, { accessToken, refreshToken });
  ok(res, { user });
}

async function login(req, res) {
  const { user, accessToken, refreshToken } = await authService.login(req.body, req);
  setSessionCookies(res, { accessToken, refreshToken });
  ok(res, { user });
}

async function refresh(req, res) {
  const token = req.cookies?.refresh_token;
  const { user, accessToken, refreshToken } = await authService.refresh(token, req);
  setSessionCookies(res, { accessToken, refreshToken });
  ok(res, { user });
}

async function logout(req, res) {
  await authService.logout(req.cookies?.refresh_token, req.user?.id, req);
  clearSessionCookies(res);
  ok(res, { loggedOut: true });
}

async function me(req, res) {
  ok(res, { user: await authService.me(req.user.id) });
}

module.exports = { register, login, refresh, logout, me };
