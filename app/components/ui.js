/* UgnayPH — Pinoy Social Media App | Created by: Dominic R. Lanaja | Copyright © 2026. All Rights Reserved. */
import { t } from '/i18n.js';
export const e = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const paths = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m5-3.87a4 4 0 0 1 0 7.75',
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0-6v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14',
  image: 'M3 3h18v18H3zM3 17l6-6 5 5 3-3 4 4M16 7h.01',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  share:
    'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m0 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6m3-4 6-4m-6 7 6 4',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
  leaf: 'M20 3C4 2 2 10 5 16s15 7 15-13ZM4 21l10-12',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  logout: 'M9 3H3v18h6m5-14 5 5-5 5m-7-5h12',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0Zm-3 6v1a6 6 0 0 0 12 0v-1m-6 7v4m-4 0h8',
  file: 'M14 2H4v20h16V8Zm0 0v6h6',
  info: 'M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  flag: 'M4 22V3c6-5 10 5 16 0v12c-6 5-10-5-16 0'
};
export const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.sun}"/></svg>`;
export const avatar = (u, large = false) =>
  u.avatar
    ? `<img class="avatar ${large ? 'large' : ''}" src="/api/media/${Number(u.avatar)}" alt="" loading="lazy">`
    : `<span class="avatar color${Number(u.id || 0) % 5} ${large ? 'large' : ''}">${e(
        (u.name || 'U')
          .split(' ')
          .map((x) => x[0])
          .slice(0, 2)
          .join('')
      )}</span>`;
export const button = (label, action, cls = 'secondary', extra = '') =>
  `<button type="button" class="${cls}" data-action="${action}" ${extra}>${t(label)}</button>`;
export const time = (v) =>
  new Intl.RelativeTimeFormat(document.documentElement.lang, { numeric: 'auto' }).format(
    -Math.max(
      0,
      Math.floor(
        (Date.now() - v) /
          (Date.now() - v < 3600000 ? 60000 : Date.now() - v < 86400000 ? 3600000 : 86400000)
      )
    ),
    Date.now() - v < 3600000 ? 'minute' : Date.now() - v < 86400000 ? 'hour' : 'day'
  );
export const reactions = {
  like: '♡',
  agree: '✅',
  happy: '😊',
  sad: '😢',
  grateful: '🙏',
  proud: '❤️'
};
export const labels = {
  like: 'Like',
  agree: 'Agree',
  happy: 'Happy',
  sad: 'Sad',
  grateful: 'Grateful',
  proud: 'Proud'
};
export const audience = (v) =>
  t({ public: 'Public', friends: 'Friends only', private: 'Only me' }[v]);
export function attachment(m, saver = false) {
  if (!m) return '';
  const url = '/api/media/' + Number(m.id || m.media);
  if (m.type?.startsWith('image/'))
    return `<img class="post-image" loading="lazy" src="${url}" alt="${e(m.name || 'Shared photo')}">`;
  if (m.type?.startsWith('video/'))
    return `<video class="post-image" controls playsinline preload="${saver ? 'none' : 'metadata'}" src="${url}"></video>`;
  if (m.type?.startsWith('audio/')) return `<audio controls preload="none" src="${url}"></audio>`;
  return `<a class="file-link" href="${url}" target="_blank" rel="noopener">${icon('file')}${e(m.name || 'Attachment')}</a>`;
}
export const field = (label, name, value = '', type = 'text', extra = '') =>
  `<label class="field">${t(label)}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;
export const select = (label, name, values, value) =>
  `<label class="field">${t(label)}<select name="${name}">${values.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label>`;
