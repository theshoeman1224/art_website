// Erases the GPS block from JPEG photographs in place, for the test "serves no photograph that records where it was
// taken". Ask the user before running it (CLAUDE.md). Usage: node tools/strip-gps.mjs <photo.jpeg>...
//
// Only GPS data changes. The file keeps its size and pixels, and everything else in its metadata (colour profile,
// camera data, HDR gain map) stays where it was: the GPS pointer is removed from the first image directory, whose
// later entries shift up by one within the directory, and the GPS directory and its values are overwritten with zeros.
import { readFileSync, writeFileSync } from 'node:fs';

const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

function exifStart(bytes) {
  if (bytes.readUInt16BE(0) !== 0xffd8) return undefined;
  for (let offset = 2; offset + 4 <= bytes.length && bytes[offset] === 0xff; offset += 2 + bytes.readUInt16BE(offset + 2)) {
    if (bytes[offset + 1] === 0xda) break;
    if (bytes[offset + 1] === 0xe1 && bytes.toString('latin1', offset + 4, offset + 10) === 'Exif\0\0') return offset + 10;
  }
  return undefined;
}

for (const file of process.argv.slice(2)) {
  const bytes = readFileSync(file);
  const tiff = exifStart(bytes);
  if (tiff === undefined) {
    console.log(`${file}: not a JPEG with Exif data, left alone`);
    continue;
  }
  const little = bytes.toString('latin1', tiff, tiff + 2) === 'II';
  const u16 = (at) => (little ? bytes.readUInt16LE(tiff + at) : bytes.readUInt16BE(tiff + at));
  const u32 = (at) => (little ? bytes.readUInt32LE(tiff + at) : bytes.readUInt32BE(tiff + at));
  const setU16 = (at, value) => (little ? bytes.writeUInt16LE(value, tiff + at) : bytes.writeUInt16BE(value, tiff + at));

  const ifd0 = u32(4);
  const count = u16(ifd0);
  const pointer = Array.from({ length: count }, (_, i) => ifd0 + 2 + i * 12).find((entry) => u16(entry) === 0x8825);
  if (pointer === undefined) {
    console.log(`${file}: no GPS data`);
    continue;
  }

  const gps = u32(pointer + 8);
  const tags = u16(gps);
  for (let i = 0; i < tags; i++) {
    const entry = gps + 2 + i * 12;
    const size = (typeSize[u16(entry + 2)] ?? 1) * u32(entry + 4);
    if (size > 4) bytes.fill(0, tiff + u32(entry + 8), tiff + u32(entry + 8) + size);
  }
  bytes.fill(0, tiff + gps, tiff + gps + 2 + tags * 12 + 4);

  const end = ifd0 + 2 + count * 12 + 4;
  bytes.copy(bytes, tiff + pointer, tiff + pointer + 12, tiff + end);
  bytes.fill(0, tiff + end - 12, tiff + end);
  setU16(ifd0, count - 1);
  writeFileSync(file, bytes);
  console.log(`${file}: erased ${tags} GPS tags`);
}
