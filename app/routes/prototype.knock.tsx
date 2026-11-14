// PROTOTYPE: a throwaway Knock spike for "Does Knock hold up against Cadence?" (#52).
// Branch prototype/knock-spike only. Never merge. Visit /prototype/knock.
import { useCallback, useEffect, useRef, useState } from "react";
import { data, useFetcher } from "react-router";
import { eq, ne } from "drizzle-orm";
import type { Route } from "./+types/prototype.knock";
import { getCurrentUserId } from "~/lib/session";
import { db } from "~/db";
import { users, UserRole } from "~/db/schema";
import {
  identify,
  knockUserId,
  publicConfig,
  signTokenFor,
  triggerNewEnrollment,
} from "~/lib/knock-prototype.server";
import type Knock from "@knocklabs/client";
import type { Feed } from "@knocklabs/client";

async function requireUser(request: Request) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw data("Select a user from the DevUI panel", { status: 401 });
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw data("Unknown user", { status: 401 });
  return user;
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  await identify(user); // keep Knock's recipient in step with the DevUI user
  const token = await signTokenFor(user.id);
  const header = JSON.parse(
    Buffer.from(token.split(".")[0], "base64url").toString()
  );
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString()
  );
  return {
    user: { id: user.id, name: user.name, role: user.role },
    knockUserId: knockUserId(user.id),
    token,
    tokenHeader: header,
    tokenPayload: payload,
    ...publicConfig(),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  const form = await request.formData();
  if (form.get("intent") === "simulate-enrollment") {
    // The current user plays the Instructor. Any other student plays the enrollee.
    const student = db
      .select()
      .from(users)
      .where(ne(users.id, user.id))
      .all()
      .find((u) => u.role === UserRole.Student);
    if (!student) return { error: "no other student in the seed" };
    const result = await triggerNewEnrollment({
      instructor: user,
      student,
      courseTitle: "PROTOTYPE course",
    });
    return { triggered: "new-enrollment", result };
  }
  return { error: "unknown intent" };
}

const ENROLLMENT_CATEGORY = "enrollment";

