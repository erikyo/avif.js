// ISOBMFF constants.
const BOX_HEADER_SIZE = 8
const BOX_FTYP = 0x66747970
const BOX_META = 0x6d657461
const BOX_ILOC = 0x696c6f63
const BOX_IPRP = 0x69707270
const BOX_IPCO = 0x6970636f
const BOX_ISPE = 0x69737065

// MOV container stub with single video track.
const MOV_HEADER = (function () {
  const u32 = new Uint32Array([469762048, 1887007846, 1836020585, 131072, 1836020585, 846164841, 825520237, 1140981760, 1987014509, 1811939328, 1684567661, 0, 0, 0, 3892510720, 704643072, 256, 1, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 33554432, 3489726464, 1801548404, 1543503872, 1684564852, 50331648, 0, 0, 16777216, 0, 704643072, 0, 0, 0, 0, 256, 0, 0, 0, 256, 0, 0, 0, 64, 32775, 14340, 1812004864, 1634296941, 536870912, 1684563053, 0, 0, 0, 3227320320, 3909287936, 50261, 553648128, 1919706216, 0, 0, 1701079414, 0, 0, 0, 16777216, 1852402979, 102, 1752004116, 100, 1, 0, 0, 1852400676, 102, 1701995548, 102, 0, 1, 1819440396, 32, 1, 1651799011, 108, 1937011583, 100, 0, 1, 813064559, 49, 0, 1, 0, 0, 0, 75499264, 4718648, 4718592, 0, 65536, 0, 0, 0, 0, 0, 0, 0, 0, 16776984, 1629028352, 2168664438, 167775240, 11, 3284118338, 31915895, 402653184, 1937011827, 0, 16777216, 16777216, 3909287936, 469762048, 1668510835, 0, 16777216, 16777216, 16777216, 16777216, 335544320, 2054386803, 0, 0, 16777216, 335544320, 1868788851, 0, 16777216, 1744961536, 0, 1952539757])
  return new Uint8Array(u32.buffer)
})()
const MOV_HEADER_SIZE = MOV_HEADER.byteLength
const MOV_STSZ_OFFSET = 568
const MOV_MDAT_OFFSET = 608
const MOV_TKHD_WIDTH_OFFSET = 234
const MOV_AV01_WIDTH_OFFSET = 437

/**
 * It throws an error if the first argument is false
 * @param cond - The condition to check.
 * @param str - The string to be parsed.
 */
function assert (cond, str) {
  if (!cond) throw new Error(str)
}

function findMoovOffset (dataView) {
  const length = dataView.byteLength

  let offset = 0

  while (offset < length) {
    const size = dataView.getUint32(offset, false)
    const type = dataView.getInt32(offset + 4, false)

    if (type === 0x6D6F6F76) {
      // found the moov atom
      return offset
    }

    // move to the next atom
    offset += size
  }

  // moov atom not found
  return null
}

function findAtomOffset (dataView, parentOffset, atomType) {
  const parentSize = dataView.getUint32(parentOffset, false)

  let offset = parentOffset + 8

  while (offset < parentOffset + parentSize) {
    const size = dataView.getUint32(offset, false)
    const type = dataView.getInt32(offset + 4, false)

    if (type === atomType) {
      // found the atom
      return offset
    }
    offset += size
  }
}

function getMovHeaderData (source) {
  // Create a new DataView object from your source data
  const dataView = new DataView(source);

  // Find the offset of the moov atom
  const moovOffset = findMoovOffset(dataView);

  // Find the offset of the mvhd atom
  const mvhdOffset = findAtomOffset(dataView, moovOffset, 'mvhd');

  // Find the offset of the trak atom
  const trakOffset = findAtomOffset(dataView, moovOffset, 'trak');

  // Find the offset of the tkhd atom
  const tkhdOffset = findAtomOffset(dataView, trakOffset, 'tkhd');

  // Find the offset of the mdia atom
  const mdiaOffset = findAtomOffset(dataView, trakOffset, 'mdia');

  // Find the offset of the mdhd atom
  const mdhdOffset = findAtomOffset(dataView, mdiaOffset, 'mdhd');

  // Find the offset of the stbl atom
  const stblOffset = findAtomOffset(dataView, mdiaOffset, 'stbl');

  // Find the offset of the stsz atom
  const stszOffset = findAtomOffset(dataView, stblOffset, 'stsz');

  // Get the timescale and duration from the mvhd atom
  const timescale = dataView.getUint32(mvhdOffset + 12, false);
  const duration = dataView.getUint32(mvhdOffset + 16, false);

  // Get the width and height from the tkhd atom
  const width = dataView.getUint16(tkhdOffset + 76, false);
  const height = dataView.getUint16(tkhdOffset + 78, false);

  // Get the number of frames from the mdhd atom
  const frameCount = dataView.getUint32(mdhdOffset + 16, false) / timescale;

  // Get the bit depth from the stsz atom
  const bitDepth = dataView.getUint16(stszOffset + 24, false);
}

