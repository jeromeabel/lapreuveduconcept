import { column, defineDb, defineTable, NOW } from 'astro:db';

// https://astro.build/db/config
const Vote = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    comicId: column.text(),
    visitorId: column.text(),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [{ on: ['comicId', 'visitorId'], unique: true }],
})

export default defineDb({
  tables: { Vote },
})