/* UgnayPH — Pinoy Social Media App | Created by: Dominic R. Lanaja | Copyright © 2026. All Rights Reserved. */
import {
  e,
  icon,
  avatar,
  button,
  time,
  reactions,
  labels,
  audience,
  attachment,
  field,
  select
} from '/ui.js';
import { t } from '/i18n.js';
export const audiences = [
  ['public', 'Public'],
  ['friends', 'Friends only'],
  ['private', 'Only me']
];
export const brand = `<img src="/icon.svg" alt="" class="brand-icon"><span>ugnay<span class="brand-ph">PH</span><small>YOUR FILIPINO HOME ONLINE</small></span>`;
export const footer = `<footer>Created by: <strong>Dominic R. Lanaja</strong><br>© 2026 UgnayPH · Version 1.1</footer>`;
export function auth(mode = 'login', demo = false) {
  return `<div class="auth-layout"><section class="auth-story"><a class="brand" href="/">${brand}</a><span class="eyebrow">MALAPIT SA PUSO. KAHIT NASAAN.</span><h1>${t('A little closer, wherever you are.')}</h1><p>${t('From everyday kwento to the moments that matter. There’s a place for you here.')}</p><div class="auth-art"><span class="sun-disc"></span><div class="mountain m1"></div><div class="mountain m2"></div><div class="sea"></div><div class="art-caption">7,641 islands.<br><strong>One connected community.</strong></div></div>${footer}</section><section class="auth-panel"><button class="language-switch" data-action="language">EN / Filipino</button><div class="auth-form"><span class="eyebrow">TULOY KA.</span><h2>${t(mode === 'signup' ? 'Join the conversation' : mode === 'reset' ? 'Reset password' : 'Welcome home.')}</h2><p class="muted">${t('A space for every Filipino.')}</p><form data-form="${mode}">${mode === 'signup' ? field('Full name', 'name', '', 'text', 'required maxlength="80" autocomplete="name"') : ''}${field('Email or phone', 'identity', '', 'text', 'required autocomplete="username"')}${
    mode === 'signup'
      ? `<div class="form-row">${field('Birthdate', 'birthdate', '', 'date', 'required')}${select(
          'Gender',
          'gender',
          [
            ['Prefer not to say', 'Prefer not to say'],
            ['Female', 'Female'],
            ['Male', 'Male'],
            ['Non-binary', 'Non-binary']
          ],
          'Prefer not to say'
        )}</div>`
      : ''
  }${mode === 'reset' ? field('Recovery code', 'recovery', '', 'text', 'required autocomplete="off"') : ''}${field(mode === 'reset' ? 'New password' : 'Password', 'password', '', 'password', `required minlength="${mode === 'login' ? 1 : 10}" maxlength="128" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"`)}${mode !== 'reset' ? `<label class="check"><input type="checkbox" name="remember">${t('Remember me')}</label>` : '<p class="hint">Use the private recovery code saved when you created your account.</p>'}<p class="form-error" role="alert"></p><button class="primary full" type="submit">${t(mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Sign in')} ${icon('arrow')}</button></form>${mode === 'login' ? `${button('Forgot password?', 'auth-reset', 'text-button')}<div class="divider">or</div>${button('Create account', 'auth-signup', 'secondary full')}${demo ? button('Explore demo', 'demo', 'text-button full') : ''}` : button('Back to sign in', 'auth-login', 'text-button full')}</div></section></div>`;
}
export function shell(s) {
  const nav = [
    ['feed', 'home', 'Home'],
    ['people', 'people', 'Connections'],
    ['chats', 'chat', 'Messages'],
    ['notifications', 'bell', 'Notifications']
  ];
  return `<aside class="sidebar"><a href="#feed" class="brand">${brand}</a><div class="nav-label">YOUR EVERYDAY, CONNECTED</div><nav>${nav.map(([v, i, l]) => `<a href="#${v}" class="nav-item ${s.page === v ? 'active' : ''}">${icon(i)}${t(l)}${v === 'chats' && s.unread ? `<b class="badge">${s.unread}</b>` : v === 'notifications' && s.notifications ? `<b class="badge">${s.notifications}</b>` : ''}</a>`).join('')}</nav><div class="nav-label">${t('Your spaces')}</div><nav>${[
    ['bayan', 'globe', 'Bayan', 'Community'],
    ['pamilya', 'heart', 'Pamilya', 'Family'],
    ['kultura', 'sun', 'Kultura', 'Culture']
  ]
    .map(
      ([v, i, l, sub]) =>
        `<a class="space-link ${s.section === v && s.page === 'feed' ? 'selected' : ''}" href="#feed/${v}"><span class="space-icon ${v}">${icon(i)}</span><span>${l}<small>${t(sub)}</small></span></a>`
    )
    .join(
      ''
    )}</nav><div class="sidebar-bottom"><div class="data-note">${icon('leaf')}<span>${t('Data Saver')}<small>${t(s.me.saver ? 'On' : 'Off')} · ${s.me.saver ? 'A little lighter on data' : 'Your connection, your choice'}</small></span><i class="status-dot"></i></div><a class="nav-item" href="#settings">${icon('settings')}${t('Settings')}</a><a class="nav-item" href="#about">${icon('info')}${t('About UgnayPH')}</a>${footer}</div></aside><div class="workspace"><header class="topbar"><span class="top-title">${s.page === 'feed' ? 'Bayan <span>/ ' + t('Your community') + '</span>' : t({ people: 'Connections', chats: 'Messages', notifications: 'Notifications', profile: 'My profile', settings: 'Settings', about: 'About UgnayPH', help: 'Help & support' }[s.page] || 'Home')}</span><form class="top-search" data-form="search">${icon('search')}<input name="q" aria-label="${t('Search people')}" placeholder="${t('Search people')}…"></form><button class="lang-button" data-action="language">${s.me.language === 'tl' ? 'FIL' : 'EN'} ${icon('globe')}</button><a class="top-profile" href="#profile/${s.me.id}">${avatar(s.me)}<span>${e(s.me.name.split(' ')[0])}</span></a></header><div class="content-grid"><main id="main"></main><aside class="rightbar" id="rightbar"></aside></div><nav class="mobile-nav">${nav.map(([v, i, l]) => `<a href="#${v}" class="${s.page === v ? 'active' : ''}" aria-label="${t(l)}">${icon(i)}<span>${t(l)}</span></a>`).join('')}<a href="#settings" aria-label="${t('Settings')}">${icon('settings')}<span>${t('Settings')}</span></a></nav></div>`;
}
export function welcome(s) {
  return `<section class="welcome"><div><span class="eyebrow">MABUHAY, ${e(s.me.name.split(' ')[0].toUpperCase())} <span>☀</span></span><h1>${t('A little closer, wherever you are.')}</h1><p>${t('Share a moment, find your people, feel at home.')}</p></div><div class="welcome-emblem">${icon('sun')}<span>kwento • kapwa • kultura</span></div></section>`;
}
export function storyBar(stories) {
  return `<section class="moments"><div class="section-heading"><h3>${t('Daily moments')} <span class="small-pill">24h</span></h3><span class="muted tiny">${t('A little of your day')}</span></div><div class="story-list"><button class="add-story" data-action="new-story"><span>${icon('plus')}</span>${t('Add moment')}</button>${stories.map((s) => `<button class="story" data-action="story" data-id="${s.id}"><span class="story-ring">${avatar(s)}</span><span>${e(s.name.split(' ')[0])}</span></button>`).join('')}${!stories.length ? `<p class="hint">${t('Share the small moments that make your day.')}</p>` : ''}</div></section>`;
}
export function composer(s) {
  return `<section class="card composer"><div class="composer-top">${avatar(s.me)}<button data-action="compose">${t('What’s on your mind?')}, ${e(s.me.name.split(' ')[0])}?</button></div><div class="composer-bottom"><button class="text-button" data-action="compose">${icon('image')}<span>${t('Photo / video')}</span></button><button class="text-button feeling" data-action="compose">${icon('sun')}<span>${t('Feeling')}</span></button>${button('Share a post', 'compose', 'primary compact')}</div></section>`;
}
export function postCard(p, s, nested = false) {
  return `<article class="${nested ? 'shared-post' : 'card post'}" data-post="${p.id}"><div class="post-header"><a href="#profile/${p.user}">${avatar(p.author)}</a><div class="post-author"><a href="#profile/${p.user}">${e(p.author.name)}</a><small>${time(p.created)} <span>· ${icon(p.audience === 'public' ? 'globe' : 'people')}${audience(p.audience)}</span></small></div>${!nested ? `<span class="post-space">${e(p.section[0].toUpperCase() + p.section.slice(1))}</span>` : ''}${p.user === s.me.id && !nested ? `<button class="icon-button" data-action="delete-post" data-id="${p.id}" aria-label="${t('Delete post')}">${icon('close')}</button>` : ''}</div>${p.feeling || p.location ? `<div class="post-tag">${e(p.feeling)} ${p.location ? ' · ' + e(p.location) : ''}</div>` : ''}<p class="post-body">${e(p.body)}</p>${attachment(p.attachment, !!s.me.saver)}${p.shared ? (p.sharedPost ? postCard(p.sharedPost, s, true) : '<p class="hint">Original post is no longer available to you.</p>') : ''}${!nested ? `<div class="post-stats"><span>${p.reactions.map((r) => reactions[r.kind]).join('')} ${p.reactions.reduce((n, r) => n + r.count, 0) || t('Be the first to react')}</span><button class="text-button" data-action="comments" data-id="${p.id}">${p.comments} ${t('Comment').toLowerCase()}${document.documentElement.lang === 'en' ? 's' : ''}</button></div><div class="post-actions"><button class="${p.mine ? 'reacted' : ''}" data-action="react" data-id="${p.id}">${p.mine ? reactions[p.mine] : icon('heart')}${t(labels[p.mine] || 'Like')}</button><button data-action="comments" data-id="${p.id}">${icon('chat')}${t('Comment')}</button><button data-action="share" data-id="${p.id}">${icon('share')}${t('Share')}</button></div>` : ''}</article>`;
}
export function rightbar(people) {
  return `<div class="card people-widget"><div class="section-heading"><h3>${t('People you may know')}</h3>${icon('people')}</div>${
    people
      .slice(0, 3)
      .map(
        (u) =>
          `<div class="suggestion"><a href="#profile/${u.id}">${avatar(u)}</a><div><a href="#profile/${u.id}">${e(u.name)}</a><small>${e(u.location || 'UgnayPH community')}</small></div><button class="connect-small" data-action="friend" data-id="${u.id}" data-kind="request" aria-label="${t('Connect')} ${e(u.name)}">${icon('plus')}</button></div>`
      )
      .join('') || `<p class="hint">${t('Your community starts with a connection.')}</p>`
  }<a class="view-all" href="#people">${t('View all')} ${icon('arrow')}</a></div><section class="bulletin"><span class="eyebrow">${t('Bayan bulletin')}</span><div class="bulletin-art">${icon('sun')}<span class="bulletin-lines"></span></div><h2>${t('Made for meaningful connections.')}</h2><p>${t('From everyday kwento to the moments that matter. There’s a place for you here.')}</p><a href="#about">Get to know UgnayPH ${icon('arrow')}</a></section><section class="kind-note">${icon('heart')}<h3>${t('A kinder corner of the internet')}</h3><p>${t('Be thoughtful. Celebrate our differences. Bring a little bayanihan to every conversation.')}</p></section><div class="right-links"><a href="#about">${t('About UgnayPH')}</a> · <a href="#help">${t('Help & support')}</a><p>🇵🇭 For every Filipino, everywhere.</p></div>`;
}
export const empty = (title, subtitle = '', i = 'sun') =>
  `<div class="empty">${icon(i)}<h3>${t(title)}</h3><p>${t(subtitle)}</p></div>`;
