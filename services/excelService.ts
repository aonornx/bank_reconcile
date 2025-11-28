import * as XLSX from 'xlsx';
import { SAPRecord } from '../types';

export const parseSAPExcel = async (file: File): Promise<SAPRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Simple heuristic to find header row if it's not the first row
        // Look for columns: 'BusA', 'Tot.rpt.pr' (or similar match)
        let headerRowIndex = 0;
        let headers: string[] = [];
        
        // Find the header row
        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
          const row = jsonData[i] as string[];
          if (row.some(cell => typeof cell === 'string' && (cell.includes('BusA') || cell.includes('Tot.rpt.pr')))) {
            headerRowIndex = i;
            headers = row;
            break;
          }
        }

        if (headers.length === 0) {
            // Fallback: Assume first row if not found
             headers = jsonData[0] as string[];
        }

        const records: SAPRecord[] = [];
        
        // Map columns
        const busAIndex = headers.findIndex(h => h && h.toString().includes('BusA'));
        const descIndex = headers.findIndex(h => h && (h.toString().includes('ข้อความ') || h.toString().includes('Text')));
        const balanceIndex = headers.findIndex(h => h && (h.toString().includes('Tot.rpt.pr') || h.toString().includes('Balance')));

        if (balanceIndex === -1) {
             reject(new Error("ไม่พบคอลัมน์ยอดเงิน (Tot.rpt.pr) ในไฟล์ Excel"));
             return;
        }

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          // Clean balance string (remove commas)
          let balanceRaw = row[balanceIndex];
          if (typeof balanceRaw === 'string') {
              balanceRaw = parseFloat(balanceRaw.replace(/,/g, ''));
          }

          if (isNaN(balanceRaw)) continue; // Skip total rows or empty rows

          const description = descIndex !== -1 ? (row[descIndex] || '').toString() : '';

          // Determine Account Type (C/A or S/A)
          let accountType = '-';
          const upperDesc = description.toUpperCase();
          
          if (upperDesc.includes('C/A') || upperDesc.includes('CURRENT') || description.includes('กระแสรายวัน')) {
            accountType = 'C/A';
          } else if (upperDesc.includes('S/A') || upperDesc.includes('SAVING') || description.includes('ออมทรัพย์')) {
            accountType = 'S/A';
          } else if (upperDesc.includes('FIXED') || description.includes('ฝากประจำ')) {
            accountType = 'F/D';
          }

          records.push({
            id: `sap-${i}`,
            busA: busAIndex !== -1 ? (row[busAIndex] || 'N/A').toString() : 'N/A',
            description: description,
            balance: balanceRaw,
            accountType: accountType,
            raw: row
          });
        }

        resolve(records);

      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};