import { Injectable } from '@angular/core';
import { EstimationStockage, StockagePort } from '../ports/stockage.port';

@Injectable()
export class StockageNavigateur extends StockagePort {
  private get api(): StorageManager | null {
    return typeof navigator !== 'undefined' && navigator.storage ? navigator.storage : null;
  }

  async estPersistant(): Promise<boolean | null> {
    return this.api?.persisted ? this.api.persisted() : null;
  }

  async demanderPersistance(): Promise<boolean | null> {
    return this.api?.persist ? this.api.persist() : null;
  }

  async estimer(): Promise<EstimationStockage> {
    if (!this.api?.estimate) return { usageOctets: null, quotaOctets: null };
    const e = await this.api.estimate();
    return { usageOctets: e.usage ?? null, quotaOctets: e.quota ?? null };
  }
}
