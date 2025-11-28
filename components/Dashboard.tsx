import React, { useMemo } from 'react';
import { ReconciliationResult } from '../types';
import { CheckCircle, AlertTriangle, XCircle, Search, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface DashboardProps {
  results: ReconciliationResult[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'MATCHED':
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1 w-fit"><CheckCircle size={12} /> ยอดตรงกัน</span>;
    case 'VARIANCE':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold flex items-center gap-1 w-fit"><AlertTriangle size={12} /> มียอดผลต่าง</span>;
    case 'UNMATCHED_SAP':
      return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold flex items-center gap-1 w-fit"><XCircle size={12} /> ไม่พบ Statement</span>;
    case 'UNMATCHED_BANK':
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-1 w-fit"><XCircle size={12} /> ไม่พบ SAP</span>;
    default:
      return null;
  }
};

const Dashboard: React.FC<DashboardProps> = ({ results }) => {
  const [filter, setFilter] = React.useState('ALL');
  const [search, setSearch] = React.useState('');

  const stats = useMemo(() => {
    return {
      matched: results.filter(r => r.status === 'MATCHED').length,
      variance: results.filter(r => r.status === 'VARIANCE').length,
      unmatched: results.filter(r => r.status.includes('UNMATCHED')).length,
      total: results.length
    };
  }, [results]);

  const filteredResults = results.filter(r => {
    const matchesFilter = filter === 'ALL' || 
      (filter === 'ISSUE' && r.status !== 'MATCHED') ||
      r.status === filter;
    
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      r.detectedBankName.toLowerCase().includes(searchLower) ||
      r.detectedBranch.toLowerCase().includes(searchLower) ||
      (r.sapRecord?.description || '').toLowerCase().includes(searchLower) ||
      (r.bankData?.accountNumber || '').includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  const chartData = [
    { name: 'Matched', value: stats.matched, color: '#22c55e' },
    { name: 'Variance', value: stats.variance, color: '#eab308' },
    { name: 'Unmatched', value: stats.unmatched, color: '#64748b' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">รายการทั้งหมด</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-green-500 border-slate-100">
          <p className="text-sm text-slate-500">กระทบยอดถูกต้อง</p>
          <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-yellow-500 border-slate-100">
          <p className="text-sm text-slate-500">มียอดผลต่าง (Variance)</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.variance}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-slate-400 border-slate-100">
          <p className="text-sm text-slate-500">จับคู่ไม่ได้</p>
          <p className="text-2xl font-bold text-slate-600">{stats.unmatched}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="font-bold text-slate-800 text-lg">รายการตรวจสอบ (Reconciliation Details)</h2>
            <div className="flex gap-2">
               <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ค้นหา (สาขา, ธนาคาร...)" 
                  className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 w-full sm:w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
               </div>
               <select 
                className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
               >
                 <option value="ALL">ทั้งหมด</option>
                 <option value="ISSUE">เฉพาะที่มีปัญหา</option>
                 <option value="MATCHED">ถูกต้อง</option>
                 <option value="VARIANCE">ผลต่าง</option>
               </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">สถานะ (Status)</th>
                  <th className="px-4 py-3">สาขา</th>
                  <th className="px-4 py-3">ธนาคาร</th>
                  <th className="px-4 py-3 text-center">ประเภทบัญชี</th>
                  <th className="px-4 py-3 text-right">SAP Balance</th>
                  <th className="px-4 py-3 text-right">Bank Balance</th>
                  <th className="px-4 py-3 text-right">ผลต่าง (Diff)</th>
                  <th className="px-4 py-3">รายละเอียด (SAP)</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length > 0 ? (
                  filteredResults.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{row.detectedBranch}</td>
                      <td className="px-4 py-3 text-slate-600">{row.detectedBankName}</td>
                      <td className="px-4 py-3 text-center">
                        {row.accountType !== '-' ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            row.accountType === 'C/A' ? 'bg-indigo-100 text-indigo-700' :
                            row.accountType === 'S/A' ? 'bg-pink-100 text-pink-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {row.accountType}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {row.sapRecord ? formatCurrency(row.sapRecord.balance) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {row.bankData ? formatCurrency(row.bankData.endingBalance) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${row.varianceAmount !== 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {formatCurrency(row.varianceAmount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={row.sapRecord?.description}>
                        {row.sapRecord?.description || row.bankData?.fileName || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                   <tr>
                     <td colSpan={8} className="px-4 py-8 text-center text-slate-400">ไม่พบข้อมูลตามเงื่อนไข</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Panel */}
        <div className="space-y-6">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">ภาพรวมผลการตรวจสอบ</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [value, 'รายการ']} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
              <h3 className="font-semibold text-primary-700 mb-2">คำแนะนำ (AI Insights)</h3>
              <ul className="text-sm text-primary-600 space-y-2 list-disc pl-4">
                 <li>พบ {stats.variance} รายการที่มีผลต่างยอดเงิน ควรตรวจสอบรายการค้างรับ/ค้างจ่าย (Reconciling Items)</li>
                 <li>พบ {stats.unmatched} รายการที่จับคู่ไม่ได้ อาจเกิดจากเลขที่บัญชีใน SAP ไม่ตรงกับ Statement หรือชื่อธนาคารสะกดผิด</li>
                 <li>ตรวจสอบรายการ "N/A" ในช่องสาขา เพื่อปรับปรุงข้อมูล Master Data ใน SAP</li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;