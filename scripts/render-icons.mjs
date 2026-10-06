import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'branding/roster-master.png'));
const { width, height } = await sharp(source).metadata();
if (width !== height || width < 1024) throw new Error('Native square artwork of at least 1024px required; no upscaling');
for (const [size, file] of [[180,'roster-180.png'],[192,'roster-192.png'],[512,'roster-512.png']]) {
  await sharp(source).resize(size,size,{kernel:'lanczos3',withoutEnlargement:true}).png().toFile(path.join(root,'icons',file));
}
await writeFile(path.join(root,'icons/roster.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="ZERO ONE ROSTER"><image width="${width}" height="${height}" href="data:image/png;base64,${source.toString('base64')}"/></svg>\n`);
