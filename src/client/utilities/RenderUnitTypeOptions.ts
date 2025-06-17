// renderUnitTypeOptions.ts
import { html, TemplateResult } from "lit";
import { UnitType } from "../../core/game/Game";
import { translateText } from "../Utils";

export interface UnitTypeRenderContext {
  disabledUnits: UnitType[];
  toggleUnit: (unit: UnitType, checked: boolean) => void;
}

const unitOptions: UnitType[] = [
  UnitType.City,
  UnitType.DefensePost,
  UnitType.Port,
  UnitType.Warship,
  UnitType.MissileSilo,
  UnitType.SAMLauncher,
  UnitType.AtomBomb,
  UnitType.HydrogenBomb,
  UnitType.MIRV,
];

// Helper function to convert enum value to translation key
function getUnitTranslationKey(unitType: UnitType): string {
  // Convert "Missile Silo" to "missile_silo", "Defense Post" to "defense_post", etc.
  const key = unitType.toString().toLowerCase().replace(/\s+/g, '_');
  return `unit_type.${key}`;
}

export function renderUnitTypeOptions({
  disabledUnits,
  toggleUnit,
}: UnitTypeRenderContext): TemplateResult[] {
  return unitOptions.map(
    (unitType) => html`
      <label
        class="option-card ${disabledUnits.includes(unitType) ? "" : "selected"}"
        style="width: 140px;"
      >
        <div class="checkbox-icon"></div>
        <input
          type="checkbox"
          .checked=${disabledUnits.includes(unitType)}
          @change=${(e: Event) => {
            const checked = (e.target as HTMLInputElement).checked;
            toggleUnit(unitType, checked);
          }}
        />
        <div class="option-card-title" style="text-align: center;">
          ${translateText(getUnitTranslationKey(unitType))}
        </div>
      </label>
    `,
  );
}
