import ar from "../../resources/lang/ar.json";
import bg from "../../resources/lang/bg.json";
import bn from "../../resources/lang/bn.json";
import cs from "../../resources/lang/cs.json";
import de from "../../resources/lang/de.json";
import en from "../../resources/lang/en.json";
import eo from "../../resources/lang/eo.json";
import es from "../../resources/lang/es.json";
import fr from "../../resources/lang/fr.json";
import he from "../../resources/lang/he.json";
import hi from "../../resources/lang/hi.json";
import it from "../../resources/lang/it.json";
import ja from "../../resources/lang/ja.json";
import nl from "../../resources/lang/nl.json";
import pl from "../../resources/lang/pl.json";
import pt_br from "../../resources/lang/pt_br.json";
import ru from "../../resources/lang/ru.json";
import sh from "../../resources/lang/sh.json";
import tp from "../../resources/lang/tp.json";
import tr from "../../resources/lang/tr.json";
import uk from "../../resources/lang/uk.json";

class TranslationManager {
  private static instance: TranslationManager;
  private translations: any = {};
  private defaultTranslations: any = {};
  private currentLang: string = "en";
  
  private languageMap: Record<string, any> = {
    ar,
    bg,
    bn,
    de,
    en,
    es,
    eo,
    fr,
    it,
    hi,
    ja,
    nl,
    pl,
    pt_br,
    ru,
    sh,
    tr,
    tp,
    uk,
    cs,
    he,
  };

  private constructor() {}

  static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager();
    }
    return TranslationManager.instance;
  }

  async initialize() {
    const browserLocale = navigator.language;
    const savedLang = localStorage.getItem("lang");
    const userLang = this.getClosestSupportedLang(savedLang || browserLocale);

    this.defaultTranslations = this.languageMap["en"];
    this.translations = this.languageMap[userLang] || this.defaultTranslations;
    this.currentLang = userLang;
  }

  private getClosestSupportedLang(lang: string): string {
    if (!lang) return "en";
    if (lang in this.languageMap) return lang;
    const base = lang.split("-")[0];
    if (base in this.languageMap) return base;
    return "en";
  }

  translateText(key: string, params: Record<string, string | number> = {}): string {
    const keys = key.split(".");
    let value = this.translations;
    let defaultValue = this.defaultTranslations;

    for (const k of keys) {
      value = value?.[k];
      defaultValue = defaultValue?.[k];
    }

    let translation = value || defaultValue || key;

    // Replace parameters
    for (const [paramKey, paramValue] of Object.entries(params)) {
      translation = translation.replace(`{${paramKey}}`, String(paramValue));
    }

    return translation;
  }

  getCurrentLanguage(): string {
    return this.currentLang;
  }

  async setLanguage(lang: string) {
    this.currentLang = lang;
    this.translations = this.languageMap[lang] || this.defaultTranslations;
    localStorage.setItem("lang", lang);
  }

  getAvailableLanguages(): string[] {
    return Object.keys(this.languageMap);
  }

  getLanguageData(lang: string): any {
    return this.languageMap[lang];
  }
}

export const translationManager = TranslationManager.getInstance();