import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TokenUsageState {
  // Current token usage
  usedTokens: number;
  tokenLimit: number;
  
  // Token history for analytics
  dailyUsage: Record<string, number>;
  monthlyUsage: Record<string, number>;
  
  // Reset information
  resetDate: Date;
  lastResetType: 'daily' | 'monthly' | 'manual';
  
  // Actions
  addTokenUsage: (tokens: number) => void;
  resetTokens: (type?: 'daily' | 'monthly' | 'manual') => void;
  setTokenLimit: (limit: number) => void;
  getUsagePercentage: () => number;
  getRemainingTokens: () => number;
  canUseTokens: (tokens: number) => boolean;
  
  // Analytics
  getTodayUsage: () => number;
  getThisMonthUsage: () => number;
  getUsageHistory: (days: number) => { date: string; usage: number }[];
}

export const useTokenUsage = create<TokenUsageState>()(
  persist(
    (set, get) => ({
      // Initial state
      usedTokens: 0,
      tokenLimit: 10000, // Default monthly limit
      dailyUsage: {},
      monthlyUsage: {},
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lastResetType: 'monthly',

      // Add token usage
      addTokenUsage: (tokens: number) => {
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = new Date().toISOString().substring(0, 7);
        
        set((state) => ({
          usedTokens: state.usedTokens + tokens,
          dailyUsage: {
            ...state.dailyUsage,
            [today]: (state.dailyUsage[today] || 0) + tokens
          },
          monthlyUsage: {
            ...state.monthlyUsage,
            [thisMonth]: (state.monthlyUsage[thisMonth] || 0) + tokens
          }
        }));
      },

      // Reset tokens
      resetTokens: (type = 'manual') => {
        const resetDate = type === 'daily' 
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          
        set({
          usedTokens: 0,
          resetDate,
          lastResetType: type
        });
      },

      // Set token limit
      setTokenLimit: (limit: number) => {
        set({ tokenLimit: limit });
      },

      // Get usage percentage
      getUsagePercentage: () => {
        const { usedTokens, tokenLimit } = get();
        return Math.min((usedTokens / tokenLimit) * 100, 100);
      },

      // Get remaining tokens
      getRemainingTokens: () => {
        const { usedTokens, tokenLimit } = get();
        return Math.max(tokenLimit - usedTokens, 0);
      },

      // Check if can use tokens
      canUseTokens: (tokens: number) => {
        const { usedTokens, tokenLimit } = get();
        return usedTokens + tokens <= tokenLimit;
      },

      // Get today's usage
      getTodayUsage: () => {
        const today = new Date().toISOString().split('T')[0];
        const { dailyUsage } = get();
        return dailyUsage[today] || 0;
      },

      // Get this month's usage
      getThisMonthUsage: () => {
        const thisMonth = new Date().toISOString().substring(0, 7);
        const { monthlyUsage } = get();
        return monthlyUsage[thisMonth] || 0;
      },

      // Get usage history
      getUsageHistory: (days: number) => {
        const { dailyUsage } = get();
        const history: { date: string; usage: number }[] = [];
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          history.push({
            date: dateStr,
            usage: dailyUsage[dateStr] || 0
          });
        }
        
        return history;
      }
    }),
    {
      name: 'token-usage-storage',
      version: 1,
    }
  )
);
