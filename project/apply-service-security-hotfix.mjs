#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/services/car.service.ts';
let s = await readFile(path, 'utf8');

if (s.includes('import { db, auth } from "../firebase";')) {
  s = s.replace(
    'import { db, auth } from "../firebase";',
    'import { db } from "../firebase";',
  );
}

const safeHandler = `function handleFirestoreError(
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
}

export interface BlogPost`;

if (!s.includes('console.error("Firestore operation failed"')) {
  const next = s.replace(
    /interface FirestoreErrorInfo[\s\S]*?export interface BlogPost/,
    safeHandler,
  );
  if (next === s) throw new Error('Firestore error handler block not found');
  s = next;
}

if (!s.includes('const cloudId = `PARTNER-${newRequest.id}`;')) {
  const replacement = `  async submitPartnerRequest(request: Omit<PartnerRequest, "id" | "date">) {
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

    const adminMsg = \`Yeni bir filo / araç değerlendirme başvurusu geldi.\\n\\nİsim: \${newRequest.name}\\nTelefon: \${newRequest.phone}\\nE-posta: \${newRequest.email}\\nAraç: \${newRequest.carBrand} (\${newRequest.modelYear}) - \${newRequest.km} km\\nAçıklama: \${newRequest.description}\`;
    this.sendNotification(
      "alperlerauto@gmail.com",
      adminMsg,
      undefined,
      "Yeni Araç Değerlendirme Başvurusu",
    );

    if (newRequest.email && newRequest.email.includes("@")) {
      const customerMsg = \`Sayın \${newRequest.name},\\n\\nAraç değerlendirme / filo ortaklığı başvurunuz tarafımıza başarıyla ulaşmıştır. Uzman ekibimiz aracınız (\${newRequest.carBrand}) ile ilgili değerlendirmeleri tamamladıktan sonra belirtmiş olduğunuz iletişim numarası (\${newRequest.phone}) üzerinden en kısa sürede dönüş sağlayacaktır.\\n\\nBizi tercih ettiğiniz için teşekkür ederiz.\\n\\nAlperler Auto\`;
      this.sendNotification(
        newRequest.email,
        customerMsg,
        undefined,
        "Başvurunuz Alındı - Alperler Auto",
      );
    }

    return newRequest;
  }

  deletePartnerRequest`;

  const next = s.replace(
    /  submitPartnerRequest\([\s\S]*?\n  deletePartnerRequest/,
    replacement,
  );
  if (next === s) throw new Error('Partner request method block not found');
  s = next;
}

await writeFile(path, s, 'utf8');
console.log('CarService privacy and cloud persistence hotfix applied.');
