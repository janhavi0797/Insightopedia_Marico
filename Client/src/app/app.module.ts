import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IPublicClientApplication, PublicClientApplication } from '@azure/msal-browser';
import { MSAL_INSTANCE, MsalModule, MsalService } from '@azure/msal-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { CommonService } from './portal/service/common.service';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../environments/environment';
import { APP_BASE_HREF } from '@angular/common';

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth:{
      clientId: '76227ae6-b2f6-4325-a751-a5b6f94fb870',
      redirectUri: environment.redirectUrl
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: true
    }
  })
}

export function initializeMsal(msalService: MsalService): () => Promise<void> {
  return () => msalService.instance.initialize();
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MsalModule,
    BrowserAnimationsModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    MsalService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeMsal,
      deps: [MsalService],
      multi: true
    },
    provideToastr(),
    CommonService,
    { provide: APP_BASE_HREF, useValue: environment.baseHref }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
