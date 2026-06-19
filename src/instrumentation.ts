export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.VERCEL !== "1") {
    const { startBackupScheduler } = await import("./lib/backup");
    startBackupScheduler();
  }
}
