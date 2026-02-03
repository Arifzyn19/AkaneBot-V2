/**
 * social-post-canvas.js  (ESM)
 * ────────────────────────────
 * Generates a fake social-post / quote image as a PNG Buffer.
 * Zero dependencies other than @napi-rs/canvas.
 * Pure Canvas API — no HTML, no Puppeteer, no filesystem write.
 *
 * Usage:
 *   import { generatePost } from './social-post-canvas.js';
 *
 *   const buffer = await generatePost({
 *     theme    : 'wa',            // 'wa' | 'tweet' | 'ig' | 'fb'
 *     name     : 'Siti Nurhaliza',
 *     username : '@sinurhala',
 *     text     : 'Selamat pagi!',
 *     avatar   : '',              // URL or base64 (optional)
 *     verified : true
 *   });
 *   // buffer -> PNG -> sock.sendMessage(jid, { image: buffer })
 */

import { createCanvas as _defaultCreateCanvas } from '@napi-rs/canvas';

// ─── test-hook ──────────────────────────────────────────────
let _createCanvas = _defaultCreateCanvas;
 
/** Swap the createCanvas factory (unit-test mock). */
export function _setCanvasLib(lib) { _createCanvas = lib.createCanvas; }

// ════════════════════════════════════════════════════════════
// PALETTE
// ════════════════════════════════════════════════════════════
const C = {
  WA_BG:'#1b1b1b', WA_HEADER:'#075e54', WA_BUBBLE:'#dcf8c6',
  WA_TIME:'#7f8c8d', WA_TICK:'#53c0f0',

  TW_BG:'#ffffff', TW_NAME:'#1a1a1a', TW_USER:'#71767d',
  TW_BODY:'#1a1a1a', TW_DIVIDER:'#e1e3e6', TW_BADGE:'#1d9bf0',
  TW_STAT:'#71767d', TW_STATNUM:'#1a1a1a',

  IG_GRAD_A:'#f09433', IG_GRAD_B:'#e6683c', IG_GRAD_C:'#dc2743',
  IG_GRAD_D:'#cc2366', IG_GRAD_E:'#bc1888',
  IG_CARD:'rgba(255,255,255,0.88)', IG_USER:'#1a1a1a', IG_TEXT:'#1a1a1a',

  FB_BLUE:'#1877f2', FB_CARD:'#ffffff', FB_BG:'#f0f2f5',
  FB_NAME:'#1877f2', FB_META:'#65676b', FB_TEXT:'#1a1a1a', FB_DIVIDER:'#e4e6eb',
};

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    const probe = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(probe).width <= maxW) { cur = probe; }
    else { if (cur) lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawTextBlock(ctx, lines, x, y, { fontSize = 14, color = '#000', lineH = 1.4 } = {}) {
  ctx.font      = `${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = color;
  const step = fontSize * lineH;
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * step);
  return lines.length * step;
}

function drawCircle(ctx, cx, cy, r, fill) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function clipCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
}

function drawInitialAvatar(ctx, cx, cy, r, bg, name) {
  drawCircle(ctx, cx, cy, r, bg);
  ctx.save();
  clipCircle(ctx, cx, cy, r);
  ctx.fillStyle    = '#fff';
  ctx.font         = `${r}px Arial, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.charAt(0).toUpperCase(), cx, cy);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  if (w < 2*r) r = w/2;
  if (h < 2*r) r = h/2;
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawVerifiedBadge(ctx, x, y, size, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = size * 0.18;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size*0.25, y + size*0.55);
  ctx.lineTo(x + size*0.45, y + size*0.75);
  ctx.lineTo(x + size*0.78, y + size*0.30);
  ctx.stroke();
  ctx.restore();
}

function drawGlobe(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = C.FB_META;
  ctx.lineWidth   = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, r*0.45, r, 0, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-r, cy); ctx.lineTo(cx+r, cy); ctx.stroke();
  ctx.restore();
}

function measureBlock(ctx, text, maxW, fontSize, lineH = 1.4) {
  ctx.font = `${fontSize}px Arial, sans-serif`;
  const lines = wrapText(ctx, text, maxW);
  return { lines, height: lines.length * fontSize * lineH };
}

// ════════════════════════════════════════════════════════════
// RENDERERS
// ════════════════════════════════════════════════════════════

