import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/contexts/AuthContext';

const WALLET_UNLOCK_KEY = 'muso_wallet_unlocked_';
const PAYPAL_PAYMENT_URL = 'https://www.paypal.com/paypalme/MUSOWallet/25';

interface WalletUnlockState {
  isWalletUnlocked: boolean;
  isAIAgent: boolean;
  isCheckingStatus: boolean;
  unlockWallet: () => void;
  openPayPalPayment: () => void;
  paypalUrl: string;
}

export const [WalletUnlockProvider, useWalletUnlock] = createContextHook((): WalletUnlockState => { // eslint-disable-line rork/general-context-optimization
  const auth = useAuth();
  const userId = auth?.user?.id ?? null;

  const [isWalletUnlocked, setIsWalletUnlocked] = useState(false);
  const [isAIAgent, setIsAIAgent] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    const checkUnlockStatus = async () => {
      setIsCheckingStatus(true);
      try {
        if (!userId) {
          setIsWalletUnlocked(false);
          setIsAIAgent(false);
          setIsCheckingStatus(false);
          return;
        }

        const agentFlag = await AsyncStorage.getItem(`muso_is_ai_agent_${userId}`);
        if (agentFlag === 'true') {
          console.log('[WalletUnlock] User is AI Agent — wallet is free');
          setIsAIAgent(true);
          setIsWalletUnlocked(true);
          setIsCheckingStatus(false);
          return;
        }

        const unlocked = await AsyncStorage.getItem(`${WALLET_UNLOCK_KEY}${userId}`);
        console.log('[WalletUnlock] Wallet unlock status for', userId, ':', unlocked);
        setIsWalletUnlocked(unlocked === 'true');
        setIsAIAgent(false);
      } catch (err) {
        console.error('[WalletUnlock] Error checking unlock status:', err);
        setIsWalletUnlocked(false);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    void checkUnlockStatus();
  }, [userId]);

  const unlockWallet = useCallback(async () => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(`${WALLET_UNLOCK_KEY}${userId}`, 'true');
      setIsWalletUnlocked(true);
      console.log('[WalletUnlock] Wallet unlocked for user:', userId);
    } catch (err) {
      console.error('[WalletUnlock] Error unlocking wallet:', err);
    }
  }, [userId]);

  const openPayPalPayment = useCallback(() => {
    console.log('[WalletUnlock] Opening PayPal payment URL');
  }, []);

  return useMemo(() => ({
    isWalletUnlocked,
    isAIAgent,
    isCheckingStatus,
    unlockWallet,
    openPayPalPayment,
    paypalUrl: PAYPAL_PAYMENT_URL,
  }), [isWalletUnlocked, isAIAgent, isCheckingStatus, unlockWallet, openPayPalPayment]);
});
