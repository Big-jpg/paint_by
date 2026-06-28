type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const textEncoder = new TextEncoder();

export async function createZipBlob(
  files: Array<{ name: string; blob: Blob }>
): Promise<Blob> {
  const entries: ZipEntry[] = await Promise.all(
    files.map(async file => ({
      name: file.name,
      data: new Uint8Array(await file.blob.arrayBuffer()),
    }))
  );

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = createLocalHeader(nameBytes, entry.data.length, crc);

    localParts.push(localHeader, nameBytes, entry.data);
    centralParts.push(
      createCentralDirectoryHeader(nameBytes, entry.data.length, crc, offset),
      nameBytes
    );

    offset += localHeader.length + nameBytes.length + entry.data.length;
  }

  const centralDirectorySize = centralParts.reduce(
    (total, part) => total + part.length,
    0
  );
  const endRecord = createEndOfCentralDirectory(
    entries.length,
    centralDirectorySize,
    offset
  );

  return new Blob([...localParts, ...centralParts, endRecord], {
    type: "application/zip",
  });
}

function createLocalHeader(
  nameBytes: Uint8Array,
  dataLength: number,
  crc: number
) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, dataLength, true);
  view.setUint32(22, dataLength, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);

  return header;
}

function createCentralDirectoryHeader(
  nameBytes: Uint8Array,
  dataLength: number,
  crc: number,
  offset: number
) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, dataLength, true);
  view.setUint32(24, dataLength, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);

  return header;
}

function createEndOfCentralDirectory(
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number
) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return header;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = new Uint32Array(256);

for (let i = 0; i < CRC_TABLE.length; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}
