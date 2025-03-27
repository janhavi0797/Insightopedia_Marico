import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, Subject, throwError } from 'rxjs';
import {environment} from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  closeDialog : Subject<any> = new Subject<any>();
  constructor(private http:HttpClient, private toastr:ToastrService) { }
  baseUrl = environment.BASE_URL;
  public messageHistory: Subject<any> = new Subject();

  postAPI(url: string, payload: any , download?:boolean): Observable<any> {
    if(download) {
      return this.http.post(this.baseUrl + url, payload, { responseType: 'blob' });
    } else {
      return this.http.post(this.baseUrl + url, payload);
    }
      
  }
  getData(url: string, userId: string) {
    const params = new HttpParams().set('userid', userId);
    return this.http.get(this.baseUrl + url, { params: params});
  }

  getDetails(url: string, tgId: string, tgName:string) {
    const params = new HttpParams().set('tgId', tgId).set('tgName',tgName);
    return this.http.get(this.baseUrl + url, { params: params});
  }

  sendQueryAI(url: string, payload:any) {
    this.messageHistory.next({
      from: 'user',
      message: payload.question
    })
    return this.http.post(this.baseUrl + url, payload);
  }

  public getMessageHistory(): Observable<any> {
    return this.messageHistory.asObservable();
  }

  getDownload(url: string) {
    this.http.get(url, { responseType: 'blob' })
      .pipe(
        catchError((error) => {
          this.toastr.error('Something Went Wrong!')
          return throwError(error);
        })
      )
      .subscribe((response: Blob) => {
        const blob = new Blob([response], { type: 'application/pdf' });
        const downloadURL = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadURL;
        link.download = 'file.pdf';
        link.click();
      });
  }

  patchData(url: string, payload: any) {
    return this.http.patch(this.baseUrl + url, payload);
  }

  postAPIBinaryData(url: string, body: any, options?: { headers?: HttpHeaders }): Observable<Blob> {
    
    return this.http.post<Blob>(this.baseUrl + url, body, {
      ...options,
      responseType: 'blob' as 'json', // Explicitly set 'blob' as the responseType
    });
  }

  getAllAudioList(url: string, userCode?:string): Observable<any> {
    
    if(userCode) {
      let params = new HttpParams().set('userId', userCode)
      return this.http.get(this.baseUrl + url,{
        params: params
      });
    } else {
      return this.http.get(this.baseUrl + url);
    }
  }
}
