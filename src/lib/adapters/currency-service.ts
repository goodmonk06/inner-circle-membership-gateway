import { CurrencyBalance } from '@/types';

/**
 * Adapter for the Currency/Economy service
 * This is a stub implementation that can be replaced with actual API calls
 */
export class CurrencyServiceAdapter {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.CURRENCY_SERVICE_URL || 'http://localhost:3002';
  }

  /**
   * Fetch currency balance for a member
   * @param memberId - The member's ID
   * @param currencyId - The currency/token ID
   * @returns Currency balance or null if not found
   */
  async getCurrencyBalance(
    memberId: string,
    currencyId: string
  ): Promise<CurrencyBalance | null> {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(
      //   `${this.baseUrl}/api/balances/${memberId}/${currencyId}`
      // );
      // if (!response.ok) return null;
      // return await response.json();

      // Stub implementation for development
      return this.stubGetCurrencyBalance(memberId, currencyId);
    } catch (error) {
      console.error('Error fetching currency balance:', error);
      return null;
    }
  }

  /**
   * Stub implementation for development/testing
   * Returns mock currency balances
   */
  private stubGetCurrencyBalance(
    memberId: string,
    currencyId: string
  ): CurrencyBalance | null {
    // Generate a deterministic balance based on memberId and currencyId hash
    const hash = (memberId + currencyId)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const balance = (hash % 10000) + 100; // Balance between 100-10100

    return {
      memberId,
      currencyId,
      balance,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Check if a member meets a minimum balance threshold
   */
  async meetsBalanceThreshold(
    memberId: string,
    currencyId: string,
    minBalance: number
  ): Promise<boolean> {
    const balance = await this.getCurrencyBalance(memberId, currencyId);
    return balance ? balance.balance >= minBalance : false;
  }
}

// Singleton instance
export const currencyService = new CurrencyServiceAdapter();
