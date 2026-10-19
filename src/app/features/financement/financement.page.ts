import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BiensService } from '../../application/biens.service';
import { BudgetService } from '../../application/budget.service';
import { FinancementService } from '../../application/financement.service';
import { ParametresService } from '../../application/parametres.service';
import { TravauxService } from '../../application/travaux.service';
import { LigneAmortissement, LigneMontage, moisCalendrier, paliers, resumeAnnuel } from '../../domain/amortissement';
import { calculerFinancement, definitionGeste, EntreeFinancement, GESTES, ResultatAide, StatutAide, tauxMoyen } from '../../domain/financement';
import { AideLocale, Bien, Foyer, PlanFinancement, ReglagePret, TypeGeste } from '../../domain/modeles';
import { CategorieAnah, DATE_REGLES, LIENS_AIDES, ZONES_PTZ } from '../../domain/regles-aides';
import { formaterEuro, formaterNombre } from '../../shared/format';
import { IconeComponent } from '../../shared/icone.component';
import { entreeFinancement } from './entree';

type Etape = 'foyer' | 'projet' | 'aides' | 'prets' | 'synthese' | 'tableau';
type PretAide = 'ptz' | 'ecoPtz' | 'actionLogementAccession' | 'actionLogementTravaux';

const ETAPES: { cle: Etape; libelle: string }[] = [
  { cle: 'foyer', libelle: 'Foyer' },
  { cle: 'projet', libelle: 'Projet' },
  { cle: 'aides', libelle: 'Aides' },
  { cle: 'prets', libelle: 'Prêts' },
  { cle: 'synthese', libelle: 'Plan' },
  { cle: 'tableau', libelle: 'Tableau' },
];

const LIBELLE_STATUT: Record<StatutAide, string> = {
  ELIGIBLE: 'Éligible',
  A_VERIFIER: 'À vérifier',
  NON_ELIGIBLE: 'Non éligible',
  INCOMPLET: 'À compléter',
};

const LIBELLE_ANAH: Record<CategorieAnah, string> = {
  TRES_MODESTE: 'très modestes (bleu)',
  MODESTE: 'modestes (jaune)',
  INTERMEDIAIRE: 'intermédiaires (violet)',
  SUPERIEUR: 'supérieurs (rose)',
};

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

@Component({
  selector: 'app-financement',
  imports: [FormsModule, RouterLink, IconeComponent],
  templateUrl: './financement.page.html',
  styleUrl: './financement.page.scss',
})
export class FinancementPage {
  readonly id = input.required<string>();
  private readonly biensService = inject(BiensService);
  private readonly travaux = inject(TravauxService);
  private readonly budgets = inject(BudgetService);
  private readonly service = inject(FinancementService);
  private readonly parametres = inject(ParametresService);
  private readonly router = inject(Router);

  protected readonly etapes = ETAPES;
  protected readonly etape = signal<Etape>('foyer');
  protected readonly bien = signal<Bien | null>(null);
  protected readonly tousBiens = signal<Bien[]>([]);
  protected readonly entree = signal<EntreeFinancement | null>(null);
  protected readonly plan = signal<PlanFinancement | null>(null);
  /** Copie de travail du foyer, enregistrée à chaque modification. */
  protected readonly foyer = signal<Foyer>(this.service.foyer());
  protected readonly enregistre = signal(false);

  protected readonly resultat = computed(() => {
    const e = this.entree();
    const p = this.plan();
    return e && p ? calculerFinancement(e, this.foyer(), p) : null;
  });

  // Tableau d'amortissement
  protected readonly vueTableau = signal<'annuel' | 'mensuel'>('annuel');
  /** `null` : tous les prêts ensemble ; sinon l'identifiant d'un prêt. */
  protected readonly pretAffiche = signal<string | null>(null);
  protected readonly impression = signal(false);

  protected readonly annuel = computed(() => resumeAnnuel(this.resultat()?.tableau ?? []));
  protected readonly paliers = computed(() => paliers(this.resultat()?.tableau ?? []));
  protected readonly indexPretAffiche = computed(() => {
    const id = this.pretAffiche();
    return id === null ? -1 : (this.resultat()?.montage.echeanciers.findIndex((e) => e.pret.id === id) ?? -1);
  });

  protected readonly gestes = GESTES;
  protected readonly zones = ZONES_PTZ;
  protected readonly liens = LIENS_AIDES;
  protected readonly dateRegles = DATE_REGLES;
  protected readonly libelleStatut = LIBELLE_STATUT;
  protected readonly libelleAnah = LIBELLE_ANAH;
  protected readonly euro = formaterEuro;
  protected readonly nombre = formaterNombre;
  protected readonly anneeN2 = new Date().getFullYear() - 2;
  protected readonly aujourdhui = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  protected readonly sommeMontant = (s: number, p: { montant: number }) => s + p.montant;
  protected readonly dureesBanque = Array.from({ length: 21 }, (_, i) => i + 7);

