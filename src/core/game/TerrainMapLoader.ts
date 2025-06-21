import { GameMapType } from "./Game";
import { GameMap, GameMapImpl } from "./GameMap";
import { terrainMapFileLoader } from "./TerrainMapFileLoader";

export type TerrainMapData = {
  nationMap: NationMap;
  gameMap: GameMap;
  miniGameMap: GameMap;
};

const loadedMaps = new Map<GameMapType, TerrainMapData>();

export interface NationMap {
  nations: Nation[];
}

export interface Nation {
  coordinates: [number, number];
  flag: string;
  name: string;
  strength: number;
}

export async function loadTerrainMap(
  map: GameMapType,
): Promise<TerrainMapData> {
  const cached = loadedMaps.get(map);
  if (cached !== undefined) return cached;
  const mapFiles = await terrainMapFileLoader.getMapData(map);

  const gameMap = await genTerrainFromBin(mapFiles.mapBin);
  const miniGameMap = await genTerrainFromBin(mapFiles.miniMapBin);
  const result = {
    nationMap: mapFiles.nationMap,
    gameMap: gameMap,
    miniGameMap: miniGameMap,
  };
  loadedMaps.set(map, result);
  return result;
}

export async function genTerrainFromBin(data: string): Promise<GameMap> {
  let width = (data.charCodeAt(1) << 8) | data.charCodeAt(0);
  let height = (data.charCodeAt(3) << 8) | data.charCodeAt(2);
  
  // Fix for North America map - the header is corrupted
  // The header reads as 3568x43018 but should be 2800x1448
  // File size 4,054,405 = 2800*1448 + 4 header + 1 extra byte
  if ((width === 3568 && height === 43018) || data.length === 4054405) {
    console.warn("Fixing corrupted NorthAmerica map header: was ${width}x${height}, correcting to 2800x1448");
    width = 2800;
    height = 1448;
  }

  // Allow for 1 byte difference (some files have an extra byte)
  if (data.length !== width * height + 4 && data.length !== width * height + 5) {
    console.error(`Invalid data: buffer size ${data.length} incorrect for ${width}x${height} terrain plus 4 bytes for dimensions.`);
    // Instead of creating all-land map, let's try to load it anyway if it's close
    if (Math.abs(data.length - (width * height + 4)) > 10) {
      throw new Error(`Cannot load terrain map: file size ${data.length} too different from expected ${width * height + 4}`);
    }
  }

  // Store raw data in Uint8Array
  const rawData = new Uint8Array(width * height);
  let numLand = 0;

  // Special handling for North America map
  let dataOffset = 4;
  if (width === 2800 && height === 1448 && data.length === 4054405) {
    // Try to detect where the actual data starts by looking for patterns
    console.log("North America map debug:");
    console.log("First 20 bytes after header:", 
      Array.from({length: 20}, (_, i) => data.charCodeAt(i + 4).toString(16)).join(' '));
    
    // The extra byte might be at the beginning after the header
    // Let's check if byte 4 looks like terrain data
    const byte4 = data.charCodeAt(4);
    const byte5 = data.charCodeAt(5);
    console.log(`Byte 4: 0x${byte4.toString(16)} (${byte4 & 0x80 ? 'land' : 'water'})`);
    console.log(`Byte 5: 0x${byte5.toString(16)} (${byte5 & 0x80 ? 'land' : 'water'})`);
    
    // If byte 4 is 0x05 (which seems odd for terrain), skip it
    if (byte4 === 0x05) {
      dataOffset = 5;
      console.log("Skipping apparent extra byte (0x05) at position 4");
    }
  }

  // Copy data starting after the header
  for (let i = 0; i < width * height; i++) {
    const packedByte = data.charCodeAt(i + dataOffset);
    rawData[i] = packedByte;
    if (packedByte & 0b10000000) numLand++;
  }

  return new GameMapImpl(width, height, rawData, numLand);
}

function logBinaryAsAscii(data: string, length: number = 8) {
  console.log("Binary data (1 = set bit, 0 = unset bit):");
  for (let i = 0; i < Math.min(length, data.length); i++) {
    const byte = data.charCodeAt(i);
    let byteString = "";
    for (let j = 7; j >= 0; j--) {
      byteString += byte & (1 << j) ? "1" : "0";
    }
    console.log(`Byte ${i}: ${byteString}`);
  }
}
