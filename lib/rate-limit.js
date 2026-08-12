const buckets = new Map();

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'] || req.headers.get?.('x-forwarded-for');
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function rateLimit(key, { windowMs = 60_000, max = 30 } = {}) {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.reset) {
    bucket = { count: 0, reset: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (now >= v.reset) buckets.delete(k);
    }
  }

  return bucket.count <= max;
}
