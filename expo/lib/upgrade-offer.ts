import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * One-shot flag that carries "this person just registered" from the register
 * screen to the first screen they land on.
 *
 * Registration replaces the screen it lives on, so the offer cannot be shown
 * from there - it would be torn down mid-animation. Persisting a flag also
 * means the offer still appears if the app is killed between the two steps,
 * and a returning member never sees it again.
 */
const UPGRADE_OFFER_PENDING_KEY = 'wci_upgrade_offer_pending';

/** Called right after a successful registration. */
export async function markUpgradeOfferPending(): Promise<void> {
  try {
    await AsyncStorage.setItem(UPGRADE_OFFER_PENDING_KEY, 'true');
  } catch (error) {
    // A failure here only costs the upsell, never the account - the user is
    // already registered by this point, so swallow it rather than surfacing
    // a scary error on top of a successful signup.
    console.log('[UpgradeOffer] Could not flag offer as pending:', error);
  }
}

/**
 * Reads and clears the flag in one step, so the offer can only ever fire
 * once even if two screens check it during the same navigation.
 */
export async function consumeUpgradeOfferPending(): Promise<boolean> {
  try {
    const pending = await AsyncStorage.getItem(UPGRADE_OFFER_PENDING_KEY);
    if (pending !== 'true') return false;
    await AsyncStorage.removeItem(UPGRADE_OFFER_PENDING_KEY);
    return true;
  } catch (error) {
    console.log('[UpgradeOffer] Could not read pending flag:', error);
    return false;
  }
}
