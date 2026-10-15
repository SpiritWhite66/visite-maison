import { NatureEquipement } from '../../../domain/modeles';

export const EQUIPEMENTS: Record<NatureEquipement, { libelle: string; sigle: string; couleur: string }> = {
  ECS: { libelle: 'Chauffe-eau (ECS)', sigle: 'ECS', couleur: '#2f6f9f' },
  TABLEAU_ELECTRIQUE: { libelle: 'Tableau électrique', sigle: 'TE', couleur: '#b27417' },
  CHAUFFAGE: { libelle: 'Chaudière / poêle', sigle: 'CH', couleur: '#b0392b' },
  COMPTEUR_EAU: { libelle: 'Compteur d’eau', sigle: 'EAU', couleur: '#3d7a4c' },
};

export const NIVEAUX_PROPOSES = ['Rez-de-chaussée', 'Étage', 'Combles', 'Sous-sol', 'Dépendance'];
