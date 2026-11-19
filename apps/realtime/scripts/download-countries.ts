// Downloads the countries of DB-IP Lite (IP to Country, CC BY 4.0, https://db-ip.com) to the file
// it is given: node apps/realtime/scripts/download-countries.ts <file>. DB-IP publishes it at the
// start of each month, so it takes this month's or, while that one is not out yet, last month's.
// The room server reads it at DBIP_COUNTRY_FILE; the image carries it, and so does the e2e.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';
import { gunzipSync } from 'node:zlib';

const target = process.argv[2];
if (!target) throw new Error('Usage: download-countries.ts <file>');

const today = new Date();
const tried: string[] = [];
for (const monthsBack of [0, 1]) {
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsBack, 1));
  const url = `https://download.db-ip.com/free/dbip-country-lite-${month.toISOString().slice(0, 7)}.mmdb.gz`;
  const response = await fetch(url);
  if (!response.ok) {
    tried.push(`${url} (${response.status})`);
    continue;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, gunzipSync(Buffer.from(await response.arrayBuffer())));
  console.log(`DB-IP Lite from ${url} saved at ${target}`);
  process.exit(0);
}
throw new Error(`No DB-IP Lite could be downloaded: ${tried.join(', ')}`);