export default function KnockPrototype({ loaderData }: Route.ComponentProps) {
  const { user, token, publicApiKey, feedChannelId } = loaderData;
  const knockRef = useRef<Knock | null>(null);
  const feedRef = useRef<Feed | null>(null);
  const [feedResponse, setFeedResponse] = useState<unknown>(null);
  const [prefs, setPrefs] = useState<unknown>(null);
  const [log, setLog] = useState<string[]>([]);
  const fetcher = useFetcher<typeof action>();

  const say = useCallback(
    (line: string) =>
      setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l]),
    []
  );

  const refresh = useCallback(async () => {
    const feed = feedRef.current;
    const knock = knockRef.current;
    if (!feed || !knock) return;
    const res = await feed.fetch();
    setFeedResponse(res?.data ?? res);
    try {
      setPrefs(await knock.user.getPreferences());
    } catch (e) {
      setPrefs({ error: String(e) });
    }
  }, []);

  // Check 1: authenticate the headless client with the server-signed token.
  // Re-runs whenever the DevUI switches user (new loaderData.token).
  useEffect(() => {
    let disposed = false;
    (async () => {
      const { default: KnockClient } = await import("@knocklabs/client");
      const knock = new KnockClient(publicApiKey);
      knock.authenticate(String(user.id), token);
      const feed = knock.feeds.initialize(feedChannelId);
      feed.listenForUpdates();
      feed.on("items.received.realtime", () => {
        say("realtime: new item");
        refresh();
      });
      knockRef.current = knock;
      feedRef.current = feed;
      say(`authenticated as Knock user ${user.id} (${user.name})`);
      if (!disposed) await refresh();
    })().catch((e) => say(`init failed: ${e}`));
    return () => {
      disposed = true;
      feedRef.current?.dispose();
      knockRef.current?.teardown();
    };
  }, [user.id, token, publicApiKey, feedChannelId, refresh, say]);

  useEffect(() => {
    if (fetcher.data) {
      say(`server: ${JSON.stringify(fetcher.data)}`);
      setTimeout(refresh, 1500);
    }
  }, [fetcher.data, refresh, say]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      say(`${label}: ok`);
    } catch (e) {
      say(`${label}: FAILED ${e}`);
    }
    await refresh();
  };

  const feedData = feedResponse as {
    entries?: Array<{
      id: string;
      source: { key: string };
      read_at: string | null;
      seen_at: string | null;
      inserted_at: string;
      data: Record<string, unknown> | null;
      actors: Array<{ name?: string }>;
      blocks: Array<{ rendered?: string }>;
    }>;
    meta?: { unread_count: number; unseen_count: number; total_count: number };
  } | null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 font-mono text-sm">
      <div className="rounded border-2 border-dashed border-amber-500 bg-amber-50 p-3">
        PROTOTYPE: Knock spike. Throwaway. Switch users in the DevUI panel and
        watch the feed follow.
      </div>

      <section>
        <h2 className="font-bold">1. Signed user token</h2>
        <div>
          Cadence user: {user.name} (id {user.id}, {user.role})
        </div>
        <pre className="overflow-auto bg-muted p-2">
          {JSON.stringify(
            { header: loaderData.tokenHeader, payload: loaderData.tokenPayload },
            null,
            2
          )}
        </pre>
      </section>

      <section>
        <h2 className="font-bold">3. Headless feed API</h2>
        <div className="my-2 flex flex-wrap gap-2">
          <button className="rounded border px-2" onClick={() => act("refetch", async () => {})}>
            refetch
          </button>
          <button
            className="rounded border px-2"
            onClick={() => act("markAllAsSeen", () => feedRef.current!.markAllAsSeen())}
          >
            mark all seen
          </button>
          <button
            className="rounded border px-2"
            onClick={() => act("markAllAsRead", () => feedRef.current!.markAllAsRead())}
          >
            mark all read
          </button>
        </div>
        <div>
          unread: <b>{feedData?.meta?.unread_count ?? "?"}</b> · unseen:{" "}
          <b>{feedData?.meta?.unseen_count ?? "?"}</b> · total:{" "}
          {feedData?.meta?.total_count ?? "?"}
        </div>
        <ul className="mt-2 space-y-1">
          {feedData?.entries?.map((item) => (
            <li key={item.id} className="rounded border p-2">
              <div>
                <b>{item.source.key}</b> from {item.actors[0]?.name ?? "?"} ·{" "}
                {item.inserted_at}
              </div>
              <div>data: {JSON.stringify(item.data)}</div>
              <div>
                seen: {item.seen_at ?? "-"} · read: {item.read_at ?? "-"}
              </div>
              <div className="mt-1 flex gap-2">
                <button
                  className="rounded border px-2"
                  onClick={() => act("markAsSeen", () => feedRef.current!.markAsSeen(item as never))}
                >
                  seen
                </button>
                <button
                  className="rounded border px-2"
                  onClick={() => act("markAsRead", () => feedRef.current!.markAsRead(item as never))}
                >
                  read
                </button>
                <button
                  className="rounded border px-2"
                  onClick={() => act("markAsUnread", () => feedRef.current!.markAsUnread(item as never))}
                >
                  unread
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-bold">2. Trigger (Discussion Reply → question author)</h2>
        <p>
          Reply to someone else's Discussion Question on any lesson page, then
          switch to the question's author and come back here.
        </p>
      </section>

      <section>
        <h2 className="font-bold">4. Preferences (new Enrollment → Instructor, opt-in)</h2>
        <div className="my-2 flex flex-wrap gap-2">
          <fetcher.Form method="post">
            <button
              className="rounded border px-2"
              name="intent"
              value="simulate-enrollment"
            >
              simulate a new Enrollment (me as Instructor)
            </button>
          </fetcher.Form>
          <button
            className="rounded border px-2"
            onClick={() =>
              act("opt in (in-app only)", () =>
                knockRef.current!.user.setPreferences(
                  {
                    categories: {
                      [ENROLLMENT_CATEGORY]: {
                        channel_types: { in_app_feed: true, email: false },
                      },
                    },
                  },
                  { preferenceSet: "default" }
                )
              )
            }
          >
            opt in: enrollment × in-app
          </button>
          <button
            className="rounded border px-2"
            onClick={() =>
              act("opt out", () =>
                knockRef.current!.user.setPreferences(
                  { categories: { [ENROLLMENT_CATEGORY]: false } },
                  { preferenceSet: "default" }
                )
              )
            }
          >
            opt out
          </button>
        </div>
        <pre className="overflow-auto bg-muted p-2">
          {JSON.stringify(prefs, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="font-bold">Log</h2>
        <pre className="max-h-64 overflow-auto bg-muted p-2">{log.join("\n")}</pre>
      </section>
    </div>
  );
}
