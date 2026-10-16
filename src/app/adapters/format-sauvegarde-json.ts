import { Injectable } from '@angular/core';
import { FichierPlan, Photo } from '../domain/modeles';
import {
  DonneesBase,
  FichierPlanExporte,
  FORMAT_SAUVEGARDE,
  PhotoExportee,
  resumerDonnees,
  validerSauvegarde,
  VERSION_FORMAT,
} from '../domain/sauvegarde';
import { FormatSauvegardePort, SauvegardeInvalideError, SauvegardeLue } from '../ports/sauvegarde.port';

function versBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(lecteur.error ?? new Error('Lecture du fichier impossible'));
    lecteur.onload = () => {
      const url = String(lecteur.result);
      resolve(url.slice(url.indexOf(',') + 1));
    };
    lecteur.readAsDataURL(blob);
  });
}

function depuisBase64(donnees: string, type: string): Blob {
  const binaire = atob(donnees);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type });
}

/**
 * JSON unique : les tables en clair, les images en base 64.
 * Le fichier est assemblé morceau par morceau (un `Blob` de plusieurs parties) pour ne jamais
 * garder en mémoire une chaîne de la taille de toute la sauvegarde.
 */
@Injectable()
export class FormatSauvegardeJson extends FormatSauvegardePort {
  async ecrire(d: DonneesBase, versionApp: string, exporteLe: Date): Promise<Blob> {
    const parties: BlobPart[] = [];
    const ligne = (cle: string, valeur: unknown) => parties.push(`  ${JSON.stringify(cle)}: ${JSON.stringify(valeur)},\n`);

    parties.push('{\n');
    ligne('format', FORMAT_SAUVEGARDE);
    ligne('version', VERSION_FORMAT);
    ligne('exporteLe', exporteLe.toISOString());
    ligne('versionApp', versionApp);
    ligne('biens', d.biens);
    ligne('postesTravaux', d.postesTravaux);
    ligne('visites', d.visites);
    ligne('pieces', d.pieces);
    ligne('etages', d.etages);
    ligne('bareme', d.bareme);
    ligne('personnes', d.personnes);
    ligne('avis', d.avis);
    if (d.parametres) ligne('parametres', d.parametres);

    parties.push('  "photos": [');
    for (const [i, photo] of d.photos.entries()) {
      const { blob, ...reste } = photo;
      const ex: PhotoExportee = { ...reste, type: blob.type || 'image/jpeg', donnees: await versBase64(blob) };
      parties.push((i ? ',\n    ' : '\n    ') + JSON.stringify(ex));
    }
    parties.push('\n  ],\n  "fichiersPlan": [');
    for (const [i, fichier] of d.fichiersPlan.entries()) {
      const { blob, ...reste } = fichier;
      const ex: FichierPlanExporte = { ...reste, donnees: await versBase64(blob) };
      parties.push((i ? ',\n    ' : '\n    ') + JSON.stringify(ex));
    }
    parties.push('\n  ]\n}\n');
    return new Blob(parties, { type: 'application/json' });
  }

  async lire(fichier: Blob): Promise<SauvegardeLue> {
    let brut: unknown;
    try {
      brut = JSON.parse(await fichier.text());
    } catch {
      throw new SauvegardeInvalideError('Ce fichier n’est pas lisible : ce n’est pas du JSON, ou il est tronqué.');
    }
    const resultat = validerSauvegarde(brut);
    if (!resultat.ok) throw new SauvegardeInvalideError(resultat.erreur);
    const s = resultat.sauvegarde;

    let donnees: DonneesBase;
    try {
      donnees = {
        biens: s.biens,
        postesTravaux: s.postesTravaux,
        visites: s.visites,
        pieces: s.pieces,
        etages: s.etages,
        bareme: s.bareme,
        parametres: s.parametres,
        personnes: s.personnes,
        avis: s.avis,
        photos: s.photos.map(({ donnees: d, type, ...reste }): Photo => ({ ...reste, blob: depuisBase64(d, type) })),
        fichiersPlan: s.fichiersPlan.map(({ donnees: d, ...reste }): FichierPlan => ({ ...reste, blob: depuisBase64(d, reste.typeMime) })),
      };
    } catch {
      throw new SauvegardeInvalideError('Une image de la sauvegarde est corrompue.');
    }
    return { donnees, resume: resumerDonnees(donnees), exporteLe: s.exporteLe, versionApp: s.versionApp };
  }
}
