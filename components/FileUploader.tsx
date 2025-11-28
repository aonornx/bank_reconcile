import React, { useCallback } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, Loader2, Files } from 'lucide-react';
import { FileType } from '../types';

interface FileUploaderProps {
  type: FileType;
  onFilesSelect: (files: File[]) => void;
  isLoading?: boolean;
  label: string;
  accept: string;
  multiple?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  type, 
  onFilesSelect, 
  isLoading, 
  label, 
  accept, 
  multiple = false 
}) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (multiple) {
        onFilesSelect(filesArray);
      } else {
        onFilesSelect([filesArray[0]]);
      }
    }
  }, [onFilesSelect, multiple]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelect(filesArray);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-6 transition-all text-center cursor-pointer relative group ${
        isLoading ? 'bg-slate-50 border-slate-300 cursor-wait' : 'bg-white border-slate-300 hover:border-primary-400 hover:bg-primary-50'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        onChange={handleChange}
        accept={accept}
        disabled={isLoading}
        multiple={multiple}
      />
      
      <div className="flex flex-col items-center gap-3">
        {isLoading ? (
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        ) : type === FileType.SAP_EXCEL ? (
          <FileSpreadsheet className="w-10 h-10 text-green-600 group-hover:scale-110 transition-transform" />
        ) : multiple ? (
          <div className="relative">
            <Files className="w-10 h-10 text-blue-600 group-hover:scale-110 transition-transform" />
            <div className="absolute -right-2 -bottom-2 bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Batch</div>
          </div>
        ) : (
          <FileText className="w-10 h-10 text-slate-500 group-hover:scale-110 transition-transform" />
        )}
        
        <div>
          <h3 className="font-semibold text-slate-700">{label}</h3>
          <p className="text-sm text-slate-500 mt-1">
            {multiple 
              ? "ลากไฟล์หลายๆ ไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก" 
              : "ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {accept === '.xlsx,.xls,.csv' ? 'รองรับ Excel (.xlsx, .xls)' : 'รองรับ PDF, Word, Images (เลือกได้หลายไฟล์)'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;