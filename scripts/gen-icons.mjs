// PWA用アイコンをSVGから生成する（npm run gen-icons）
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbbf24"/>
      <stop offset="1" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${pad ? 0 : 116}" fill="url(#bg)"/>
  <g transform="translate(256 268) scale(${pad ? 0.72 : 0.9}) translate(-256 -268)">
    <!-- ジョッキ本体 -->
    <rect x="150" y="150" width="180" height="240" rx="28" fill="#fffbeb"/>
    <!-- 取っ手 -->
    <path d="M330 190 h34 a44 44 0 0 1 44 44 v72 a44 44 0 0 1 -44 44 h-34 v-40 h30 a12 12 0 0 0 12 -12 v-56 a12 12 0 0 0 -12 -12 h-30 z" fill="#fffbeb"/>
    <!-- ビール -->
    <rect x="174" y="196" width="132" height="170" rx="14" fill="#f59e0b"/>
    <!-- 泡 -->
    <circle cx="176" cy="150" r="38" fill="#ffffff"/>
    <circle cx="240" cy="132" r="46" fill="#ffffff"/>
    <circle cx="306" cy="150" r="38" fill="#ffffff"/>
    <!-- 気泡 -->
    <circle cx="210" cy="250" r="9" fill="#fde68a"/>
    <circle cx="252" cy="300" r="7" fill="#fde68a"/>
    <circle cx="228" cy="336" r="6" fill="#fde68a"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });

await sharp(Buffer.from(svg(false))).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(svg(false))).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(svg(true))).resize(512, 512).png().toFile("public/icons/icon-512-maskable.png");

console.log("icons generated ✔");
