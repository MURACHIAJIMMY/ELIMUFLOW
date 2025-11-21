import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import TopRightLogout from "../components/TopRightLogout";
import Spinner from "../components/Spinner";
import { getSchoolLogo } from "../utils/logos";
import {
  createFeePayment,
  getFeeReceiptByAdmNo,
  getClassFeesListByName,
} from "../Api";

const tabs = [
  { key: "record", label: "💵 Record Fee" },
  { key: "receipt", label: "📄 Student Receipts" },
  { key: "class", label: "🏫 Class List" }
];

export default function Fee() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("record");

  // School Info/logo
  const [schoolInfo, setSchoolInfo] = useState(null);

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      const code = localStorage.getItem("schoolCode");
      if (!code || code === "undefined") return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/schools/${code}`
        );
        const data = await res.json();
        setSchoolInfo(data);
      } catch {
        toast.error("Failed to fetch school info");
      }
    };
    fetchSchoolInfo();
  }, []);

  // --- Fee Recording
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admNo, setAdmNo] = useState("");
  const [termFee, setTermFee] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [latestReceipt, setLatestReceipt] = useState(null);

  // --- Receipt
  const [receiptAdmNo, setReceiptAdmNo] = useState("");
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [exportingReceipt, setExportingReceipt] = useState(false);

  // --- Class List
  const [className, setClassName] = useState("");
  const [classFees, setClassFees] = useState(null);
  const [loadingClassFees, setLoadingClassFees] = useState(false);
  const [exportingClass, setExportingClass] = useState(false);

  // --- Logic
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
      setActiveTab("receipt");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error recording fee");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // --- Export: Receipt PDF with logo
  const exportReceiptPDF = async () => {
    if (!latestReceipt) return;
    setExportingReceipt(true);
    setTimeout(async () => {
      const doc = new jsPDF();
      doc.setFontSize(12);

      // School logo and heading
      let curY = 16;
      if (schoolInfo?.logo?.[0]?.url) {
        const logoUrl = getSchoolLogo(schoolInfo);
        if (logoUrl) {
          const img = new window.Image();
          img.crossOrigin = "Anonymous";
          img.src = logoUrl;

          await new Promise((resolve) => {
            img.onload = () => {
              doc.addImage(img, logoUrl.includes(".png") ? "PNG" : "JPEG", 14, 8, 20, 20);
              resolve();
            };
            img.onerror = resolve;
          });
        }
        doc.setFontSize(14);
        doc.text(schoolInfo?.name || "", 40, 14);
        doc.setFontSize(11);
        if (schoolInfo.motto) doc.text(`"${schoolInfo.motto}"`, 40, 20);
        doc.setFontSize(10);
        if (schoolInfo.location) doc.text(schoolInfo.location, 40, 27);
        if (schoolInfo.contact || schoolInfo.email) doc.text(
          `Contact: ${schoolInfo.contact || "—"} | Email: ${schoolInfo.email || "—"}`, 40, 32
        );
        curY = 36;
      }

      doc.setFontSize(13);
      doc.text("Fee Receipt", 14, curY + 4);

      autoTable(doc, {
        startY: curY + 10,
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
        headStyles: { fillColor: [34, 197, 94] }, // green
      });
      doc.save(`Receipt_${latestReceipt.student?.admNo ?? "student"}.pdf`);
      setExportingReceipt(false);
      toast.success("Receipt PDF downloaded");
    }, 200);
  };

  // --- Export: Class List PDF with logo
  const exportClassFeesPDF = async () => {
    if (!classFees) return;
    setExportingClass(true);
    setTimeout(async () => {
      const doc = new jsPDF();
      doc.setFontSize(12);

      // School logo and heading
      let curY = 16;
      if (schoolInfo?.logo?.[0]?.url) {
        const logoUrl = getSchoolLogo(schoolInfo);
        if (logoUrl) {
          const img = new window.Image();
          img.crossOrigin = "Anonymous";
          img.src = logoUrl;
          await new Promise((resolve) => {
            img.onload = () => {
              doc.addImage(img, logoUrl.includes(".png") ? "PNG" : "JPEG", 14, 8, 20, 20);
              resolve();
            };
            img.onerror = resolve;
          });
        }
        doc.setFontSize(14);
        doc.text(schoolInfo?.name || "", 40, 14);
        doc.setFontSize(11);
        if (schoolInfo.motto) doc.text(`"${schoolInfo.motto}"`, 40, 20);
        doc.setFontSize(10);
        if (schoolInfo.location) doc.text(schoolInfo.location, 40, 27);
        if (schoolInfo.contact || schoolInfo.email) doc.text(
          `Contact: ${schoolInfo.contact || "—"} | Email: ${schoolInfo.email || "—"}`, 40, 32
        );
        curY = 36;
      }

      doc.setFontSize(13);
      doc.text(
        `${classFees.school?.class ?? ""} (${classFees.school?.grade ?? ""}) – ${classFees.school?.name ?? ""}`,
        14,
        curY + 4
      );
      autoTable(doc, {
        startY: curY + 10,
        head: [["Adm No", "Name", "Term Fee", "Paid", "Balance"]],
        body: classFees.students.map((s) => [
          s.admNo, s.name, s.termFee, s.cumulativePaid, s.balance
        ]),
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] }, // indigo
      });
      doc.save(`ClassFees_${classFees.school?.class ?? "class"}.pdf`);
      setExportingClass(false);
      toast.success("Class fees PDF downloaded");
    }, 200);
  };

  // -- Tabs UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex flex-col">
      <TopRightLogout />
      <div className="flex-1 flex flex-col items-center justify-start px-2 w-full">
        <h2 className="text-3xl font-extrabold text-indigo-700 my-8">
          Fee Management
        </h2>

        {/* --- Tab Bar --- */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded transition font-semibold text-sm
                ${activeTab === t.key
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-50 text-indigo-800 hover:bg-indigo-200"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* --- Tab contents --- */}
        <div className="w-full max-w-2xl">
          {activeTab === "record" && (
            <form
              className="mb-8 w-full bg-white/95 shadow-lg p-8 rounded-2xl flex flex-col gap-4 items-center"
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
          )}

          {activeTab === "receipt" && (
            <div className="mb-8 w-full bg-white/95 p-6 rounded-2xl shadow flex flex-col items-center">
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
          )}

          {activeTab === "class" && (
            <div className="mb-8 w-full bg-white/95 p-6 rounded-2xl shadow flex flex-col items-center">
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
          )}

          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
