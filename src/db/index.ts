import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __atendeaiSql: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não definida. Configure a variável de ambiente com a string de conexão do PostgreSQL."
  );
}

// Reutiliza a conexão em desenvolvimento (hot reload) para não abrir várias pools.
const sql =
  global.__atendeaiSql ??
  postgres(connectionString, {
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  global.__atendeaiSql = sql;
}

export const db = drizzle(sql, { schema });
