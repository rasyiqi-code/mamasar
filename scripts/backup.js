import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '../data/mamasar.db');
const BACKUP_DIR = path.resolve(__dirname, '../data/backups');
const MAX_BACKUPS = 7;

async function runBackup() {
  console.log('🔄 Memulai proses backup database SQLite Mamasar...');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Database tidak ditemukan di: ${DB_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Membuat direktori backup: ${BACKUP_DIR}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `mamasar_backup_${timestamp}.db`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  const db = new Database(DB_PATH);

  try {
    const startTime = Date.now();
    await db.backup(backupFilePath);
    const durationMs = Date.now() - startTime;
    const stats = fs.statSync(backupFilePath);
    const sizeKb = (stats.size / 1024).toFixed(2);

    console.log(`✅ Backup berhasil diselesaikan!`);
    console.log(`   File: ${backupFileName}`);
    console.log(`   Ukuran: ${sizeKb} KB`);
    console.log(`   Durasi: ${durationMs} ms`);

    // Clean up older backups keeping only the latest MAX_BACKUPS
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('mamasar_backup_') && f.endsWith('.db'))
      .sort((a, b) => b.localeCompare(a)); // Newest first

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      for (const oldFile of toDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, oldFile));
        console.log(`🗑️ Menghapus arsip lama: ${oldFile}`);
      }
    }
  } catch (err) {
    console.error('❌ Gagal melakukan backup database:', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

runBackup();
