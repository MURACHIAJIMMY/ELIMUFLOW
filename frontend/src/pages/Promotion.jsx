import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import TopRightLogout from "../components/TopRightLogout";
import Spinner from "../components/Spinner";
import { toast } from "sonner";
import {
  promoteStudentsApi,
  syncEnrollmentApi,
} from '../Api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loadingPromotion, setLoadingPromotion] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  // Trigger promotion
  const handlePromotion = async () => {
    setLoadingPromotion(true);
    try {
      await promoteStudentsApi();
      toast.success('🎓 Promotion triggered successfully');
    } catch {
      toast.error('Promotion trigger failed');
    } finally {
      setLoadingPromotion(false);
    }
  };

  // Trigger enrollment sync
  const handleSyncEnrollment = async () => {
    setLoadingSync(true);
    try {
      const { updatedCount } = await syncEnrollmentApi();
      toast.success(`📘 Enrollment synced: ${updatedCount} students updated`);
    } catch {
      toast.error('Enrollment sync failed');
    } finally {
      setLoadingSync(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col">
      <TopRightLogout />
      <div className="flex-1 flex flex-col justify-center items-center">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-8">
          Admin Promotion & Enrollment
        </h1>
        <div className="flex flex-col gap-6 items-center bg-white/90 shadow-lg p-10 rounded-2xl">
          <button
            onClick={handlePromotion}
            disabled={loadingPromotion}
            className={`w-64 px-6 py-3 rounded-lg text-lg font-semibold 
              bg-indigo-600 text-white shadow-md hover:bg-indigo-700
              transition-all ${
                loadingPromotion ? "opacity-70 cursor-wait" : ""
            }`}
          >
            {loadingPromotion ? <span className="inline-flex items-center gap-2"><Spinner size={22}/> Promoting...</span> : "🎓 Trigger Promotion"}
          </button>
          <button
            onClick={handleSyncEnrollment}
            disabled={loadingSync}
            className={`w-64 px-6 py-3 rounded-lg text-lg font-semibold 
              bg-green-600 text-white shadow-md hover:bg-green-700
              transition-all ${
                loadingSync ? "opacity-70 cursor-wait" : ""
            }`}
          >
            {loadingSync ? <span className="inline-flex items-center gap-2"><Spinner size={22}/> Syncing...</span> : "📘 Sync Enrollment"}
          </button>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-10 w-64 px-6 py-2 rounded-lg bg-indigo-400 text-white font-semibold hover:bg-indigo-600 shadow"
        >
          ← Back to Dashboard
        </button>
      </div>
      
    </div>
  );
}
