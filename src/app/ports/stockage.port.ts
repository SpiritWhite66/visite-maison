export interface EstimationStockage {
  usageOctets: number | null;
  quotaOctets: number | null;
}

export abstract class StockagePort {
  abstract estPersistant(): Promise<boolean | null>;
  abstract demanderPersistance(): Promise<boolean | null>;
  abstract estimer(): Promise<EstimationStockage>;
}
