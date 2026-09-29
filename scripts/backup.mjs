// Nightly pg_dump to Cloudflare R2. Run as its own Railway cron service: "15 7 * * *".
import { spawn } from 'node:child_process';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const { DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BACKUP_BUCKET, R2_BUCKET } = process.env;
if (!DATABASE_URL || !R2_ACCOUNT_ID) { console.error('DATABASE_URL and R2_* required'); process.exit(1); }
const key = `pg/${new Date().toISOString().slice(0, 10)}.dump`;
const dump = spawn('pg_dump', ['--format=custom', '--no-owner', '--no-acl', DATABASE_URL], { stdio: ['ignore', 'pipe', 'inherit'] });
const client = new S3Client({ region: 'auto', endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } });
await new Upload({ client, params: { Bucket: R2_BACKUP_BUCKET ?? R2_BUCKET, Key: key, Body: dump.stdout } }).done();
const code = await new Promise((r) => dump.on('close', r));
if (code !== 0) { console.error('pg_dump exited', code); process.exit(1); }
console.log('backup uploaded', key);