function renderWA(ctx, W, H, data) {
  ctx.fillStyle = C.WA_BG;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 12; x < W; x += 24)
    for (let y = 12; y < H; y += 24) ctx.fillRect(x, y, 2, 2);

  const hdrH = 56;
  ctx.fillStyle = C.WA_HEADER;
  ctx.fillRect(0, 0, W, hdrH);

  const avR = 18, avCx = 28 + avR, avCy = hdrH / 2;
  drawInitialAvatar(ctx, avCx, avCy, avR, '#4a9a8a', data.name);

  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(data.name, avCx + avR + 10, 22);
  ctx.fillStyle = '#a7d9c9'; ctx.font = '11px Arial, sans-serif';
  ctx.fillText('online', avCx + avR + 10, 40);

  const pad = 24, maxBubW = W - pad*2 - 60;
  const { lines, height: txtH } = measureBlock(ctx, data.text, maxBubW - 28, 15);
  const bubPadX = 14, bubPadY = 10;
  const bubW = Math.min(maxBubW, ctx.measureText(lines[0] || '').width + bubPadX*2 + 20);
  const bubH = txtH + bubPadY*2 + 22;
  const bubX = W - pad - bubW, bubY = hdrH + 24;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
  ctx.beginPath(); roundRectPath(ctx, bubX, bubY, bubW, bubH, 14);
  ctx.fillStyle = C.WA_BUBBLE; ctx.fill();
  ctx.restore();

  ctx.fillStyle = C.WA_BUBBLE;
  ctx.beginPath();
  ctx.moveTo(bubX+bubW-4, bubY+bubH-12);
  ctx.lineTo(bubX+bubW+6, bubY+bubH);
  ctx.lineTo(bubX+bubW-4, bubY+bubH);
  ctx.closePath(); ctx.fill();

  drawTextBlock(ctx, lines, bubX+bubPadX, bubY+bubPadY+15, { fontSize:15, color:'#1a1a1a', lineH:1.4 });

  const metaY = bubY + bubH - 18;
  ctx.fillStyle = C.WA_TIME; ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('1m ago', bubX+bubW-bubPadX-22, metaY);
  ctx.fillStyle = C.WA_TICK; ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('\u2713\u2713', bubX+bubW-bubPadX, metaY);
  ctx.textAlign = 'left';
}

function renderTweet(ctx, W, H, data) {
  ctx.fillStyle = '#f0f3f7'; ctx.fillRect(0, 0, W, H);
  fillRoundRect(ctx, 16, 16, W-32, H-32, 12, C.TW_BG);

  const avR = 22, avCx = 16+22+avR, avCy = 16+28+avR;
  drawInitialAvatar(ctx, avCx, avCy, avR, '#667eea', data.name);

  const nameX = avCx+avR+12, nameY = avCy-12;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 16px Arial, sans-serif'; ctx.fillStyle = C.TW_NAME;
  ctx.fillText(data.name, nameX, nameY);
  let cx = nameX + ctx.measureText(data.name).width + 6;

  if (data.verified) { drawVerifiedBadge(ctx, cx, nameY-13, 16, C.TW_BADGE); cx += 22; }
  ctx.font = '15px Arial, sans-serif'; ctx.fillStyle = C.TW_USER;
  ctx.fillText(data.username, cx, nameY);

  const bodyX = nameX, bodyY = avCy+avR+10;
  const bodyMaxW = W - 32 - 22 - (avR*2+12);
  const { lines: bodyLines } = measureBlock(ctx, data.text, bodyMaxW, 18);
  ctx.font = '18px Arial, sans-serif'; ctx.fillStyle = C.TW_BODY;
  for (let i = 0; i < bodyLines.length; i++) ctx.fillText(bodyLines[i], bodyX, bodyY + i*26);

  const divY = bodyY + bodyLines.length*26 + 14;
  ctx.strokeStyle = C.TW_DIVIDER; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(38, divY); ctx.lineTo(W-38, divY); ctx.stroke();

  const stats = [{ l:'Replies', v:'1,284' },{ l:'Retweets', v:'9.2K' },{ l:'Likes', v:'42.1K' }];
  let sx = 38; const statY = divY+22;
  for (const s of stats) {
    ctx.font = 'bold 14px Arial, sans-serif'; ctx.fillStyle = C.TW_STATNUM;
    ctx.fillText(s.v, sx, statY);
    const vw = ctx.measureText(s.v).width;
    ctx.font = '14px Arial, sans-serif'; ctx.fillStyle = C.TW_STAT;
    const lbl = ` ${s.l}`; ctx.fillText(lbl, sx+vw, statY);
    sx += vw + ctx.measureText(lbl).width + 24;
  }
  ctx.font = '13px Arial, sans-serif'; ctx.fillStyle = C.TW_USER;
  ctx.fillText('1m ago \u00b7 Twitter Web App', 38, statY+28);
}

