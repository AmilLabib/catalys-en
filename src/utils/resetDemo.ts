// Clears all Catalys demo data in this browser, then reloads to the login page.
// Only the app's own keys are removed, not the origin's entire localStorage.
const PREFIXES = ["catalys_", "inventory_", "journals_", "chartOfAccounts_", "business_sector_", "cashier_orders", "tour_shown_"];

export function resetDemoData({ showTour = true }: { showTour?: boolean } = {}) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && PREFIXES.some((p) => k.startsWith(p))) keys.push(k);
    }
    for (const k of keys) {
      // keep the tour status if the user doesn't want to see the tour again
      if (!showTour && k.startsWith("tour_shown_")) continue;
      localStorage.removeItem(k);
    }
  } catch {
    // storage unavailable: reload anyway
  }
  // full reload so every context starts from initial data (without rewriting old data)
  window.location.assign("/");
}
