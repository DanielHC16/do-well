import { useEffect, useState } from "react";

import type { AssignmentGateway } from "@/features/assignments/data/assignment-gateway";

type ActivityReader = Pick<AssignmentGateway, "listUserActivity">;

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, Readonly<{ unread: boolean; at: number }>>();

async function defaultReader(): Promise<ActivityReader> {
  // Loaded lazily so screens that render the shell do not pull the Supabase
  // client into module scope until a signed-in user actually needs the badge.
  const module = await import("@/features/assignments/data/assignment-gateway");
  return module.assignmentGateway;
}

/**
 * Whether the signed-in user has unread activity, from the same RLS-scoped
 * `list_user_activity` read the Activity tab uses. Shared across shell mounts
 * for a minute so tab switches do not refetch. Failures simply show no badge.
 */
export function useUnreadActivity(
  userId: string | null,
  reader?: ActivityReader,
): boolean {
  const cached = userId ? cache.get(userId) : undefined;
  const [unread, setUnread] = useState(cached?.unread ?? false);

  useEffect(() => {
    if (!userId) return;
    const hit = cache.get(userId);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return;
    let active = true;
    void (reader ? Promise.resolve(reader) : defaultReader())
      .then((gateway) => gateway.listUserActivity(20, 0))
      .then((events) => {
        const next = events.some((event) => event.readAt === null);
        cache.set(userId, { unread: next, at: Date.now() });
        if (active) setUnread(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId, reader]);

  return unread;
}

/** Call after marking events read so the bell badge refreshes. */
export function invalidateUnreadActivity(userId: string): void {
  cache.delete(userId);
}
