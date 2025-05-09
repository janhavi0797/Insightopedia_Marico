import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Client';
  errorDisplay: boolean = false;

  constructor(private toastr: ToastrService) {}

  ngOnInit(): void {
    this.listenForMessage();
  }


  listenForMessage() {
    window.addEventListener('message', (event) => {
      if (event.origin == '') {
        return;
      }

      const data = event.data;
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
        // Update localStorage
        localStorage.setItem('User', email);
        localStorage.setItem('uId', userId);
        localStorage.setItem('userName', userName);
      }
      //this.addUserDetails(userId, userName, email);

    })
  }
}
