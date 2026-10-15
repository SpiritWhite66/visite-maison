export interface EtatBaseDonnees {
  ouverte: boolean;
  version: number | null;
  erreur?: string;
}

export abstract class BaseDonneesPort {
  abstract etat(): Promise<EtatBaseDonnees>;
}
