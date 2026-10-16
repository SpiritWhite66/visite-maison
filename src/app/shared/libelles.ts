import { Etape, Gamme, Priorite, TypeBien } from '../domain/modeles';

export const LIBELLE_ETAPE: Record<Etape, string> = {
  REPERE: 'Repéré',
  VISITE_PLANIFIEE: 'Visite planifiée',
  VISITE: 'Visité',
  CONTRE_VISITE: 'Contre-visite',
  OFFRE_FAITE: 'Offre faite',
  OFFRE_ACCEPTEE: 'Offre acceptée',
  COMPROMIS: 'Compromis',
  OFFRE_REFUSEE: 'Offre refusée',
  ABANDONNE: 'Abandonné',
};

export const LIBELLE_TYPE_BIEN: Record<TypeBien, string> = { VILLE: 'Ville', RURAL: 'Rural' };

export const LIBELLE_PRIORITE: Record<Priorite, string> = {
  URGENT: 'Urgent',
  COURT_TERME: 'Court terme',
  CONFORT: 'Confort',
};

export const LIBELLE_GAMME: Record<Gamme, string> = {
  ECO: 'Bas de gamme',
  STANDARD: 'Moyen de gamme',
  HAUT: 'Haut de gamme',
};
