"use client";

import { useState, useEffect } from "react";

interface SetupStatus {
  dbOk: boolean;
  licensed: boolean;
  hasAdmin: boolean;
}

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  // License activation state
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState("");
  const [activateSuccess, setActivateSuccess] = useState(false);

  // Admin creation state
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState(false);

  // DB test state
  const [testingDb, setTestingDb] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/setup/status");
      const data = await res.json();
      setStatus(data);
      // Determine which step to show
      if (!data.dbOk) {
        setCurrentStep(1);
      } else if (!data.licensed) {
        setCurrentStep(2);
      } else if (!data.hasAdmin) {
        setCurrentStep(3);
      } else {
        // All done — set cookie and redirect
        document.cookie = "pos-licensed=true; path=/; max-age=31536000";
        window.location.href = "/login";
      }
    } catch {
      setStatus({ dbOk: false, licensed: false, hasAdmin: false });
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testDbConnection = async () => {
    setTestingDb(true);
    setDbConnected(null);
    try {
      const res = await fetch("/api/setup/db-status");
      const data = await res.json();
      setDbConnected(data.connected);
      if (data.connected) {
        await fetchStatus();
      }
    } catch {
      setDbConnected(false);
    } finally {
      setTestingDb(false);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setActivateError("Please enter a license key");
      return;
    }
    setActivating(true);
    setActivateError("");
    try {
      const res = await fetch("/api/setup/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: licenseKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActivateError(data.error || "Invalid license key");
      } else {
        setActivateSuccess(true);
        // Set cookie from client side as well
        document.cookie = "pos-licensed=true; path=/; max-age=31536000";
        await fetchStatus();
      }
    } catch {
      setActivateError("Failed to activate license. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setAdminError("All fields are required");
      return;
    }
    if (adminPassword.length < 8) {
      setAdminError("Password must be at least 8 characters");
      return;
    }
    setCreatingAdmin(true);
    setAdminError("");
    try {
      const res = await fetch("/api/setup/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: adminName, email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAdminError(data.error || "Failed to create admin account");
      } else {
        setAdminSuccess(true);
        // Redirect to login after a moment
        setTimeout(() => {
          document.cookie = "pos-licensed=true; path=/; max-age=31536000";
          window.location.href = "/login";
        }, 1500);
      }
    } catch {
      setAdminError("Failed to create admin account. Please try again.");
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Checking system status...</p>
        </div>
      </div>
    );
  }

  const stepDone = (step: number) => {
    if (step === 1) return status?.dbOk ?? false;
    if (step === 2) return status?.licensed ?? false;
    if (step === 3) return status?.hasAdmin ?? false;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">POS System Activation</h1>
          <p className="text-blue-300/70 text-sm mt-1">Powered by Zenthoz Technologies</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                stepDone(step)
                  ? "bg-green-500 text-white"
                  : currentStep === step
                  ? "bg-blue-500 text-white ring-4 ring-blue-500/30"
                  : "bg-white/10 text-white/40"
              }`}>
                {stepDone(step) ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step}
              </div>
              {step < 3 && (
                <div className={`w-12 h-0.5 ${stepDone(step) ? "bg-green-500" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Database Check */}
        {currentStep === 1 && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4-8 4s8 1.79 8 4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Step 1: Database Connection</h2>
                <p className="text-sm text-white/50">Verify your database is accessible</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-4 rounded-xl mb-4 ${
              dbConnected === true
                ? "bg-green-500/20 border border-green-500/30"
                : dbConnected === false
                ? "bg-red-500/20 border border-red-500/30"
                : "bg-white/5 border border-white/10"
            }`}>
              {dbConnected === true ? (
                <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : dbConnected === false ? (
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  {dbConnected === true
                    ? "Database connected successfully"
                    : dbConnected === false
                    ? "Cannot connect to database"
                    : "Database connection not tested yet"}
                </p>
                {dbConnected === false && (
                  <p className="text-xs text-red-300 mt-1">
                    Make sure DATABASE_URL is set correctly in your environment variables and the MySQL server is running.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={testDbConnection}
              disabled={testingDb}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {testingDb ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing Connection...
                </>
              ) : (
                "Test Database Connection"
              )}
            </button>

            {dbConnected === false && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="text-xs font-semibold text-amber-400 mb-2">Setup Instructions:</p>
                <ol className="text-xs text-amber-300/80 space-y-1 list-decimal list-inside">
                  <li>Set <code className="bg-amber-500/20 px-1 rounded">DATABASE_URL</code> in your <code className="bg-amber-500/20 px-1 rounded">.env</code> file</li>
                  <li>Format: <code className="bg-amber-500/20 px-1 rounded">mysql://user:password@host:3306/dbname</code></li>
                  <li>Ensure MySQL server is running and accessible</li>
                  <li>Run <code className="bg-amber-500/20 px-1 rounded">npx prisma db push</code> to create tables</li>
                  <li>Restart the server and try again</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Step 2: License Activation */}
        {currentStep === 2 && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Step 2: License Activation</h2>
                <p className="text-sm text-white/50">Enter your license key to activate</p>
              </div>
            </div>

            {activateSuccess ? (
              <div className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/30 rounded-xl mb-4">
                <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-300 font-medium">License activated successfully!</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white/70 mb-2">License Key</label>
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => {
                      setLicenseKey(e.target.value.toUpperCase());
                      setActivateError("");
                    }}
                    placeholder="ZPOS-XXXX-XXXX-XXXX-XXXX"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 font-mono text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                  />
                  <p className="text-xs text-white/40 mt-1.5">Format: ZPOS-XXXX-XXXX-XXXX-XXXX</p>
                </div>

                {activateError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-300">{activateError}</p>
                  </div>
                )}

                <button
                  onClick={handleActivate}
                  disabled={activating || !licenseKey.trim()}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {activating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Activate License"
                  )}
                </button>

                <p className="text-xs text-white/40 text-center mt-3">
                  Contact Zenthoz Technologies to obtain a license key for your domain.
                </p>
              </>
            )}
          </div>
        )}

        {/* Step 3: Create Admin Account */}
        {currentStep === 3 && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Step 3: Create Admin Account</h2>
                <p className="text-sm text-white/50">Set up the first administrator account</p>
              </div>
            </div>

            {adminSuccess ? (
              <div className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-300 font-medium">Admin account created! Redirecting to login...</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => { setAdminName(e.target.value); setAdminError(""); }}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => { setAdminEmail(e.target.value); setAdminError(""); }}
                      placeholder="admin@mystore.com"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => { setAdminPassword(e.target.value); setAdminError(""); }}
                      placeholder="Min. 8 characters"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    />
                  </div>
                </div>

                {adminError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-300">{adminError}</p>
                  </div>
                )}

                <button
                  onClick={handleCreateAdmin}
                  disabled={creatingAdmin}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {creatingAdmin ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Admin Account"
                  )}
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-center text-white/30 text-xs mt-6">
          &copy; {new Date().getFullYear()} Zenthoz Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
