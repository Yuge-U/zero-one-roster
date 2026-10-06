import sharp from 'sharp'; // 承認済み画像からiOS/PWA用PNGを生成します。
import { readFile } from 'node:fs/promises'; // 原版バイトを検証します。
import { createHash } from 'node:crypto'; // 承認済み原版との一致を確認します。
const source='branding/approved-roster.webp'; // 承認済みROSTERアイコンを唯一の原版にします。
const bytes=await readFile(source); // 変換前の原版を読みます。
if(createHash('sha256').update(bytes).digest('hex')!=='be2ad14480e8ce951d9741de2c067402a497304faac7b5dea2a96cfaeada776d')throw new Error('Approved ROSTER artwork mismatch'); // 別画像なら停止します。
for (const size of [180,192,512]) { // iPhoneとPWAの3サイズを揃えます。
  const name=size===180?'roster-180.png':`roster-${size}.png`; // 既存命名を維持し180だけ追加します。
  await sharp(source).resize(size,size,{fit:'cover'}).png().toFile(`icons/${name}`); // 再生成せず縮小・拡大だけを行います。
} // 画像生成を閉じます。
