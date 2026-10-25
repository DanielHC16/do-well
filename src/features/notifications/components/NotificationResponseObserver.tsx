import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import {
  notificationService,
  type NotificationResponseTarget,
  type NotificationService,
} from "../services/notification-service";

type NotificationResponseObserverProps = Readonly<{
  service?: NotificationService;
}>;

export function NotificationResponseObserver({
  service = notificationService,
}: NotificationResponseObserverProps) {
  const router = useRouter();
  const lastResponseIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const openTarget = (target: NotificationResponseTarget) => {
      if (!mounted || lastResponseIdRef.current === target.id) return;
      lastResponseIdRef.current = target.id;
      router.push(target.route as Href);
    };

    service.configureForegroundPresentation();
    void (async () => {
      try {
        const target = await service.getLastResponseTarget();
        if (target) openTarget(target);
      } catch {
        // A native startup lookup failure must not crash authenticated routing.
      } finally {
        try {
          await service.clearLastResponse();
        } catch {
          // Clearing stale native state is best-effort and retried next startup.
        }
      }
    })();
    const unsubscribe = service.subscribeToResponses((target) => {
      openTarget(target);
      void service.clearLastResponse().catch(() => {
        // The allowlisted route already opened; native cleanup is best-effort.
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router, service]);

  return null;
}
