import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconeComponent } from './shared/icone.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
