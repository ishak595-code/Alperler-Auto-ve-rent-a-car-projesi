import { GoogleGenAI } from "@google/genai";
console.log("Creating genai...");
try {
  new GoogleGenAI({ apiKey: "" });
  console.log("Success");
} catch(e) {
  console.error("Error:", e);
}