function renderIG(ctx, W, H, data) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, C.IG_GRAD_A); grad.addColorStop(0.25, C.IG_GRAD_B);
  grad.addColorStop(0.5, C.IG_GRAD_C); grad.addColorStop(0.75, C.IG_GRAD_D);
  grad.addColorStop(1, C.IG_GRAD_E);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  const hdrH = 62;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, W, hdrH);

  const avR = 22, avCx = 28+avR, avCy = hdrH/2;

  ctx.save();
  ctx.beginPath(); ctx.arc(avCx, avCy, avR+4, 0, Math.PI*2);
  const rg = ctx.createLinearGradient(avCx-avR-4, avCy-avR-4, avCx+avR+4, avCy+avR+4);
  rg.addColorStop(0,'#f09433'); rg.addColorStop(0.5,'#dc2743'); rg.addColorStop(1,'#bc1888');
  ctx.fillStyle = rg; ctx.fill(); ctx.restore();

  drawCircle(ctx, avCx, avCy, avR+1.5, '#fff');
  drawInitialAvatar(ctx, avCx, avCy, avR, '#667eea', data.name);

  const usrX = avCx+avR+14;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 15px Arial, sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(data.username, usrX, avCy-4);
  if (data.verified) drawVerifiedBadge(ctx, usrX + ctx.measureText(data.username).width + 6, avCy-16, 16, '#fff');
  ctx.font = '11px Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Jakarta, Indonesia', usrX, avCy+12);

  const cardM = 20, cardY = hdrH+16, cardW = W - cardM*2, cardH = H - cardY - cardM;
  fillRoundRect(ctx, cardM, cardY, cardW, cardH, 16, C.IG_CARD);

  const imgH = cardH * 0.45;
  ctx.save();
  ctx.beginPath(); roundRectPath(ctx, cardM, cardY, cardW, imgH, 16); ctx.clip();
  const ig2 = ctx.createLinearGradient(cardM, cardY, cardM+cardW, cardY+imgH);
  ig2.addColorStop(0,'#667eea'); ig2.addColorStop(1,'#764ba2');
  ctx.fillStyle = ig2; ctx.fillRect(cardM, cardY, cardW, imgH);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '13px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('[ Photo ]', cardM + cardW/2, cardY + imgH/2);

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const capX = cardM+14, capY = cardY+imgH+16, capMaxW = cardW-28;
  ctx.font = 'bold 14px Arial, sans-serif'; ctx.fillStyle = C.IG_USER;
  const userTag = data.username.replace('@','');
  ctx.fillText(userTag, capX, capY);
  const userW = ctx.measureText(userTag).width;

  ctx.font = '14px Arial, sans-serif';
  const words = data.text.split(' '), lines = [];
  let cur = '', first = true;
  for (const w of words) {
    const probe = cur ? `${cur} ${w}` : w;
    const limit = (first && lines.length === 0) ? (capMaxW - userW - 6) : capMaxW;
    if (ctx.measureText(probe).width <= limit) { cur = probe; }
    else { lines.push(cur); cur = w; first = false; }
  }
  if (cur) lines.push(cur);
  ctx.fillStyle = C.IG_TEXT;
  for (let i = 0; i < lines.length; i++)
    ctx.fillText(lines[i], i === 0 ? capX+userW+6 : capX, capY + i*19);
  ctx.fillStyle = '#8e8e8e'; ctx.font = '11px Arial, sans-serif';
  ctx.fillText('1m ago', capX, capY + lines.length*19 + 6);
}

