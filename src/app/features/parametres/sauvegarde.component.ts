import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DiagnosticService } from '../../application/diagnostic.service';
import { ModeImport, SauvegardeService } from '../../application/sauvegarde.service';
import { ParametresService } from '../../application/parametres.service';
import { DELAI_RAPPEL_JOURS, joursDepuis, ResumeSauvegarde, sauvegardeAFaire } from '../../domain/sauvegarde';
import { SauvegardeInvalideError, SauvegardeLue } from '../../ports/sauvegarde.port';
import { formaterTaille } from '../../shared/format';
import { IconeComponent } from '../../shared/icone.component';

type Etat = 'repos' | 'export' | 'lecture' | 'import';

@Component({
  selector: 'app-sauvegarde',
  imports: [IconeComponent],
  templateUrl: './sauvegarde.component.html',
  styleUrl: './sauvegarde.component.scss',
})
export class SauvegardeComponent implements OnInit {
  private readonly service = inject(SauvegardeService);
  private readonly diagnostic = inject(DiagnosticService);
  private readonly parametres = inject(ParametresService);

  protected readonly etat = signal<Etat>('repos');
  protected readonly persistant = signal<boolean | null>(null);
  protected readonly aDesDonnees = signal(false);
  protected readonly message = signal<{ type: 'ok' | 'erreur'; texte: string } | null>(null);
  /** Fichier lu et contrôlé, en attente du choix « remplacer » ou « fusionner ». */
  protected readonly enAttente = signal<{ nom: string; lue: SauvegardeLue } | null>(null);
  protected readonly peutPartager = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

  protected readonly jours = computed(() => joursDepuis(this.parametres.parametres().derniereSauvegarde, new Date()));
  protected readonly derniere = computed(() => this.parametres.parametres().derniereSauvegarde);
  protected readonly alerte = computed(() => sauvegardeAFaire(this.derniere(), new Date(), this.aDesDonnees()));
  protected readonly delai = DELAI_RAPPEL_JOURS;
  private readonly formatDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  protected date(iso: string): string {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? '' : this.formatDate.format(t);
  }

  async ngOnInit(): Promise<void> {
    this.persistant.set(await this.diagnostic.etatPersistance());
    this.aDesDonnees.set(await this.service.aDesDonnees());
  }

  protected async demanderPersistance(): Promise<void> {
    await this.diagnostic.demanderPersistance();
    this.persistant.set(await this.diagnostic.etatPersistance());
  }

  /* ---------- Export ---------- */

  protected async exporter(): Promise<void> {
    await this.preparer(async (fichier) => {
      const url = URL.createObjectURL(fichier);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = fichier.name;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      // Laisse au navigateur le temps de lancer le téléchargement avant de libérer l'URL.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return `Fichier « ${fichier.name} » enregistré dans les téléchargements.`;
    });
  }

  protected async partager(): Promise<void> {
    await this.preparer(async (fichier) => {
      if (!navigator.canShare({ files: [fichier] })) throw new Error('Le partage de fichiers n’est pas disponible ici.');
      try {
        await navigator.share({ files: [fichier], title: 'Sauvegarde Visite Immo' });
      } catch (e) {
        // Fermer la feuille de partage n'est pas une erreur ; mais la sauvegarde n'a pas eu lieu.
        if (e instanceof DOMException && e.name === 'AbortError') throw new Error('Partage annulé.');
        throw e;
      }
      return 'Sauvegarde partagée.';
    });
  }

  private async preparer(remettre: (f: File) => Promise<string>): Promise<void> {
    this.message.set(null);
    this.etat.set('export');
    try {
      const { fichier, resume } = await this.service.exporter();
      const texte = await remettre(fichier);
      this.message.set({ type: 'ok', texte: `${texte} ${this.decrire(resume)} · ${formaterTaille(fichier.size)}.` });
      this.aDesDonnees.set(resume.biens > 0);
    } catch (e) {
      this.message.set({ type: 'erreur', texte: e instanceof Error ? e.message : 'L’export a échoué.' });
    } finally {
      this.etat.set('repos');
    }
  }

  /* ---------- Import ---------- */

  protected async choisirFichier(evenement: Event): Promise<void> {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    if (!fichier) return;
    this.message.set(null);
    this.enAttente.set(null);
    this.etat.set('lecture');
    try {
      this.enAttente.set({ nom: fichier.name, lue: await this.service.lire(fichier) });
    } catch (e) {
      this.message.set({
        type: 'erreur',
        texte: e instanceof SauvegardeInvalideError ? e.message : 'Ce fichier n’a pas pu être lu.',
      });
    } finally {
      this.etat.set('repos');
    }
  }

  protected annulerImport(): void {
    this.enAttente.set(null);
  }

  protected async importer(mode: ModeImport): Promise<void> {
    const attente = this.enAttente();
    if (!attente) return;
    if (
      mode === 'REMPLACER' &&
      this.aDesDonnees() &&
      !confirm('Remplacer TOUTES les données de cet appareil par celles de la sauvegarde ? Ce qui n’est pas dans la sauvegarde sera perdu.')
    ) {
      return;
    }
    this.etat.set('import');
    try {
      await this.service.importer(attente.lue, mode);
      this.message.set({
        type: 'ok',
        texte: `${mode === 'REMPLACER' ? 'Données restaurées' : 'Données fusionnées'} : ${this.decrire(attente.lue.resume)}.`,
      });
      this.enAttente.set(null);
      this.aDesDonnees.set(await this.service.aDesDonnees());
    } catch (e) {
      this.message.set({ type: 'erreur', texte: `L’import a échoué, vos données n’ont pas été modifiées. ${e instanceof Error ? e.message : ''}` });
    } finally {
      this.etat.set('repos');
    }
  }

  protected decrire(r: ResumeSauvegarde): string {
    const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
    return [
      pluriel(r.biens, 'bien'),
      pluriel(r.postesTravaux, 'poste'),
      pluriel(r.visites, 'visite'),
      pluriel(r.pieces, 'pièce'),
      pluriel(r.etages, 'niveau').replace('niveaus', 'niveaux'),
      ...(r.devis > 0 ? [`${r.devis} devis`] : []),
      r.photos + r.fichiersPlan + r.fichiersDevis === 1 ? '1 image ou fichier' : `${r.photos + r.fichiersPlan + r.fichiersDevis} images et fichiers`,
      ...(r.personnes > 0 ? [pluriel(r.personnes, 'personne')] : []),
    ].join(', ');
  }
}
