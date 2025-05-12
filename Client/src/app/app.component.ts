import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Client';
  errorDisplay: boolean = false;

  private allowedOrigin = environment.allowedOrigin;

  constructor(private toastr: ToastrService) {}

  ngOnInit(): void {
    window.addEventListener('message', this.messageHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageHandler);
  }

  private messageHandler = (event: MessageEvent) => {
    if (event.origin !== this.allowedOrigin) {
      return;
    }

    const data = event.data;
    if (typeof data !== 'object' || data === null) {
      return;
    }

    const { userId, userName, email } = data;

    if (!userId || !userName || !email) {
      if (!this.errorDisplay) {
        this.toastr.error('Invalid user data received from superapp application!');
        this.errorDisplay = true;
      }
      return;
    }

    const storedUserId = localStorage.getItem('uId');
    const storedUserName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('User');

    const isUserChanged =
      storedUserId !== userId ||
      storedUserName !== userName ||
      storedEmail !== email;

    if (isUserChanged) {
      localStorage.setItem('User', email);
      localStorage.setItem('uId', userId);
      localStorage.setItem('userName', userName);
    }
  };
}
