import { db, Vote } from 'astro:db';

export default async function seed() {
  await db.insert(Vote).values([
    { comicId: '001', visitorId: 'visitor-aaa' },
    { comicId: '001', visitorId: 'visitor-bbb' },
    { comicId: '002', visitorId: 'visitor-aaa' },
  ]);
}
