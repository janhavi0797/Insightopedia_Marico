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
    // if (event.origin !== this.allowedOrigin) {
    //   return;
    // }

     if (event.origin == '') {
      return;
    }
    
    // const data = event.data;
    // if (typeof data !== 'object' || data === null || data === 'undefined') {
    //   return;
    // }
   
    // const { userId, userName, email } = data;

    // if (event.data?.type === 'webpackClose' || event.data?.type === 'webpackInvalid') {
    //   return; // Ignore dev events
    // }

     // Avoid dev server events like webpack invalidation
  if (event.data?.type === 'webpackClose' || event.data?.type === 'webpackInvalid') return;

  console.log("Received event:", event);
  console.log("App component",localStorage.getItem('role'));

  // Ensure message has valid user data
  if (!event.data || typeof event.data !== 'object') return;

  const { userId, userName, email } = event.data;

    
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
      localStorage.setItem('role','2');
    }
  };
}
