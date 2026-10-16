import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconeComponent } from '../../shared/icone.component';
import { BaremeService } from '../../application/bareme.service';
import { BudgetService } from '../../application/budget.service';
import { VisitesService } from '../../application/visites.service';
import { TravauxService } from '../../application/travaux.service';
import { Categorie, CATEGORIES, Gamme, LigneBareme, PosteTravaux, UniteBareme } from '../../domain/modeles';
import { formaterFourchette } from '../../shared/format';
import { LIBELLE_GAMME } from '../../shared/libelles';
import { gammesDisponibles, prixLigne } from '../../domain/budget';

const LIBELLE_UNITE: Record<UniteBareme, string> = { M2: 'm²', ML: 'ml', UNITE: 'unité(s)', FORFAIT: 'forfait(s)' };

@Component({
  selector: 'app-poste-form',
  imports: [FormsModule, RouterLink, IconeComponent],
  templateUrl: './poste-form.page.html',
})
export class PosteFormPage implements OnInit {
  /** Identifiant du bien (`:id`) et du poste en édition (`:posteId`, absent à la création). */
  readonly id = input.required<string>();
  readonly posteId = input<string>();
  /** Pré-remplissage depuis un point de visite (paramètres de requête). */
  readonly categorie = input<Categorie>();
  readonly libelle = input<string>();
  readonly notes = input<string>();
  readonly visiteId = input<string>();
  readonly pointId = input<string>();
  private readonly travaux = inject(TravauxService);
  private readonly budgets = inject(BudgetService);
  private readonly visites = inject(VisitesService);
  private readonly router = inject(Router);
  protected readonly baremeService = inject(BaremeService);

  protected readonly poste = signal<PosteTravaux | null>(null);
  protected readonly categories = CATEGORIES;
  protected readonly erreur = signal('');
  protected readonly libelleGamme = LIBELLE_GAMME;

  /** Gammes de la ligne choisie ; vide si la ligne n'en propose qu'une (le choix n'a alors pas de sens). */
  protected gammes(p: PosteTravaux): { gamme: Gamme; prix: string }[] {
    const l = this.ligne(p);
    if (!l) return [];
    const liste = gammesDisponibles(l);
    if (liste.length < 2) return [];
    return liste.map((gamme) => {
      const { bas, haut } = prixLigne(l, gamme);
      return { gamme, prix: `${formaterFourchette(bas, haut)} / ${this.unite(p)}` };
    });
  }

  protected choisirGamme(p: PosteTravaux, gamme: Gamme): void {
    p.gamme = gamme;
  }

  async ngOnInit(): Promise<void> {
    const posteId = this.posteId();
    if (!posteId) {
      const nouveau = this.travaux.nouveau(this.id());
      const categorie = this.categorie();
      if (categorie && CATEGORIES.includes(categorie)) nouveau.categorie = categorie;
      nouveau.libelle = this.libelle() ?? '';
      nouveau.notes = this.notes();
      this.poste.set(nouveau);
      return;
    }
    const existant = (await this.travaux.listerParBien(this.id())).find((p) => p.id === posteId);
    if (!existant) {
      await this.router.navigate(['/biens', this.id()]);
      return;
    }
    this.poste.set(structuredClone(existant));
  }

  /** Lignes du barème de la catégorie du poste, proposées en premier. */
  protected suggerees(p: PosteTravaux): LigneBareme[] {
    return this.baremeService.lignes().filter((l) => l.categorie === p.categorie);
  }

  protected autres(p: PosteTravaux): LigneBareme[] {
    return this.baremeService.lignes().filter((l) => l.categorie !== p.categorie);
  }

  /** Retour : la visite d'où l'on vient, sinon l'onglet Travaux. */
  protected retour(): { chemin: unknown[]; params: Record<string, string> } {
    const visiteId = this.visiteId();
    return visiteId
      ? { chemin: ['/biens', this.id(), 'visites', visiteId], params: {} }
      : { chemin: ['/biens', this.id()], params: { onglet: 'travaux' } };
  }

  protected ligne(p: PosteTravaux): LigneBareme | undefined {
    return this.baremeService.lignes().find((l) => l.id === p.baremeId);
  }

  protected unite(p: PosteTravaux): string {
    const l = this.ligne(p);
    return l ? LIBELLE_UNITE[l.unite] : '';
  }

  /** Choisir une ligne de barème pré-remplit catégorie et libellé. */
  protected choisirLigne(p: PosteTravaux, baremeId: string): void {
    p.baremeId = baremeId || undefined;
    const l = this.ligne(p);
    if (l) {
      p.categorie = l.categorie;
      p.libelle = l.libelle;
      p.quantite ??= 1;
      // Une ligne sans gammes est toujours chiffrée en moyen de gamme.
      if (!gammesDisponibles(l).includes(p.gamme ?? 'STANDARD')) p.gamme = 'STANDARD';
      p.gamme ??= 'STANDARD';
    }
  }

  protected apercu(p: PosteTravaux): string {
    const m = this.budgets.montantPoste(p);
    return formaterFourchette(m.bas, m.haut);
  }

  protected async enregistrer(): Promise<void> {
    const p = this.poste();
    if (!p) return;
    if (!p.libelle.trim()) {
      this.erreur.set('Le libellé est obligatoire.');
      return;
    }
    if (p.modeChiffrage === 'BAREME' && (!this.ligne(p) || !(p.quantite && p.quantite > 0))) {
      this.erreur.set('Choisissez une ligne du barème et une quantité.');
      return;
    }
    await this.travaux.enregistrer({
      ...p,
      libelle: p.libelle.trim(),
      montantBas: p.montantBas ?? 0,
      montantHaut: p.montantHaut ?? 0,
      notes: p.notes?.trim() || undefined,
    });
    const visiteId = this.visiteId();
    const pointId = this.pointId();
    if (visiteId && pointId) await this.visites.lierPoste(visiteId, pointId, p.id);
    const { chemin, params } = this.retour();
    await this.router.navigate(chemin, { queryParams: params });
  }
}
