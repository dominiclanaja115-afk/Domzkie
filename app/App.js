/* UgnayPH — Pinoy Social Media App
 * Created by: Dominic R. Lanaja
 * Copyright © 2026. All Rights Reserved. */
import { t, setLanguage } from '/i18n.js';
import {
  e,
  icon,
  avatar,
  button,
  time,
  reactions,
  labels,
  attachment,
  field,
  select
} from '/ui.js';
import * as screens from '/screens.js';
const app = document.querySelector('#app'),
  modal = document.querySelector('#modal');
const state = {
  me: null,
  page: 'feed',
  section: '',
  mode: 'discover',
  peopleTab: 'all',
  posts: [],
  stories: [],
  people: [],
  query: '',
  next: null,
  unread: 0,
  notifications: 0
};
let authMode = 'login',
  demo = false,
  upload = null,
  observer,
  routeVersion = 0,
  loadingMore = false,
  recorder,
  recordStream,
  recordTimer;
async function api(path, method = 'GET', data) {
  const res = await fetch('/api' + path, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'same-origin'
  });
  const b = await res.json();
  if (!res.ok) {
    if (res.status === 401 && state.me) {
      state.me = null;
      renderAuth();
    }
    throw new Error(b.error || 'Unable to connect.');
  }
  return b;
}
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = t(message);
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
}
function renderAuth() {
  setLanguage(localStorage.getItem('ugnay-language') || 'en');
  app.innerHTML = screens.auth(authMode, demo);
}
function openModal(title, body) {
  stopRecording(true);
  upload = null;
  modal.innerHTML = `<div class="modal-head"><h2>${t(title)}</h2><button data-action="close" aria-label="${t('Cancel')}">${icon('close')}</button></div>${body}`;
  if (!modal.open) modal.showModal();
}
const errorArea = '<p class="form-error" role="alert"></p>';
const uploadField = (accept = 'image/jpeg,image/png,image/webp,video/mp4,video/webm') =>
  `<label class="upload-label">${icon('image')}<input type="file" name="attachment" accept="${accept}" aria-label="${t('Attach file')}"></label><p class="upload-status"></p>`;
