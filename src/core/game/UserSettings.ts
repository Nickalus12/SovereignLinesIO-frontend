export class UserSettings {
  get(key: string, defaultValue: boolean): boolean {
    const value = localStorage.getItem(key);
    if (!value) return defaultValue;

    if (value === "true") return true;

    if (value === "false") return false;

    return defaultValue;
  }

  set(key: string, value: boolean) {
    localStorage.setItem(key, value ? "true" : "false");
  }

  emojis() {
    return this.get("settings.emojis", true);
  }
  anonymousNames() {
    return this.get("settings.anonymousNames", false);
  }

  fxLayer() {
    return this.get("settings.specialEffects", true);
  }

  darkMode() {
    return this.get("settings.darkMode", false);
  }

  leftClickOpensMenu() {
    return this.get("settings.leftClickOpensMenu", false);
  }

  focusLocked() {
    return false;
    // TODO: renable when performance issues are fixed.
    this.get("settings.focusLocked", true);
  }

  toggleLeftClickOpenMenu() {
    this.set("settings.leftClickOpensMenu", !this.leftClickOpensMenu());
  }

  toggleFocusLocked() {
    this.set("settings.focusLocked", !this.focusLocked());
  }

  toggleEmojis() {
    this.set("settings.emojis", !this.emojis());
  }

  toggleRandomName() {
    this.set("settings.anonymousNames", !this.anonymousNames());
  }

  toggleFxLayer() {
    this.set("settings.specialEffects", !this.fxLayer());
  }

  toggleDarkMode() {
    this.set("settings.darkMode", !this.darkMode());
    if (this.darkMode()) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  // Country UI visibility settings - default to showing everything
  showNationNames() {
    return this.get("settings.showNationNames", true);
  }

  showCrowns() {
    return this.get("settings.showCrowns", true);
  }
  
  showTroops() {
    return this.get("settings.showTroops", true);
  }
  
  showAlliances() {
    return this.get("settings.showAlliances", true);
  }
  
  showAllianceRequests() {
    return this.get("settings.showAllianceRequests", true);
  }
  
  showTargets() {
    return this.get("settings.showTargets", true);
  }
  
  showTraitors() {
    return this.get("settings.showTraitors", true);
  }
  
  showDisconnected() {
    return this.get("settings.showDisconnected", true);
  }
  
  showEmbargoes() {
    return this.get("settings.showEmbargoes", true);
  }
  
  showNukes() {
    return this.get("settings.showNukes", true);
  }
  
  showFlags() {
    return this.get("settings.showFlags", true);
  }
  
  // Legacy hide methods for backward compatibility
  hideNationNames() {
    return !this.showNationNames();
  }

  hideCrowns() {
    return !this.showCrowns();
  }
  
  hideTroops() {
    return !this.showTroops();
  }
  
  hideAlliances() {
    return !this.showAlliances();
  }
  
  hideAllianceRequests() {
    return !this.showAllianceRequests();
  }
  
  hideTargets() {
    return !this.showTargets();
  }
  
  hideTraitors() {
    return !this.showTraitors();
  }
  
  hideDisconnected() {
    return !this.showDisconnected();
  }
  
  hideEmbargoes() {
    return !this.showEmbargoes();
  }
  
  hideNukes() {
    return !this.showNukes();
  }
  
  hideFlags() {
    return !this.showFlags();
  }

  // Toggle methods for Country UI settings
  toggleShowNationNames() {
    this.set("settings.showNationNames", !this.showNationNames());
  }

  toggleShowCrowns() {
    this.set("settings.showCrowns", !this.showCrowns());
  }
  
  toggleShowTroops() {
    this.set("settings.showTroops", !this.showTroops());
  }
  
  toggleShowAlliances() {
    this.set("settings.showAlliances", !this.showAlliances());
  }
  
  toggleShowAllianceRequests() {
    this.set("settings.showAllianceRequests", !this.showAllianceRequests());
  }
  
  toggleShowTargets() {
    this.set("settings.showTargets", !this.showTargets());
  }
  
  toggleShowTraitors() {
    this.set("settings.showTraitors", !this.showTraitors());
  }
  
  toggleShowDisconnected() {
    this.set("settings.showDisconnected", !this.showDisconnected());
  }
  
  toggleShowEmbargoes() {
    this.set("settings.showEmbargoes", !this.showEmbargoes());
  }
  
  toggleShowNukes() {
    this.set("settings.showNukes", !this.showNukes());
  }
  
  toggleShowFlags() {
    this.set("settings.showFlags", !this.showFlags());
  }
  
  // Legacy toggle methods for backward compatibility
  toggleHideNationNames() {
    this.toggleShowNationNames();
  }

  toggleHideCrowns() {
    this.toggleShowCrowns();
  }
  
  toggleHideTroops() {
    this.toggleShowTroops();
  }
  
  toggleHideAlliances() {
    this.toggleShowAlliances();
  }
  
  toggleHideAllianceRequests() {
    this.toggleShowAllianceRequests();
  }
  
  toggleHideTargets() {
    this.toggleShowTargets();
  }
  
  toggleHideTraitors() {
    this.toggleShowTraitors();
  }
  
  toggleHideDisconnected() {
    this.toggleShowDisconnected();
  }
  
  toggleHideEmbargoes() {
    this.toggleShowEmbargoes();
  }
  
  toggleHideNukes() {
    this.toggleShowNukes();
  }
  
  toggleHideFlags() {
    this.toggleShowFlags();
  }
  
  // SAM radius visibility
  showSAMRadius() {
    return this.get("settings.showSAMRadius", true);
  }
  
  toggleShowSAMRadius() {
    this.set("settings.showSAMRadius", !this.showSAMRadius());
  }
  
  // Master toggle for all Country UI
  toggleAllCountryUI(show: boolean) {
    this.set("settings.showNationNames", show);
    this.set("settings.showCrowns", show);
    this.set("settings.showTroops", show);
    this.set("settings.showAlliances", show);
    this.set("settings.showAllianceRequests", show);
    this.set("settings.showTargets", show);
    this.set("settings.showTraitors", show);
    this.set("settings.showDisconnected", show);
    this.set("settings.showEmbargoes", show);
    this.set("settings.showNukes", show);
    this.set("settings.showFlags", show);
  }
}
