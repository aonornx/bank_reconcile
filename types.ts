
export interface SAPRecord {
  id: string;
  busA: string; // Branch/Business Area
  description: string; // ข้อความสำหรับรายการ B/S P&L
  balance: number; // Tot.rpt.pr
  accountType: string; // New field: C/A or S/A detected from description
  raw: any;
}

export interface BankStatementData {
  fileName: string;
  accountNumber: string;
  bankName?: string;
  endingBalance: number;
  statementDate: string;
}

export interface ReconciliationResult {
  id: string;
  status: 'MATCHED' | 'VARIANCE' | 'UNMATCHED_SAP' | 'UNMATCHED_BANK';
  sapRecord?: SAPRecord;
  bankData?: BankStatementData;
  varianceAmount: number;
  detectedBankName: string; // Extracted from SAP Description
  detectedBranch: string; // BusA
  accountType: string; // C/A or S/A
  detectedAccountNumber: string; // New field for display
}

export enum FileType {
  SAP_EXCEL = 'SAP_EXCEL',
  BANK_STATEMENT = 'BANK_STATEMENT'
}
