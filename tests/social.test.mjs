/* UgnayPH — Pinoy Social Media App | Created by: Dominic R. Lanaja | Copyright © 2026. All Rights Reserved. */
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'ugnay-test-'));
const { server, db } = await import('../app/services/server.mjs');
let base;
before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  await new Promise((r) => server.close(r));
  db.close();
  rmSync(process.env.DATA_DIR, { recursive: true });
});
function client() {
  let cookie = '';
  return async (path, method = 'GET', body, expected = 200) => {
    const res = await fetch(base + '/api' + path, {
      method,
      headers: { cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
    assert.equal(res.status, expected, `${method} ${path}: ${await res.clone().text()}`);
    return res.headers.get('content-type').includes('json') ? res.json() : res.arrayBuffer();
  };
}
const alice = client(),
  bob = client(),
  carla = client(),
  guest = client();
let aid, bid, cid, recovery, post, privatePost, media;
const signup = (name) => ({
  name,
  identity: name + '@example.test',
  password: 'StrongPassword123!',
  birthdate: '1995-06-12',
  gender: 'Prefer not to say'
});
test('authentication, session cookies, recovery code and anonymous denial', async () => {
  const a = await alice('/signup', 'POST', signup('Alice'));
  aid = a.user.id;
  recovery = a.recovery;
  bid = (await bob('/signup', 'POST', signup('Bob'))).user.id;
  cid = (await carla('/signup', 'POST', signup('Carla'))).user.id;
  assert.equal(recovery.length, 32);
  assert.equal((await alice('/me')).user.id, aid);
  await guest('/posts', 'GET', undefined, 401);
  await guest('/login', 'POST', { identity: 'Alice@example.test', password: 'wrong' }, 401);
  await guest('/signup', 'POST', signup('Alice'), 400);
});
test('friends-only and private posts are enforced on feed and mutation endpoints', async () => {
  post = await alice('/posts', 'POST', { body: 'Friends', audience: 'friends', section: 'bayan' });
  privatePost = await alice('/posts', 'POST', {
    body: 'Private',
    audience: 'private',
    section: 'bayan'
  });
  assert.equal((await bob('/posts')).posts.length, 0);
  await bob(`/posts/${post.id}/reactions`, 'POST', { kind: 'proud' }, 404);
  await bob('/friends', 'POST', { target: aid, action: 'request' });
  await bob('/friends', 'POST', { target: aid, action: 'accept' }, 400);
  await alice('/friends', 'POST', { target: bid, action: 'accept' });
  assert.equal((await bob('/posts')).posts.length, 1);
  await bob(`/posts/${privatePost.id}/comments`, 'POST', { body: 'No' }, 404);
  await bob(`/posts/${post.id}`, 'DELETE', {}, 403);
});
test('reactions, comments and shares retain original privacy', async () => {
  await bob(`/posts/${post.id}/reactions`, 'POST', { kind: 'proud' });
  await bob(`/posts/${post.id}/comments`, 'POST', { body: 'Great!' });
  const p = (await alice('/posts')).posts.find((x) => x.id === post.id);
  assert.equal(p.comments, 1);
  assert.equal(p.reactions[0].count, 1);
  const share = await bob('/posts', 'POST', {
    body: 'Shared',
    audience: 'public',
    section: 'bayan',
    shared: post.id
  });
  assert.ok(share.sharedPost);
  assert.equal((await carla('/posts')).posts.find((x) => x.id === share.id).sharedPost, null);
  assert.ok((await alice('/notifications')).some((n) => n.body === 'shared your post'));
});
test('attachment ownership and audience authorization', async () => {
  media = await alice('/upload', 'POST', {
    name: 'private.txt',
    type: 'text/plain',
    base64: Buffer.from('private document').toString('base64')
  });
  await bob(
    '/posts',
    'POST',
    { body: 'Stolen', audience: 'public', section: 'bayan', media: media.id },
    400
  );
  await bob('/media/' + media.id, 'GET', undefined, 404);
  await alice('/chats/' + bid, 'POST', { body: 'A file', media: media.id });
  assert.equal(Buffer.from(await bob('/media/' + media.id)).toString(), 'private document');
  await carla('/media/' + media.id, 'GET', undefined, 404);
});
test('message privacy, unread counts, mark read and friends-only setting', async () => {
  await bob('/settings', 'PATCH', {
    language: 'en',
    audience: 'friends',
    messages: 'friends',
    saver: true
  });
  await carla('/chats/' + bid, 'POST', { body: 'Unwanted' }, 403);
  assert.equal((await bob('/me')).unread, 1);
  const chat = await bob('/chats/' + aid);
  assert.equal(chat.messages[0].body, 'A file');
  assert.equal((await bob('/me')).unread, 0);
  assert.equal((await carla('/chats/' + aid)).messages.length, 0);
});
test('stories are friends-only and expire server-side after 24 hours', async () => {
  const photo = await alice('/upload', 'POST', {
    name: 'tiny.png',
    type: 'image/png',
    base64:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lX8AAAAASUVORK5CYII='
  });
  await alice('/stories', 'POST', { media: photo.id, caption: 'Today' });
  const stories = await bob('/stories');
  assert.equal(stories.length, 1);
  assert.equal((await carla('/stories')).length, 0);
  await carla(`/stories/${stories[0].id}/react`, 'POST', { kind: 'happy' }, 404);
  db.prepare('UPDATE stories SET created=?').run(Date.now() - 86400001);
  assert.equal((await bob('/stories')).length, 0);
  await bob(`/stories/${stories[0].id}/react`, 'POST', { kind: 'happy' }, 404);
  await bob('/media/' + photo.id, 'GET', undefined, 404);
});
test('removing a friendship immediately removes access to friends-only posts', async () => {
  await alice('/friends', 'POST', { target: bid, action: 'remove' });
  assert.equal(
    (await bob('/posts')).posts.some((p) => p.id === post.id),
    false
  );
  await bob(`/posts/${post.id}/comments`, 'GET', undefined, 404);
});
test('recovery rotates codes and invalidates sessions', async () => {
  const d = await guest('/reset', 'POST', {
    identity: 'alice@example.test',
    recovery,
    password: 'NewStrongPassword123!'
  });
  assert.notEqual(d.recovery, recovery);
  await alice('/me', 'GET', undefined, 401);
  await guest(
    '/reset',
    'POST',
    { identity: 'alice@example.test', recovery, password: 'AnotherPassword123!' },
    400
  );
  await alice('/login', 'POST', {
    identity: 'alice@example.test',
    password: 'NewStrongPassword123!'
  });
});
test('deactivation hides profile and login reactivates; deletion cascades content', async () => {
  await alice('/account', 'POST', { action: 'deactivate', password: 'NewStrongPassword123!' });
  await bob('/people/' + aid, 'GET', undefined, 404);
  await alice('/login', 'POST', {
    identity: 'alice@example.test',
    password: 'NewStrongPassword123!'
  });
  assert.equal((await bob('/people/' + aid)).id, aid);
  await alice('/account', 'POST', { action: 'delete', password: 'NewStrongPassword123!' });
  await alice('/me', 'GET', undefined, 401);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM media WHERE owner=?').get(aid).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM messages WHERE sender=?').get(aid).n, 0);
});
test('rejects cross-origin state changes and emits browser security headers', async () => {
  const res = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(res.status, 403);
  const page = await fetch(base);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
});

test('passwords retain whitespace and overlong login inputs are rejected', async () => {
  const password = '  Exact Password 123!  ';
  await carla('/account', 'POST', {
    action: 'password',
    password: 'StrongPassword123!',
    newPassword: password
  });
  const other = client();
  await other('/login', 'POST', { identity: 'carla@example.test', password: password.trim() }, 401);
  await other('/login', 'POST', { identity: 'carla@example.test', password });
  await other('/login', 'POST', { identity: 'carla@example.test', password: 'x'.repeat(129) }, 401);
});

test('cursor pagination and following filters do not duplicate or leak posts', async () => {
  for (let i = 0; i < 16; i++)
    await carla('/posts', 'POST', {
      body: 'Page item ' + i,
      audience: 'public',
      section: 'kultura'
    });
  const first = await bob('/posts?section=kultura');
  assert.equal(first.posts.length, 15);
  const second = await bob('/posts?section=kultura&before=' + first.next);
  assert.equal(second.posts.length, 1);
  assert.equal(new Set([...first.posts, ...second.posts].map((p) => p.id)).size, 16);
  assert.equal((await bob('/posts?mode=following&section=kultura')).posts.length, 0);
  await bob('/follow', 'POST', { target: cid, follow: true });
  assert.equal((await bob('/posts?mode=following&section=kultura')).posts.length, 15);
  await bob('/follow', 'POST', { target: cid, follow: false });
  assert.equal((await bob('/posts?mode=following&section=kultura')).posts.length, 0);
});

test('conditional cache responses require fresh authentication and current audience access', async () => {
  const login = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'bob@example.test', password: 'StrongPassword123!' })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  await bob('/friends', 'POST', { target: cid, action: 'request' });
  await carla('/friends', 'POST', { target: bid, action: 'accept' });
  const post = await carla('/posts', 'POST', {
    body: 'Cached friends post',
    audience: 'friends',
    section: 'bayan'
  });
  const path = base + '/api/posts/' + post.id + '/comments';
  const fresh = await fetch(path, { headers: { cookie } });
  assert.equal(fresh.status, 200);
  const etag = fresh.headers.get('etag');
  assert.ok(etag);
  const cached = await fetch(path, { headers: { cookie, 'If-None-Match': etag } });
  assert.equal(cached.status, 304);
  assert.equal(await cached.text(), '');
  assert.equal((await fetch(path, { headers: { 'If-None-Match': etag } })).status, 401);
  await carla('/friends', 'POST', { target: bid, action: 'remove' });
  assert.equal((await fetch(path, { headers: { cookie, 'If-None-Match': etag } })).status, 404);
  const health = await fetch(base + '/healthz');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { app: 'ph.ugnay.app', status: 'ok' });
});
