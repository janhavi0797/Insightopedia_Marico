import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const msalService = inject(MsalService);
  const router = inject(Router);  
  if(msalService.instance.getActiveAccount() == null) {
    router.navigate(["/login"]);
    return false;
  }

  // Check session expiry
  const loginTime = localStorage.getItem('LoginTime');
  if (loginTime) {
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - Number(loginTime);
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

    // If session is older than 24 hours, force logout and redirect to login
    if (timeDifference > oneDayInMilliseconds) {
      msalService.logout(); // Optional: You can also clear localStorage here
      router.navigate(["/login"]);
      return false;
    }
  } else {
    // If no login time is found, redirect to login
    router.navigate(["/login"]);
    return false;
  }

  const userRole = Number(localStorage.getItem('role'));

  // Role-based redirection: If userRole is 3 and trying to access /portal/dashboard, redirect
  if (userRole === 3 && (state.url === '/portal/dashboard' || state.url === '/portal/userList')) {
    router.navigate(['/portal/all-files']);
    return false;
  }
  
  return true;
};
