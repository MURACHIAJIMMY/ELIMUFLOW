import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import TopRightLogout from "../components/TopRightLogout";
import Spinner from "../components/Spinner";
import { toast } from "sonner";
import {
  promoteStudentsApi,
  syncEnrollmentApi,
  getClasses,
} from '../Api';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [loadingPromotion, setLoadingPromotion] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classes, setClasses] = useState([]);

  // Load classes on mount (optional: just for display)
  React.useEffect(() => {
    setLoadingClasses(true);
    getClasses()
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));
  }, []);

  // Trigger promotion
  const handlePromotion = async () => {
    setLoadingPromotion(true);
    try {
      await promoteStudentsApi();
      toast.success('Promotion triggered successfully');
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
      toast.success(`Enrollment synced: ${updatedCount} students updated`);
    } catch {
      toast.error('Enrollment sync failed');
    } finally {
      setLoadingSync(false);
    }
  };

  return (
    <div>
      <TopRightLogout />
      <h1>Admin Dashboard</h1>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handlePromotion} disabled={loadingPromotion}>
          {loadingPromotion ? <Spinner size={16} /> : 'Trigger Promotion'}
        </button>
        <button
          onClick={handleSyncEnrollment}
          disabled={loadingSync}
          style={{ marginLeft: '0.5rem' }}
        >
          {loadingSync ? <Spinner size={16} /> : 'Sync Enrollment'}
        </button>
      </div>
      <hr />

      {loadingClasses ? (
        <Spinner />
      ) : (
        classes.length > 0 && (
          <div>
            <h2>Classes in school: </h2>
            <ul>
              {classes.map(cls => (
                <li key={cls._id}>{cls.name}</li>
              ))}
            </ul>
          </div>
        )
      )}

      <button
        onClick={() => navigate("/dashboard")}
        className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}
