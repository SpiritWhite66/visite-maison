import { inject, Injectable } from '@angular/core';
import { devisRetenuPour, integrerDevis, memeDevisRetenu } from '../domain/devis';
import { Devis, FichierDevis, PosteTravaux } from '../domain/modeles';
import { DevisPort, PostesTravauxPort } from '../ports/depots.port';
import { CompressionPhotoPort } from '../ports/photo.port';

/** Une page de devis photographiée doit rester lisible : comme un plan, plus grande qu'une photo. */
const COTE_MAX_DEVIS = 2400;
const QUALITE_DEVIS = 0.85;

function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable({ providedIn: 'root' })
export class DevisService {
  private readonly port = inject(DevisPort);
  private readonly postes = inject(PostesTravauxPort);
  private readonly compression = inject(CompressionPhotoPort);

  listerParBien(bienId: string): Promise<Devis[]> {
    return this.port.listerParBien(bienId);
  }

  obtenir(id: string): Promise<Devis | undefined> {
    return this.port.obtenir(id);
  }

  nouveau(bienId: string, posteId: string | null): Devis {
    const maintenant = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      bienId,
      posteId,
      entreprise: '',
      objet: '',
      montantTtc: 0,
      date: aujourdhui(),
      valableJusquau: null,
      statut: 'EN_ATTENTE',
      notes: '',
      ajouteLe: maintenant,
      modifieLe: maintenant,
    };
  }

  /** Postes dont le devis retenu ne correspond plus aux devis : à réenregistrer. */
  private postesAJour(postes: readonly PosteTravaux[], devis: readonly Devis[]): PosteTravaux[] {
    return postes
      .map((p) => ({ poste: p, retenu: devisRetenuPour(p.id, devis) }))
      .filter(({ poste, retenu }) => !memeDevisRetenu(poste.devisRetenu, retenu))
      .map(({ poste, retenu }) => {
        const { devisRetenu: _ancien, ...reste } = poste;
        return retenu ? { ...reste, devisRetenu: retenu } : reste;
      });
  }

  /** Enregistre le devis ; s'il est accepté, il devient le prix du poste (et l'ancien devis accepté repasse en attente). */
  async enregistrer(devis: Devis): Promise<void> {
    const [existants, postes] = await Promise.all([this.port.listerParBien(devis.bienId), this.postes.listerParBien(devis.bienId)]);
    const liste = integrerDevis(existants, { ...devis, modifieLe: new Date().toISOString() });
    const modifies = liste.filter((d) => {
      const avant = existants.find((e) => e.id === d.id);
      return !avant || d.id === devis.id || avant.statut !== d.statut;
    });
    await this.port.enregistrer(modifies, this.postesAJour(postes, liste));
  }

  async supprimer(devis: Devis): Promise<void> {
    const [existants, postes] = await Promise.all([this.port.listerParBien(devis.bienId), this.postes.listerParBien(devis.bienId)]);
    await this.port.supprimer(devis.id, this.postesAJour(postes, existants.filter((d) => d.id !== devis.id)));
  }

  listerFichiers(devisId: string): Promise<FichierDevis[]> {
    return this.port.listerFichiers(devisId);
  }

  compterFichiers(bienId: string): Promise<Map<string, number>> {
    return this.port.compterFichiers(bienId);
  }

  async blobFichier(id: string): Promise<Blob | undefined> {
    return (await this.port.obtenirFichier(id))?.blob;
  }

  /** Les photos des pages sont réduites ; les PDF et autres fichiers sont gardés tels quels. */
  async ajouterFichier(devis: Pick<Devis, 'id' | 'bienId'>, fichier: File): Promise<FichierDevis> {
    const estImage = fichier.type.startsWith('image/') && fichier.type !== 'image/svg+xml';
    const enregistrement: FichierDevis = {
      id: crypto.randomUUID(),
      bienId: devis.bienId,
      devisId: devis.id,
      nom: fichier.name || 'Devis',
      typeMime: estImage ? 'image/jpeg' : fichier.type || 'application/octet-stream',
      blob: estImage ? await this.compression.compresser(fichier, COTE_MAX_DEVIS, QUALITE_DEVIS) : fichier,
      ajouteLe: new Date().toISOString(),
    };
    await this.port.enregistrerFichier(enregistrement);
    return enregistrement;
  }

  supprimerFichier(id: string): Promise<void> {
    return this.port.supprimerFichier(id);
  }
}
