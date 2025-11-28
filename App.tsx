import React, { useState } from 'react';
import { FileType, SAPRecord, BankStatementData, ReconciliationResult } from './types';
import FileUploader from './components/FileUploader';
import Dashboard from './components/Dashboard';
import { parseSAPExcel } from './services/excelService';
import { geminiService } from './services/geminiService';
import { reconcileData } from './services/reconcileService';
import { ShieldCheck, RefreshCw, Trash2, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [sapData, setSapData] = useState<SAPRecord[]>([]);
  const [bankData, setBankData] = useState<BankStatementData[]>([]);
  const [results, setResults] = useState<ReconciliationResult[] | null>(null);
  
  const [isProcessingSAP, setIsProcessingSAP] = useState(false);
  const [isProcessingBank, setIsProcessingBank] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSAPUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0]; // SAP usually processes one master file

    setIsProcessingSAP(true);
    setError(null);
    try {
      const records = await parseSAPExcel(file);
      setSapData(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอ่านไฟล์ SAP');
    } finally {
      setIsProcessingSAP(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const res = reader.result?.toString().split(',')[1];
        if (res) resolve(res);
        else reject(new Error("Failed to read file"));
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleBankUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setIsProcessingBank(true);
    setError(null);
    
    // Create a temporary holder for new data to batch update state
    const newBankData: BankStatementData[] = [];
    const processingErrors: string[] = [];

    try {
      // Process all files concurrently
      await Promise.all(files.map(async (file) => {
        try {
          const base64Str = await fileToBase64(file);
          // Default to PDF/Image, but try to detect based on extension
          const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
          
          const statement = await geminiService.parseBankStatementWithGemini(base64Str, mimeType);
          statement.fileName = file.name;
          newBankData.push(statement);
        } catch (e) {
          console.error(`Error processing ${file.name}:`, e);
          processingErrors.push(`${file.name}: ${e instanceof Error ? e.message : 'อ่านไฟล์ไม่สำเร็จ'}`);
        }
      }));

      // Update state
      if (newBankData.length > 0) {
        setBankData(prev => [...prev, ...newBankData]);
      }
      
      // Handle errors
      if (processingErrors.length > 0) {
        setError(`พบข้อผิดพลาด ${processingErrors.length} ไฟล์: ${processingErrors.join(', ')}`);
      } else if (newBankData.length > 0) {
        // Clear previous main errors if this batch was successful
        if (!error?.includes('SAP')) setError(null); 
      }

    } catch (err) {
      setError('เกิดข้อผิดพลาดร้ายแรงในการอัปโหลดไฟล์');
    } finally {
      setIsProcessingBank(false);
    }
  };

  const handleReconcile = () => {
    if (sapData.length === 0 || bankData.length === 0) {
      setError('กรุณาอัปโหลดไฟล์ทั้งสองประเภทให้ครบถ้วน');
      return;
    }
    const recResults = reconcileData(sapData, bankData);
    setResults(recResults);
  };

  const resetData = () => {
    setSapData([]);
    setBankData([]);
    setResults(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-2 rounded-lg shadow-sm">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none">AutoReconcile AI</h1>
              <p className="text-xs text-slate-500 mt-1">Smart Financial Matching System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-medium text-slate-700">Month-End Closing</p>
               <p className="text-xs text-slate-500">
                 {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
               </p>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
             <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
             <div className="text-sm">{error}</div>
             <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700">
               <Trash2 size={16} />
             </button>
          </div>
        )}

        {/* Upload Section */}
        {!results && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">อัปโหลดเอกสารเพื่อเริ่มตรวจสอบ</h2>
              <p className="text-slate-500 mt-2">ระบบรองรับไฟล์ SAP Excel (.xlsx) และ Bank Statement (PDF/Word/Image) ได้ครั้งละหลายไฟล์</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SAP Uploader */}
              <div className="space-y-4">
                 <FileUploader 
                    type={FileType.SAP_EXCEL} 
                    label="1. SAP System Report (Excel)" 
                    accept=".xlsx,.xls,.csv"
                    onFilesSelect={handleSAPUpload}
                    isLoading={isProcessingSAP}
                    multiple={false}
                 />
                 {sapData.length > 0 && (
                   <div className="bg-green-50 text-green-700 border border-green-100 p-3 rounded-lg text-sm flex justify-between items-center animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>โหลดข้อมูล SAP แล้ว: <span className="font-bold">{sapData.length}</span> รายการ</span>
                      </div>
                      <button onClick={() => setSapData([])} className="text-green-600 hover:text-green-800 hover:bg-green-100 p-1.5 rounded transition-colors" title="ลบข้อมูล">
                        <Trash2 size={16}/>
                      </button>
                   </div>
                 )}
              </div>

              {/* Bank Statement Uploader (Multiple) */}
              <div className="space-y-4">
                 <FileUploader 
                    type={FileType.BANK_STATEMENT} 
                    label="2. Bank Statement Files" 
                    accept=".pdf,.doc,.docx,.jpg,.png,.jpeg"
                    onFilesSelect={handleBankUpload}
                    isLoading={isProcessingBank}
                    multiple={true}
                 />
                 {bankData.length > 0 && (
                   <div className="bg-blue-50 border border-blue-100 rounded-lg overflow-hidden animate-in fade-in">
                     <div className="bg-blue-100/50 px-4 py-2 flex justify-between items-center border-b border-blue-100">
                        <div className="flex items-center gap-2">
                           <span className="font-semibold text-blue-800 text-sm">รายการ Statement ({bankData.length})</span>
                        </div>
                        <button onClick={() => setBankData([])} className="text-xs text-blue-600 hover:text-red-500 hover:underline">ล้างทั้งหมด</button>
                     </div>
                     <div className="max-h-60 overflow-y-auto p-2 space-y-2">
                       {bankData.map((bank, idx) => (
                         <div key={idx} className="bg-white p-3 rounded border border-blue-100 shadow-sm flex justify-between items-center text-sm group">
                            <div className="flex flex-col overflow-hidden mr-2">
                              <span className="font-medium text-slate-700 truncate" title={bank.fileName}>{bank.fileName}</span>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{bank.bankName || 'Unknown Bank'}</span>
                                <span>{bank.accountNumber}</span>
                                <span className="text-green-600 font-mono">฿{bank.endingBalance.toLocaleString()}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => setBankData(prev => prev.filter((_, i) => i !== idx))} 
                              className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="ลบรายการนี้"
                            >
                               <Trash2 size={16}/>
                            </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <button
                onClick={handleReconcile}
                disabled={sapData.length === 0 || bankData.length === 0 || isProcessingBank || isProcessingSAP}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-10 rounded-full shadow-lg shadow-primary-600/30 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {isProcessingBank || isProcessingSAP ? <RefreshCw className="animate-spin" /> : <ShieldCheck />}
                ประมวลผลการกระทบยอด (Run Reconciliation)
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="animate-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-slate-800">ผลการตรวจสอบ (Reconciliation Results)</h2>
               <button 
                  onClick={resetData}
                  className="bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
                >
                  <RefreshCw size={16} /> เริ่มต้นใหม่
               </button>
             </div>
             <Dashboard results={results} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;