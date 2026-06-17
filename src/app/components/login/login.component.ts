import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  isRegister = false;
  username = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    if (auth.currentUser()) {
      this.router.navigate(['/home']);
    }
  }

  toggleMode(): void {
    this.isRegister = !this.isRegister;
    this.error = '';
    this.confirmPassword = '';
  }

  submit(): void {
    this.error = '';
    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Please fill in all fields';
      return;
    }

    this.loading = true;

    if (this.isRegister) {
      if (this.password !== this.confirmPassword) {
        this.error = 'Passwords do not match';
        this.loading = false;
        return;
      }
      const err = this.auth.register(this.username.trim(), this.password);
      if (err) {
        this.error = err;
        this.loading = false;
        return;
      }
    } else {
      const ok = this.auth.login(this.username.trim(), this.password);
      if (!ok) {
        this.error = 'Invalid username or password';
        this.loading = false;
        return;
      }
    }

    this.loading = false;
    this.router.navigate(['/home']);
  }
}
