import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

type SignupProfile = 'client' | 'motoboy' | 'restaurant';

@Component({
  selector: 'app-user-profile',
  imports: [NgIcon, RouterLink],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class UserProfile {
  private readonly router = inject(Router);

  readonly selectedUserProfile = signal<SignupProfile | null>(null);

  selectUserProfile(profile: SignupProfile): void {
    this.selectedUserProfile.set(profile);
  }

  continueSignup(): void {
    const profile = this.selectedUserProfile();

    if (!profile) return;

    this.router.navigate([`/auth/${profile}-signup`]);
  }
}
