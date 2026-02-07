import type { APIRoute } from 'astro';
import { db, Votes, Users, eq } from 'astro:db';

export const prerender = false;

// Generate a secure hash for cookie
function generateCookieHash(): string {
  return crypto.randomUUID();
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { comicId } = await request.json();
    
    if (!comicId) {
      return new Response(JSON.stringify({ error: 'Comic ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get or create user cookie
    let userHash = cookies.get('user_id')?.value;
    
    if (!userHash) {
      userHash = generateCookieHash();
      cookies.set('user_id', userHash, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: true,
        sameSite: 'lax'
      });
    }
    
    // Check if user already voted for this comic
    const user = await db.select().from(Users).where(eq(Users.cookie_hash, userHash)).get();
    
    let votedIds: string[] = [];
    if (user) {
      votedIds = JSON.parse(user.voted_ids || '[]');
      if (votedIds.includes(comicId)) {
        return new Response(JSON.stringify({ error: 'Already voted' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Add vote to comic
    const comic = await db.select().from(Votes).where(eq(Votes.comic_id, comicId)).get();
    
    if (comic) {
      await db.update(Votes)
        .set({ count: comic.count + 1 })
        .where(eq(Votes.comic_id, comicId));
    } else {
      await db.insert(Votes).values({ comic_id: comicId, count: 1 });
    }
    
    // Update user's voted list
    votedIds.push(comicId);
    if (user) {
      await db.update(Users)
        .set({ voted_ids: JSON.stringify(votedIds) })
        .where(eq(Users.cookie_hash, userHash));
    } else {
      await db.insert(Users).values({
        cookie_hash: userHash,
        voted_ids: JSON.stringify(votedIds),
        created_at: new Date()
      });
    }
    
    // Get updated vote count
    const updatedComic = await db.select().from(Votes).where(eq(Votes.comic_id, comicId)).get();
    
    return new Response(JSON.stringify({ 
      success: true, 
      votes: updatedComic?.count || 1 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Vote error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
