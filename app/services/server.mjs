/* UgnayPH — Pinoy Social Media App
 * Created by: Dominic R. Lanaja
 * Copyright © 2026. All Rights Reserved. */
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const dataDir = process.env.DATA_DIR || resolve(root, 'data');
mkdirSync(dataDir, { recursive: true });
export const db = new DatabaseSync(resolve(dataDir, 'ugnay.db'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, identity TEXT UNIQUE NOT NULL, password TEXT NOT NULL, recovery TEXT NOT NULL, birthdate TEXT, gender TEXT, bio TEXT DEFAULT '', location TEXT DEFAULT '', work TEXT DEFAULT '', school TEXT DEFAULT '', avatar INTEGER, cover INTEGER, language TEXT DEFAULT 'en', audience TEXT DEFAULT 'public', messages TEXT DEFAULT 'everyone', saver INTEGER DEFAULT 1, active INTEGER DEFAULT 1, last_seen INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user INTEGER REFERENCES users(id) ON DELETE CASCADE, expires INTEGER);
CREATE TABLE IF NOT EXISTS friendships(sender INTEGER REFERENCES users(id) ON DELETE CASCADE, receiver INTEGER REFERENCES users(id) ON DELETE CASCADE, status TEXT, PRIMARY KEY(sender,receiver));
CREATE TABLE IF NOT EXISTS follows(user INTEGER REFERENCES users(id) ON DELETE CASCADE, target INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(user,target));
CREATE TABLE IF NOT EXISTS media(id INTEGER PRIMARY KEY, owner INTEGER REFERENCES users(id) ON DELETE CASCADE, name TEXT, type TEXT, bytes BLOB, created INTEGER);
CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY, user INTEGER REFERENCES users(id) ON DELETE CASCADE, body TEXT, media INTEGER REFERENCES media(id) ON DELETE SET NULL, audience TEXT, section TEXT, feeling TEXT, location TEXT, shared INTEGER REFERENCES posts(id) ON DELETE SET NULL, created INTEGER);
CREATE TABLE IF NOT EXISTS reactions(post INTEGER REFERENCES posts(id) ON DELETE CASCADE, user INTEGER REFERENCES users(id) ON DELETE CASCADE, kind TEXT, PRIMARY KEY(post,user));
CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY, post INTEGER REFERENCES posts(id) ON DELETE CASCADE, user INTEGER REFERENCES users(id) ON DELETE CASCADE, body TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, sender INTEGER REFERENCES users(id) ON DELETE CASCADE, receiver INTEGER REFERENCES users(id) ON DELETE CASCADE, body TEXT, media INTEGER REFERENCES media(id) ON DELETE SET NULL, created INTEGER, seen INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS stories(id INTEGER PRIMARY KEY, user INTEGER REFERENCES users(id) ON DELETE CASCADE, media INTEGER REFERENCES media(id) ON DELETE CASCADE, caption TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS story_reactions(story INTEGER REFERENCES stories(id) ON DELETE CASCADE, user INTEGER REFERENCES users(id) ON DELETE CASCADE, kind TEXT, PRIMARY KEY(story,user));
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY, user INTEGER REFERENCES users(id) ON DELETE CASCADE, actor INTEGER REFERENCES users(id) ON DELETE CASCADE, body TEXT, post INTEGER REFERENCES posts(id) ON DELETE CASCADE, created INTEGER, seen INTEGER DEFAULT 0);`);
const q = (sql, ...args) => db.prepare(sql).all(...args);
const one = (sql, ...args) => db.prepare(sql).get(...args);
const run = (sql, ...args) => db.prepare(sql).run(...args);
const now = () => Date.now();
const hash = (s) => createHash('sha256').update(s).digest('hex');
function password(s) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(s, salt, 32).toString('hex');
}
function matches(s, stored) {
  const [salt, h] = stored.split(':');
  return timingSafeEqual(Buffer.from(h, 'hex'), scryptSync(s, salt, 32));
}
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const str = (v, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const choice = (v, list) => (list.includes(v) ? v : fail('Invalid option'));
const validPassword = (p) => {
  if (typeof p !== 'string' || p.length < 10 || p.length > 128)
    fail('Use a password of 10–128 characters.');
  return p;
};
const publicUser = (u) =>
  u && {
    id: u.id,
    name: u.name,
    bio: u.bio,
    location: u.location,
    work: u.work,
    school: u.school,
    avatar: u.avatar,
    cover: u.cover,
    last_seen: u.last_seen
  };
const selfUser = (u) => ({
  ...publicUser(u),
  identity: u.identity,
  birthdate: u.birthdate,
  gender: u.gender,
  language: u.language,
  audience: u.audience,
  messages: u.messages,
  saver: u.saver
});
const friends = (a, b) =>
  !!one(
    "SELECT 1 FROM friendships WHERE status='accepted' AND ((sender=? AND receiver=?) OR (sender=? AND receiver=?))",
    a,
    b,
    b,
    a
  );
const activeUser = (id) => one('SELECT * FROM users WHERE id=? AND active=1', id);
const canPost = (p, uid) =>
  !!p &&
  !!activeUser(p.user) &&
  (p.user === uid || p.audience === 'public' || (p.audience === 'friends' && friends(p.user, uid)));
const notify = (user, actor, body, post = null) => {
  if (user !== actor)
    run(
      'INSERT INTO notifications(user,actor,body,post,created) VALUES(?,?,?,?,?)',
      user,
      actor,
      body,
      post,
      now()
    );
};
function ownedMedia(id, uid, kinds = null) {
  if (!id) return null;
  const m = one('SELECT id,type FROM media WHERE id=? AND owner=?', Number(id), uid);
  if (!m || (kinds && !kinds.some((k) => m.type.startsWith(k)))) fail('Invalid attachment');
  return m.id;
}
function postView(p, uid, nested = false) {
  const u = activeUser(p.user);
  return {
    ...p,
    author: publicUser(u),
    attachment: p.media ? one('SELECT id,type,name FROM media WHERE id=?', p.media) : null,
    reactions: q('SELECT kind,COUNT(*) AS count FROM reactions WHERE post=? GROUP BY kind', p.id),
    mine: one('SELECT kind FROM reactions WHERE post=? AND user=?', p.id, uid)?.kind,
    comments: one('SELECT COUNT(*) AS count FROM comments WHERE post=?', p.id).count,
    sharedPost:
      !nested && p.shared
        ? (() => {
            const s = one('SELECT * FROM posts WHERE id=?', p.shared);
            return canPost(s, uid) ? postView(s, uid, true) : null;
          })()
        : null
  };
}
const rate = new Map();
function limit(key, max) {
  const t = now();
  const r = rate.get(key);
  if (!r || r.until < t) rate.set(key, { until: t + 60000, n: 1 });
  else if (++r.n > max) fail('Too many attempts. Try again in a minute.', 429);
}
setInterval(() => {
  for (const [k, v] of rate) if (v.until < now()) rate.delete(k);
  run('DELETE FROM sessions WHERE expires<?', now());
  run('DELETE FROM stories WHERE created<?', now() - 86400000);
}, 60000).unref();
async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 12 * 1024 * 1024) fail('File too large. Maximum 8 MB.', 413);
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    fail('Invalid JSON');
  }
}
function session(res, uid, remember) {
  const token = randomBytes(32).toString('hex');
  const days = remember ? 30 : 1;
  run('INSERT INTO sessions VALUES(?,?,?)', hash(token), uid, now() + days * 86400000);
  res.setHeader(
    'Set-Cookie',
    `ugnay=${token}; HttpOnly; SameSite=Strict; Path=/${remember ? '; Max-Age=2592000' : ''}${process.env.SECURE_COOKIES === '1' ? '; Secure' : ''}`
  );
}
async function api(req, res, url) {
  const path = url.pathname.slice(4),
    method = req.method;
  const token = (req.headers.cookie || '').match(/(?:^|; )ugnay=([a-f0-9]{64})(?:;|$)/)?.[1];
  const auth = token
    ? one(
        'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user WHERE s.token=? AND s.expires>? AND u.active=1',
        hash(token),
        now()
      )
    : null;
  if (method !== 'GET') {
    const origin = req.headers.origin;
    if (origin && origin !== `${process.env.PUBLIC_ORIGIN || `http://${req.headers.host}`}`)
      fail('Origin not allowed', 403);
  }
  limit(req.socket.remoteAddress + ':' + (auth?.id || 'guest'), auth ? 240 : 50);
  if (path === '/config')
    return { app: 'ph.ugnay.app', demo: process.env.DEMO === '1', version: '1.1' };
  const b = method === 'GET' ? {} : await body(req);
  if (path === '/signup' && method === 'POST') {
    const name = str(b.name, 80),
      identity = str(b.identity, 160).toLowerCase();
    if (
      !name ||
      !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity) || /^\+?[0-9]{10,15}$/.test(identity))
    )
      fail('Enter your name and a valid email or phone number.');
    const birth = str(b.birthdate, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
      !Number.isFinite(Date.parse(birth)) ||
      Date.parse(birth) > now() ||
      Date.parse(birth) < Date.parse('1900-01-01')
    )
      fail('Enter a valid birthdate.');
    const recovery = randomBytes(16).toString('hex');
    const pw = password(validPassword(b.password));
    if (one('SELECT id FROM users WHERE identity=?', identity))
      fail('This email or phone is already registered.');
    const id = Number(
      run(
        'INSERT INTO users(name,identity,password,recovery,birthdate,gender) VALUES(?,?,?,?,?,?)',
        name,
        identity,
        pw,
        hash(recovery),
        birth,
        choice(b.gender, ['Female', 'Male', 'Non-binary', 'Prefer not to say'])
      ).lastInsertRowid
    );
    session(res, id, !!b.remember);
    return { user: selfUser(activeUser(id)), recovery };
  }
  if (path === '/login' && method === 'POST') {
    limit('login:' + req.socket.remoteAddress, 10);
    const u = one('SELECT * FROM users WHERE identity=?', str(b.identity, 160).toLowerCase());
    if (
      !u ||
      !matches(
        typeof b.password === 'string' && b.password.length <= 128 ? b.password : '',
        u.password
      )
    )
      fail('Email/phone or password is incorrect.', 401);
    run('UPDATE users SET active=1 WHERE id=?', u.id);
    session(res, u.id, !!b.remember);
    return { user: selfUser(u) };
  }
  if (path === '/reset' && method === 'POST') {
    limit('reset:' + req.socket.remoteAddress, 5);
    const u = one('SELECT * FROM users WHERE identity=?', str(b.identity, 160).toLowerCase());
    if (
      !u ||
      !timingSafeEqual(
        Buffer.from(hash(str(b.recovery, 100)), 'hex'),
        Buffer.from(u.recovery, 'hex')
      )
    )
      fail('Account or recovery code is incorrect.');
    const recovery = randomBytes(16).toString('hex');
    run(
      'UPDATE users SET password=?,recovery=? WHERE id=?',
      password(validPassword(b.password)),
      hash(recovery),
      u.id
    );
    run('DELETE FROM sessions WHERE user=?', u.id);
    return { recovery };
  }
  if (!auth) fail('Please sign in.', 401);
  const uid = auth.id;
  run('UPDATE users SET last_seen=? WHERE id=?', now(), uid);
  if (path === '/me' && method === 'GET')
    return {
      user: selfUser(auth),
      unread: one('SELECT COUNT(*) n FROM messages WHERE receiver=? AND seen=0', uid).n,
      notifications: one('SELECT COUNT(*) n FROM notifications WHERE user=? AND seen=0', uid).n
    };
  if (path === '/logout' && method === 'POST') {
    run('DELETE FROM sessions WHERE token=?', hash(token));
    res.setHeader('Set-Cookie', 'ugnay=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return { ok: true };
  }
  if (path === '/profile' && method === 'PATCH') {
    run(
      'UPDATE users SET name=?,bio=?,location=?,work=?,school=?,avatar=?,cover=? WHERE id=?',
      str(b.name, 80) || auth.name,
      str(b.bio, 300),
      str(b.location, 100),
      str(b.work, 100),
      str(b.school, 100),
      ownedMedia(b.avatar, uid, ['image/']),
      ownedMedia(b.cover, uid, ['image/']),
      uid
    );
    return { user: selfUser(activeUser(uid)) };
  }
  if (path === '/settings' && method === 'PATCH') {
    run(
      'UPDATE users SET language=?,audience=?,messages=?,saver=? WHERE id=?',
      choice(b.language, ['en', 'tl']),
      choice(b.audience, ['public', 'friends', 'private']),
      choice(b.messages, ['everyone', 'friends']),
      b.saver ? 1 : 0,
      uid
    );
    return { user: selfUser(activeUser(uid)) };
  }
  if (path === '/account' && method === 'POST') {
    if (
      !matches(
        typeof b.password === 'string' && b.password.length <= 128 ? b.password : '',
        auth.password
      )
    )
      fail('Current password is incorrect.');
    if (b.action === 'password') {
      run('UPDATE users SET password=? WHERE id=?', password(validPassword(b.newPassword)), uid);
      run('DELETE FROM sessions WHERE user=? AND token<>?', uid, hash(token));
    } else if (b.action === 'deactivate') {
      run('UPDATE users SET active=0 WHERE id=?', uid);
      run('DELETE FROM sessions WHERE user=?', uid);
    } else if (b.action === 'delete') run('DELETE FROM users WHERE id=?', uid);
    else fail('Invalid action');
    return { ok: true };
  }
  if (path === '/upload' && method === 'POST') {
    const types = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'application/pdf',
      'text/plain'
    ];
    const type = choice(b.type, types),
      bytes = Buffer.from(str(b.base64, 12 * 1024 * 1024), 'base64');
    if (!bytes.length || bytes.length > 8 * 1024 * 1024)
      fail('Attachment must be between 1 byte and 8 MB.');
    const used = one('SELECT COALESCE(SUM(length(bytes)),0) n FROM media WHERE owner=?', uid).n;
    if (used + bytes.length > 100 * 1024 * 1024) fail('Your 100 MB storage allowance is full.');
    const id = Number(
      run(
        'INSERT INTO media(owner,name,type,bytes,created) VALUES(?,?,?,?,?)',
        uid,
        str(b.name, 120) || 'Attachment',
        type,
        bytes,
        now()
      ).lastInsertRowid
    );
    return { id, type, name: str(b.name, 120) };
  }
  if (path === '/posts' && method === 'POST') {
    const text = str(b.body);
    const media = ownedMedia(b.media, uid, ['image/', 'video/']);
    const shared = b.shared ? Number(b.shared) : null;
    if (shared && !canPost(one('SELECT * FROM posts WHERE id=?', shared), uid))
      fail('Post is unavailable.', 404);
    if (!text && !media && !shared) fail('Write something or add a photo/video.');
    const id = Number(
      run(
        'INSERT INTO posts(user,body,media,audience,section,feeling,location,shared,created) VALUES(?,?,?,?,?,?,?,?,?)',
        uid,
        text,
        media,
        choice(b.audience, ['public', 'friends', 'private']),
        choice(b.section, ['bayan', 'pamilya', 'kultura']),
        str(b.feeling, 40),
        str(b.location, 100),
        shared,
        now()
      ).lastInsertRowid
    );
    if (shared)
      notify(
        one('SELECT user FROM posts WHERE id=?', shared).user,
        uid,
        'shared your post',
        shared
      );
    return postView(one('SELECT * FROM posts WHERE id=?', id), uid);
  }
  if (path === '/posts' && method === 'GET') {
    const cursor = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER,
      section = url.searchParams.get('section'),
      user = Number(url.searchParams.get('user')) || 0,
      mode = url.searchParams.get('mode');
    const rows = q(
      `SELECT p.* FROM posts p JOIN users u ON u.id=p.user WHERE u.active=1 AND p.id<? AND (?='' OR p.section=?) AND (?=0 OR p.user=?) AND (p.user=? OR p.audience='public' OR (p.audience='friends' AND EXISTS(SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.sender=p.user AND f.receiver=?) OR (f.receiver=p.user AND f.sender=?))))) AND (?!='following' OR p.user=? OR EXISTS(SELECT 1 FROM follows f WHERE f.user=? AND f.target=p.user) OR EXISTS(SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.sender=p.user AND f.receiver=?) OR (f.receiver=p.user AND f.sender=?)))) ORDER BY p.id DESC LIMIT 15`,
      cursor,
      section || '',
      section || '',
      user,
      user,
      uid,
      uid,
      uid,
      mode || '',
      uid,
      uid,
      uid,
      uid
    );
    return {
      posts: rows.map((p) => postView(p, uid)),
      next: rows.length === 15 ? rows.at(-1).id : null
    };
  }
  const pm = path.match(/^\/posts\/(\d+)(?:\/(reactions|comments))?$/);
  if (pm) {
    const p = one('SELECT * FROM posts WHERE id=?', Number(pm[1]));
    if (!canPost(p, uid)) fail('Post is unavailable.', 404);
    if (!pm[2] && method === 'DELETE') {
      if (p.user !== uid) fail('Not allowed', 403);
      run('DELETE FROM posts WHERE id=?', p.id);
      return { ok: true };
    }
    if (pm[2] === 'reactions' && method === 'POST') {
      if (b.kind) {
        const kind = choice(b.kind, ['like', 'agree', 'happy', 'sad', 'grateful', 'proud']);
        run(
          'INSERT INTO reactions VALUES(?,?,?) ON CONFLICT(post,user) DO UPDATE SET kind=excluded.kind',
          p.id,
          uid,
          kind
        );
        notify(p.user, uid, 'reacted to your post', p.id);
      } else run('DELETE FROM reactions WHERE post=? AND user=?', p.id, uid);
      return postView(p, uid);
    }
    if (pm[2] === 'comments' && method === 'GET')
      return q(
        'SELECT c.*,u.name,u.avatar FROM comments c JOIN users u ON u.id=c.user WHERE c.post=? AND u.active=1 ORDER BY c.id DESC LIMIT 100',
        p.id
      ).reverse();
    if (pm[2] === 'comments' && method === 'POST') {
      const text = str(b.body, 2000);
      if (!text) fail('Write a comment.');
      run('INSERT INTO comments(post,user,body,created) VALUES(?,?,?,?)', p.id, uid, text, now());
      notify(p.user, uid, 'commented on your post', p.id);
      return { ok: true };
    }
  }
  if (path === '/people' && method === 'GET') {
    const search = str(url.searchParams.get('q'), 80);
    return q(
      'SELECT * FROM users WHERE active=1 AND id<>? AND name LIKE ? ORDER BY name LIMIT 50',
      uid,
      '%' + search + '%'
    ).map((u) => ({
      ...publicUser(u),
      friend: friends(uid, u.id),
      request: one(
        'SELECT * FROM friendships WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)',
        uid,
        u.id,
        u.id,
        uid
      ),
      following: !!one('SELECT 1 FROM follows WHERE user=? AND target=?', uid, u.id)
    }));
  }
  const um = path.match(/^\/people\/(\d+)$/);
  if (um && method === 'GET') {
    const u = activeUser(Number(um[1]));
    if (!u) fail('Profile unavailable', 404);
    return publicUser(u);
  }
  if (path === '/friends' && method === 'POST') {
    const target = Number(b.target);
    if (target === uid || !activeUser(target)) fail('Invalid person');
    const f = one(
      'SELECT * FROM friendships WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)',
      uid,
      target,
      target,
      uid
    );
    if (b.action === 'request') {
      if (f) fail('Connection already exists');
      run("INSERT INTO friendships VALUES(?,?,'pending')", uid, target);
      notify(target, uid, 'sent you a connection request');
    } else if (b.action === 'accept') {
      if (!f || f.receiver !== uid || f.status !== 'pending') fail('No request to accept');
      run("UPDATE friendships SET status='accepted' WHERE sender=? AND receiver=?", target, uid);
      notify(target, uid, 'accepted your connection request');
    } else if (b.action === 'remove')
      run(
        'DELETE FROM friendships WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)',
        uid,
        target,
        target,
        uid
      );
    else fail('Invalid action');
    return { ok: true };
  }
  if (path === '/follow' && method === 'POST') {
    const target = Number(b.target);
    if (target === uid || !activeUser(target)) fail('Invalid person');
    if (b.follow) run('INSERT OR IGNORE INTO follows VALUES(?,?)', uid, target);
    else run('DELETE FROM follows WHERE user=? AND target=?', uid, target);
    return { ok: true };
  }
  if (path === '/chats' && method === 'GET')
    return q(
      'SELECT * FROM users WHERE active=1 AND id IN(SELECT sender FROM messages WHERE receiver=? UNION SELECT receiver FROM messages WHERE sender=?)',
      uid,
      uid
    )
      .map((u) => ({
        ...publicUser(u),
        last: one(
          'SELECT * FROM messages WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?) ORDER BY id DESC LIMIT 1',
          uid,
          u.id,
          u.id,
          uid
        ),
        unread: one(
          'SELECT COUNT(*) n FROM messages WHERE sender=? AND receiver=? AND seen=0',
          u.id,
          uid
        ).n
      }))
      .sort((a, b) => b.last.id - a.last.id);
  const cm = path.match(/^\/chats\/(\d+)$/);
  if (cm) {
    const target = Number(cm[1]),
      u = activeUser(target);
    if (!u || target === uid) fail('Conversation unavailable', 404);
    if (method === 'GET') {
      const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
      const rows = q(
        'SELECT m.*,a.type,a.name FROM messages m LEFT JOIN media a ON a.id=m.media WHERE ((sender=? AND receiver=?) OR (sender=? AND receiver=?)) AND m.id<? ORDER BY m.id DESC LIMIT 50',
        uid,
        target,
        target,
        uid,
        before
      ).reverse();
      run(
        'UPDATE messages SET seen=1 WHERE sender=? AND receiver=? AND id>=?',
        target,
        uid,
        rows[0]?.id || before
      );
      return { user: publicUser(u), messages: rows, next: rows.length === 50 ? rows[0].id : null };
    }
    if (method === 'POST') {
      if (u.messages === 'friends' && !friends(uid, target))
        fail('This person accepts messages from friends only.', 403);
      const text = str(b.body, 4000),
        media = ownedMedia(b.media, uid);
      if (!text && !media) fail('Write a message or attach a file.');
      run(
        'INSERT INTO messages(sender,receiver,body,media,created) VALUES(?,?,?,?,?)',
        uid,
        target,
        text,
        media,
        now()
      );
      return { ok: true };
    }
  }
  if (path === '/notifications' && method === 'GET')
    return q(
      'SELECT n.*,u.name,u.avatar FROM notifications n JOIN users u ON u.id=n.actor WHERE n.user=? AND u.active=1 ORDER BY n.id DESC LIMIT 100',
      uid
    );
  if (path === '/notifications' && method === 'POST') {
    if (b.clear) run('DELETE FROM notifications WHERE user=?', uid);
    else run('UPDATE notifications SET seen=1 WHERE user=?', uid);
    return { ok: true };
  }
  if (path === '/stories' && method === 'GET')
    return q(
      "SELECT s.*,u.name,u.avatar,m.type FROM stories s JOIN users u ON u.id=s.user JOIN media m ON m.id=s.media WHERE s.created>? AND u.active=1 AND (s.user=? OR EXISTS(SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.sender=s.user AND f.receiver=?) OR (f.receiver=s.user AND f.sender=?)))) ORDER BY s.created DESC LIMIT 60",
      now() - 86400000,
      uid,
      uid,
      uid
    );
  if (path === '/stories' && method === 'POST') {
    const media = ownedMedia(b.media, uid, ['image/', 'video/']);
    if (!media) fail('Choose a photo or video.');
    run(
      'INSERT INTO stories(user,media,caption,created) VALUES(?,?,?,?)',
      uid,
      media,
      str(b.caption, 300),
      now()
    );
    return { ok: true };
  }
  const sm = path.match(/^\/stories\/(\d+)\/react$/);
  if (sm && method === 'POST') {
    const s = one(
      'SELECT * FROM stories WHERE id=? AND created>?',
      Number(sm[1]),
      now() - 86400000
    );
    if (!s || !activeUser(s.user) || (s.user !== uid && !friends(s.user, uid)))
      fail('Moment expired or unavailable.', 404);
    const kind = choice(b.kind, ['like', 'agree', 'happy', 'sad', 'grateful', 'proud']);
    run(
      'INSERT INTO story_reactions VALUES(?,?,?) ON CONFLICT(story,user) DO UPDATE SET kind=excluded.kind',
      s.id,
      uid,
      kind
    );
    notify(s.user, uid, 'reacted to your daily moment');
    return { ok: true };
  }
  const mm = path.match(/^\/media\/(\d+)$/);
  if (mm && method === 'GET') {
    const m = one('SELECT * FROM media WHERE id=?', Number(mm[1]));
    if (!m) fail('Attachment unavailable', 404);
    const allowed =
      m.owner === uid ||
      one('SELECT 1 FROM users WHERE active=1 AND (avatar=? OR cover=?)', m.id, m.id) ||
      q('SELECT * FROM posts WHERE media=?', m.id).some((p) => canPost(p, uid)) ||
      one('SELECT 1 FROM messages WHERE media=? AND (sender=? OR receiver=?)', m.id, uid, uid) ||
      q('SELECT * FROM stories WHERE media=? AND created>?', m.id, now() - 86400000).some(
        (s) => activeUser(s.user) && (s.user === uid || friends(s.user, uid))
      );
    if (!allowed) fail('Attachment unavailable', 404);
    res.writeHead(200, {
      'Content-Type': m.type,
      'Content-Length': m.bytes.length,
      'Content-Disposition': `${m.type === 'application/pdf' || m.type === 'text/plain' ? 'attachment' : 'inline'}; filename="attachment.${m.type.split('/')[1]}"`,
      'Cache-Control': 'private, no-store'
    });
    res.end(Buffer.from(m.bytes));
    return;
  }
  fail('Not found', 404);
}
export const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  );
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz' && req.method === 'GET') {
      db.prepare('SELECT 1').get();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ app: 'ph.ugnay.app', status: 'ok' }));
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
      const result = await api(req, res, url);
      if (!res.writableEnded) {
        const payload = JSON.stringify(result);
        // api() authenticates and authorizes first, even for conditional requests.
        const etag = '"' + hash(payload) + '"';
        if (req.method === 'GET' && url.pathname !== '/api/config' && url.pathname !== '/api/me') {
          res.setHeader('ETag', etag);
          if (req.headers['if-none-match'] === etag) {
            res.writeHead(304);
            res.end();
            return;
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(payload);
      }
      return;
    }
    if (req.method !== 'GET') fail('Method not allowed', 405);
    const map = {
      '/': 'app/index.html',
      '/App.js': 'app/App.js',
      '/cache.js': 'app/services/cache.js',
      '/style.css': 'app/assets/style.css',
      '/ui.js': 'app/components/ui.js',
      '/i18n.js': 'app/services/i18n.js',
      '/screens.js': 'app/screens/screens.js',
      '/icon.svg': 'app/assets/icon.svg'
    };
    const file = map[url.pathname];
    if (!file) fail('Not found', 404);
    const content = readFileSync(resolve(root, file));
    res.writeHead(200, {
      'Content-Type': {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml'
      }[extname(file)],
      'Cache-Control': url.pathname === '/' ? 'no-cache' : 'public, max-age=300'
    });
    res.end(content);
  } catch (e) {
    if (!res.headersSent) res.writeHead(e.status || 500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ error: e.status ? e.message : 'Something went wrong. Please try again.' })
    );
    if (!e.status) console.error(e);
  }
});
if (process.env.NODE_ENV !== 'test')
  server.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () =>
    console.log('UgnayPH ready on port ' + (process.env.PORT || 3000))
  );
