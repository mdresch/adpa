import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    schema: './lib/morphic/db/schema.ts',
    out: './drizzle/morphic',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.MORPHIC_DATABASE_URL || process.env.DATABASE_URL!,
    },
})
