import { Colord } from "colord";
import atomBombSprite from "../../../resources/sprites/atombomb.png";
import hydrogenBombSprite from "../../../resources/sprites/hydrogenbomb.png";
import mirvSprite from "../../../resources/sprites/mirv2.png";
import samMissileSprite from "../../../resources/sprites/samMissile.png";
import tradeShipSprite from "../../../resources/sprites/tradeship.png";
import transportShipSprite from "../../../resources/sprites/transportship.png";
import warshipSprite from "../../../resources/sprites/warship.png";
import { Theme } from "../../core/configuration/Config";
import { UnitType } from "../../core/game/Game";
import { UnitView } from "../../core/game/GameView";

const SPRITE_CONFIG: Partial<Record<UnitType, string>> = {
  [UnitType.TransportShip]: transportShipSprite,
  [UnitType.Warship]: warshipSprite,
  [UnitType.SAMMissile]: samMissileSprite,
  [UnitType.AtomBomb]: atomBombSprite,
  [UnitType.HydrogenBomb]: hydrogenBombSprite,
  [UnitType.TradeShip]: tradeShipSprite,
  [UnitType.MIRV]: mirvSprite,
};

const spriteMap: Map<UnitType, ImageBitmap> = new Map();

// preload all images
export const loadAllSprites = async (): Promise<void> => {
  console.log('Starting to load sprites...');
  console.log('SPRITE_CONFIG:', SPRITE_CONFIG);
  console.log('UnitType enum values:', {
    TransportShip: UnitType.TransportShip,
    Warship: UnitType.Warship,
    SAMMissile: UnitType.SAMMissile,
    AtomBomb: UnitType.AtomBomb,
    HydrogenBomb: UnitType.HydrogenBomb,
    TradeShip: UnitType.TradeShip,
    MIRV: UnitType.MIRV
  });
  const entries = Object.entries(SPRITE_CONFIG);
  const totalSprites = entries.length;
  let loadedCount = 0;
  console.log(`Will load ${totalSprites} sprites`);

  await Promise.all(
    entries.map(async ([unitType, url]) => {
      const typedUnitType = unitType as UnitType;

      if (!url || url === "") {
        console.warn(`No sprite URL for ${typedUnitType}, skipping...`);
        return;
      }

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        
        console.log(`Loading sprite for ${typedUnitType} from ${url}`);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            console.log(`Successfully loaded image for ${typedUnitType}`);
            resolve();
          };
          img.onerror = (err) => {
            console.error(`Failed to load image for ${typedUnitType} from ${url}:`, err);
            // Try fallback URL if the webpack bundled URL fails
            const fallbackUrl = `/sprites/${url.split('/').pop()}`;
            console.log(`Trying fallback URL: ${fallbackUrl}`);
            const fallbackImg = new Image();
            fallbackImg.crossOrigin = "anonymous";
            fallbackImg.src = fallbackUrl;
            fallbackImg.onload = () => {
              console.log(`Successfully loaded from fallback for ${typedUnitType}`);
              img.src = fallbackUrl;
              resolve();
            };
            fallbackImg.onerror = () => {
              console.error(`Fallback also failed for ${typedUnitType}`);
              reject(err);
            };
          };
        });

        const bitmap = await createImageBitmap(img);
        spriteMap.set(typedUnitType, bitmap);
        loadedCount++;

        if (loadedCount === totalSprites) {
          console.log("All sprites loaded.");
        }
      } catch (err) {
        console.error(`Failed to load sprite for ${typedUnitType}:`, err);
        // Create a placeholder bitmap to prevent crashes
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#888';
        ctx.fillRect(0, 0, 16, 16);
        const bitmap = await createImageBitmap(canvas);
        spriteMap.set(typedUnitType, bitmap);
        console.warn(`Using placeholder for ${typedUnitType}`);
      }
    }),
  );
};

const getSpriteForUnit = (unitType: UnitType): ImageBitmap | null => {
  const sprite = spriteMap.get(unitType);
  if (!sprite) {
    console.warn(`No sprite found for unit type '${unitType}'. Available sprites:`, Array.from(spriteMap.keys()));
    console.warn(`Sprite map size: ${spriteMap.size}`);
    // Also check if the sprite is configured
    if (!SPRITE_CONFIG[unitType]) {
      console.warn(`Unit type '${unitType}' is not configured in SPRITE_CONFIG`);
    }
  }
  return sprite ?? null;
};

export const isSpriteReady = (unitType: UnitType): boolean => {
  return spriteMap.has(unitType);
};

const coloredSpriteCache: Map<string, HTMLCanvasElement> = new Map();

/**
 * Load a canvas and replace grayscale with border colors
 */
export const colorizeCanvas = (
  source: CanvasImageSource & { width: number; height: number },
  colorA: Colord,
  colorB: Colord,
  colorC: Colord,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const colorARgb = colorA.toRgb();
  const colorBRgb = colorB.toRgb();
  const colorCRgb = colorC.toRgb();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];

    if (r === 180 && g === 180 && b === 180) {
      data[i] = colorARgb.r;
      data[i + 1] = colorARgb.g;
      data[i + 2] = colorARgb.b;
    } else if (r === 70 && g === 70 && b === 70) {
      data[i] = colorBRgb.r;
      data[i + 1] = colorBRgb.g;
      data[i + 2] = colorBRgb.b;
    } else if (r === 130 && g === 130 && b === 130) {
      data[i] = colorCRgb.r;
      data[i + 1] = colorCRgb.g;
      data[i + 2] = colorCRgb.b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

export const getColoredSprite = (
  unit: UnitView,
  theme: Theme,
  customTerritoryColor?: Colord,
  customBorderColor?: Colord,
): HTMLCanvasElement => {
  const owner = unit.owner();
  const territoryColor: Colord =
    customTerritoryColor ?? theme.territoryColor(owner);
  const borderColor: Colord = customBorderColor ?? theme.borderColor(owner);
  const spawnHighlightColor = theme.spawnHighlightColor();
  const key = `${unit.type()}-${owner.id()}-${territoryColor.toRgbString()}-${borderColor.toRgbString()}`;

  if (coloredSpriteCache.has(key)) {
    return coloredSpriteCache.get(key)!;
  }

  const sprite = getSpriteForUnit(unit.type());
  if (sprite === null) {
    console.error(`Failed to get sprite for unit type ${unit.type()}. Unit:`, unit);
    // Return a placeholder canvas instead of throwing
    const placeholder = document.createElement('canvas');
    placeholder.width = 16;
    placeholder.height = 16;
    const ctx = placeholder.getContext('2d')!;
    ctx.fillStyle = territoryColor.toRgbString();
    ctx.fillRect(0, 0, 16, 16);
    ctx.strokeStyle = borderColor.toRgbString();
    ctx.strokeRect(0, 0, 16, 16);
    return placeholder;
  }

  const coloredCanvas = colorizeCanvas(
    sprite,
    territoryColor,
    borderColor,
    spawnHighlightColor,
  );

  coloredSpriteCache.set(key, coloredCanvas);
  return coloredCanvas;
};
