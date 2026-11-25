// Detail probe: WDX000 / SDX000 cumulative-end offset structure around the item-icon
// region (logical index 3501..3700 per community Pascal ITEM_BEGIN_PIC = 3501).
// IDX format (piccache.c:132-135, 269-280): idx[0]=0 sentinel, idx[i]=end offset of
// pic i-1; pic i spans [idx[i], idx[i+1]). JY_LoadPic divides the API picid by 2, so
// the Lua caller multiplies by 2; logical index = API/2.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dos = name => readFileSync(`original/dos/${name}`);
const inspect = (idxName, grpName) => {
  const idx = dos(idxName);
  const entries = idx.length / 4;
  const offs = Array.from({ length: entries }, (_, i) => idx.readInt32LE(i * 4));
  const grpLen = dos(grpName).length;
  // Find the trailing run of zeros.
  let zeros = 0;
  while (zeros < entries && offs[entries - 1 - zeros] === 0) zeros++;
  const pics = entries - zeros;
  const mono = offs.slice(0, pics).every((v, i) => i === 0 ? v > 0 : v > offs[i - 1]);
  const maxOff = offs[pics - 1];
  console.log(`${idxName}: ${entries} entries, trailing zeros=${zeros}, pics=${pics}, monotonic=${mono}, last end=${maxOff} (grp ${grpLen}B, ${maxOff <= grpLen ? 'ok' : 'OVER'})`);
  // Item-icon region: logical 3500..3701.
  const show = from => {
    const rows = [];
    for (let i = from; i < Math.min(from + 4, pics + 1); i++)
      rows.push(`idx[${i}]=${i < entries ? offs[i] : '—'}${i < pics ? ` (pic ${i} size ${offs[i] - offs[i - 1]})` : ''}`);
    console.log(`  ${rows.join('  ')}`);
  };
  console.log('  around item start (logical 3500-3503):'); show(3500);
  console.log('  around item end   (logical 3700-3703):'); show(3700);
  // The 200 item icons 0..199 -> logical 3501..3700 need idx[3501..3701].
  const coversItems = pics + 1 > 3701 && mono; // idx[3701] must exist as an end offset
  console.log(`  covers logical 3501..3700 (200 items): ${coversItems}`);
  // Average item-icon size if covered.
  if (coversItems) {
    const total = offs[3701] - offs[3501];
    console.log(`  item region bytes ${total} (logical 3501..3700), avg ${Math.round(total / 200)} B/icon`);
  }
  return { sha: createHash('sha256').update(idx).digest('hex').slice(0, 16), entries, pics, coversItems };
};
const w = inspect('WDX000', 'WMP000');
const s = inspect('SDX000', 'SMP000');
console.log(`\nWDX000 sha ${w.sha}, SDX000 sha ${s.sha}`);
console.log(w.coversItems && s.coversItems
  ? 'CONCLUSION: item icons are present in the split map-pic atlases (WMP/SDX scene+world), index 3501+ — NOT in ALLDEF.GRP'
  : 'CONCLUSION: partial coverage; see per-file results');