/**
 * It parses the AVIF file
 * header, extracts the image dimensions and the actual image data, and returns
 * them as an object
 * @param ab - The ArrayBuffer of the AVIF file.
 * @returns An object with the width, height, and data of the image.
 */
export function avif2obu (ab) {
  function getU8 () { const v = view.getUint8(pos); pos += 1; return v }
  function getU16 () { const v = view.getUint16(pos); pos += 2; return v }
  function getU32 () { const v = view.getUint32(pos); pos += 4; return v }

  const view = new DataView(ab)
  const len = ab.byteLength
  let pos = 0

  let brandsCheck = false
  let width = 0
  let height = 0
  let data = null

  while (pos < len) {
    const size = getU32()
    const type = getU32()
    const end = pos + size - BOX_HEADER_SIZE
    assert(size >= BOX_HEADER_SIZE, 'corrupted file')

    // TODO(Kagami): Add box version checks!
    switch (type) {
      case BOX_FTYP:
      // FIXME(Kagami): Check brands.
      // TODO(Kagami): Also check that meta/hdlr.handler = "pict".
        brandsCheck = true
        break
      case BOX_META:
        pos += 1 // version
        pos += 3 // flags
        continue
      case BOX_IPRP:
        continue
      case BOX_IPCO:
        continue
      case BOX_ISPE:
        pos += 1 // version
        pos += 3 // flags
        width = getU32()
        height = getU32()
        break
      case BOX_ILOC:
        pos += 1 // version
        pos += 3 // flags
        const offsetSizeAndLengthSize = getU8()
        const offsetSize = offsetSizeAndLengthSize >>> 4
        assert(offsetSize < 8, 'unsupported offset size')
        const lengthSize = offsetSizeAndLengthSize & 0xf
        assert(lengthSize < 8, 'unsupported length size')
        const baseOffsetSize = getU8() >>> 4
        assert(baseOffsetSize < 8, 'unsupported base offset size')
        const itemCount = getU16()
        assert(itemCount >= 1, 'bad iloc items number')
        // XXX(Kagami): Choosing first item for simplicity.
        // TODO(Kagami): Use primary item (meta/pitm/item_ID).
        // TODO(Kagami): Also check that meta/iinf/infe[i].item_type = "av01".
        pos += 2 // item_ID
        pos += 2 // data_reference_index
        const baseOffset = baseOffsetSize === 4 ? getU32() : 0
        pos += 2 // extent_count (>= 1)
        // XXX(Kagami): What should we do if extent_count > 1?
        const extentOffset = offsetSize === 4 ? getU32() : 0
        const extentLength = lengthSize === 4 ? getU32() : 0
        const u8 = new Uint8Array(ab)
        const offset = baseOffset + extentOffset
        data = u8.subarray(offset, offset + extentLength)
        break
    }

    pos = end
  }

  assert(brandsCheck, 'bad brands')
  assert(width && height, 'bad image width or height')
  assert(data, 'picture data not found')
  return { width, height, data }
}

/**
 * It takes a WebM file and converts it to a MOV file
 * Embed OBU into MOV container stub as video frame.
 * TODO(Kagami): Fix matrix, bitdepth, av1C metadata.
 * @param  - `width` - the width of the video
 * @returns An ArrayBuffer
 */
export function obu2mov ({ width, height, data }) {
  const fileSize = MOV_HEADER_SIZE + data.byteLength
  const ab = new ArrayBuffer(fileSize)
  const view = new DataView(ab)
  const u8 = new Uint8Array(ab)
  u8.set(MOV_HEADER)
  u8.set(data, MOV_HEADER_SIZE)
  // |....|stsz|.|...|xxxx|
  view.setUint32(MOV_STSZ_OFFSET + BOX_HEADER_SIZE + 4, data.byteLength)
  // |xxxx|mdat|
  view.setUint32(MOV_MDAT_OFFSET, data.byteLength + BOX_HEADER_SIZE)
  // |xxxx|xxxx|
  view.setUint32(MOV_TKHD_WIDTH_OFFSET, width)
  view.setUint32(MOV_TKHD_WIDTH_OFFSET + 4, height)
  // |xx|xx|
  view.setUint16(MOV_AV01_WIDTH_OFFSET, width)
  view.setUint16(MOV_AV01_WIDTH_OFFSET + 2, height)
  return ab
}

/**
 * Remux AVIF picture as MOV video with single frame.
 * @param ab - ArrayBuffer of the AVIF file
 * @returns A function that takes an array buffer
 */
export function avif2mov (ab) {
  return obu2mov(avif2obu(ab))
}