  private minuterie: ReturnType<typeof setTimeout> | undefined;
  private minuterieFoyer: ReturnType<typeof setTimeout> | undefined;
  private planEnAttente = false;

  constructor() {
    effect(() => void this.charger(this.id()));
    inject(DestroyRef).onDestroy(() => {
      // Ne rien perdre en quittant la page.
      if (this.minuterie) void this.enregistrerPlan();
      if (this.minuterieFoyer) void this.service.enregistrerFoyer(this.foyer());
    });
    if (typeof window !== 'undefined') {
      const apres = () => this.impression.set(false);
      window.addEventListener('afterprint', apres);
      inject(DestroyRef).onDestroy(() => window.removeEventListener('afterprint', apres));
    }
  }

  private async charger(id: string): Promise<void> {
    if (this.minuterie) {
      clearTimeout(this.minuterie);
      this.minuterie = undefined;
      await this.enregistrerPlan();
    }
    const bien = await this.biensService.obtenir(id);
    if (!bien) {
      await this.router.navigate(['/financement']);
      return;
    }
    const [postes, biens] = await Promise.all([this.travaux.listerParBien(id), this.biensService.lister()]);
    const budget = this.budgets.calculer(bien, postes);
    const { plan, nouveau } = await this.service.plan(id, postes);
    this.bien.set(bien);
    this.tousBiens.set([...biens].sort((a, b) => a.titre.localeCompare(b.titre, 'fr')));
    this.entree.set(entreeFinancement(bien, postes, budget, this.budgets, this.parametres.parametres().tauxNotairePct));
    this.plan.set(plan);
    this.foyer.set(this.service.foyer());
    this.pretAffiche.set(null);
    // Premier passage : on commence par le foyer s'il n'est pas rempli, sinon par le projet.
    this.etape.set(!this.service.foyerRempli() ? 'foyer' : nouveau ? 'projet' : 'synthese');
  }

  protected changerBien(id: string): void {
    void this.router.navigate(['/financement', id]);
  }

  // ---------- Enregistrement automatique ----------

