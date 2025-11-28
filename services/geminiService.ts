import { GoogleGenAI, Type } from "@google/genai";
import { BankStatementData } from "../types";

const parseBankStatementWithGemini = async (
  fileBase64: string,
  mimeType: string
): Promise<BankStatementData> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze this bank statement document image/pdf.
    Your task is to extract financial data specifically for RECONCILIATION purposes.

    EXTRACT THE FOLLOWING STRICTLY:
    1. **Bank Account Number**: Normalize it (remove dashes/spaces). If multiple, find the main account header.
    2. **Ending Balance**: 
       - This MUST be the "Closing Balance" or "Ending Balance" at the end of the statement period.
       - Look for keywords like: "Ending Balance", "Closing Balance", "C/F", "Carried Forward", "ยอดยกไป", "ยอดคงเหลือปลายงวด", "ยอดคงเหลือ".
       - **WARNING**: DO NOT extract "Beginning Balance", "B/F", "Brought Forward", "Total Debits", "Total Credits", or "Available Balance" (unless it is the same as Ledger Balance).
       - Ensure the amount corresponds to the LATEST date in the statement.
    3. **Statement Date**: The "As of" date, "Statement Date", or the date of the Ending Balance. Format as YYYY-MM-DD.
    4. **Bank Name**: Identify the bank (e.g., KTB, SCB, KBANK, BBL, TTB, BAY).
    
    Return the result in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            accountNumber: { type: Type.STRING },
            endingBalance: { type: Type.NUMBER },
            statementDate: { type: Type.STRING },
            bankName: { type: Type.STRING },
          },
          required: ["accountNumber", "endingBalance"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const data = JSON.parse(text);
    
    return {
      fileName: "Uploaded File",
      accountNumber: data.accountNumber,
      endingBalance: data.endingBalance,
      statementDate: data.statementDate || new Date().toISOString().split('T')[0],
      bankName: data.bankName
    };
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("ไม่สามารถอ่านข้อมูลจากไฟล์ Statement ได้ กรุณาตรวจสอบไฟล์หรือลองใหม่อีกครั้ง");
  }
};

export const geminiService = {
  parseBankStatementWithGemini,
};