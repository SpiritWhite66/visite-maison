import { CHECKLIST_CATALOGUE, PointChecklist, THEMES_CHECKLIST } from './checklist-catalogue';
import { EtatPoint, ReponseChecklist, TypeBien, Visite } from './modeles';

export interface ThemeAvecPoints {
  id: string;
  libelle: string;
  points: readonly PointChecklist[];
}

export interface Progression {
  verifies: number;
  total: number;
}

/** Thèmes et points applicables à un type de bien, dans l'ordre du catalogue. */
export function themesPourBien(typeBien: TypeBien): ThemeAvecPoints[] {
  return THEMES_CHECKLIST.filter((t) => t.typesBien.includes(typeBien)).map((t) => ({
    id: t.id,
    libelle: t.libelle,
    points: CHECKLIST_CATALOGUE.filter((pt) => pt.theme === t.id && pt.typesBien.includes(typeBien)),
  }));
}

export function pointParId(pointId: string): PointChecklist | undefined {
  return CHECKLIST_CATALOGUE.find((pt) => pt.id === pointId);
}

/** Réponse enregistrée pour un point, ou une réponse vierge (`NON_VERIFIE`). */
export function reponseDe(visite: Visite, pointId: string): ReponseChecklist {
  return visite.reponses.find((r) => r.pointId === pointId) ?? { pointId, etat: 'NON_VERIFIE', photoIds: [] };
}

/** Nouvelle visite avec la réponse du point mise à jour ; l'originale n'est pas modifiée. */
export function modifierReponse(
  visite: Visite,
  pointId: string,
  modification: Partial<Omit<ReponseChecklist, 'pointId'>>,
): Visite {
  const maj: ReponseChecklist = { ...reponseDe(visite, pointId), ...modification };
  const existe = visite.reponses.some((r) => r.pointId === pointId);
  return {
    ...visite,
    reponses: existe ? visite.reponses.map((r) => (r.pointId === pointId ? maj : r)) : [...visite.reponses, maj],
  };
}

/** Un point est « vérifié » dès qu'il n'est plus `NON_VERIFIE` (N/A compris). */
export function progression(points: readonly PointChecklist[], visite: Visite): Progression {
  return {
    verifies: points.filter((pt) => reponseDe(visite, pt.id).etat !== 'NON_VERIFIE').length,
    total: points.length,
  };
}

export function progressionTotale(typeBien: TypeBien, visite: Visite): Progression {
  const points = themesPourBien(typeBien).flatMap((t) => t.points);
  return progression(points, visite);
}

export function compterEtats(typeBien: TypeBien, visite: Visite): Record<EtatPoint, number> {
  const compte: Record<EtatPoint, number> = { OK: 0, A_SURVEILLER: 0, TRAVAUX: 0, NA: 0, NON_VERIFIE: 0 };
  for (const pt of themesPourBien(typeBien).flatMap((t) => t.points)) {
    compte[reponseDe(visite, pt.id).etat]++;
  }
  return compte;
}
