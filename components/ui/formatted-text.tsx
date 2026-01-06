"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FormattedTextProps {
  content: string;
  className?: string;
  maxLength?: number;
  showExpandButton?: boolean;
}

export function FormattedText({
  content,
  className,
  maxLength,
  showExpandButton = false,
}: FormattedTextProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // If no content, return null
  if (!content || content.trim() === "") {
    return null;
  }

  // If content has HTML formatting, render it safely
  if (content.includes("<") && content.includes(">")) {
    if (maxLength && content.length > maxLength && !isExpanded) {
      // For HTML content, we need to be more careful with truncation
      // Find the first complete tag and truncate there
      let truncated = content;
      if (content.length > maxLength) {
        // Simple truncation - find the last complete word before maxLength
        const lastSpace = content.lastIndexOf(" ", maxLength);
        if (lastSpace > maxLength * 0.8) {
          // Only truncate if we can get a reasonable break
          truncated = content.substring(0, lastSpace) + "...";
        } else {
          truncated = content.substring(0, maxLength) + "...";
        }
      }

      return (
        <div className={cn("space-y-2", className)}>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: truncated }}
          />
          {showExpandButton && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-blue-600 hover:text-blue-800 text-sm underline justify-self-start"
            >
              Read more
            </button>
          )}
        </div>
      );
    }

    if (maxLength && content.length > maxLength && isExpanded) {
      return (
        <div className={cn("space-y-2", className)}>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
          {showExpandButton && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-blue-600 hover:text-blue-800 text-sm underline justify-self-start"
            >
              Show less
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        className={cn("prose prose-sm max-w-none", className)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // If content is plain text (no HTML tags), treat it as regular text
  if (maxLength && content.length > maxLength && !isExpanded) {
    return (
      <div className={cn("space-y-2", className)}>
        <span className="whitespace-pre-wrap">
          {content.substring(0, maxLength)}...
        </span>
        {showExpandButton && (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-blue-600 hover:text-blue-800 text-sm underline justify-self-start"
          >
            Read more
          </button>
        )}
      </div>
    );
  }

  if (maxLength && content.length > maxLength && isExpanded) {
    return (
      <div className={cn("space-y-2", className)}>
        <span className="whitespace-pre-wrap">{content}</span>
        {showExpandButton && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-blue-600 hover:text-blue-800 text-sm underline justify-self-start"
          >
            Show less
          </button>
        )}
      </div>
    );
  }

  return (
    <span className={cn("whitespace-pre-wrap", className)}>{content}</span>
  );
}
