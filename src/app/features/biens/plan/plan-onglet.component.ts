import { Component, computed, ErrorHandler, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanService } from '../../../application/plan.service';
import { Etage, FichierPlan, Piece } from '../../../domain/modeles';
import { bornes } from '../../../domain/plan';
import { surfacePiece } from '../../../domain/piece';
import { IconeComponent } from '../../../shared/icone.component';
import { NIVEAUX_PROPOSES } from './libelles-plan';
import { InfoPiece, RenduPlanComponent } from './rendu-plan.component';

interface FichierAffiche {
  fichier: FichierPlan;
  url: string;
  image: boolean;
}

/** Onglet « Plan » de la fiche : un bloc par niveau, avec son dessin et ses plans importés. */
@Component({
  selector: 'app-plan-onglet',
  imports: [RouterLink, IconeComponent, RenduPlanComponent],
  templateUrl: './plan-onglet.component.html',
  styleUrl: './plan-onglet.component.scss',
})
export class PlanOngletComponent implements OnInit, OnDestroy {
  readonly bienId = input.required<string>();
  readonly piecesBien = input<Piece[]>([]);
  readonly nombreEtages = output<number>();
  private readonly plans = inject(PlanService);
  private readonly erreurs = inject(ErrorHandler);

  protected readonly etages = signal<Etage[] | null>(null);
  protected readonly fichiers = signal<FichierAffiche[]>([]);
  protected readonly ouvert = signal<FichierAffiche | null>(null);
  protected readonly envoiEnCours = signal<string | null>(null);
  protected readonly niveauxProposes = NIVEAUX_PROPOSES;

  protected readonly infosPieces = computed<Record<string, InfoPiece>>(() =>
    Object.fromEntries(this.piecesBien().map((p) => [p.id, { nom: p.nom, surface: surfacePiece(p) }])),
  );

  async ngOnInit(): Promise<void> {
    await this.charger();
  }

  ngOnDestroy(): void {
    for (const f of this.fichiers()) URL.revokeObjectURL(f.url);
  }

  private async charger(): Promise<void> {
    const [etages, fichiers] = await Promise.all([this.plans.listerEtages(this.bienId()), this.plans.listerFichiers(this.bienId())]);
    for (const f of this.fichiers()) URL.revokeObjectURL(f.url);
    this.fichiers.set(
      fichiers
        .sort((a, b) => a.ajouteLe.localeCompare(b.ajouteLe))
        .map((fichier) => ({ fichier, url: URL.createObjectURL(fichier.blob), image: fichier.typeMime.startsWith('image/') })),
    );
    this.etages.set(etages);
    this.nombreEtages.emit(etages.length);
  }

  protected fichiersDe(etageId: string): FichierAffiche[] {
    return this.fichiers().filter((f) => f.fichier.etageId === etageId);
  }

  /** Cadre du dessin pour l'aperçu, avec une marge d'un mètre. */
  protected cadre(e: Etage): string | null {
    const b = bornes(e.elements);
    if (!b) return null;
    return `${b.minX - 1} ${b.minY - 1} ${b.maxX - b.minX + 2} ${b.maxY - b.minY + 2}`;
  }

  protected async ajouterNiveau(nom: string): Promise<void> {
    const deja = this.etages()?.filter((e) => e.nom === nom || e.nom.startsWith(nom + ' ')).length ?? 0;
    await this.plans.ajouterEtage(this.bienId(), deja ? `${nom} ${deja + 1}` : nom);
    await this.charger();
  }

  protected async ajouterNiveauLibre(): Promise<void> {
    const nom = prompt('Nom du niveau (ex. « 1er étage », « Grange »)')?.trim();
    if (nom) await this.ajouterNiveau(nom);
  }

  protected async renommer(e: Etage): Promise<void> {
    const nom = prompt('Nom du niveau', e.nom)?.trim();
    if (!nom || nom === e.nom) return;
    await this.plans.enregistrerEtage({ ...e, nom });
    await this.charger();
  }

  protected async deplacer(e: Etage, sens: -1 | 1): Promise<void> {
    const liste = this.etages() ?? [];
    const i = liste.findIndex((x) => x.id === e.id);
    const autre = liste[i + sens];
    if (!autre) return;
    await Promise.all([this.plans.enregistrerEtage({ ...e, ordre: autre.ordre }), this.plans.enregistrerEtage({ ...autre, ordre: e.ordre })]);
    await this.charger();
  }

  protected async supprimerNiveau(e: Etage): Promise<void> {
    if (!confirm(`Supprimer « ${e.nom} », son dessin et ses plans importés ?`)) return;
    await this.plans.supprimerEtage(e.id);
    await this.charger();
  }

  protected async importer(e: Etage, evenement: Event): Promise<void> {
    const champ = evenement.target as HTMLInputElement;
    const choisis = [...(champ.files ?? [])];
    champ.value = '';
    if (choisis.length === 0) return;
    this.envoiEnCours.set(e.id);
    try {
      for (const f of choisis) await this.plans.ajouterFichier(this.bienId(), e.id, f);
      await this.charger();
    } catch (err) {
      this.erreurs.handleError(err);
      alert('Ce fichier n’a pas pu être ajouté.');
    } finally {
      this.envoiEnCours.set(null);
    }
  }

  protected ouvrir(f: FichierAffiche): void {
    if (f.image) this.ouvert.set(f);
    else window.open(f.url, '_blank');
  }

  /** Ouvre l'image dans un nouvel onglet, où le navigateur permet de zoomer librement. */
  protected ouvrirEnGrand(f: FichierAffiche): void {
    window.open(f.url, '_blank');
  }

  protected async supprimerFichier(f: FichierAffiche): Promise<void> {
    if (!confirm(`Supprimer « ${f.fichier.nom} » ?`)) return;
    this.ouvert.set(null);
    await this.plans.supprimerFichier(f.fichier.id);
    await this.charger();
  }
}
