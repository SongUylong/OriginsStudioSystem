"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FileTextIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";

interface SecureDocumentProps {
  documentKey: string;
  filename: string;
  className?: string;
  fallback?: React.ReactNode;
  type?: string;
}

export function SecureDocument({
  documentKey,
  filename,
  className,
  fallback,
  type = "application/pdf",
}: SecureDocumentProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    async function fetchSecureDocument() {
      if (status === "loading") {
        return; // Still loading, wait
      }

      if (status === "unauthenticated" || !session?.user?.id) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/private-image?key=${encodeURIComponent(documentKey)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status}`);
        }

        const data = await response.json();
        setDocumentUrl(data.url);
      } catch (err) {
        console.error("SecureDocument: Error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load document"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSecureDocument();
  }, [documentKey, session, status]);

  const handleDocumentClick = () => {
    if (documentUrl) {
      window.open(documentUrl, "_blank");
    }
  };

  const renderDocumentPreview = () => {
    if (type === "application/pdf") {
      return (
        <div className="w-full h-full bg-red-50 border border-red-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
          {/* PDF Icon Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 opacity-50"></div>

          {/* PDF Preview */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-10 bg-white border border-red-300 rounded shadow-sm mb-2 relative">
              <div className="absolute top-1 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
              <div className="absolute top-2.5 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
              <div className="absolute top-4 left-1 right-1 h-0.5 bg-red-300 rounded"></div>
              <div className="absolute bottom-1 right-1 text-[6px] font-bold text-red-500">
                PDF
              </div>
            </div>
          </div>
        </div>
      );
    } else if (
      type === "application/msword" ||
      type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return (
        <div className="w-full h-full bg-blue-50 border border-blue-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-10 bg-white border border-blue-300 rounded shadow-sm mb-2 relative">
              <div className="absolute top-1 left-1 right-1 h-0.5 bg-blue-300 rounded"></div>
              <div className="absolute top-2.5 left-1 right-1 h-0.5 bg-blue-300 rounded"></div>
              <div className="absolute top-4 left-1 right-1 h-0.5 bg-blue-300 rounded"></div>
              <div className="absolute bottom-1 right-1 text-[6px] font-bold text-blue-500">
                DOC
              </div>
            </div>
          </div>
        </div>
      );
    } else if (type.startsWith("text/")) {
      return (
        <div className="w-full h-full bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <FileTextIcon className="h-6 w-6 text-gray-500 mb-1" />
          </div>
        </div>
      );
    } else if (
      type === "application/postscript" ||
      filename.toLowerCase().endsWith(".ai")
    ) {
      return (
        <div className="w-full h-full bg-orange-50 border border-orange-200 rounded flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-200 opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-10 bg-white border border-orange-300 rounded shadow-sm mb-2 relative">
              <div className="absolute inset-1 bg-gradient-to-br from-orange-200 to-orange-300 rounded-sm"></div>
              <div className="absolute bottom-1 right-1 text-[6px] font-bold text-orange-600">
                AI
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center">
        <DownloadIcon className="h-6 w-6 text-gray-400 mb-1" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`${className} relative overflow-hidden animate-pulse`}>
        <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
          <FileTextIcon className="h-6 w-6 text-gray-400" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
          Loading...
        </div>
      </div>
    );
  }

  if (error || !documentUrl) {
    return (
      fallback || (
        <div className={`${className} relative overflow-hidden`}>
          <div className="w-full h-full bg-red-50 border border-red-200 rounded flex items-center justify-center">
            <FileTextIcon className="h-6 w-6 text-red-400" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-xs p-1 truncate">
            Failed to load
          </div>
        </div>
      )
    );
  }

  return (
    <div
      className={`${className} cursor-pointer hover:opacity-90 transition-all group relative overflow-hidden`}
      onClick={handleDocumentClick}
    >
      {renderDocumentPreview()}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
        {filename}
      </div>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLinkIcon className="h-3 w-3 text-white bg-black/50 rounded p-0.5" />
      </div>
    </div>
  );
}
