"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "@/components/login-form";
import Image from "next/image";

/*
=== LOGIN CREDENTIALS FOR DEVELOPMENT ===
Password for ALL users: password123

MANAGER ACCOUNTS:
1. Sam Wujiale (Manager)
   - Email: sam@origins.com
   - Password: password123

2. Aliza Sanny Sreng (Manager)
   - Email: aliza@origins.com
   - Password: password123

STAFF ACCOUNTS:
3. Song Uylong (Staff)
   - Email: song@origins.com
   - Password: password123

4. Lin (Staff)
   - Email: lin@origins.com
   - Password: password123

5. Na Sereybosha (Staff)
   - Email: na@origins.com
   - Password: password123

6. Dalipine Cheng (Staff)
   - Email: dalipine@origins.com
   - Password: password123

7. Davin Horn (Staff)
   - Email: davin@origins.com
   - Password: password123

8. Liya (Staff)
   - Email: liya@origins.com
   - Password: password123

9. Bovy (Staff)
   - Email: bovy@origins.com
   - Password: password123

Total: 9 users (2 Managers, 7 Staff)
Email Pattern: [firstname]@origins.com
Common Password: password123 (hashed with bcrypt)
*/

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#465C88] via-[#000000] to-[#FF7A30] flex items-center justify-center p-4 relative overflow-hidden">
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
            Checking Authentication
          </h2>
          <p className="text-gray-300 text-sm sm:text-base">
            Please wait while we verify your session...
          </p>
        </div>
      </div>
    );
  }

  // Don't render login page if user is authenticated
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#465C88] via-[#000000] to-[#FF7A30] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#FF7A30] rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#465C88] rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-[#FF7A30] rounded-full blur-3xl opacity-20"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24 bg-white rounded-2xl shadow-2xl flex items-center justify-center p-4">
              <Image
                src="/logostar.png"
                alt="ORIGINS Logo"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
            ORIGINS
          </h1>
          <p className="text-[#FF7A30] text-lg font-medium mb-2">
            Team Management
          </p>
          <p className="text-gray-300 text-sm">Work Update System</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/60 text-xs">
            Powered by ORIGINS Team Management System
          </p>
        </div>
      </div>
    </div>
  );
}
