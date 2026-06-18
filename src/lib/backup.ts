import fs from "fs";
import path from "path";
import cron, { type ScheduledTask } from "node-cron";

export const DB_PATH = path.resolve("prisma/dev.db");
export const BACKUP_DIR = path.resolve("prisma/backups");

let scheduledTask: ScheduledTask | null = null;

export function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export function createBackup() {
  ensureBackupDir();
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `infinitybox-${timestamp}.db`;
  const dest = path.join(BACKUP_DIR, filename);
  fs.copyFileSync(DB_PATH, dest);
  pruneOldBackups();
  return { filename, path: dest };
}

export function getBackupStatus() {
  ensureBackupDir();
  const files = getBackupFiles();
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(path.join(BACKUP_DIR, file)).size, 0);
  const latest = files.at(-1) ?? null;
  return {
    lastBackup: latest ? fs.statSync(path.join(BACKUP_DIR, latest)).mtime.toISOString() : null,
    latestFilename: latest,
    count: files.length,
    totalSizeMb: Number((totalBytes / 1024 / 1024).toFixed(2)),
  };
}

export function getLatestBackupPath() {
  ensureBackupDir();
  const latest = getBackupFiles().at(-1);
  return latest ? path.join(BACKUP_DIR, latest) : null;
}

export function startBackupScheduler() {
  if (scheduledTask) return;
  ensureBackupDir();

  scheduledTask = cron.schedule("0 0 * * *", () => {
    try {
      const backup = createBackup();
      console.log(`[Backup] Saved: ${backup.path}`);
    } catch (error) {
      console.error("[Backup] Failed:", error);
    }
  });

  console.log("[Backup] Scheduler started — daily at midnight");
}

function pruneOldBackups() {
  const files = getBackupFiles();
  if (files.length <= 30) return;

  const toDelete = files.slice(0, files.length - 30);
  for (const file of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, file));
  }
  console.log(`[Backup] Pruned ${toDelete.length} old backup(s)`);
}

function getBackupFiles() {
  return fs.readdirSync(BACKUP_DIR).filter((file) => file.endsWith(".db")).sort();
}
