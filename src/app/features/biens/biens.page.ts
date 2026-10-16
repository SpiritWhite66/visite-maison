import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BiensService } from '../../application/biens.service';
import { ParametresService } from '../../application/parametres.service';
import { BudgetService } from '../../application/budget.service';
import { TravauxService } from '../../application/travaux.service';
import { Budget } from '../../domain/budget';
import { Bien } from '../../domain/modeles';
import { joursDepuis, sauvegardeAFaire } from '../../domain/sauvegarde';
import { formaterEuro, formaterNombre } from '../../shared/format';
import { IconeComponent } from '../../shared/icone.component';
import { CouvertureBienComponent } from '../../shared/photos.component';
import { LIBELLE_ETAPE, LIBELLE_TYPE_BIEN } from '../../shared/libelles';

interface CarteBien {
  bien: Bien;
  budget: Budget;
  nbPostes: number;
}

@Component({
  selector: 'app-biens',
  imports: [RouterLink, IconeComponent, CouvertureBienComponent],
  template: `
    <header class="entete-page">
      <div>
        <h1>Biens</h1>
        @if (cartes(); as c) {
          <div class="meta">{{ c.length }} bien{{ c.length > 1 ? 's' : '' }} suivi{{ c.length > 1 ? 's' : '' }}</div>
        }
      </div>
      <a class="bouton" routerLink="nouveau"><app-icone nom="plus" [taille]="20" /> Nouveau bien</a>
    </header>

    @if (rappelSauvegarde()) {
      <a class="rappel" routerLink="/parametres">
        <app-icone nom="cloche" [taille]="22" />
        <span>
          <strong>Pensez à sauvegarder vos données.</strong>
          {{ jours() === null ? 'Aucune sauvegarde n’a encore été faite.' : 'Dernière sauvegarde il y a ' + jours() + ' jours.' }}
          Elles ne sont que sur cet appareil.
        </span>
        <app-icone nom="droite" [taille]="20" />
      </a>
    }

    @if (cartes() === null) {
      <p class="discret">Chargement…</p>
    } @else if (cartes()!.length === 0) {
      <div class="vide">
        <p>Aucun bien pour l'instant.</p>
        <a class="bouton" routerLink="nouveau">Ajouter un premier bien</a>
      </div>
    } @else {
      <div class="grille">
        @for (c of cartes(); track c.bien.id) {
          <a class="fiche" [routerLink]="[c.bien.id]">
            <app-couverture-bien class="couverture" [photoId]="c.bien.photoCouvertureId" />
            <div class="corps">
            <div class="haut">
              <span class="etiquette">{{ typeBien[c.bien.typeBien] }}</span>
              <span class="etape">{{ etape[c.bien.etape] }}</span>
            </div>
            <h2>{{ c.bien.titre || 'Sans titre' }}</h2>
            <p class="lieu">{{ c.bien.commune || '—' }}</p>
            <p class="caracteristiques">
              @if (c.bien.surfaceHabitable) { <span>{{ nombre(c.bien.surfaceHabitable) }} m²</span> }
              @if (c.bien.surfaceTerrain) { <span>terrain {{ nombre(c.bien.surfaceTerrain) }} m²</span> }
              @if (c.bien.dpe) { <span class="classe-energie" [attr.data-classe]="c.bien.dpe" title="DPE">{{ c.bien.dpe }}</span> }
            </p>
            <div class="bas">
              <span class="surtitre">Budget total</span>
              <span class="montant">{{ euro(c.budget.total.bas) }}</span>
              @if (c.budget.total.haut !== c.budget.total.bas) {
                <span class="haut-fourchette">à {{ euro(c.budget.total.haut) }}</span>
              }
              <span class="detail">
                Affiché {{ euro(c.bien.prixAffiche) }} · {{ c.nbPostes }} poste{{ c.nbPostes > 1 ? 's' : '' }} de travaux
              </span>
            </div>
            </div>
          </a>
        }
      </div>
    }
  `,
  styles: `
    .rappel {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; padding: 0.75rem 1rem; text-decoration: none; color: var(--encre);
      border: 1px solid color-mix(in srgb, var(--etat-surveiller) 45%, transparent); border-radius: var(--rayon);
      background: color-mix(in srgb, var(--etat-surveiller) 10%, var(--surface)); font-size: 0.92rem;
    }
    .rappel span { flex: 1; }
    .grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr)); gap: 1rem; }
    .fiche {
      display: flex; flex-direction: column; color: inherit; text-decoration: none; overflow: hidden;
      background: var(--surface); border: 1px solid var(--filet); border-radius: var(--rayon);
      transition: border-color 120ms;
    }
    .couverture { aspect-ratio: 16 / 9; border-bottom: 1px solid var(--filet); }
    .corps { display: flex; flex-direction: column; flex: 1; padding: 1.1rem 1.25rem; }
    .fiche:active { border-color: var(--primaire); }
    .haut { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .etape { font-size: 0.8rem; font-weight: 650; color: var(--primaire); }
    h2 { font-size: 1.2rem; margin: 0; }
    .lieu { margin: 0.1rem 0 0; color: var(--texte-discret); }
    .caracteristiques { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 0.75rem; margin: 0.6rem 0 0; font-size: 0.9rem; min-height: 1.4rem; }
    .bas { margin-top: auto; padding-top: 1rem; margin-top: 1rem; border-top: 1px solid var(--filet); display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 0.5rem; }
    .bas .surtitre { width: 100%; margin-bottom: 0.15rem; }
    .montant { font-size: 1.5rem; font-weight: 750; color: var(--encre); font-variant-numeric: tabular-nums; }
    .haut-fourchette { color: var(--texte-discret); font-variant-numeric: tabular-nums; }
    .detail { width: 100%; font-size: 0.82rem; color: var(--texte-discret); margin-top: 0.2rem; }
  `,
})
export class BiensPage implements OnInit {
  private readonly biens = inject(BiensService);
  private readonly travaux = inject(TravauxService);
  private readonly budgets = inject(BudgetService);
  private readonly parametres = inject(ParametresService);
  protected readonly cartes = signal<CarteBien[] | null>(null);
  protected readonly jours = computed(() => joursDepuis(this.parametres.parametres().derniereSauvegarde, new Date()));
  protected readonly rappelSauvegarde = computed(() =>
    sauvegardeAFaire(this.parametres.parametres().derniereSauvegarde, new Date(), (this.cartes()?.length ?? 0) > 0),
  );
  protected readonly euro = formaterEuro;
  protected readonly nombre = formaterNombre;
  protected readonly etape = LIBELLE_ETAPE;
  protected readonly typeBien = LIBELLE_TYPE_BIEN;

  async ngOnInit(): Promise<void> {
    const [biens, postes] = await Promise.all([this.biens.lister(), this.travaux.lister()]);
    this.cartes.set(
      biens.map((bien) => {
        const sesPostes = postes.filter((p) => p.bienId === bien.id);
        return { bien, budget: this.budgets.calculer(bien, sesPostes), nbPostes: sesPostes.length };
      }),
    );
  }
}
