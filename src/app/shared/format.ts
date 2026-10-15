const octets = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export function formaterTaille(valeur: number | null): string {
  if (valeur === null) return 'inconnu';
  if (valeur < 1024) return `${octets.format(valeur)} o`;
  if (valeur < 1024 ** 2) return `${octets.format(valeur / 1024)} Ko`;
  if (valeur < 1024 ** 3) return `${octets.format(valeur / 1024 ** 2)} Mo`;
  return `${octets.format(valeur / 1024 ** 3)} Go`;
}

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Affichage à l'euro ; les calculs, eux, ne sont jamais arrondis. */
export function formaterEuro(valeur: number): string {
  return euro.format(valeur);
}

export function formaterNombre(valeur: number): string {
  return nombre.format(valeur);
}

export function formaterFourchette(bas: number, haut: number): string {
  return euro.format(bas) === euro.format(haut) ? euro.format(bas) : `${euro.format(bas)} – ${euro.format(haut)}`;
}
