import { getStore } from '@netlify/blobs';

const MAX_RETRIES = 3;

// Track ids are the track file paths from the post front matter
function isValidId(id) {
  return typeof id === 'string' && id.startsWith('/assets/music/') && id.length <= 200;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Read the count, write count + 1 only if nobody changed it meanwhile
async function increment(store, key) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const entry = await store.getWithMetadata(key, { type: 'json' });
    const count = (entry ? entry.data : 0) + 1;
    const options = entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true };
    const { modified } = await store.setJSON(key, count, options);
    if (modified) return count;
  }
  return null;
}

export default async (req) => {
  const store = getStore({ name: 'plays', consistency: 'strong' });

  if (req.method === 'GET') {
    const ids = (new URL(req.url).searchParams.get('ids') || '').split(',').filter(isValidId);
    const counts = {};
    await Promise.all(
      ids.map(async (id) => {
        counts[id] = (await store.get(encodeURIComponent(id), { type: 'json' })) || 0;
      }),
    );
    return json(counts);
  }

  if (req.method === 'POST') {
    let id;
    try {
      ({ id } = await req.json());
    } catch (e) {
      return json({ error: 'Invalid body' }, 400);
    }
    if (!isValidId(id)) return json({ error: 'Invalid id' }, 400);

    const count = await increment(store, encodeURIComponent(id));
    if (count === null) return json({ error: 'Busy, try again' }, 409);
    return json({ id, count });
  }

  return json({ error: 'Method not allowed' }, 405);
};
