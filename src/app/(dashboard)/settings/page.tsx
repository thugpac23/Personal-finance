"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile } from "@/types";

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
      setLoading(false);
    };
    void load();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      currency:  profile.currency,
      locale:    profile.locale,
      timezone:  profile.timezone,
    }).eq("id", user.id);

    if (error) toast.error(error.message);
    else toast.success("Settings saved");
    setSaving(false);
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile and preferences</p>
      </div>

      <div className="card max-w-lg p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Profile</h2>
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={profile.full_name ?? ""}
              onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50" value={profile.email ?? ""} disabled />
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed here.</p>
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={profile.currency ?? "EUR"}
              onChange={e => setProfile(p => ({ ...p, currency: e.target.value }))}>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="BGN">BGN — Bulgarian Lev</option>
            </select>
          </div>
          <div>
            <label className="label">Timezone</label>
            <select className="input" value={profile.timezone ?? "UTC"}
              onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}>
              <option value="UTC">UTC</option>
              <option value="Europe/Sofia">Europe/Sofia</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
