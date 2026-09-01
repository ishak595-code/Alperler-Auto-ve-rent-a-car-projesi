import { Injectable, inject, signal } from '@angular/core';
import { CustomerAuthService } from './customer-auth.service';

export interface SavedCardWalletStatusV225 {
  ok:boolean;
  mode:'SANDBOX'|'LIVE';
  canAddCard:boolean;
}
export interface AddSavedCardV225 {
  cardAlias:string;
  cardHolderName:string;
  cardNumber:string;
  expireMonth:string;
  expireYear:string;
  consent:boolean;
}

@Injectable({providedIn:'root'})
export class CustomerSavedCardsV225Service{
  private readonly auth=inject(CustomerAuthService);
  readonly loading=signal(false);
  readonly status=signal<SavedCardWalletStatusV225|null>(null);

  async refreshStatus():Promise<SavedCardWalletStatusV225>{
    const response=await fetch('/api/wallet?op=status',{headers:await this.headers(),cache:'no-store'});
    const payload=await response.json().catch(()=>({})) as SavedCardWalletStatusV225 & {code?:string};
    if(!response.ok||payload.ok!==true)throw new Error(payload.code||'WALLET_STATUS_FAILED');
    this.status.set(payload);return payload;
  }

  async add(input:AddSavedCardV225):Promise<void>{
    this.loading.set(true);
    try{const response=await fetch('/api/wallet?op=add',{method:'POST',headers:await this.headers(),body:JSON.stringify(input),cache:'no-store'});const payload=await response.json().catch(()=>({})) as {ok?:boolean;code?:string};if(!response.ok||payload.ok!==true)throw new Error(payload.code||'WALLET_ADD_FAILED');}
    finally{this.loading.set(false);}
  }
  async remove(methodId:string):Promise<void>{
    this.loading.set(true);
    try{const response=await fetch('/api/wallet?op=remove',{method:'DELETE',headers:await this.headers(),body:JSON.stringify({methodId}),cache:'no-store'});const payload=await response.json().catch(()=>({})) as {ok?:boolean;code?:string};if(!response.ok||payload.ok!==true)throw new Error(payload.code||'WALLET_REMOVE_FAILED');}
    finally{this.loading.set(false);}
  }
  async setDefault(methodId:string):Promise<void>{
    this.loading.set(true);
    try{const response=await fetch('/api/wallet?op=default',{method:'PATCH',headers:await this.headers(),body:JSON.stringify({methodId}),cache:'no-store'});const payload=await response.json().catch(()=>({})) as {ok?:boolean;code?:string};if(!response.ok||payload.ok!==true)throw new Error(payload.code||'WALLET_DEFAULT_FAILED');}
    finally{this.loading.set(false);}
  }

  friendlyError(error:unknown):string{
    const code=error instanceof Error?error.message:'';
    if(code==='IYZICO_CARD_STORAGE_NOT_ENABLED')return'Kayıtlı kart özelliğinin ödeme hesabında etkinleştirilmesi gerekiyor. Bu işlem tamamlandıktan sonra kartınızı buradan ekleyebilirsiniz.';
    if(code.includes('NOT_CONFIGURED'))return'Kayıtlı kart özelliği şu anda kullanıma hazır değil.';
    if(code==='INVALID_CARD_NUMBER')return'Kart numarasını kontrol edin.';
    if(code.includes('EXPIRY'))return'Son kullanma tarihini kontrol edin.';
    if(code==='CARD_HOLDER_REQUIRED')return'Kart üzerindeki adı girin.';
    if(code==='CARD_STORAGE_CONSENT_REQUIRED')return'Kartı kaydetmek için onay kutusunu işaretleyin.';
    if(code==='PAYMENT_METHOD_LIMIT_REACHED')return'En fazla 10 kart kaydedebilirsiniz.';
    if(code==='RATE_LIMITED')return'Çok kısa sürede fazla işlem yapıldı. Birkaç dakika sonra tekrar deneyin.';
    return'Kart işlemi şu anda tamamlanamadı. Lütfen tekrar deneyin.';
  }

  private async headers():Promise<Record<string,string>>{const token=await this.auth.getAccessToken();if(!token)throw new Error('CUSTOMER_SESSION_REQUIRED');return{authorization:`Bearer ${token}`,'content-type':'application/json',accept:'application/json','x-request-id':crypto.randomUUID()};}
}
