export function getPrismaDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    // Railway may receive either Supabase's pooler URL or its direct URL.
    // Enabling Prisma's PgBouncer mode for both avoids prepared-statement
    // collisions when a pooled connection is reused between requests.
    url.searchParams.set('pgbouncer', 'true');
    // One connection is too restrictive when admin polling, visitor chat,
    // Socket.IO fallback, and health checks arrive at the same time.
    url.searchParams.set('connection_limit', '3');
    url.searchParams.set('pool_timeout', '30');
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
