import { SAPRecord, BankStatementData, ReconciliationResult } from '../types';

// Helper to detect bank name from description text
const detectBankName = (text: string): string => {
  const upperText = text.toUpperCase();
  if (upperText.includes('KBANK') || upperText.includes('KASIKORN')) return 'KBANK';
  if (upperText.includes('SCB') || upperText.includes('SIAM COMMERCIAL')) return 'SCB';
  if (upperText.includes('BBL') || upperText.includes('BANGKOK BANK')) return 'BBL';
  if (upperText.includes('KTB') || upperText.includes('KRUNG THAI')) return 'KTB';
  if (upperText.includes('TMB') || upperText.includes('TTB')) return 'TTB';
  if (upperText.includes('BAY') || upperText.includes('KRUNGSRI')) return 'BAY';
  if (upperText.includes('GSB')) return 'GSB';
  return 'Unknown';
};

// Clean account number for comparison
const normalizeAccount = (acc: string): string => {
  return acc.replace(/[^0-9]/g, '');
};

export const reconcileData = (
  sapRecords: SAPRecord[],
  bankStatements: BankStatementData[]
): ReconciliationResult[] => {
  const results: ReconciliationResult[] = [];
  const usedStatementIndices = new Set<number>();

  // 1. Iterate through SAP records and try to find a matching bank statement
  sapRecords.forEach(sap => {
    const bankName = detectBankName(sap.description);
    const sapAccMatch = sap.description.match(/(\d[\d\-\s]{8,}\d)/); // Simple regex to find account-like numbers in text
    const sapAccNormalized = sapAccMatch ? normalizeAccount(sapAccMatch[0]) : '';

    let matchedStatementIndex = -1;

    // Try to match by Exact Account Number found in Text
    if (sapAccNormalized) {
        matchedStatementIndex = bankStatements.findIndex((bs, idx) => 
            !usedStatementIndices.has(idx) && 
            normalizeAccount(bs.accountNumber).includes(sapAccNormalized)
        );
    }

    // If no account match, try very loose matching (Bank Name + Exact Amount) - Optional/Risky
    // Implementing strict match first.

    if (matchedStatementIndex !== -1) {
      const statement = bankStatements[matchedStatementIndex];
      usedStatementIndices.add(matchedStatementIndex);

      const variance = Math.abs(sap.balance - statement.endingBalance);
      const isMatch = variance < 0.01; // Floating point tolerance

      results.push({
        id: `rec-${sap.id}`,
        status: isMatch ? 'MATCHED' : 'VARIANCE',
        sapRecord: sap,
        bankData: statement,
        varianceAmount: Number((sap.balance - statement.endingBalance).toFixed(2)),
        detectedBankName: bankName,
        detectedBranch: sap.busA,
        accountType: sap.accountType
      });
    } else {
      results.push({
        id: `rec-${sap.id}`,
        status: 'UNMATCHED_SAP',
        sapRecord: sap,
        varianceAmount: sap.balance,
        detectedBankName: bankName,
        detectedBranch: sap.busA,
        accountType: sap.accountType
      });
    }
  });

  // 2. Identify Bank Statements that were not used
  bankStatements.forEach((bs, idx) => {
    if (!usedStatementIndices.has(idx)) {
      results.push({
        id: `rec-bs-${idx}`,
        status: 'UNMATCHED_BANK',
        bankData: bs,
        varianceAmount: -bs.endingBalance,
        detectedBankName: bs.bankName || 'Unknown',
        detectedBranch: 'N/A',
        accountType: '-'
      });
    }
  });

  return results;
};