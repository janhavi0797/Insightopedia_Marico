import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  constructor(private http: HttpClient) { }
  baseUrl = environment.BASE_URL;

  postAPI(url: string, payload: any): Observable<any> {
    return this.http.post(this.baseUrl + url, payload);
  }

  getAPI(url: string, userCode?:string): Observable<any> {
    debugger
    if(userCode) {
      let params = new HttpParams().set('userId', userCode)
      return this.http.get(this.baseUrl + url,{
        params: params
      });
    } else {
      return this.http.get(this.baseUrl + url);
    }
  }

  getTagwiseAudio(url: string, userCode?:string) : Observable<any> {
    debugger
    if(userCode) {
      let params = new HttpParams().set('userId', userCode)
      return this.http.get(this.baseUrl + url,{
        params: params
      });
    } else {
      return this.http.get(this.baseUrl + url);
    }
  }

  CreateProject(payload: {userId: string; projectName: string; audioIds: {audioId: string}[];}): Observable<any> {
    debugger
    const url = this.baseUrl + 'project/create';
    return this.http.post(url, payload);
  }

  getAllProject(endpoint: string, params: any): Observable<any> {
    let httpParams = new HttpParams()
    .set('isAllFile', params.isAllFile)
      .set('userId', params.user);

    return this.http.get(`${this.baseUrl}${endpoint}`, { params: httpParams });
  }

  getProjectDetail(endpoint: string, projectId: any): Observable<any> {
    let httpParams = new HttpParams()
    .set('projectId', projectId)
    return this.http.get(`${this.baseUrl}${endpoint}`, { params: httpParams });
  }


}
