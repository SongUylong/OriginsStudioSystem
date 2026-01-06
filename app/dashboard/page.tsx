"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { StaffDashboard } from "@/components/staff-dashboard";
import { ManagerDashboard } from "@/components/manager-dashboard";
import Image from "next/image";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#465C88] via-[#000000] to-[#FF7A30] flex items-center justify-center relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 sm:w-32 sm:h-32 bg-[#FF7A30] rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 sm:w-40 sm:h-40 bg-[#465C88] rounded-full blur-3xl"></div>
        </div>

        <div className="text-center relative z-10 px-4">
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl flex items-center justify-center p-3 sm:p-4 border border-white/20">
              <Image
                src="/bingo.png"
                alt="Loading..."
                width={96}
                height={96}
                className="object-contain animate-pulse w-16 h-16 sm:w-24 sm:h-24"
              />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Loading Dashboard
          </h2>
          <p className="text-gray-300 text-sm sm:text-base">
            Please wait while we prepare your workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#465C88] via-[#000000] to-[#FF7A30]">
      {user.role === "staff" ? (
        <StaffDashboard user={user} />
      ) : (
        <ManagerDashboard user={user} />
      )}
    </div>
  );
}