export function peoplePage(people, s) {
  const filtered = people.filter((u) =>
    s.peopleTab === 'friends'
      ? u.friend
      : s.peopleTab === 'requests'
        ? u.request?.status === 'pending' && u.request.receiver === s.me.id
        : true
  );
  return `<div class="page-heading"><span class="eyebrow">KAPWA</span><h1>${t('Connections')}</h1><p>${t('Find familiar faces. Make new connections.')}</p></div><div class="tabs">${[
    ['all', 'All people'],
    ['friends', 'Friends'],
    ['requests', 'Requests']
  ]
    .map(([v, l]) =>
      button(l, 'people-tab', s.peopleTab === v ? 'selected' : '', `data-tab="${v}"`)
    )
    .join(
      ''
    )}</div><form class="search-box" data-form="search">${icon('search')}<input name="q" placeholder="${t('Search people')}…" aria-label="${t('Search people')}" value="${e(s.query || '')}"><button class="primary">${t('Search')}</button></form><div class="people-grid">${filtered.map((u) => `<article class="card person-card"><a href="#profile/${u.id}">${avatar(u, true)}<h3>${e(u.name)}</h3></a><p class="muted">${e(u.location || 'UgnayPH')}</p><div class="person-actions">${u.friend ? button('Connected', 'friend', 'secondary', `data-id="${u.id}" data-kind="remove"`) : u.request?.receiver === s.me.id ? button('Accept', 'friend', 'primary', `data-id="${u.id}" data-kind="accept"`) + button('Decline', 'friend', 'text-button', `data-id="${u.id}" data-kind="remove"`) : u.request ? button('Cancel request', 'friend', 'secondary', `data-id="${u.id}" data-kind="remove"`) : button('Connect', 'friend', 'primary', `data-id="${u.id}" data-kind="request"`)}${button(u.following ? 'Unfollow' : 'Follow', 'follow', 'text-button', `data-id="${u.id}" data-follow="${!u.following}"`)}<a href="#chats/${u.id}" class="text-button">${t('Message')}</a></div></article>`).join('') || empty('No results yet')}</div>`;
}
export function settings(s) {
  return `<div class="page-heading"><span class="eyebrow">MAKE YOURSELF AT HOME</span><h1>${t('Settings')}</h1></div><section class="card padded"><h3>${t('Privacy & preferences')}</h3><form data-form="settings">${select(
    'Language',
    'language',
    [
      ['en', 'English'],
      ['tl', 'Filipino']
    ],
    s.me.language
  )}<label class="toggle-row"><span><strong>${t('Data Saver')}</strong><small>${t('Smaller photos. No autoplay. Less data, more connection.')}</small></span><input name="saver" type="checkbox" ${s.me.saver ? 'checked' : ''}></label>${select('Default post audience', 'audience', audiences, s.me.audience)}${select(
    'Who can message you',
    'messages',
    [
      ['everyone', 'Everyone'],
      ['friends', 'Friends only']
    ],
    s.me.messages
  )}<p class="form-error" role="alert"></p><button class="primary">${t('Save changes')}</button></form></section><section class="card padded"><h3>${t('Account & security')}</h3>${['password', 'deactivate', 'delete'].map((v, i) => `<button class="settings-row ${v === 'delete' ? 'danger' : ''}" data-action="account" data-kind="${v}">${t(['Change password', 'Deactivate account', 'Delete account'][i])}${icon('arrow')}</button>`).join('')}<button class="settings-row" data-action="logout">${t('Log out')}${icon('logout')}</button><a class="settings-row" href="#about">${t('About UgnayPH')}${icon('info')}</a><a class="settings-row" href="#help">${t('Help & support')}${icon('arrow')}</a></section>${footer}`;
}
export function about() {
  return `<div class="card about-card"><img src="/icon.svg" alt="UgnayPH" width="88"><span class="eyebrow">KWENTO. KAPWA. KULTURA.</span><h1>UgnayPH — Your Filipino Home Online</h1><h3>Created by: Dominic R. Lanaja</h3><p>Version 1.1 — For Every Filipino, Everywhere</p><hr><p>Ugnay means connection. A space to share our everyday stories, celebrate where we come from, and stay close to the people who matter.</p><p>Rooted in bayanihan. Designed for a lighter connection.</p><a href="#help" class="primary">${t('Help & support')}</a>${footer}</div>`;
}
export function help() {
  return `<div class="page-heading"><h1>${t('Help & support')}</h1></div><section class="card padded"><h3>Getting started / Pagsisimula</h3><p>Create an account and save your recovery code in a safe place. Search Kapwa to connect with friends. Accepted friends see your Friends only posts and daily moments.</p><h3>Photos, videos & files</h3><p>Each attachment can be up to 8 MB. Photos are resized before upload, with smaller sizes in Data Saver mode. Video never autoplays. Supported files: JPEG, PNG, WebP, MP4, WebM, audio, PDF and text. Storage allowance: 100 MB per account.</p><h3>Privacy / Pagkapribado</h3><p>Choose Public, Friends only or Only me on each post. Changing your default audience affects new posts. Shared posts always respect the original audience. Choose friends-only messages in Settings.</p><h3>Password recovery</h3><p>Use “Forgot password?” with your email/phone and private recovery code. Each reset replaces the code. Email and phone identifiers are not verified; no email or SMS is sent by this self-hosted version.</p><h3>Account controls</h3><p>Deactivation hides your profile and posts. Signing in reactivates the account. Deleting permanently removes your account, messages and content from the active database. Server backups are managed by your host.</p><h3>Need help?</h3><p>Contact the operator of your UgnayPH server. This release does not include a staffed support desk, content moderation queue, or background push notifications. Notifications and message counts update while the app is open.</p><a href="#settings" class="secondary">${t('Settings')}</a></section>`;
}
