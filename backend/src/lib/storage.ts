/**
 * storage.ts — Stockage des fichiers uploadés.
 * Si Cloudinary est configuré (CLOUDINARY_URL ou CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET),
 * les fichiers sont envoyés sur Cloudinary (durable). Sinon, repli sur le disque local
 * (éphémère sur Render free — perdu au redéploiement).
 */
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

const hasUrl  = !!process.env.CLOUDINARY_URL;
const hasKeys = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

export const cloudinaryEnabled = hasUrl || hasKeys;

if (cloudinaryEnabled) {
  // CLOUDINARY_URL est lu automatiquement ; sinon on configure depuis les 3 variables.
  if (!hasUrl) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  console.log('☁️  Cloudinary activé — stockage durable des fichiers');
} else {
  console.log('💾 Cloudinary non configuré — stockage local (éphémère sur Render free)');
}

/**
 * Envoie un fichier local sur Cloudinary et le supprime du disque.
 * Renvoie l'URL durable, ou null si Cloudinary n'est pas configuré (→ garder l'URL locale).
 */
export async function persistUpload(localPath: string, folder: string): Promise<string | null> {
  if (!cloudinaryEnabled) return null;
  try {
    const res = await cloudinary.uploader.upload(localPath, {
      folder: `focusbrain/${folder}`,
      resource_type: 'auto',
    });
    fs.promises.unlink(localPath).catch(() => {});
    return res.secure_url;
  } catch (e) {
    console.error('Cloudinary upload error:', (e as any)?.message);
    return null; // repli sur l'URL locale
  }
}
