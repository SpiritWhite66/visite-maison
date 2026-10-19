import { Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BudgetService } from '../../../application/budget.service';
import { DevisService } from '../../../application/devis.service';
import { TravauxService } from '../../../application/travaux.service';
import { Devis, PosteTravaux, StatutDevis } from '../../../domain/modeles';
import { formaterEuro, formaterFourchette } from '../../../shared/format';
import { IconeComponent } from '../../../shared/icone.component';
import { LIBELLE_STATUT_DEVIS } from '../../../shared/libelles';

/** Fichier affiché dans le formulaire : déjà enregistré, ou choisi et pas encore enregistré. */
interface FichierAffiche {
  cle: string;
  nom: string;
  estImage: boolean;
  url: string;
  /** Identifiant en base ; absent pour un fichier pas encore enregistré. */
  id?: string;
  fichier?: File;
}

@Component({
  selector: 'app-devis-form',
  imports: [FormsModule, RouterLink, IconeComponent],
  templateUrl: './devis-form.page.html',
  styleUrl: './devis.scss',
})
export class DevisFormPage implements OnInit, OnDestroy {
  /** Bien (`:id`), devis en édition (`:devisId`, absent à la création), poste proposé (`?poste=`) et page de retour (`?depuis=poste`). */
  readonly id = input.required<string>();
  readonly devisId = input<string>();
  readonly poste = input<string>();
  readonly depuis = input<string>();
  private readonly service = inject(DevisService);
  private readonly travaux = inject(TravauxService);
  private readonly budgets = inject(BudgetService);
  private readonly router = inject(Router);

  protected readonly devis = signal<Devis | null>(null);
  protected readonly postes = signal<PosteTravaux[]>([]);
  protected readonly fichiers = signal<FichierAffiche[]>([]);
  private readonly aSupprimer: string[] = [];
  protected readonly erreur = signal('');
  protected readonly enCours = signal(false);
  protected readonly ouvert = signal<FichierAffiche | null>(null);
  protected readonly statuts: StatutDevis[] = ['EN_ATTENTE', 'ACCEPTE', 'REFUSE'];
  protected readonly libelleStatut = LIBELLE_STATUT_DEVIS;
  protected readonly euro = formaterEuro;

  /** Postes par catégorie, pour le choix du poste. */
  protected readonly groupesPostes = computed(() => {
    const groupes = new Map<string, PosteTravaux[]>();
    for (const p of this.postes()) groupes.set(p.categorie, [...(groupes.get(p.categorie) ?? []), p]);
    return [...groupes].map(([categorie, postes]) => ({ categorie, postes }));
  });

  protected posteChoisi(d: Devis): PosteTravaux | undefined {
    return this.postes().find((p) => p.id === d.posteId);
  }

  /** Estimation du poste, sans son devis retenu. */
  protected estimation(p: PosteTravaux): string {
    const m = this.budgets.montantPoste({ ...p, devisRetenu: undefined });
    return formaterFourchette(m.bas, m.haut);
  }

  async ngOnInit(): Promise<void> {
    const postes = await this.travaux.listerParBien(this.id());
    this.postes.set(postes.sort((a, b) => a.categorie.localeCompare(b.categorie, 'fr') || a.libelle.localeCompare(b.libelle, 'fr')));
    const devisId = this.devisId();
    if (!devisId) {
      const posteId = this.poste();
      this.devis.set(this.service.nouveau(this.id(), postes.some((p) => p.id === posteId) ? posteId! : null));
      return;
    }
    const existant = await this.service.obtenir(devisId);
    if (!existant || existant.bienId !== this.id()) {
      await this.router.navigate(['/biens', this.id(), 'devis']);
      return;
    }
    this.devis.set(structuredClone(existant));
    const enregistres = await this.service.listerFichiers(devisId);
    this.fichiers.set(
      enregistres.map((f) => ({ cle: f.id, id: f.id, nom: f.nom, estImage: f.typeMime.startsWith('image/'), url: URL.createObjectURL(f.blob) })),
    );
  }

  ngOnDestroy(): void {
    for (const f of this.fichiers()) URL.revokeObjectURL(f.url);
  }

  protected retour(): { chemin: unknown[]; params: Record<string, string> } {
    const d = this.devis();
    if (this.depuis() === 'poste' && d?.posteId) return { chemin: ['/biens', this.id(), 'travaux', d.posteId], params: {} };
    return { chemin: ['/biens', this.id(), 'devis'], params: {} };
  }

  protected choisirStatut(d: Devis, statut: StatutDevis): void {
    d.statut = statut;
  }

  protected ajouterFichiers(evenement: Event): void {
    const champ = evenement.target as HTMLInputElement;
    const choisis = [...(champ.files ?? [])];
    champ.value = '';
    this.fichiers.update((l) => [
      ...l,
      ...choisis.map((fichier) => ({
        cle: crypto.randomUUID(),
        nom: fichier.name || 'Page',
        estImage: fichier.type.startsWith('image/'),
        url: URL.createObjectURL(fichier),
        fichier,
      })),
    ]);
  }

  protected retirerFichier(f: FichierAffiche): void {
    if (!confirm(`Retirer « ${f.nom} » ?`)) return;
    if (f.id) this.aSupprimer.push(f.id);
    URL.revokeObjectURL(f.url);
    this.fichiers.update((l) => l.filter((x) => x.cle !== f.cle));
    this.ouvert.set(null);
  }

  protected async enregistrer(): Promise<void> {
    const d = this.devis();
    if (!d || this.enCours()) return;
    if (!d.entreprise.trim()) {
      this.erreur.set('Indiquez l’entreprise.');
      return;
    }
    if (!(Number(d.montantTtc) > 0)) {
      this.erreur.set('Indiquez le montant TTC du devis.');
      return;
    }
    this.enCours.set(true);
    try {
      await this.service.enregistrer({
        ...d,
        entreprise: d.entreprise.trim(),
        objet: d.objet.trim(),
        notes: d.notes.trim(),
        montantTtc: Number(d.montantTtc),
        valableJusquau: d.valableJusquau || null,
        date: d.date || this.service.nouveau(d.bienId, null).date,
      });
      for (const id of this.aSupprimer) await this.service.supprimerFichier(id);
      for (const f of this.fichiers()) if (f.fichier) await this.service.ajouterFichier(d, f.fichier);
      const { chemin, params } = this.retour();
      await this.router.navigate(chemin, { queryParams: params });
    } catch (e) {
      this.erreur.set(`L’enregistrement a échoué. ${e instanceof Error ? e.message : ''}`);
    } finally {
      this.enCours.set(false);
    }
  }

  protected async supprimer(): Promise<void> {
    const d = this.devis();
    if (!d || !this.devisId() || !confirm(`Supprimer le devis de « ${d.entreprise || 'cette entreprise'} » et ses fichiers ?`)) return;
    await this.service.supprimer(d);
    const { chemin, params } = this.retour();
    await this.router.navigate(chemin, { queryParams: params });
  }
}
