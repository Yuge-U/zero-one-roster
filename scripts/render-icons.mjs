import sharp from 'sharp'; // SVG原版からホーム画面用PNGを生成します。
for (const size of [192,512]) { // PWAが参照する2サイズを揃えます。
  await sharp('icons/roster.svg').resize(size,size).png().toFile(`icons/roster-${size}.png`); // 同一デザインを指定寸法へ変換します。
}