  protected majPlan(changement: Partial<PlanFinancement>): void {
    const p = this.plan();
    if (!p) return;
    this.plan.set({ ...p, ...changement });
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => void this.enregistrerPlan(), 400);
  }

  private async enregistrerPlan(): Promise<void> {
    this.minuterie = undefined;
    const p = this.plan();
    if (!p || this.planEnAttente) return;
    this.planEnAttente = true;
    try {
      await this.service.enregistrer(p);
      this.signalerEnregistre();
    } finally {
      this.planEnAttente = false;
    }
  }

  protected majFoyer(changement: Partial<Foyer>): void {
    this.foyer.update((f) => ({ ...f, ...changement }));
    clearTimeout(this.minuterieFoyer);
    this.minuterieFoyer = setTimeout(async () => {
      this.minuterieFoyer = undefined;
      await this.service.enregistrerFoyer(this.foyer());
      this.signalerEnregistre();
    }, 400);
  }

  private signalerEnregistre(): void {
    this.enregistre.set(true);
    setTimeout(() => this.enregistre.set(false), 1500);
  }

  // ---------- Aides de champs ----------

  /** Valeur d'un champ numérique : vide → 0. */
  protected n(v: unknown): number {
    const x = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  /** Champ facultatif : vide → `null` (valeur reprise du bien ou maximum). */
  protected nOuNull(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  }

  protected majPret(cle: PretAide, changement: Partial<ReglagePret>): void {
    const p = this.plan();
    if (p) this.majPlan({ [cle]: { ...p[cle], ...changement } } as Partial<PlanFinancement>);
  }

  protected majBanque(changement: Partial<PlanFinancement['banque']>): void {
    const p = this.plan();
    if (p) this.majPlan({ banque: { ...p.banque, ...changement } });
  }

  protected appliquerTauxMoyen(): void {
    const p = this.plan();
    if (p) this.majBanque({ tauxPct: Math.round(tauxMoyen(p.banque.dureeMois) * 100) / 100 });
  }

  protected tauxMoyenAffiche(): string {
    const p = this.plan();
    return p ? formaterNombre(Math.round(tauxMoyen(p.banque.dureeMois) * 100) / 100) : '';
  }

  // ---------- Gestes ----------

  protected gesteCoche(type: TypeGeste): boolean {
    return !!this.plan()?.gestes.some((g) => g.type === type);
  }

  protected basculerGeste(type: TypeGeste): void {
    const p = this.plan();
    if (!p) return;
    this.majPlan({ gestes: this.gesteCoche(type) ? p.gestes.filter((g) => g.type !== type) : [...p.gestes, { type, montant: null }] });
  }

  protected montantGeste(type: TypeGeste): number {
    return this.resultat()?.gestes.find((g) => g.type === type)?.montant ?? 0;
  }

  protected gesteDepuisPostes(type: TypeGeste): boolean {
    return this.plan()?.gestes.find((g) => g.type === type)?.montant === null;
  }

  protected majGeste(type: TypeGeste, montant: number | null): void {
    const p = this.plan();
    if (p) this.majPlan({ gestes: p.gestes.map((g) => (g.type === type ? { ...g, montant } : g)) });
  }

  protected readonly libelleGeste = (type: TypeGeste) => definitionGeste(type).libelle;

  protected indicationsCee(): { libelle: string; indication: string }[] {
    return (this.resultat()?.gestes ?? [])
      .filter((g) => g.montant > 0)
      .map((g) => ({ libelle: g.libelle, indication: definitionGeste(g.type).indicationCee ?? '' }))
      .filter((g) => g.indication);
  }

  // ---------- Aides locales ----------

  protected ajouterAideLocale(nature: AideLocale['nature']): void {
    const p = this.plan();
    if (!p) return;
    const aide: AideLocale = { id: crypto.randomUUID(), libelle: '', nature, montant: 0, tauxPct: 0, dureeMois: nature === 'PRET' ? 120 : 0 };
    this.majPlan({ aidesLocales: [...p.aidesLocales, aide] });
  }

  protected majAideLocale(id: string, changement: Partial<AideLocale>): void {
    const p = this.plan();
    if (p) this.majPlan({ aidesLocales: p.aidesLocales.map((a) => (a.id === id ? { ...a, ...changement } : a)) });
  }

  protected retirerAideLocale(id: string): void {
    const p = this.plan();
    if (p) this.majPlan({ aidesLocales: p.aidesLocales.filter((a) => a.id !== id) });
  }

  // ---------- Affichage ----------

  protected classeStatut(a: ResultatAide): string {
    return a.statut.toLowerCase().replace('_', '-');
  }

  protected pct(v: number | null): string {
    return v === null ? '—' : `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
  }

  protected duree(mois: number): string {
    const ans = Math.floor(mois / 12);
    const reste = mois % 12;
    return [ans ? `${ans} an${ans > 1 ? 's' : ''}` : '', reste ? `${reste} mois` : ''].filter(Boolean).join(' ') || '0 mois';
  }

  protected dateEcheance(mois: number): string {
    const d = moisCalendrier(this.plan()?.premiereEcheance ?? '', mois);
    return d ? `${MOIS[d.mois - 1]} ${d.annee}` : `mois ${mois}`;
  }

  protected anneeCalendaire(annee: number): string {
    const debut = moisCalendrier(this.plan()?.premiereEcheance ?? '', (annee - 1) * 12 + 1);
    const fin = moisCalendrier(this.plan()?.premiereEcheance ?? '', annee * 12);
    return debut && fin ? `${MOIS[debut.mois - 1]} ${debut.annee} – ${MOIS[fin.mois - 1]} ${fin.annee}` : '';
  }

  /** Ligne d'un prêt donné, ou totaux tous prêts, dans le format commun du tableau. */
  protected ligneAffichee(l: LigneMontage): { echeance: number; capital: number; interets: number; assurance: number; restant: number } | null {
    const i = this.indexPretAffiche();
    if (i < 0) return { echeance: l.total, capital: l.capitalAmorti, interets: l.interets, assurance: l.assurance, restant: l.capitalRestant };
    const p: LigneAmortissement | null = l.parPret[i];
    return p ? { echeance: p.echeance + p.assurance, capital: p.capitalAmorti, interets: p.interets, assurance: p.assurance, restant: p.capitalFin } : null;
  }

  protected totalPret(id: string): number {
    const e = this.resultat()?.montage.echeanciers.find((x) => x.pret.id === id);
    return e ? e.pret.montant + e.totalInterets + e.totalAssurance : 0;
  }

  /** Échéance « courante » d'un prêt : la première non nulle (après un éventuel différé). */
  protected echeanceType(id: string): number {
    const e = this.resultat()?.montage.echeanciers.find((x) => x.pret.id === id);
    const l = e?.lignes.find((x) => x.echeance > 0);
    return l ? l.echeance + l.assurance : 0;
  }

  protected totalRessources(): number {
    const r = this.resultat();
    const p = this.plan();
    if (!r || !p) return 0;
    return this.n(p.apport) + r.prets.reduce((s, x) => s + x.montant, 0) + (p.primesDeduites ? r.primes : 0);
  }

  protected imprimer(): void {
    this.impression.set(true);
    setTimeout(() => window.print(), 300);
  }
}
