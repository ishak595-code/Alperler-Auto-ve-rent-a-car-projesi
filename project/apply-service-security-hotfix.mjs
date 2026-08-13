#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/services/car.service.ts';
let s = await readFile(path, 'utf8');

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`${label}: expected source text not found`);
  return source.replace(from, to);
}

s = replaceOnce(
  s,
  `interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}`,
  `function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Firestore operation failed", {
    operationType,
    path,
    message,
  });
  throw new Error(message);
}`,
  'privacy-safe Firestore errors',
);

s = replaceOnce(
  s,
  `  submitPartnerRequest(request: Omit<PartnerRequest, "id" | "date">) {
    const newRequest: PartnerRequest = {
      ...request,
      id: Date.now(),
      date: new Date(),
    };
    this._partnerRequests.update((reqs) => [newRequest, ...reqs]);
    localStorage.setItem(
      "db_partnerRequests_v2",
      JSON.stringify(this._partnerRequests()),
    );
    
    // Notify Admin
    const adminMsg = \`Yeni bir filo / araç değerlendirme başvurusu geldi.\n\nİsim: \${newRequest.name}\nTelefon: \${newRequest.phone}\nE-posta: \${newRequest.email}\nAraç: \${newRequest.carBrand} (\${newRequest.modelYear}) - \${newRequest.km} km\nAçıklama: \${newRequest.description}\`;
    this.sendNotification("alperlerauto@gmail.com", adminMsg, undefined, "Yeni Araç Değerlendirme Başvurusu");

    // Notify Customer
    if (newRequest.email && newRequest.email.includes("@")) {
      const customerMsg = \`Sayın \${newRequest.name},\n\nAraç değerlendirme / filo ortaklığı başvurunuz tarafımıza başarıyla ulaşmıştır. Uzman ekibimiz aracınız (\${newRequest.carBrand}) ile ilgili değerlendirmeleri tamamladıktan sonra belirtmiş olduğunuz iletişim numarası (\${newRequest.phone}) üzerinden en kısa sürede dönüş sağlayacaktır.\n\nBizi tercih ettiğiniz için teşekkür ederiz.\n\nAlperler Auto\`;
      this.sendNotification(newRequest.email, customerMsg, undefined, "Başvurunuz Alındı - Alperler Auto");
    }

    return Promise.resolve(newRequest);
  }`,
  `  async submitPartnerRequest(request: Omit<PartnerRequest, "id" | "date">) {
    const newRequest: PartnerRequest = {
      ...request,
      id: Date.now(),
      date: new Date(),
    };

    const cloudId = \`PARTNER-\${newRequest.id}\`;
    try {
      await setDoc(doc(db, "messages", cloudId), {
        type: "PARTNER_REQUEST",
        name: newRequest.name.trim().slice(0, 120),
        phone: newRequest.phone.trim().slice(0, 40),
        email: newRequest.email?.trim().toLowerCase().slice(0, 160) || "",
        carBrand: newRequest.carBrand.trim().slice(0, 160),
        modelYear: newRequest.modelYear,
        km: newRequest.km,
        description: newRequest.description.slice(0, 4000),
        status: "NEW",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "messages");
    }

    this._partnerRequests.update((reqs) => [newRequest, ...reqs]);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "db_partnerRequests_v2",
        JSON.stringify(this._partnerRequests()),
      );
    }

    const adminMsg = \`Yeni bir filo / araç değerlendirme başvurusu geldi.\n\nİsim: \${newRequest.name}\nTelefon: \${newRequest.phone}\nE-posta: \${newRequest.email}\nAraç: \${newRequest.carBrand} (\${newRequest.modelYear}) - \${newRequest.km} km\nAçıklama: \${newRequest.description}\`;
    this.sendNotification("alperlerauto@gmail.com", adminMsg, undefined, "Yeni Araç Değerlendirme Başvurusu");

    if (newRequest.email && newRequest.email.includes("@")) {
      const customerMsg = \`Sayın \${newRequest.name},\n\nAraç değerlendirme / filo ortaklığı başvurunuz tarafımıza başarıyla ulaşmıştır. Uzman ekibimiz aracınız (\${newRequest.carBrand}) ile ilgili değerlendirmeleri tamamladıktan sonra belirtmiş olduğunuz iletişim numarası (\${newRequest.phone}) üzerinden en kısa sürede dönüş sağlayacaktır.\n\nBizi tercih ettiğiniz için teşekkür ederiz.\n\nAlperler Auto\`;
      this.sendNotification(newRequest.email, customerMsg, undefined, "Başvurunuz Alındı - Alperler Auto");
    }

    return newRequest;
  }`,
  'cloud-persist partner requests',
);

await writeFile(path, s, 'utf8');
console.log('CarService privacy and partner-request persistence hotfix applied.');