function formButtons(label) {
  return `${errorArea}<div class="modal-actions">${button('Cancel', 'close', 'secondary')}<button class="primary" type="submit">${t(label)}</button></div>`;
}
function compose(shared = null) {
  openModal(
    shared ? 'Share' : 'Create post',
    `<form data-form="post" ${shared ? `data-shared="${shared}"` : ''}><label class="field">${t('What’s on your mind?')}<textarea name="body" maxlength="5000" placeholder="Ibahagi ang iyong kwento…"></textarea></label>${shared ? '' : uploadField()}<div class="form-row">${select('Audience', 'audience', screens.audiences, state.me.audience)}${select(
      'Space',
      'section',
      [
        ['bayan', 'Bayan'],
        ['pamilya', 'Pamilya'],
        ['kultura', 'Kultura']
      ],
      state.section || 'bayan'
    )}</div><div class="form-row">${select(
      'Feeling',
      'feeling',
      [
        ['', '—'],
        ['😊 Happy', 'Happy'],
        ['🙏 Grateful', 'Grateful'],
        ['❤️ Proud', 'Proud'],
        ['😢 Sad', 'Sad']
      ],
      ''
    )}${field('Location', 'location', '', 'text', 'maxlength="100"')}</div>${formButtons('Post')}</form>`
  );
}
function feedQuery(before) {
  const p = new URLSearchParams();
  if (state.section) p.set('section', state.section);
  if (state.page === 'profile') p.set('user', state.id);
  else p.set('mode', state.mode);
  if (before) p.set('before', before);
  return '/posts?' + p;
}
function renderPosts() {
  const el = document.querySelector('#posts');
  if (!el) return;
  el.innerHTML =
    state.posts.map((p) => screens.postCard(p, state)).join('') ||
    screens.empty('No posts yet', 'Start a conversation with your community.');
  document.querySelector('#load-slot').innerHTML = state.next
    ? button('Load more', 'more', 'secondary full')
    : `<p class="hint center">${t('You’re all caught up')} · ☀</p>`;
  if (observer) observer.disconnect();
  if (state.next) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(document.querySelector('#load-slot'));
  }
}
async function loadMore() {
  if (loadingMore || !state.next) return;
  loadingMore = true;
  const version = routeVersion;
  try {
    const d = await api(feedQuery(state.next));
    if (version !== routeVersion) return;
    state.posts.push(...d.posts);
    state.next = d.next;
    renderPosts();
  } catch (err) {
    toast(err.message);
    observer?.disconnect();
  } finally {
    loadingMore = false;
  }
}
async function route() {
  if (!state.me) return;
  const version = ++routeVersion;
  observer?.disconnect();
  stopRecording(true);
  const [page, id] = (location.hash.slice(1) || 'feed').split('/');
  state.page = [
    'feed',
    'people',
    'chats',
    'notifications',
    'settings',
    'about',
    'help',
    'profile'
  ].includes(page)
    ? page
    : 'feed';
  state.id = Number(id) || null;
  state.chat = null;
  state.section = state.page === 'feed' && ['bayan', 'pamilya', 'kultura'].includes(id) ? id : '';
  setLanguage(state.me.language);
  app.innerHTML = screens.shell(state);
  const main = document.querySelector('#main');
  main.innerHTML = '<div class="loading">Sandali lang…</div>';
  try {
    if (state.page === 'feed' || state.page === 'profile') {
      const [feed, people, stories, profile] = await Promise.all([
        api(feedQuery()),
        api('/people'),
        state.page === 'feed' ? api('/stories') : [],
        state.page === 'profile' ? api('/people/' + (state.id || state.me.id)) : null
      ]);
      if (version !== routeVersion) return;
      state.posts = feed.posts;
      state.next = feed.next;
      state.people = people;
      state.stories = stories;
      if (profile)
        main.innerHTML = `<section class="card"><div class="profile-cover">${profile.cover ? `<img src="/api/media/${profile.cover}" alt="Cover photo">` : ''}</div><div class="profile-details">${avatar(profile, true)}<h1>${e(profile.name)}</h1><p>${e(profile.bio)}</p><div class="profile-meta">${[
          profile.location,
          profile.work,
          profile.school
        ]
          .filter(Boolean)
          .map((x) => `<span>${e(x)}</span>`)
          .join(
            ''
          )}</div>${profile.id === state.me.id ? button('Edit profile', 'edit-profile', 'secondary') : `<a class="primary" href="#chats/${profile.id}">${t('Message')}</a> <a class="secondary" href="#people">${t('Connections')}</a>`}</div></section><div id="posts"></div><div id="load-slot"></div>`;
      else
        main.innerHTML = `${screens.welcome(state)}<nav class="mobile-spaces"><a href="#feed" class="${!state.section ? 'selected' : ''}">${t('Discover')}</a>${['bayan', 'pamilya', 'kultura'].map((v) => `<a href="#feed/${v}" class="${state.section === v ? 'selected' : ''}">${v[0].toUpperCase() + v.slice(1)}</a>`).join('')}</nav>${screens.storyBar(stories)}${screens.composer(state)}<div class="feed-heading"><h3>${t('Your feed')} ${state.section ? `<span class="small-pill">${e(state.section)}</span>` : ''}</h3><div class="tabs">${[
          ['discover', 'Discover'],
          ['following', 'Following']
        ]
          .map(([v, l]) =>
            button(l, 'feed-mode', state.mode === v ? 'selected' : '', `data-mode="${v}"`)
          )
          .join('')}</div></div><div id="posts"></div><div id="load-slot"></div>`;
      renderPosts();
      document.querySelector('#rightbar').innerHTML = screens.rightbar(
        people.filter((u) => !u.request)
      );
    } else if (state.page === 'people') {
      state.people = await api('/people?q=' + encodeURIComponent(state.query));
      if (version !== routeVersion) return;
      main.innerHTML = screens.peoplePage(state.people, state);
    } else if (state.page === 'settings') main.innerHTML = screens.settings(state);
    else if (state.page === 'about') main.innerHTML = screens.about();
    else if (state.page === 'help') main.innerHTML = screens.help();
    else if (state.page === 'notifications') {
      const list = await api('/notifications');
      if (version !== routeVersion) return;
      main.innerHTML = `<div class="page-heading"><span class="eyebrow">STAY IN THE LOOP</span><h1>${t('Notifications')}</h1><div class="form-row">${button('Mark all read', 'read-notifications', 'secondary')}${button('Clear all', 'clear-notifications', 'text-button')}</div></div><section class="card">${list.map((n) => `<div class="notification ${!n.seen ? 'unread' : ''}">${avatar(n)}<div><p><strong>${e(n.name)}</strong> ${e(n.body)}</p><small>${time(n.created)}</small></div>${!n.seen ? '<i class="status-dot"></i>' : ''}</div>`).join('') || screens.empty('Nothing new yet', 'Your notifications will appear here.', 'bell')}</section>`;
    } else if (state.page === 'chats') {
      if (state.id) {
        const chat = await api('/chats/' + state.id);
        if (version !== routeVersion) return;
        state.chat = chat;
        main.innerHTML = `<section class="card"><div class="chat-header"><a href="#chats" aria-label="Back">←</a>${avatar(chat.user)}<div><strong>${e(chat.user.name)}</strong><small>${Date.now() - chat.user.last_seen < 60000 ? t('Online now') : t('Last seen') + ' ' + (chat.user.last_seen ? time(chat.user.last_seen) : '—')}</small></div></div><div class="message-list" id="messages"></div><form class="chat-compose" data-form="message"><textarea class="input" name="body" maxlength="4000" placeholder="${t('Write a message…')}" aria-label="${t('Message')}"></textarea><label class="upload-label">${icon('file')}<input type="file" name="attachment" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/webm,audio/ogg,audio/mp4,application/pdf,text/plain" aria-label="${t('Attach file')}"></label><p class="upload-status"></p><div class="form-row">${button('Voice message', 'record', 'text-button')}<button class="primary" type="submit">${t('Send')} ${icon('arrow')}</button></div>${errorArea}</form></section>`;
        renderMessages(true);
      } else {
        const chats = await api('/chats');
        if (version !== routeVersion) return;
        main.innerHTML = `<div class="page-heading"><span class="eyebrow">USAP TAYO</span><h1>${t('Messages')}</h1><a href="#people" class="primary">${t('New message')}</a></div><section class="card">${chats.map((c) => `<a class="chat-link" href="#chats/${c.id}">${avatar(c)}<div><h3>${e(c.name)}</h3><p>${e(c.last.body || 'Attachment')}</p></div>${c.unread ? `<b class="badge">${c.unread}</b>` : ''}</a>`).join('') || screens.empty('Choose a connection to start chatting.', '', 'chat')}</section>`;
      }
    }
    if (version === routeVersion && !document.querySelector('#rightbar').innerHTML)
      document.querySelector('#rightbar').innerHTML = screens.rightbar([]);
  } catch (err) {
    if (version === routeVersion && state.me)
      main.innerHTML = `${screens.empty('Unable to load', err.message)}${button('Try again', 'retry', 'secondary')}`;
  }
}
function renderMessages(scroll = false) {
  const el = document.querySelector('#messages');
  if (!el) return;
  const previousTop = el.scrollTop;
  el.innerHTML =
    (state.chat.next ? button('Earlier messages', 'earlier', 'text-button') : '') +
    state.chat.messages
      .map(
        (m) =>
          `<div class="bubble ${m.sender === state.me.id ? 'mine' : ''}"><p>${e(m.body)}</p>${m.media ? attachment({ id: m.media, type: m.type, name: m.name }, !!state.me.saver) : ''}<small>${time(m.created)}${m.sender === state.me.id && m.seen ? ' · ✓✓' : ''}</small></div>`
      )
      .join('');
  el.scrollTop = scroll ? el.scrollHeight : previousTop;
}
async function refreshSession() {
  if (!state.me || document.hidden) return;
  try {
    const d = await api('/me');
    Object.assign(state, { unread: d.unread, notifications: d.notifications });
    if (state.page === 'chats' && state.id && state.chat && !loadingMore) {
      const chat = await api('/chats/' + state.id);
      if (state.page === 'chats' && chat.user.id === state.id) {
        const older = state.chat.messages.filter((m) => m.id < (chat.messages[0]?.id || Infinity));
        const changed =
          JSON.stringify(chat.messages) !== JSON.stringify(state.chat.messages.slice(-50));
        state.chat = {
          ...chat,
          messages: [...older, ...chat.messages],
          next: older.length ? state.chat.next : chat.next
        };
        if (changed) renderMessages(true);
      }
    }
    for (const [page, count] of [
      ['chats', state.unread],
      ['notifications', state.notifications]
    ]) {
      const nav = document.querySelector(`.sidebar a[href="#${page}"]`);
      if (nav) {
        nav.querySelector('.badge')?.remove();
        if (count) nav.insertAdjacentHTML('beforeend', `<b class="badge">${count}</b>`);
      }
    }
  } catch {}
}
async function showComments(id) {
  const comments = await api('/posts/' + id + '/comments');
  openModal(
    'Comment',
    `<div class="comments-list">${comments.map((c) => `<div class="comment-item">${avatar(c)}<div><strong>${e(c.name)}</strong><p>${e(c.body)}</p><small>${time(c.created)}</small></div></div>`).join('') || screens.empty('Start a conversation with your community.')}</div><form data-form="comment" data-id="${id}"><label class="field"><textarea name="body" required maxlength="2000" placeholder="${t('Write a comment…')}" aria-label="${t('Comment')}"></textarea></label>${formButtons('Send')}</form>`
  );
}
function recoveryModal(code) {
  openModal(
    'Recovery code',
    `<p>Save this private code in a password manager. It is required to reset your password. Never share it.</p><p class="recovery">${e(code)}</p>${button('I saved my code', 'close', 'primary full')}`
  );
}
function stopRecording(discard = false) {
  clearTimeout(recordTimer);
  if (recorder && recorder.state !== 'inactive') {
    if (discard) recorder.onstop = null;
    recorder.stop();
  }
  recordStream?.getTracks().forEach((track) => track.stop());
  recorder = null;
  recordStream = null;
}
async function uploadFile(file, container) {
  if (!file) return null;
  const status = container.querySelector('.upload-status');
  if (status) status.textContent = 'Preparing attachment…';
  let blob = file;
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    const image = await createImageBitmap(file);
    const max = state.me.saver ? 960 : 1600,
      scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', state.me.saver ? 0.65 : 0.85)
    );
    if (!blob) throw Error('Unable to process image.');
  }
  if (blob.size > 8 * 1024 * 1024) throw Error('Maximum attachment size is 8 MB.');
  const data = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  const result = await api('/upload', 'POST', {
    base64: data,
    type: blob.type.split(';')[0],
    name: file.name || 'Voice message.webm'
  });
  if (status)
    status.textContent = `✓ ${file.name || 'Voice message'} · ${Math.ceil(blob.size / 1024)} KB`;
  return result;
}
document.addEventListener('change', async (event) => {
  if (event.target.name !== 'attachment') return;
  const form = event.target.closest('form');
  const submit = form?.querySelector('[type=submit]');
  if (submit) submit.disabled = true;
  upload = null;
  event.target.disabled = true;
  try {
    const result = await uploadFile(event.target.files[0], form);
    if (form.isConnected) upload = result ? { ...result, form } : null;
  } catch (err) {
    toast(err.message);
    form.querySelector('.upload-status').textContent = err.message;
    event.target.value = '';
  } finally {
    event.target.disabled = false;
    if (submit) submit.disabled = false;
  }
});
document.addEventListener('click', async (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action,
    id = Number(el.dataset.id);
  try {
    if (a === 'close') {
      stopRecording(true);
      modal.close();
    } else if (a.startsWith('auth-')) {
      authMode = a.slice(5);
      renderAuth();
    } else if (a === 'language') {
      const lang =
        (state.me?.language || localStorage.getItem('ugnay-language') || 'en') === 'en'
          ? 'tl'
          : 'en';
      localStorage.setItem('ugnay-language', lang);
      if (state.me) {
        state.me = (await api('/settings', 'PATCH', { ...state.me, language: lang })).user;
        await route();
      } else renderAuth();
    } else if (a === 'demo') {
      const d = await api('/login', 'POST', {
        identity: 'maria@ugnay.example',
        password: 'UgnayDemo2026!',
        remember: false
      });
      state.me = d.user;
      location.hash = 'feed';
      await route();
    } else if (a === 'compose') compose();
    else if (a === 'share') compose(id);
    else if (a === 'retry') await route();
    else if (a === 'more') await loadMore();
    else if (a === 'feed-mode') {
      state.mode = el.dataset.mode;
      await route();
    } else if (a === 'people-tab') {
      state.peopleTab = el.dataset.tab;
      await route();
    } else if (a === 'react') {
      openModal(
        'Reactions',
        `<div class="reaction-list">${Object.entries(reactions)
          .map(
            ([v, emoji]) =>
              `<button data-action="reaction" data-id="${id}" data-kind="${v}"><span>${emoji}</span>${t(labels[v])}</button>`
          )
          .join(
            ''
          )}</div>${button('Remove reaction', 'reaction', 'text-button full', `data-id="${id}" data-kind=""`)}`
      );
    } else if (a === 'reaction') {
      const p = await api('/posts/' + id + '/reactions', 'POST', { kind: el.dataset.kind });
      state.posts = state.posts.map((x) => (x.id === id ? p : x));
      modal.close();
      renderPosts();
    } else if (a === 'comments') await showComments(id);
    else if (a === 'delete-post') {
      openModal(
        'Delete post',
        `<p>This post and its comments will be permanently deleted.</p>${button('Delete post', 'confirm-delete-post', 'primary', `data-id="${id}"`)}`
      );
    } else if (a === 'confirm-delete-post') {
      await api('/posts/' + id, 'DELETE');
      modal.close();
      await route();
    } else if (a === 'friend') {
      if (el.dataset.kind === 'remove' && state.people.find((p) => p.id === id)?.friend) {
        openModal(
          'Remove connection',
          `<p>Friends-only content will no longer be shared between you.</p>${button('Remove connection', 'confirm-remove-friend', 'primary', `data-id="${id}"`)}`
        );
      } else {
        await api('/friends', 'POST', { target: id, action: el.dataset.kind });
        toast(el.dataset.kind === 'accept' ? 'Connected' : 'Saved');
        await route();
      }
    } else if (a === 'confirm-remove-friend') {
      await api('/friends', 'POST', { target: id, action: 'remove' });
      modal.close();
      await route();
    } else if (a === 'follow') {
      await api('/follow', 'POST', { target: id, follow: el.dataset.follow === 'true' });
      await route();
    } else if (a === 'read-notifications' || a === 'clear-notifications') {
      await api('/notifications', 'POST', { clear: a === 'clear-notifications' });
      state.notifications = 0;
      await route();
    } else if (a === 'logout') {
      await api('/logout', 'POST', {});
      state.me = null;
      stopRecording(true);
      renderAuth();
    } else if (a === 'edit-profile') {
      openModal(
        'Edit profile',
        `<form data-form="profile">${field('Full name', 'name', state.me.name, 'text', 'required maxlength="80"')}<label class="field">${t('Bio')}<textarea name="bio" maxlength="300">${e(state.me.bio)}</textarea></label>${field('Location / hometown', 'location', state.me.location, 'text', 'maxlength="100"')}${field('Work', 'work', state.me.work, 'text', 'maxlength="100"')}${field('School', 'school', state.me.school, 'text', 'maxlength="100"')}${select(
          'Photo',
          'photoKind',
          [
            ['avatar', 'Profile photo'],
            ['cover', 'Cover photo']
          ],
          'avatar'
        )}${uploadField('image/jpeg,image/png,image/webp')}${formButtons('Save changes')}</form>`
      );
    } else if (a === 'account') {
      const kind = el.dataset.kind;
      openModal(
        { password: 'Change password', deactivate: 'Deactivate account', delete: 'Delete account' }[
          kind
        ],
        `<form data-form="account" data-kind="${kind}"><p class="hint">${kind === 'delete' ? 'Permanently deletes your profile, posts, messages, and uploaded files. This cannot be undone.' : kind === 'deactivate' ? 'Your profile and posts will be hidden. Sign in again to reactivate.' : 'Other sessions will be signed out.'}</p>${field('Current password', 'password', '', 'password', 'required autocomplete="current-password"')}${kind === 'password' ? field('New password', 'newPassword', '', 'password', 'required minlength="10" maxlength="128" autocomplete="new-password"') : ''}${formButtons(kind === 'password' ? 'Change password' : kind === 'delete' ? 'Delete account' : 'Deactivate account')}</form>`
      );
    } else if (a === 'new-story')
      openModal(
        'Daily moment',
        `<form data-form="story"><p class="hint">${t('Visible to friends for 24 hours.')}</p>${uploadField()}${field('Caption', 'caption', '', 'text', 'maxlength="300"')}${formButtons('Share moment')}</form>`
      );
    else if (a === 'story') {
      const s = state.stories.find((x) => x.id === id);
      if (!s) return;
      openModal(
        'Daily moment',
        `${attachment({ id: s.media, type: s.type, name: s.caption }, !!state.me.saver)}<p class="story-caption"><strong>${e(s.name)}</strong><br>${e(s.caption)}</p><div class="reaction-list">${Object.entries(
          reactions
        )
          .map(
            ([v, emoji]) =>
              `<button data-action="story-react" data-id="${id}" data-kind="${v}" aria-label="${t(labels[v])}">${emoji}</button>`
          )
          .join('')}</div>`
      );
    } else if (a === 'story-react') {
      await api('/stories/' + id + '/react', 'POST', { kind: el.dataset.kind });
      modal.close();
      toast('Sent');
    } else if (a === 'earlier') {
      const d = await api('/chats/' + state.id + '?before=' + state.chat.next);
      state.chat.messages.unshift(...d.messages);
      state.chat.next = d.next;
      renderMessages();
    } else if (a === 'record') {
      if (recorder) {
        stopRecording();
        el.textContent = t('Voice message');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw Error(
          'Voice recording needs HTTPS and a supported browser. You can attach an audio file instead.'
        );
      recordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      recorder = new MediaRecorder(recordStream);
      recorder.ondataavailable = (ev) => chunks.push(ev.data);
      const type = recorder.mimeType;
      const form = el.closest('form');
      recorder.onstop = async () => {
        try {
          const result = await uploadFile(
            new File(chunks, 'Voice message.webm', { type: type.split(';')[0] }),
            form
          );
          if (form.isConnected) upload = { ...result, form };
        } catch (err) {
          toast(err.message);
        } finally {
          form.querySelector('[type=submit]').disabled = false;
          el.textContent = t('Voice message');
        }
      };
      form.querySelector('[type=submit]').disabled = true;
      recorder.start();
      recordTimer = setTimeout(() => stopRecording(), 60000);
      el.textContent = t('Stop recording');
    }
  } catch (err) {
    toast(err.message);
  }
});
document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const type = form.dataset.form;
  const submit = form.querySelector('[type=submit]') || form.querySelector('button');
  const error = form.querySelector('.form-error');
  if (error) error.textContent = '';
  if (submit) submit.disabled = true;
  try {
    if (type === 'signup' || type === 'login') {
      data.remember = form.elements.remember.checked;
      const d = await api('/' + type, 'POST', data);
      state.me = d.user;
      location.hash = 'feed';
      await route();
      if (d.recovery) recoveryModal(d.recovery);
    } else if (type === 'reset') {
      const d = await api('/reset', 'POST', data);
      authMode = 'login';
      renderAuth();
      recoveryModal(d.recovery);
    } else if (type === 'search') {
      state.query = data.q;
      state.peopleTab = 'all';
      if (state.page === 'people') await route();
      else location.hash = 'people';
    } else if (type === 'post') {
      await api('/posts', 'POST', {
        ...data,
        media: upload?.form === form ? upload.id : undefined,
        shared: form.dataset.shared
      });
      modal.close();
      toast('Shared');
      await route();
    } else if (type === 'comment') {
      await api('/posts/' + form.dataset.id + '/comments', 'POST', data);
      await showComments(Number(form.dataset.id));
      const p = state.posts.find((x) => x.id === Number(form.dataset.id));
      if (p) p.comments++;
      renderPosts();
    } else if (type === 'settings') {
      data.saver = form.elements.saver.checked;
      state.me = (await api('/settings', 'PATCH', data)).user;
      toast('Saved');
      await route();
    } else if (type === 'profile') {
      const payload = { ...state.me, ...data };
      if (upload?.form === form) payload[data.photoKind] = upload.id;
      state.me = (await api('/profile', 'PATCH', payload)).user;
      modal.close();
      toast('Saved');
      await route();
    } else if (type === 'account') {
      await api('/account', 'POST', { ...data, action: form.dataset.kind });
      modal.close();
      toast('Saved');
      if (form.dataset.kind !== 'password') {
        state.me = null;
        renderAuth();
      }
    } else if (type === 'story') {
      await api('/stories', 'POST', {
        ...data,
        media: upload?.form === form ? upload.id : undefined
      });
      modal.close();
      toast('Shared');
      await route();
    } else if (type === 'message') {
      await api('/chats/' + state.id, 'POST', {
        body: data.body,
        media: upload?.form === form ? upload.id : undefined
      });
      form.reset();
      upload = null;
      form.querySelector('.upload-status').textContent = '';
      const d = await api('/chats/' + state.id);
      state.chat = d;
      renderMessages(true);
    }
  } catch (err) {
    if (error) error.textContent = err.message;
    else toast(err.message);
  } finally {
    if (submit) submit.disabled = false;
  }
});
modal.addEventListener('cancel', () => stopRecording(true));
window.addEventListener('hashchange', () => {
  modal.close();
  upload = null;
  route();
});
window.addEventListener('online', () => toast('Connection restored'));
window.addEventListener('offline', () =>
  toast('You are offline. Reconnect to load or share updates.')
);
setInterval(refreshSession, 15000);
try {
  demo = (await api('/config')).demo;
  const d = await api('/me');
  state.me = d.user;
  state.unread = d.unread;
  state.notifications = d.notifications;
  await route();
} catch {
  renderAuth();
}
