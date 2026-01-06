"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnhancedFileUpload } from "@/components/enhanced-file-upload";
import { useToast } from "@/hooks/use-toast";

export function FileUploadExample() {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const { toast } = useToast();

  const handlePrivateFilesUploaded = (files: any[]) => {
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ ...f, private: true })),
    ]);
    toast({
      title: "Upload successful",
      description: `${files.length} private file(s) uploaded successfully`,
    });
  };

  const handlePublicFilesUploaded = (files: any[]) => {
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ ...f, private: false })),
    ]);
    toast({
      title: "Upload successful",
      description: `${files.length} public file(s) uploaded successfully`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Private File Upload</h3>
            <p className="text-sm text-gray-600 mb-4">
              Only you can access these files
            </p>
          </div>
          <EnhancedFileUpload
            onFilesUploaded={handlePrivateFilesUploaded}
            maxFiles={5}
            maxSize={10}
            acceptedTypes={["image/*", "video/*"]}
            isPrivate={true}
            multiple={true}
          />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Public File Upload</h3>
            <p className="text-sm text-gray-600 mb-4">
              Anyone with the link can access these files
            </p>
          </div>
          <EnhancedFileUpload
            onFilesUploaded={handlePublicFilesUploaded}
            maxFiles={5}
            maxSize={10}
            acceptedTypes={["image/*", "video/*"]}
            isPrivate={false}
            multiple={true}
          />
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Uploaded Files:</h3>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="border p-2 rounded">
              <p>
                <strong>Name:</strong> {file.filename}
              </p>
              <p>
                <strong>Type:</strong> {file.private ? "Private" : "Public"}
              </p>
              <p>
                <strong>Size:</strong> {Math.round(file.size / 1024)} KB
              </p>
              <p>
                <strong>URL:</strong> {file.url}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
