import React, { useState } from "react";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";

export default function PrivateFileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const handleFilesUploaded = (files: any[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const viewPrivateFile = async (fileUrl: string) => {
    try {
      // To access a private file, you need to include authorization
      const token = "your-jwt-token-here"; // Get from your auth system

      const response = await fetch(fileUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unauthorized to view this file");
      }

      const { url: signedUrl } = await response.json();

      // Open the temporary signed URL (expires in 5 minutes)
      window.open(signedUrl, "_blank");
    } catch (error) {
      console.error("Error accessing private file:", error);
      alert("Unable to access private file. You may not have permission.");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Private File Upload</h2>

      <div className="mb-6">
        <EnhancedFileUpload
          onFilesUploaded={handleFilesUploaded}
          maxFiles={5}
          maxSize={10}
          acceptedTypes={["image/*", "video/*", "application/pdf", "text/*"]}
          userId="test-user"
          isPrivate={true}
          multiple={true}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Uploaded Files</h3>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="p-3 bg-green-50 rounded border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">
                    ✅ {file.filename}
                  </p>
                  <p className="text-xs text-gray-600">
                    Private URL: {file.url}
                  </p>
                </div>
                <button
                  onClick={() => viewPrivateFile(file.url)}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  View File
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Note: This URL cannot be accessed directly. It requires
                authentication.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
