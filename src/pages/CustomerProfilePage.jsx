// ملف مُعاد إنشاؤه تلقائياً - ضروري عشان App.jsx (THEIRS) يستورد منه
// هاد كان ملف بنيناه قبل وحذفناه — رجعناه لأن THEIRS يعتمد عليه
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getPublicCustomerProfile } from "../services/profileService";
import { Skeleton } from "../components/LoadingState";
import "./CustomerProfilePage.css";

export default function CustomerProfilePage() {
  const { customerId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getPublicCustomerProfile(customerId);
        if (alive) setProfile(data);
      } catch (err) {
        if (alive) setError(err?.message || "فشل التحميل");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [customerId]);

  if (loading) return <Skeleton width="100%" height={300} />;
  if (error) return <div className="cpp-error">{error}</div>;
  if (!profile) return null;

  return (
    <div className="cpp-page" dir="rtl">
      <h1>{profile?.customer?.firstName} {profile?.customer?.lastName}</h1>
    </div>
  );
}
