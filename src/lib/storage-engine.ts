import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), 'vault-storage');

export interface StoredFileMetadata {
  storagePath: string;
  absolutePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  qrVerificationToken: string;
}

/**
 * Ensure storage directories exist
 */
export async function ensureStorageDirectories(): Promise<{
  active: string;
  archive: string;
  temp: string;
}> {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const activeDir = path.join(STORAGE_ROOT, 'storage', 'active', year, month);
  const archiveDir = path.join(STORAGE_ROOT, 'storage', 'archive', year, month);
  const tempDir = path.join(STORAGE_ROOT, 'storage', 'temp_uploads');

  await fs.mkdir(activeDir, { recursive: true });
  await fs.mkdir(archiveDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });

  return { active: activeDir, archive: archiveDir, temp: tempDir };
}

/**
 * Save a buffer to active local storage with SHA-256 hash and UUID
 */
export async function saveFileToStorage(
  buffer: Buffer,
  originalFileName: string,
  docNumber: string
): Promise<StoredFileMetadata> {
  const dirs = await ensureStorageDirectories();

  // Calculate SHA-256 Checksum
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Generate unique file ID & QR Token
  const fileId = crypto.randomUUID();
  const sanitizedDocNumber = docNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = '.pdf';
  const targetFileName = `${fileId}${ext}`;
  const absolutePath = path.join(/*turbopackIgnore: true*/ dirs.active, targetFileName);

  // Write file to local disk
  await fs.writeFile(/*turbopackIgnore: true*/ absolutePath, buffer);

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const storagePath = `/storage/active/${year}/${month}/${targetFileName}`;
  const qrVerificationToken = `EV-${sanitizedDocNumber}-${Date.now().toString(36).toUpperCase()}`;

  return {
    storagePath,
    absolutePath,
    fileName: originalFileName,
    fileSize: buffer.length,
    mimeType: 'application/pdf',
    sha256Hash: hash,
    qrVerificationToken,
  };
}

/**
 * Resolve absolute path from relative storage path
 */
export function getAbsolutePath(storagePath: string): string {
  // Strip leading slash
  const cleanPath = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath;
  return path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, cleanPath);
}

/**
 * Check if a stored file exists
 */
export function fileExists(storagePath: string): boolean {
  return existsSync(/*turbopackIgnore: true*/ getAbsolutePath(storagePath));
}

/**
 * Read stream of a stored file
 */
export function getFileStream(storagePath: string) {
  const abs = getAbsolutePath(storagePath);
  return createReadStream(/*turbopackIgnore: true*/ abs);
}

/**
 * Read buffer of a stored file
 */
export async function getFileBuffer(storagePath: string): Promise<Buffer> {
  const abs = getAbsolutePath(storagePath);
  return fs.readFile(/*turbopackIgnore: true*/ abs);
}

/**
 * Move a file from active to archive directory
 */
export async function archiveFile(storagePath: string): Promise<string> {
  const currentAbs = getAbsolutePath(storagePath);
  if (!existsSync(/*turbopackIgnore: true*/ currentAbs)) return storagePath;

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dirs = await ensureStorageDirectories();
  const fileName = path.basename(currentAbs);
  const targetAbs = path.join(/*turbopackIgnore: true*/ dirs.archive, fileName);

  try {
    await fs.rename(/*turbopackIgnore: true*/ currentAbs, targetAbs);
    return `/storage/archive/${year}/${month}/${fileName}`;
  } catch {
    // If cross-device or error, copy & unlink
    await fs.copyFile(/*turbopackIgnore: true*/ currentAbs, targetAbs);
    await fs.unlink(/*turbopackIgnore: true*/ currentAbs).catch(() => {});
    return `/storage/archive/${year}/${month}/${fileName}`;
  }
}
