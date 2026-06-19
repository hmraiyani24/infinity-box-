import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const databaseUrl = process.env.DATABASE_URL || "";

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit" });
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
  const vercelSchemaPath = path.join("prisma", "schema.vercel.prisma");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const vercelSchema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');

  fs.writeFileSync(vercelSchemaPath, vercelSchema);
  return vercelSchemaPath;
}

if (isVercel) {
  const schemaPath = ensureVercelSchema();
  run(`npx prisma generate --schema=${schemaPath}`);
  run(`npx prisma db push --schema=${schemaPath} --accept-data-loss`);
} else {
  run("npx prisma generate --schema=prisma/schema.prisma");
}

run("npx next build");
