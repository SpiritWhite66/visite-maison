const COULEURS = ['#2f5d50', '#2f6f9f', '#8a5a9f', '#b27417', '#b0392b', '#4d7a8a', '#6b7a2f', '#a0526a'];

/** Couleur stable d'une personne (même couleur partout), choisie d'après son identifiant. */
export function couleurPersonne(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COULEURS[h % COULEURS.length];
}

export function initiale(prenom: string): string {
  return prenom.trim().charAt(0).toLocaleUpperCase('fr');
}
