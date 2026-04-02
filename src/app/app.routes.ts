import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'products',
    pathMatch: 'full',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/product-list.component').then((m) => m.ProductListComponent),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/products/product-detail.component').then((m) => m.ProductDetailComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'my-reviews',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reviews/my-reviews.component').then((m) => m.MyReviewsComponent),
  },
  {
    path: '**',
    redirectTo: 'products',
  },
];
