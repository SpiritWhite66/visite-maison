const octets = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export function formaterTaille(valeur: number | null): string {
  if (valeur === null) return 'inconnu';
  if (valeur < 1024) return `${octets.format(valeur)} o`;
  if (valeur < 1024 ** 2) return `${octets.format(valeur / 1024)} Ko`;
  if (valeur < 1024 ** 3) return `${octets.format(valeur / 1024 ** 2)} Mo`;
  return `${octets.format(valeur / 1024 ** 3)} Go`;
}
