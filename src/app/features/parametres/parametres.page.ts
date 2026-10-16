import { Component, inject, OnInit, signal } from '@angular/core';
import { Diagnostic, DiagnosticService } from '../../application/diagnostic.service';
import { formaterTaille } from '../../shared/format';
import { BaremeEditeurComponent } from './bareme-editeur.component';
import { PersonnesComponent } from './personnes.component';
import { ReglagesBudgetComponent } from './reglages-budget.component';
import { SauvegardeComponent } from './sauvegarde.component';

@Component({
  selector: 'app-parametres',
  imports: [ReglagesBudgetComponent, BaremeEditeurComponent, SauvegardeComponent, PersonnesComponent],
  templateUrl: './parametres.page.html',
  styleUrl: './parametres.page.scss',
})
export class ParametresPage implements OnInit {
  private readonly service = inject(DiagnosticService);
  protected readonly diagnostic = signal<Diagnostic | null>(null);
  protected readonly taille = formaterTaille;

  ngOnInit(): void {
    void this.actualiser();
  }

  protected async actualiser(): Promise<void> {
    this.diagnostic.set(await this.service.collecter());
  }

  protected async demanderPersistance(): Promise<void> {
    await this.service.demanderPersistance();
    await this.actualiser();
  }

  protected async viderErreurs(): Promise<void> {
    this.service.viderErreurs();
    await this.actualiser();
  }

  protected oui(v: boolean | null): string {
    return v === null ? 'inconnu' : v ? 'oui' : 'non';
  }
}
