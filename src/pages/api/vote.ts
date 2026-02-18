import type { APIContext, AstroCookies } from "astro";
import { and, count, db, eq, inArray, Vote } from "astro:db";

export const prerender = false;

const COOKIE_NAME = "visitorId";

function getOrCreateVisitorId(cookies: AstroCookies): string {

  let visitorId = cookies.get(COOKIE_NAME)?.value;

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    cookies.set(COOKIE_NAME, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
    });
  }

  return visitorId;
}

export async function GET(context: APIContext): Promise<Response> {

  // Get Ids
  const comicParam = context.url.searchParams.get("comic");

  if (!comicParam) {
      return Response.json({ error: "Missing 'comic' query parameter" }, { status: 400 });
  }
  
  const comicIds = comicParam.split(",").map(id => id.trim());

  // Get user
  const visitorId = getOrCreateVisitorId(context.cookies);

  // Get queries
  const comicsCounts = await 
    db.select({ comicId: Vote.comicId, value: count() })
    .from(Vote)
    .where(inArray(Vote.comicId, comicIds))
    .groupBy(Vote.comicId);
  
  const userVotes = await
    db.select({ comicId: Vote.comicId })
    .from(Vote)
    .where(and(
      inArray(Vote.comicId, comicIds),
      eq(Vote.visitorId, visitorId)
    ));

  // Results
  const countMap = new Map(comicsCounts.map(c => [c.comicId, c.value]));
  const votedSet = new Set(userVotes.map(v => v.comicId));

  const results = comicIds.map(comicId => ({
    comicId,
    votes: countMap.get(comicId) ?? 0,
    userVoted: votedSet.has(comicId),
  }));

  return Response.json({ result: results });
}



export async function POST(context: APIContext): Promise<Response> {

  let comicId: string | undefined = undefined;

  try {
    const body = await context.request.json();
    comicId = body.comicId;
  } catch (error) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!comicId || typeof comicId !== "string") {
    return Response.json({ error: "Missing 'comicId' in request body" }, { status: 400 });
  }

  const visitorId = getOrCreateVisitorId(context.cookies);

  try {
    const existingVote = await
      db.select()
      .from(Vote)
      .where(and(
        eq(Vote.comicId, comicId),
        eq(Vote.visitorId, visitorId)
      )).limit(1).get();

    if (existingVote) {
      await db.delete(Vote).where(eq(Vote.id, existingVote.id));
    } else {
      await db.insert(Vote).values({ comicId, visitorId });
    }

    const newCount = await db.select({ count: count() })
      .from(Vote)
      .where(eq(Vote.comicId, comicId))
      .limit(1).get();

    return Response.json({ comicId, count: newCount?.count ?? 0, voted: !existingVote });
  } catch (error) {
    console.error("DB error in POST /api/vote:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}