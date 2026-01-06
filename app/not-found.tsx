import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#465C88] via-[#000000] to-[#FF7A30] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#FF7A30] rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#465C88] rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl w-full relative z-10 text-center">
        <div className="mb-8">
          {/* 404 Image */}
          <div className="flex justify-center mb-6">
            <div className="relative w-64 h-64 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl flex items-center justify-center p-6 border border-white/20">
              <Image
                src="/bingo-404.png"
                alt="404 - Page Not Found"
                width={240}
                height={240}
                className="object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-[#FF7A30] mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist. It might have been moved,
            deleted, or you entered the wrong URL.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block bg-[#FF7A30] hover:bg-[#FF7A30]/90 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Go Back Home
          </Link>

          <div className="text-center">
            <p className="text-white/60 text-sm">
              Need help? Contact the ORIGINS team
            </p>
          </div>
        </div>

        {/* Additional decorative image */}
        <div className="mt-12 flex justify-center">
          <div className="relative w-32 h-32 opacity-30">
            <Image
              src="/bingo-404-2.png"
              alt="Decorative"
              width={128}
              height={128}
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