function renderFB(ctx, W, H, data) {
  ctx.fillStyle = C.FB_BG; ctx.fillRect(0, 0, W, H);

  const barH = 42;
  ctx.fillStyle = C.FB_BLUE; ctx.fillRect(0, 0, W, barH);
  ctx.font = 'bold 24px Georgia, serif'; ctx.fillStyle = '#fff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('f', 18, barH-8);
  fillRoundRect(ctx, 60, 9, W-80, 24, 12, 'rgba(255,255,255,0.22)');
  ctx.font = '13px Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Search\u2026', 78, 26);

  const cardM = 12, cardY = barH+8, cardW = W - cardM*2, cardH = H - cardY - cardM;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.1)'; ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 2;
  ctx.beginPath(); roundRectPath(ctx, cardM, cardY, cardW, cardH, 10);
  ctx.fillStyle = C.FB_CARD; ctx.fill();
  ctx.restore();

  const avR = 22, avCx = cardM+16+avR, avCy = cardY+16+avR;
  drawInitialAvatar(ctx, avCx, avCy, avR, '#1877f2', data.name);

  const nameX = avCx+avR+10, nameY = avCy-10;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 15px Arial, sans-serif'; ctx.fillStyle = C.FB_NAME;
  ctx.fillText(data.name, nameX, nameY);
  if (data.verified) drawVerifiedBadge(ctx, nameX + ctx.measureText(data.name).width + 4, nameY-13, 15, C.FB_BLUE);

  const metaY = avCy+6;
  ctx.font = '12px Arial, sans-serif'; ctx.fillStyle = C.FB_META;
  ctx.fillText('1m ago', nameX, metaY);
  const globeCx = nameX + ctx.measureText('1m ago').width + 8;
  drawGlobe(ctx, globeCx, metaY-5, 5);
  ctx.fillText(' \u00b7', globeCx+8, metaY);

  const txtX = cardM+16, txtY = avCy+avR+14, txtMaxW = cardW-32;
  const { lines: postLines } = measureBlock(ctx, data.text, txtMaxW, 15);
  ctx.font = '15px Arial, sans-serif'; ctx.fillStyle = C.FB_TEXT;
  for (let i = 0; i < postLines.length; i++) ctx.fillText(postLines[i], txtX, txtY + i*21);

  const divY = txtY + postLines.length*21 + 14;
  ctx.strokeStyle = C.FB_DIVIDER; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cardM+16, divY); ctx.lineTo(cardM+cardW-16, divY); ctx.stroke();

  const iconY = divY+22;
  ctx.font = '13px Arial, sans-serif'; ctx.fillStyle = C.FB_META;
  ctx.textAlign = 'left';
  ctx.fillText('\ud83d\udc4d Like   \ud83d\udcac Comment   \u2197 Share', txtX, iconY);
  ctx.textAlign = 'right';
  ctx.fillText('2.4K likes \u00b7 318 comments', cardM+cardW-16, iconY);
  ctx.textAlign = 'left';
}

// ════════════════════════════════════════════════════════════
// HEIGHT CALC + PUBLIC EXPORT
// ════════════════════════════════════════════════════════════
function calcHeight(W, data) {
  const charsPerLine = Math.floor((W - 100) / 7.2);
  const lineCount    = Math.ceil(data.text.length / charsPerLine) || 1;
  return 400 + Math.max(0, lineCount - 3) * 22;
}

const RENDERERS = { wa: renderWA, tweet: renderTweet, ig: renderIG, fb: renderFB };

/**
 * @param {object}  data
 * @param {'wa'|'tweet'|'ig'|'fb'} data.theme
 * @param {string}  data.name
 * @param {string}  data.username
 * @param {string}  data.text
 * @param {string}  [data.avatar]
 * @param {boolean} [data.verified]
 * @returns {Promise<Buffer>} PNG
 */
export async function generatePost(data) {
  if (!data?.theme) throw new Error('data.theme is required');
  if (!data.name)   throw new Error('data.name is required');
  if (!data.text)   throw new Error('data.text is required');

  const theme = data.theme.toLowerCase();
  if (!RENDERERS[theme])
    throw new Error(`Unknown theme "${theme}". Use: wa | tweet | ig | fb`);

  const W = 600, H = calcHeight(W, data);
  const canvas = _createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  RENDERERS[theme](ctx, W, H, data);
  return canvas.toBuffer('image/png');
}
