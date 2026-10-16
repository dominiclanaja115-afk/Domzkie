/* UgnayPH — Pinoy Social Media App | Created by: Dominic R. Lanaja | Copyright © 2026. All Rights Reserved. */
// Explicit, synthetic development fixtures. Never run on a public community database.
process.env.NODE_ENV = 'test';
const { db } = await import('../app/services/server.mjs');
const { randomBytes, scryptSync, createHash } = await import('node:crypto');
const { readFileSync, existsSync } = await import('node:fs');
if (db.prepare('SELECT COUNT(*) n FROM users').get().n)
  throw Error('Seed requires an empty database.');
function add(name, identity, location, bio) {
  const salt = randomBytes(16).toString('hex');
  return Number(
    db
      .prepare(
        'INSERT INTO users(name,identity,password,recovery,birthdate,gender,location,bio,last_seen) VALUES(?,?,?,?,?,?,?,?,?)'
      )
      .run(
        name,
        identity,
        salt + ':' + scryptSync('UgnayDemo2026!', salt, 32).toString('hex'),
        createHash('sha256').update(randomBytes(32)).digest('hex'),
        '1995-06-12',
        'Prefer not to say',
        location,
        bio,
        Date.now() - 180000
      ).lastInsertRowid
  );
}
const maria = add(
  'Maria Santos',
  'maria@ugnay.example',
  'Quezon City',
  'Finding joy in the little things. Kape, kwento, at kaunting araw. ☀'
);
const users = [
  add(
    'Miguel Reyes',
    'miguel@ugnay.example',
    'El Nido, Palawan',
    'Island mornings & everyday adventures.'
  ),
  add('Isabella Cruz', 'isabella@ugnay.example', 'Baguio City', 'Growing slowly. Creating always.'),
  add('Paolo Dela Cruz', 'paolo@ugnay.example', 'Makati City', 'Design, coffee, and community.'),
  add('Sofia Garcia', 'sofia@ugnay.example', 'Cebu City', 'Collecting stories from home.'),
  add(
    'Lorenzo Aquino',
    'lorenzo@ugnay.example',
    'Iloilo City',
    'A little music makes the day better.'
  ),
  add('Andrea Mendoza', 'andrea@ugnay.example', 'Davao City', 'Good food. Better company.')
];
for (const u of users.slice(0, 3))
  db.prepare('INSERT INTO friendships VALUES(?,?,?)').run(maria, u, 'accepted');
let photo = null;
const photoPath = new URL('../app/assets/palawan.jpg', import.meta.url);
if (existsSync(photoPath))
  photo = Number(
    db
      .prepare('INSERT INTO media(owner,name,type,bytes,created) VALUES(?,?,?,?,?)')
      .run(
        users[0],
        'A quiet morning by the islands',
        'image/jpeg',
        readFileSync(photoPath),
        Date.now()
      ).lastInsertRowid
  );
const post = (user, body, section, media = null, minutes = 10) =>
  Number(
    db
      .prepare(
        'INSERT INTO posts(user,body,media,audience,section,feeling,location,created) VALUES(?,?,?,?,?,?,?,?)'
      )
      .run(user, body, media, 'public', section, '', '', Date.now() - minutes * 60000)
      .lastInsertRowid
  );
post(
  users[4],
  'May bagong tugtugin para sa weekend. What’s a Filipino song that always reminds you of home? 🎶',
  'kultura',
  null,
  200
);
post(
  users[1],
  'Slow mornings, warm pandesal, and a table full of stories. Sometimes, the simplest things feel the most like home.\n\nAnong kwentong pamilya ninyo ngayong araw? 🤎',
  'pamilya',
  null,
  95
);
const p = post(
  users[0],
  'Some places remind you to slow down. 🌿\nA quiet morning in El Nido — grateful to call these islands home.\n\nSaan ang happy place ninyo?',
  'bayan',
  photo,
  24
);
for (const [i, u] of [maria, ...users.slice(1)].entries())
  db.prepare('INSERT INTO reactions VALUES(?,?,?)').run(
    p,
    u,
    ['proud', 'grateful', 'happy'][i % 3]
  );
db.prepare('INSERT INTO comments(post,user,body,created) VALUES(?,?,?,?)').run(
  p,
  maria,
  'Ang ganda! Nothing quite like home. ☀',
  Date.now() - 600000
);
if (photo)
  db.prepare('INSERT INTO stories(user,media,caption,created) VALUES(?,?,?,?)').run(
    users[0],
    photo,
    'A little island sunshine for your day.',
    Date.now() - 3600000
  );
db.prepare('INSERT INTO messages(sender,receiver,body,created) VALUES(?,?,?,?)').run(
  users[0],
  maria,
  'Kumusta, Maria! Hope your week is off to a lovely start. ☀',
  Date.now() - 600000
);
db.prepare('INSERT INTO notifications(user,actor,body,created) VALUES(?,?,?,?)').run(
  maria,
  users[0],
  'accepted your connection request',
  Date.now() - 3600000
);
console.log('Synthetic demo ready. Sign in: maria@ugnay.example / UgnayDemo2026!');
db.close();
