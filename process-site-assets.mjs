/**
 * One-off: 把本机壁纸素材压缩入池，作为站点封面池与首页横幅。
 *
 * 输出：
 *   public/img/cover-mine/c01..cNN.webp  （封面池，宽 1280，WebP q82）
 *   public/img/banner/banner-1920.webp / banner-800.webp （首页横幅两档）
 *   docs/asset-map.md  （原图 → cNN 映射清单，便于日后增删）
 *
 * 规则（用户 2026-09-28 决策）：
 *   - 四个来源全收，排除竖版（h>w），排除横幅原图避免与封面池重复
 *   - md5 去重（不同目录同名/同内容只收一张）
 *   - 统一重命名 c01..cNN
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SOURCES = [
  'D:/搜集/壁纸/琉璃神社壁纸包',
  'D:/搜集/壁纸/横屏/4.1',
  'D:/搜集/壁纸/横屏/8.14',
  'D:/搜集/壁纸/横屏', // 仅当前目录
];
const BANNER_SRC = 'D:/搜集/壁纸/横屏/4.1/G90Kb0XacAEwbRQ.jpg';
/** 用户指定剔除的图（不进封面池）：c54 原图，观感不适宜公开博客封面 */
const EXCLUDE = new Set(['D:/搜集/壁纸/横屏/113229292_p0.jpg'].map((p) => p.replaceAll('/', path.sep)));
const OUT_COVERS = 'public/img/cover-mine';
const OUT_BANNER = 'public/img/banner';
const MAP_FILE = 'docs/asset-map.md';
const COVER_WIDTH = 1280;
const QUALITY = 82;

const IMG_RE = /\.(jpe?g|png|webp|gif)$/i;

async function processCover(srcFile, outName) {
  const buf = await sharp(srcFile)
    .resize({ width: COVER_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  fs.writeFileSync(path.join(OUT_COVERS, outName), buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(OUT_COVERS, { recursive: true });
  fs.mkdirSync(OUT_BANNER, { recursive: true });

  const seen = new Set(); // md5 去重
  const mapping = []; // { out, src }
  let idx = 0;

  for (const dir of SOURCES) {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && IMG_RE.test(e.name));
    for (const entry of entries) {
      const src = path.join(dir, entry.name);
      if (path.resolve(src) === path.resolve(BANNER_SRC)) continue; // 横幅原图不进池
      if (EXCLUDE.has(path.resolve(src))) {
        console.log(`SKIP 剔除 ${src}`);
        continue;
      }
      const meta = await sharp(src).metadata();
      if ((meta.height ?? 0) > (meta.width ?? 0)) {
        console.log(`SKIP 竖版 ${src}`);
        continue;
      }
      const hash = crypto.createHash('md5').update(fs.readFileSync(src)).digest('hex');
      if (seen.has(hash)) {
        console.log(`SKIP 重复 ${src}`);
        continue;
      }
      seen.add(hash);
      idx += 1;
      const outName = `c${String(idx).padStart(2, '0')}.webp`;
      const bytes = await processCover(src, outName);
      mapping.push({ out: outName, src, w: meta.width, h: meta.height, kb: Math.round(bytes / 1024) });
      console.log(`${outName} <= ${src} (${meta.width}x${meta.height} -> ${Math.round(bytes / 1024)}KB)`);
    }
  }

  // 横幅两档
  for (const [name, width] of [
    ['banner-1920.webp', 1920],
    ['banner-800.webp', 800],
  ]) {
    const buf = await sharp(BANNER_SRC).resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer();
    fs.writeFileSync(path.join(OUT_BANNER, name), buf);
    console.log(`${name}: ${Math.round(buf.length / 1024)}KB`);
  }

  // 映射清单
  const rows = mapping.map((m) => `| ${m.out} | ${m.src.replace(/\\/g, '/')} | ${m.w}x${m.h} | ${m.kb} |`).join('\n');
  const md = `# 站点素材映射清单（2026-09-28）

封面池 \`public/img/cover-mine/c01..c${String(idx).padStart(2, '0')}.webp\` 由下列原图压缩而来
（sharp 宽 ${COVER_WIDTH}、WebP q82；排除竖版与横幅原图；md5 去重）。
首页横幅 \`public/img/banner/banner-{1920,800}.webp\` <= \`${BANNER_SRC.replace(/\\/g, '/')}\`。

| 入池文件 | 原图 | 原尺寸 | 压缩后 |
|---|---|---|---|
${rows}
`;
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(MAP_FILE, md);
  console.log(`\n共 ${idx} 张封面入池；映射清单 -> ${MAP_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
