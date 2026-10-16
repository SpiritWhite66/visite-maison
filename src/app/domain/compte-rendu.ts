import { PointChecklist } from './checklist-catalogue';
import { reponseDe, themesPourBien } from './checklist';
import { EtatPoint, PosteTravaux, Priorite, ReponseChecklist, TypeBien, Visite } from './modeles';

/** Point relevé pendant une visite et à signaler dans le compte rendu. */
export interface PointSignale {
  theme: string;
  point: PointChecklist;
  reponse: ReponseChecklist;
}

export interface LigneRecapitulatif {
  theme: string;
  total: number;
  ok: number;
  aSurveiller: number;
  travaux: number;
  na: number;
  nonVerifie: number;
}

export interface PointsSignales {
  travaux: PointSignale[];
  aSurveiller: PointSignale[];
}

/**
 * Points « Travaux » et « À surveiller » d'une visite, dans l'ordre du catalogue.
 * Les points OK ne sont pas listés : ils ne figurent que dans le récapitulatif par thème.
 */
export function pointsSignales(typeBien: TypeBien, visite: Visite): PointsSignales {
  const resultat: PointsSignales = { travaux: [], aSurveiller: [] };
  for (const theme of themesPourBien(typeBien)) {
    for (const point of theme.points) {
      const reponse = reponseDe(visite, point.id);
      if (reponse.etat === 'TRAVAUX') resultat.travaux.push({ theme: theme.libelle, point, reponse });
      else if (reponse.etat === 'A_SURVEILLER') resultat.aSurveiller.push({ theme: theme.libelle, point, reponse });
    }
  }
  return resultat;
}

const CHAMP_PAR_ETAT: Record<EtatPoint, keyof Omit<LigneRecapitulatif, 'theme' | 'total'>> = {
  OK: 'ok',
  A_SURVEILLER: 'aSurveiller',
  TRAVAUX: 'travaux',
  NA: 'na',
  NON_VERIFIE: 'nonVerifie',
};

/** Un compteur par thème et par état : c'est ce qui résume les points conformes. */
export function recapitulatifParTheme(typeBien: TypeBien, visite: Visite): LigneRecapitulatif[] {
  return themesPourBien(typeBien).map((theme) => {
    const ligne: LigneRecapitulatif = { theme: theme.libelle, total: theme.points.length, ok: 0, aSurveiller: 0, travaux: 0, na: 0, nonVerifie: 0 };
    for (const point of theme.points) ligne[CHAMP_PAR_ETAT[reponseDe(visite, point.id).etat]]++;
    return ligne;
  });
}

const RANG_PRIORITE: Record<Priorite, number> = { URGENT: 0, COURT_TERME: 1, CONFORT: 2 };

/** Urgent d'abord, puis court terme, puis confort ; à priorité égale, par catégorie puis libellé. */
export function trierPostes(postes: readonly PosteTravaux[]): PosteTravaux[] {
  return [...postes].sort(
    (a, b) =>
      RANG_PRIORITE[a.priorite] - RANG_PRIORITE[b.priorite] ||
      a.categorie.localeCompare(b.categorie, 'fr') ||
      a.libelle.localeCompare(b.libelle, 'fr'),
  );
}

/** Visites à imprimer : la plus récente par défaut, ou toutes (de la plus ancienne à la plus récente). */
export function visitesAImprimer(visites: readonly Visite[], choix: string): Visite[] {
  const chronologique = [...visites].sort((a, b) => a.date.localeCompare(b.date));
  if (choix === 'toutes') return chronologique;
  if (choix === 'derniere') return chronologique.slice(-1);
  return chronologique.filter((v) => v.id === choix);
}
