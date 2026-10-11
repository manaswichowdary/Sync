import calendar from "../../data/calendar.json";
import { badgeLabels, helpCounts, helpGivenThisMonth, recommendationCount } from "../badges";
import { childLine } from "../childDetails";
import { activityState, capStatus, daysUntilPause, nextGroupStatus, shouldSuggestMerge } from "../groupRules";
import { forecastConflicts } from "../forecast";
import { formatClock } from "../forecast";
import type { GroupPageData, PostView } from "../viewTypes";
import { missingSupabaseEnv } from "../supabase/env";
import { currentUser, from, serviceDb, type Db } from "./db";

export async function loadGroupPage(groupId: string): Promise<
  | { status: "ok"; data: GroupPageData }
  | { status: "setup"; missing: string[] }
  | { status: "missing" }
  | { status: "home" }
> {
  const missing = missingSupabaseEnv();
  const db = serviceDb();
  if (missing.length || !db) {
    return {
      status: "setup",
      missing: missing.length ? missing : ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    };
  }
  const user = await currentUser();
  if (!user) return { status: "home" };
  const { data: profile } = await from(db, "profiles")
    .select("id, first_name, hear_help, hear_gather, hear_updates")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { status: "home" };
  const { data: membership } = await from(db, "group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { status: "missing" };

  await from(db, "handoffs").delete().lt("expires_at", new Date().toISOString());
  const { data: group } = await from(db, "groups").select("*").eq("id", groupId).maybeSingle();
  if (!group || group.removed) return { status: "missing" };
  const next = nextGroupStatus(group.status, new Date(group.last_activity_at), new Date(), false);
  if (next !== group.status) {
    await from(db, "groups").update({ status: next }).eq("id", group.id);
    group.status = next;
  }

  const { data: memberRows } = await from(db, "group_members").select("*").eq("group_id", groupId);
  const members = memberRows ?? [];
  const memberIds = members.map((row: { user_id: string }) => row.user_id);
  const inviterIds = members.map((row: { invited_by: string | null }) => row.invited_by).filter(Boolean);
  const { data: postsRaw } = await from(db, "posts").select("*").eq("group_id", groupId).eq("removed", false).order("created_at", { ascending: false });
  const posts = postsRaw ?? [];
  const postIds = posts.map((post: { id: string }) => post.id);
  const authorIds = posts.map((post: { author_id: string }) => post.author_id);

  const replies = postIds.length
    ? (await from(db, "replies").select("*").in("post_id", postIds).eq("removed", false).order("created_at", { ascending: true })).data ?? []
    : [];
  const exchanges = postIds.length ? (await from(db, "exchanges").select("*").in("post_id", postIds)).data ?? [] : [];
  const rsvps = postIds.length ? (await from(db, "gather_rsvps").select("*").in("post_id", postIds)).data ?? [] : [];
  const prefs = postIds.length
    ? (await from(db, "thread_prefs").select("*").eq("user_id", user.id).in("post_id", postIds)).data ?? []
    : [];
  const privates = postIds.length
    ? (await from(db, "need_private").select("*").in("post_id", postIds)).data ?? []
    : [];
  const handoffs = exchanges.length
    ? (await from(db, "handoffs").select("*").in("exchange_id", exchanges.map((row: { id: string }) => row.id))).data ?? []
    : [];
  const offers = (await from(db, "standing_offers").select("*").eq("group_id", groupId)).data ?? [];
  const codes = (await from(db, "invite_codes").select("*").eq("group_id", groupId).order("expires_at", { ascending: true })).data ?? [];

  const peopleIds = [...new Set([...memberIds, ...inviterIds, ...authorIds, ...replies.map((row: { author_id: string }) => row.author_id), ...exchanges.flatMap((row: { helper_id: string; requester_id: string }) => [row.helper_id, row.requester_id]), ...rsvps.map((row: { user_id: string }) => row.user_id), ...offers.map((row: { user_id: string }) => row.user_id)])];
  const people = peopleIds.length
    ? (await from(db, "profiles").select("id, first_name").in("id", peopleIds)).data ?? []
    : [];
  const names = new Map<string, string>(people.map((person: { id: string; first_name: string }) => [person.id, person.first_name]));

  const phoneIds = exchanges
    .filter((row: { chosen: boolean; helper_id: string }) => row.chosen && row.helper_id === user.id)
    .map((row: { requester_id: string }) => row.requester_id);
  const phoneRows = phoneIds.length ? (await from(db, "profiles").select("id, phone").in("id", phoneIds)).data ?? [] : [];
  const phones = new Map<string, string>(phoneRows.map((row: { id: string; phone: string }) => [row.id, row.phone]));

  const { data: related } = memberIds.length
    ? await from(db, "exchanges")
        .select("helper_id, requester_id, requester_recommends, helper_recommends, completed_at")
        .or(`helper_id.in.(${memberIds.join(",")}),requester_id.in.(${memberIds.join(",")})`)
    : { data: [] };
  const history = related ?? [];

  const { data: mine } = await from(db, "exchanges")
    .select("helper_id, requester_id, completed_at")
    .or(`helper_id.eq.${user.id},requester_id.eq.${user.id}`);
  const counts = helpCounts(
    (mine ?? []).map((row: { helper_id: string; requester_id: string; completed_at: string | null }) => ({
      helperId: row.helper_id,
      requesterId: row.requester_id,
      completed: Boolean(row.completed_at),
    })),
    user.id
  );

  const helpThisMonth = helpGivenThisMonth(
    exchanges.map((row: { completed_at: string | null }) => row.completed_at),
    new Date()
  );

  const confirmed = exchanges.filter((row: { completed_at: string | null }) => row.completed_at).length;
  const cap = capStatus(members.length, confirmed);
  const state = activityState(new Date(group.last_activity_at), new Date());

  const memberViews = members.map((row: { user_id: string; role: "creator" | "member"; invited_by: string | null }) => {
    const recommenders: string[] = [];
    let helped = false;
    for (const item of history) {
      if (!item.completed_at) continue;
      if (item.helper_id === row.user_id) helped = true;
      if (item.helper_id === row.user_id && item.requester_recommends) recommenders.push(item.requester_id);
      if (item.requester_id === row.user_id && item.helper_recommends) recommenders.push(item.helper_id);
    }
    return {
      userId: row.user_id,
      firstName: names.get(row.user_id) ?? "Neighbor",
      role: row.role,
      badges: badgeLabels({
        invitedByFirstName: row.invited_by ? names.get(row.invited_by) ?? "a neighbor" : null,
        helpedNeighbors: helped,
        recommendedBy: recommendationCount(recommenders),
      }),
    };
  });

  const prefByPost = new Map<string, { muted: boolean; left_thread: boolean }>();
  for (const row of prefs as { post_id: string; muted: boolean; left_thread: boolean }[]) {
    prefByPost.set(row.post_id, row);
  }
  const visiblePosts: PostView[] = [];
  for (const post of posts) {
    const postExchanges = exchanges.filter((row: { post_id: string }) => row.post_id === post.id);
    const userInExchange = postExchanges.some(
      (row: { requester_id: string; helper_id: string }) => row.requester_id === user.id || row.helper_id === user.id
    );
    if (post.held && post.author_id !== user.id && !userInExchange) continue;
    if (post.kind === "update" && post.expires_at && new Date(post.expires_at).getTime() <= Date.now() && !userInExchange) continue;
    const pref = prefByPost.get(post.id);
    const categoryEnabled = post.kind === "gather" ? profile.hear_gather : post.kind === "update" ? profile.hear_updates : profile.hear_help;
    const muted = Boolean(pref?.muted);
    const left = Boolean(pref?.left_thread);
    const show = userInExchange || (!muted && !left && categoryEnabled);
    if (!show) continue;
    const postReplies = replies.filter((row: { post_id: string; held: boolean; author_id: string }) => row.post_id === post.id && (!row.held || row.author_id === user.id));
    const postRsvps = rsvps.filter((row: { post_id: string }) => row.post_id === post.id);
    const priv = privates.find((row: { post_id: string }) => row.post_id === post.id);
    visiblePosts.push({
      id: post.id,
      kind: post.kind,
      topic: post.topic,
      text: post.text,
      authorId: post.author_id,
      authorName: names.get(post.author_id) ?? "Neighbor",
      createdAt: post.created_at,
      expiresAt: post.expires_at,
      held: post.held,
      pendingChild: post.author_id === user.id ? childLine(priv?.child_details) : null,
      replies: postReplies.map((reply: { id: string; text: string; author_id: string; held: boolean; created_at: string }) => ({
        id: reply.id,
        text: reply.text,
        authorId: reply.author_id,
        authorName: names.get(reply.author_id) ?? "Neighbor",
        createdAt: reply.created_at,
        held: reply.held,
      })),
      rsvpNames: postRsvps.map((row: { user_id: string }) => names.get(row.user_id) ?? "Neighbor"),
      viewerIn: postRsvps.some((row: { user_id: string }) => row.user_id === user.id),
      safetyNotice: userInExchange && (muted || left || !categoryEnabled),
      exchanges: postExchanges.map((row: any) => {
        const handoff = handoffs.find((item: { exchange_id: string }) => item.exchange_id === row.id);
        const party = row.chosen && (row.helper_id === user.id || row.requester_id === user.id);
        return {
          id: row.id,
          helperId: row.helper_id,
          helperName: names.get(row.helper_id) ?? "Neighbor",
          requesterId: row.requester_id,
          chosen: row.chosen,
          requesterDone: row.requester_confirmed,
          helperDone: row.helper_confirmed,
          completedAt: row.completed_at,
          thankYou: party ? row.thank_you : null,
          viewerRecommended: (row.requester_id === user.id && row.requester_recommends) || (row.helper_id === user.id && row.helper_recommends),
          codeWord: party ? handoff?.code_word ?? null : null,
          childLine: party ? childLine(handoff?.child_details) : null,
          parentPhone: row.chosen && row.helper_id === user.id ? phones.get(row.requester_id) ?? null : null,
        };
      }),
    });
  }

  const { data: myMemberships } = await from(db, "group_members").select("group_id").eq("user_id", user.id);
  const otherIds = (myMemberships ?? []).map((row: { group_id: string }) => row.group_id).filter((id: string) => id !== groupId);
  const otherGroups = otherIds.length
    ? ((await from(db, "groups").select("id, name").in("id", otherIds).eq("removed", false)).data ?? []).map((row: { id: string; name: string }) => ({
        id: row.id,
        name: row.name,
      }))
    : [];

  const mergeNames = await mergeSuggestions(db, groupId, memberIds);
  const realOffers = offers.map((offer: { user_id: string; weekday: string; start_time: string; end_time: string; note: string }) => ({
    firstName: names.get(offer.user_id) ?? "Neighbor",
    weekday: offer.weekday,
    start: offer.start_time,
    end: offer.end_time,
    note: offer.note,
  }));
  const forecast = forecastConflicts({
    busy: calendar.busy,
    pickups: calendar.pickups,
    offers: [...realOffers, ...calendar.sampleOffers],
    now: new Date(),
  }).map((item) => ({
    summary: item.summary,
    helperName: item.helperName,
    busyLabel: item.busyLabel,
    pickupLabel: item.pickupLabel,
  }));

  return {
    status: "ok",
    data: {
      me: { id: user.id, firstName: profile.first_name, helpGiven: counts.given, helpReceived: counts.received },
      group: {
        id: group.id,
        name: group.name,
        neighborhood: group.neighborhood,
        purpose: group.purpose,
        status: group.status,
        held: group.held,
        warnDays: group.status === "active" && state === "warn" ? daysUntilPause(new Date(group.last_activity_at), new Date()) : null,
        suggestSplit: cap.suggestSplit,
        mergeNames,
        helpThisMonth,
        memberCount: members.length,
        cap: cap.cap,
      },
      members: memberViews,
      codes: codes.map((code: { code: string; uses: number; max_uses: number; expires_at: string }) => ({
        code: code.code,
        uses: code.uses,
        maxUses: code.max_uses,
        expiresAt: code.expires_at,
      })),
      otherGroups,
      posts: visiblePosts,
      freeTimes: realOffers.map((offer: { firstName: string; weekday: string; start: string; end: string; note: string }, index: number) => ({
        id: offers[index].id,
        firstName: offer.firstName,
        weekday: offer.weekday,
        start: formatClock(offer.start),
        end: formatClock(offer.end),
        note: offer.note,
      })),
      forecast,
      calendarNote: calendar.note,
    },
  };
}

async function mergeSuggestions(db: Db, groupId: string, memberIds: string[]) {
  if (memberIds.length === 0) return [];
  const { data: links } = await from(db, "group_members").select("group_id, user_id").in("user_id", memberIds).neq("group_id", groupId);
  const byGroup = new Map<string, string[]>();
  for (const link of links ?? []) {
    const list = byGroup.get(link.group_id) ?? [];
    list.push(link.user_id);
    byGroup.set(link.group_id, list);
  }
  const ids = [...byGroup.keys()];
  if (ids.length === 0) return [];
  const { data: groups } = await from(db, "groups").select("id, name, status, removed").in("id", ids).eq("removed", false).eq("status", "active");
  return (groups ?? [])
    .filter((group: { id: string }) => shouldSuggestMerge(memberIds, byGroup.get(group.id) ?? []))
    .map((group: { name: string }) => group.name);
}

export async function loadHome() {
  const missing = missingSupabaseEnv();
  if (missing.length) return { user: null, profile: null, missing, groupId: null as string | null };
  const user = await currentUser();
  const db = serviceDb();
  if (!user || !db) return { user: null, profile: null, missing: [] as string[], groupId: null as string | null };
  const { data: profile } = await from(db, "profiles").select("id, first_name").eq("id", user.id).maybeSingle();
  const { data: memberships } = await from(db, "group_members").select("group_id").eq("user_id", user.id);
  const ids = (memberships ?? []).map((row: { group_id: string }) => row.group_id);
  let groupId: string | null = null;
  if (ids.length) {
    const { data: groups } = await from(db, "groups").select("id, last_activity_at").in("id", ids).eq("removed", false);
    const best = (groups ?? []).sort((a: { last_activity_at: string }, b: { last_activity_at: string }) =>
      b.last_activity_at.localeCompare(a.last_activity_at)
    )[0];
    groupId = best?.id ?? null;
  }
  return { user, profile, missing: [] as string[], groupId };
}

export async function loadPreferences() {
  const db = serviceDb();
  const user = await currentUser();
  if (!db || !user) return null;
  const { data: profile } = await from(db, "profiles")
    .select("first_name, hear_help, hear_gather, hear_updates")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;
  const { data: mine } = await from(db, "exchanges")
    .select("helper_id, requester_id, completed_at")
    .or(`helper_id.eq.${user.id},requester_id.eq.${user.id}`);
  const counts = helpCounts(
    (mine ?? []).map((row: { helper_id: string; requester_id: string; completed_at: string | null }) => ({
      helperId: row.helper_id,
      requesterId: row.requester_id,
      completed: Boolean(row.completed_at),
    })),
    user.id
  );
  const { data: prefs } = await from(db, "thread_prefs").select("post_id, muted, left_thread").eq("user_id", user.id);
  const interesting = (prefs ?? []).filter((row: { muted: boolean; left_thread: boolean }) => row.muted || row.left_thread);
  const postIds = interesting.map((row: { post_id: string }) => row.post_id);
  const posts = postIds.length ? (await from(db, "posts").select("id, text, group_id").in("id", postIds)).data ?? [] : [];
  const postMap = new Map<string, { text: string; group_id: string }>();
  for (const post of posts as { id: string; text: string; group_id: string }[]) {
    postMap.set(post.id, post);
  }
  return {
    firstName: profile.first_name,
    hearHelp: profile.hear_help,
    hearGather: profile.hear_gather,
    hearUpdates: profile.hear_updates,
    helpGiven: counts.given,
    helpReceived: counts.received,
    threads: interesting.map((row: { post_id: string; muted: boolean; left_thread: boolean }) => ({
      postId: row.post_id,
      groupId: postMap.get(row.post_id)?.group_id ?? "",
      text: postMap.get(row.post_id)?.text ?? "A thread",
      muted: row.muted,
      left: row.left_thread,
    })),
  };
}

export async function loadAdmin(email: string) {
  const db = serviceDb();
  if (!db) return [];
  const { data: reports } = await from(db, "reports").select("*").eq("status", "open").order("created_at", { ascending: false });
  const items = [];
  for (const report of reports ?? []) {
    let label = "Item";
    if (report.target_type === "post") {
      const { data } = await from(db, "posts").select("text").eq("id", report.target_id).maybeSingle();
      label = data?.text ?? "Post";
    } else if (report.target_type === "reply") {
      const { data } = await from(db, "replies").select("text").eq("id", report.target_id).maybeSingle();
      label = data?.text ?? "Reply";
    } else {
      const { data } = await from(db, "groups").select("name, neighborhood").eq("id", report.target_id).maybeSingle();
      label = data ? `${data.name} (${data.neighborhood})` : "Group";
    }
    items.push({
      id: report.id,
      targetType: report.target_type,
      reason: report.reason,
      createdAt: report.created_at,
      label,
      email,
    });
  }
  return items;
}
