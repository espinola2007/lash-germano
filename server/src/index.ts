import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from './loadenv.js';
loadEnv();

const isProd = process.env.NODE_ENV === 'production';
const password = process.env.ADMIN_PASSWORD ?? '';
const secret = process.env.SESSION_SECRET ?? '';
const origin = process.env.PUBLIC_ORIGIN || 'http://localhost:5173';
if (password.length < 16 || secret.length < 32 || password.includes('SUBSTITUA') || secret.includes('SUBSTITUA')) {
  throw new Error('Configure ADMIN_PASSWORD (16+ caracteres) e SESSION_SECRET (32+ caracteres) no arquivo .env.');
}
if (isProd && !origin.startsWith('https://')) throw new Error('PUBLIC_ORIGIN deve ser HTTPS em producao.');
const base = resolve(fileURLToPath(new URL('../', import.meta.url)), 'data');
const uploads = join(base, 'uploads');
mkdirSync(uploads, { recursive: true });
const dbFile = join(base, 'config.json');
const slugNames = ['Brasileiro 3D', 'Fox Eyes', 'Sirena', 'Glow', 'Glamour', 'Efeito Wispy', 'Efeito Suave'];
const application = [90, 95, 85, 100, 90, 120, 100];
const maintenance = [70, 70, 65, 75, 70, 80, 75];
type Service = { id: string; name: string; application: number; maintenance: number; image: string | null };
type Config = { studioName: string; tagline: string; whatsapp: string; days: number[]; startTime: string; endTime: string; interval: number; blockedDates: string[]; services: Service[] };
const defaults: Config = { studioName: 'Lash Germano', tagline: 'Seu olhar, sua essência.', whatsapp: '', days: [1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '18:00', interval: 60, blockedDates: [], services: slugNames.map((name, i) => ({ id: `modelo-${i + 1}`, name, application: application[i], maintenance: maintenance[i], image: null })) };
let config: Config = existsSync(dbFile) ? JSON.parse(readFileSync(dbFile, 'utf8')) as Config : defaults;
function save() { const tmp = `${dbFile}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 }); renameSync(tmp, dbFile); }
if (!existsSync(dbFile)) save();
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false); // Se houver proxy, configure o servidor web conscientemente antes de alterar.
app.use(helmet({ contentSecurityPolicy: isProd ? { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: [] } } : false, crossOriginResourcePolicy: { policy: 'same-origin' } }));
app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: '16kb' }));
const cookieName = isProd ? '__Host-atelier_admin' : 'atelier_admin';
const sessions = new Map<string, number>();
const SESSION_MS = 8 * 60 * 60 * 1000;
const passSalt = createHash('sha256').update(secret).digest();
const passHash = scryptSync(password, passSalt, 64);
function verifyPassword(value: string) { const got = scryptSync(value, passSalt, 64); return timingSafeEqual(passHash, got); }
function parseCookie(header: string) { const part = header.split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`)); return part ? part.slice(cookieName.length + 1) : ''; }
function signature(token: string) { return createHmac('sha256', secret).update(token).digest('hex'); }
function getSession(req: express.Request): string | null {
  const raw = parseCookie(req.headers.cookie ?? ''); const [token, mac] = raw.split('.');
  if (!token || !mac || !/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(mac)) return null;
  const expected = signature(token);
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const expiry = sessions.get(token);
  if (!expiry || expiry < Date.now()) { sessions.delete(token); return null; }
  return token;
}
function admin(req: express.Request, res: express.Response, next: express.NextFunction) { if (!getSession(req)) { res.status(401).json({ error: 'Acesso restrito.' }); return; } next(); }
function safeOrigin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
  const requestOrigin = req.get('origin');
  if (requestOrigin !== origin) { res.status(403).json({ error: 'Origem da requisicao nao autorizada.' }); return; }
  next();
}
app.use('/api', safeOrigin);
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } });
app.get('/api/public', (_req, res) => res.json(config));
app.get('/api/admin/session', (req, res) => res.json({ authenticated: !!getSession(req) }));
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const parsed = z.object({ password: z.string().min(1).max(256) }).safeParse(req.body);
  if (!parsed.success || !verifyPassword(parsed.data.password)) { res.status(401).json({ error: 'Senha incorreta.' }); return; }
  const token = randomBytes(32).toString('hex'); sessions.set(token, Date.now() + SESSION_MS);
  res.cookie(cookieName, `${token}.${signature(token)}`, { httpOnly: true, secure: isProd, sameSite: 'strict', path: '/', maxAge: SESSION_MS });
  res.json({ authenticated: true });
});
app.post('/api/admin/logout', admin, (req, res) => { const tok = getSession(req); if (tok) sessions.delete(tok); res.clearCookie(cookieName, { httpOnly: true, secure: isProd, sameSite: 'strict', path: '/' }); res.json({ ok: true }); });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const serviceInput = z.object({ id: z.string(), name: z.string().trim().min(2).max(80), application: z.number().min(0).max(100000), maintenance: z.number().min(0).max(100000), image: z.string().nullable() });
const configInput = z.object({ studioName: z.string().trim().min(2).max(80), tagline: z.string().trim().max(160), whatsapp: z.string().regex(/^(|[1-9][0-9]{9,14})$/), days: z.array(z.number().int().min(0).max(6)).min(1).max(7), startTime: time, endTime: time, interval: z.number().int().min(15).max(240), blockedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(365), services: z.array(serviceInput).length(7) }).strict();
app.put('/api/admin/config', admin, (req, res) => {
  const parsed = configInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira os campos e os valores.', issues: parsed.error.flatten() }); return; }
  const next = parsed.data;
  if (next.startTime >= next.endTime || new Set(next.days).size !== next.days.length || new Set(next.blockedDates).size !== next.blockedDates.length) { res.status(400).json({ error: 'Horarios ou datas invalidos.' }); return; }
  if (next.services.some((s, i) => s.id !== defaults.services[i].id || s.image !== config.services[i].image)) { res.status(400).json({ error: 'O identificador e a imagem so podem ser alterados pelo upload.' }); return; }
  config = next; save(); res.json(config);
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) });
app.use('/uploads', express.static(uploads, { fallthrough: false, maxAge: '1d', immutable: false, setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox"); } }));
app.post('/api/admin/services/:id/image', admin, upload.single('image'), async (req, res) => {
  const service = config.services.find(s => s.id === req.params.id);
  if (!service || !req.file) { res.status(400).json({ error: 'Servico ou imagem invalida. Use JPEG, PNG ou WebP ate 5 MB.' }); return; }
  try {
    const meta = await sharp(req.file.buffer, { failOn: 'error', limitInputPixels: 20_000_000 }).metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format ?? '')) { res.status(415).json({ error: 'Formato real nao autorizado.' }); return; }
    const filename = `${randomBytes(16).toString('hex')}.webp`;
    await sharp(req.file.buffer, { failOn: 'error' }).rotate().resize(1200, 1200, { fit: 'cover', position: 'attention' }).webp({ quality: 84 }).toFile(join(uploads, filename));
    const old = service.image; service.image = `/uploads/${filename}`; save();
    if (old?.startsWith('/uploads/')) { try { unlinkSync(join(uploads, old.slice('/uploads/'.length))); } catch {} }
    res.json({ image: service.image });
  } catch { res.status(400).json({ error: 'Nao foi possivel processar essa imagem.' }); }
});
app.delete('/api/admin/services/:id/image', admin, (req, res) => {
  const service = config.services.find(s => s.id === req.params.id);
  if (!service) { res.status(404).json({ error: 'Servico nao encontrado.' }); return; }
  const old = service.image; service.image = null; save();
  if (old?.startsWith('/uploads/')) { try { unlinkSync(join(uploads, old.slice('/uploads/'.length))); } catch {} }
  res.json({ image: null });
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota inexistente.' }));
app.use((err: Error & { code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') { res.status(413).json({ error: 'A imagem deve ter ate 5 MB.' }); return; }
  console.error('Erro interno:', err.message); res.status(500).json({ error: 'Ocorreu um erro. Tente novamente.' });
});
const dist = resolve(base, '../../dist');
if (isProd && existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html'))); }
const port = Number(process.env.PORT ?? 3001);
app.listen(port, '127.0.0.1', () => console.log(`API pronta em http://127.0.0.1:${port}`));
