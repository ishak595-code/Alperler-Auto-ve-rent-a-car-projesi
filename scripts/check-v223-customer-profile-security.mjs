import fs from 'node:fs';

const failures=[];
const read=(file)=>fs.readFileSync(file,'utf8');
const must=(source,token,message)=>{if(!source.includes(token))failures.push(message||`Missing ${token}`);};
const reject=(source,token,message)=>{if(source.includes(token))failures.push(message||`Forbidden ${token}`);};

const shell=read('src/pages/account-shell.component.ts');
const profile=read('src/components/account-profile-settings-v241.component.ts');
const security=read('src/components/account-security-v223.component.ts');
const auth=read('src/services/customer-auth.service.ts');

for(const token of ['AccountFavoritesV213Component','AccountProfileSettingsV241Component','AccountDashboardV150Component','@switch (section())',"@case ('favorites')","@case ('profile')",'<app-account-favorites-v213>','<app-account-profile-settings-v241>','<app-account-dashboard-v150>']) must(shell,token,`Customer account shell canonical ownership missing ${token}`);
reject(shell,'AccountSecurityV223Component','Account shell must not eagerly own the security component.');
reject(shell,'<app-account-security-v223','Account shell must not render security outside explicit profile action.');

for(const token of ['AccountSecurityV223Component',"type ProfilePanelV241='avatar'|'info'|'security'|null", "toggle('security')", "openPanel()==='security'", '<app-account-security-v223 />', '[attr.aria-expanded]="openPanel()===\'security\'"']) must(profile,token,`Profile security lazy ownership missing ${token}`);
if((profile.split('<app-account-security-v223').length-1)!==1) failures.push('Profile settings must own exactly one account security render path.');

for(const token of ['CustomerAuthService','this.auth.changePassword(this.newPassword)','autocomplete="new-password"','Yeni parola tekrar','Parolanızı güvenle yönetin','Veri sızıntılarında görülen parolalar kabul edilmez','role="alert"','role="status"']) must(security,token,`Customer security UI contract missing ${token}`);
for(const forbidden of ['supabaseAuthUrl(','SUPABASE_PROJECT_URL','localStorage.setItem','sessionStorage.setItem','innerHTML','bypassSecurityTrustHtml']) reject(security,forbidden,`Customer security component must not become a parallel auth/storage owner: ${forbidden}`);

for(const token of ['async changePassword(password:string)','await this.validatePassword(password)','supabaseAuthUrl(\'user\')','method:\'PUT\'','isPwnedPassword(password)','Parola en az 10 karakter olmalı.']) must(auth,token,`Canonical CustomerAuth password security missing ${token}`);

if(failures.length){console.error('V223/V241 customer profile security: FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1);}
console.log('V223/V241 customer profile security: PASS');
