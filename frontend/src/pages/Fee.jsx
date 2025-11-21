import React, { useState } from "react";
import { toast } from "sonner";
import TopRightLogout from "../components/TopRightLogout";
import Spinner from "../components/Spinner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  createFeePayment,
  getFeeReceiptByAdmNo,
  getClassFeesListByName,
} from "../Api";

export default function Fee() {
  // Payment Recording
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admNo, setAdmNo] = useState("");
  const [termFee, setTermFee] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [latestReceipt, setLatestReceipt] = useState(null);

  // Receipt Fetching
  const [receiptAdmNo, setReceiptAdmNo] = useState("");
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [exportingReceipt, setExportingReceipt] = useState(false);

  // Class Fees List
  const [className, setClassName] = useState("");
  const [classFees, setClassFees] = useState(null);
  const [loadingClassFees, setLoadingClassFees] = useState(false);
  const [exportingClass, setExportingClass] = useState(false);

  // Submit payment
  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        admNo,
        termFee: Number(termFee),
        amountPaid: Number(amountPaid),
        term,
      };
      const res = await createFeePayment(payload);
      toast.success(res.message);
      setLatestReceipt(res.receipt);
      setAdmNo("");
      setTermFee("");
      setAmountPaid("");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error recording fee");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get latest receipt
  const handleFetchReceipt = async () => {
    if (!receiptAdmNo) return toast.error("Provide Admission No");
    setLoadingReceipt(true);
    try {
      const res = await getFeeReceiptByAdmNo(receiptAdmNo);
      setLatestReceipt(res);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error fetching receipt");
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Get class fees
  const handleFetchClassFees = async () => {
    if (!className) return toast.error("Provide Class Name");
    setLoadingClassFees(true);
    try {
      const res = await getClassFeesListByName(className);
      setClassFees(res);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error fetching class fees list");
    } finally {
      setLoadingClassFees(false);
    }
  };

  // Export latest receipt as PDF (tabular)
  const exportReceiptPDF = () => {
    if (!latestReceipt) return;
    setExportingReceipt(true);
    setTimeout(() => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Student Fee Receipt", 20, 20);
      doc.setFontSize(12);
      autoTable(doc, {
        startY: 32,
        theme: "grid",
        head: [["Field", "Value"]],
        body: [
          ["Receipt #", latestReceipt.receiptNo],
          ["Admission No", latestReceipt.student?.admNo ?? ""],
          ["Name", latestReceipt.student?.name ?? ""],
          ["Class", latestReceipt.student?.class ?? ""],
          ["Grade", latestReceipt.student?.grade ?? ""],
          ["School", latestReceipt.student?.school ?? ""],
          ["Term Fee", latestReceipt.termFee],
          ["Paid", latestReceipt.amountPaid],
          ["Cumulative Paid", latestReceipt.cumulativePaid],
          ["Balance", latestReceipt.balance],
          ["Date", new Date(latestReceipt.dateOfPayment).toLocaleString()]
        ],
        headStyles: { fillColor: [34, 197, 94] }, // green for receipt
      });
      doc.save(`Receipt_${latestReceipt.student?.admNo ?? "student"}.pdf`);
      setExportingReceipt(false);
      toast.success("Receipt PDF downloaded");
    }, 200);
  };

  // Export class fees summary as PDF (tabular format using autoTable)
  const exportClassFeesPDF = () => {
    if (!classFees) return;
    setExportingClass(true);
    setTimeout(() => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Class Fees Summary", 20, 20);
      doc.setFontSize(12);
      doc.text(
        `${classFees.school?.class ?? ""} (${classFees.school?.grade ?? ""}) – ${classFees.school?.name ?? ""}`,
        20,
        32
      );
      const columns = [
        { header: "Adm No", dataKey: "admNo" },
        { header: "Name", dataKey: "name" },
        { header: "Term Fee", dataKey: "termFee" },
        { header: "Paid", dataKey: "cumulativePaid" },
        { header: "Balance", dataKey: "balance" },
      ];
      const rows = classFees.students.map((s) => ({
        admNo: s.admNo,
        name: s.name,
        termFee: s.termFee,
        cumulativePaid: s.cumulativePaid,
        balance: s.balance,
      }));

      autoTable(doc, {
        head: [columns.map((c) => c.header)],
        body: rows.map((r) => columns.map((c) => r[c.dataKey])),
        startY: 40,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] }, // indigo
      });

      doc.save(`ClassFees_${classFees.school?.class ?? "class"}.pdf`);
      setExportingClass(false);
      toast.success("Class fees PDF downloaded");
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex flex-col">
      <TopRightLogout />
      <div className="flex-1 flex flex-col items-center justify-center px-2">
        <h2 className="text-3xl font-extrabold text-indigo-700 mt-8 mb-2">Fee Management</h2>

        {/* Payment Creation */}
        <form
          className="mb-8 w-full max-w-lg bg-white/95 shadow-lg p-8 rounded-2xl flex flex-col gap-4 items-center"
          onSubmit={handleCreatePayment}
        >
          <h3 className="text-xl font-bold text-indigo-600 mb-2">Record Student Payment</h3>
          <div className="grid grid-cols-2 gap-3 w-full">
            <input
              type="text"
              placeholder="Admission No"
              value={admNo}
              onChange={(e) => setAdmNo(e.target.value)}
              required
              className="p-2 border rounded col-span-2"
            />
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              required
              className="p-2 border rounded"
            >
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
            <input
              type="number"
              placeholder="Term Fee"
              value={termFee}
              onChange={(e) => setTermFee(e.target.value)}
              required
              className="p-2 border rounded"
              min={0}
            />
            <input
              type="number"
              placeholder="Amount Paid"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              required
              className="p-2 border rounded"
              min={0}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-3 py-2 px-6 rounded bg-indigo-600 text-white hover:bg-indigo-800 font-semibold min-w-[150px] flex items-center justify-center"
          >
            {isSubmitting ? <Spinner size={18} /> : "Add Payment"}
          </button>
        </form>

        {/* Latest Receipt */}
        <div className="mb-8 w-full max-w-lg bg-white/95 p-6 rounded-2xl shadow flex flex-col items-center">
          <h3 className="font-bold text-lg text-green-700 mb-1">Latest Receipt</h3>
          <div className="flex gap-2 w-full mb-2 items-center">
            <input
              type="text"
              placeholder="Admission No"
              value={receiptAdmNo}
              onChange={(e) => setReceiptAdmNo(e.target.value)}
              className="p-2 border rounded flex-1"
            />
            <button
              onClick={handleFetchReceipt}
              disabled={loadingReceipt}
              className="py-2 px-4 rounded bg-green-600 text-white font-semibold hover:bg-green-800 min-w-[110px] flex items-center justify-center"
            >
              {loadingReceipt ? <Spinner size={16} /> : "Get Receipt"}
            </button>
          </div>
          {latestReceipt && (
            <div className="mt-3 text-xs w-full bg-gray-50 rounded p-2 border">
              <table className="w-full text-sm mb-2">
                <tbody>
                  <tr>
                    <td className="font-bold w-24">Receipt #</td>
                    <td>{latestReceipt.receiptNo}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Adm No</td>
                    <td>{latestReceipt.student?.admNo ?? ""}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Name</td>
                    <td>{latestReceipt.student?.name ?? ""}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Class</td>
                    <td>{latestReceipt.student?.class ?? ""}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Grade</td>
                    <td>{latestReceipt.student?.grade ?? ""}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">School</td>
                    <td>{latestReceipt.student?.school ?? ""}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Term Fee</td>
                    <td>{latestReceipt.termFee}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Paid</td>
                    <td>{latestReceipt.amountPaid}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Cumulative Paid</td>
                    <td>{latestReceipt.cumulativePaid}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Balance</td>
                    <td>{latestReceipt.balance}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">Date</td>
                    <td>{new Date(latestReceipt.dateOfPayment).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={exportReceiptPDF}
                  disabled={exportingReceipt}
                  className="py-1 px-4 rounded bg-indigo-500 text-white text-xs hover:bg-indigo-700 flex gap-2 items-center"
                >
                  {exportingReceipt ? <Spinner size={13} /> : null}
                  Export Receipt PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Class Fees Summary */}
        <div className="mb-12 w-full max-w-xl bg-white/95 p-6 rounded-2xl shadow flex flex-col items-center">
          <h3 className="font-bold text-lg text-indigo-600 mb-2">
            Class Fees Summary
          </h3>
          <div className="flex gap-2 w-full mb-2 items-center">
            <input
              type="text"
              placeholder="Class Name"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="p-2 border rounded flex-1"
            />
            <button
              onClick={handleFetchClassFees}
              disabled={loadingClassFees}
              className="py-2 px-4 rounded bg-indigo-500 text-white font-semibold hover:bg-indigo-700 min-w-[110px] flex items-center justify-center"
            >
              {loadingClassFees ? <Spinner size={16} /> : "Get Summary"}
            </button>
          </div>
          {classFees && (
            <div className="w-full mt-2">
              <div className="font-semibold mb-2 text-sm">{classFees.school?.class} ({classFees.school?.grade}) – {classFees.school?.name}</div>
              <div className="overflow-x-auto max-h-80">
                <table className="min-w-full border rounded text-xs bg-gray-50">
                  <thead>
                    <tr className="bg-indigo-100">
                      <th className="border px-2 py-1">Adm No</th>
                      <th className="border px-2 py-1">Name</th>
                      <th className="border px-2 py-1">Term Fee</th>
                      <th className="border px-2 py-1">Paid</th>
                      <th className="border px-2 py-1">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classFees.students.map((s, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50">
                        <td className="border px-2 py-1">{s.admNo}</td>
                        <td className="border px-2 py-1">{s.name}</td>
                        <td className="border px-2 py-1">{s.termFee}</td>
                        <td className="border px-2 py-1">{s.cumulativePaid}</td>
                        <td className="border px-2 py-1">{s.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={exportClassFeesPDF}
                    disabled={exportingClass}
                    className="py-1 px-4 rounded bg-green-600 text-white text-xs hover:bg-green-800 flex gap-2 items-center"
                  >
                    {exportingClass ? <Spinner size={13} /> : null}
                    Export Summary PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
