import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const databaseUrl = process.env.DATABASE_URL || readEnvDatabaseUrl() || "";

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit" });
}

function readEnvDatabaseUrl() {
  for (const envFile of [".env.local", ".env"]) {
    if (!fs.existsSync(envFile)) continue;

    const match = fs.readFileSync(envFile, "utf8").match(/^DATABASE_URL=(.*)$/m);
    if (!match) continue;

    return match[1].trim().replace(/^["']|["']$/g, "");
  }

  return "";
}

function ensureVercelSchema() {
  if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    console.error(
      [
        "Vercel production needs a persistent PostgreSQL DATABASE_URL.",
        "Do not use SQLite/file: URLs on Vercel because serverless storage is not persistent.",
        "Create a Vercel Postgres/Neon/Supabase database and set DATABASE_URL in Vercel Environment Variables.",
      ].join("\n"),
    );
    process.exit(1);
  }

  const schemaPath = path.join("prisma", "schema.prisma");
  return schemaPath;
}

function ensureLocalSchema() {
  const schemaPath = path.join("prisma", "schema.prisma");
  if (!databaseUrl.startsWith("file:")) return schemaPath;

  const localSchemaPath = path.join("prisma", "schema.local.prisma");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const localSchema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');

  fs.writeFileSync(localSchemaPath, localSchema);
  return localSchemaPath;
}

if (isVercel) {
  const schemaPath = ensureVercelSchema();
  run(`npx prisma generate --schema=${schemaPath}`);
  run(`npx prisma db push --schema=${schemaPath} --accept-data-loss`);
} else {
  const schemaPath = ensureLocalSchema();
  run(`npx prisma generate --schema=${schemaPath}`);
}

run("npx next build");
