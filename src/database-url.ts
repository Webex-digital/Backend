export function getPrismaDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.hostname.includes('pooler.supabase.com') || url.searchParams.get('pgbouncer') === 'true') {
      url.searchParams.set('pgbouncer', 'true');
      url.searchParams.set('connection_limit', '1');
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export function getPrismaOptions() {
  const url = getPrismaDatabaseUrl();
  return url ? { datasources: { db: { url } } } : undefined;
}

export function getPrismaDataSource() {
  const url = getPrismaDatabaseUrl();
  return url ? { url } : undefined;
}
