"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  rows = 3,
  disabled = false,
}: RichTextEditorProps) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Handle input changes
  const handleInput = useCallback(() => {
    // Update value without losing cursor position
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (html !== value) {
        onChange(html);
      }
    }
  }, [value, onChange]);

  // Handle paste events
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // Update value after paste
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        if (html !== value) {
          onChange(html);
        }
      }
    },
    [value, onChange]
  );

  // Toggle bold formatting
  const toggleBold = useCallback(() => {
    if (document.queryCommandSupported("bold")) {
      document.execCommand("bold", false);
      setIsBold(!isBold);
    }
    // Update value after formatting
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (html !== value) {
        onChange(html);
      }
    }
  }, [isBold, value, onChange]);

  // Toggle italic formatting
  const toggleItalic = useCallback(() => {
    if (document.queryCommandSupported("italic")) {
      document.execCommand("italic", false);
      setIsItalic(!isItalic);
    }
    // Update value after formatting
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (html !== value) {
        onChange(html);
      }
    }
  }, [isItalic, value, onChange]);

  // Focus the editor
  const focusEditor = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.focus();

      // Move cursor to end if no selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount === 0) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "b") {
          e.preventDefault();
          toggleBold();
        } else if (e.key === "i") {
          e.preventDefault();
          toggleItalic();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const br = document.createElement("br");
          range.deleteContents();
          range.insertNode(br);

          // Move cursor after the line break
          range.setStartAfter(br);
          range.setEndAfter(br);
          selection.removeAllRanges();
          selection.addRange(range);

          // Update the value without losing cursor position
          if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            if (html !== value) {
              onChange(html);
            }
          }
        }
      }
    };

    editor.addEventListener("keydown", handleKeyDown);
    return () => editor.removeEventListener("keydown", handleKeyDown);
  }, [toggleBold, toggleItalic]);

  // Sync internal state with external value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Update formatting state based on current selection
  useEffect(() => {
    const updateFormattingState = () => {
      if (document.queryCommandSupported("bold")) {
        setIsBold(document.queryCommandState("bold"));
      }
      if (document.queryCommandSupported("italic")) {
        setIsItalic(document.queryCommandState("italic"));
      }
    };

    const updateValueOnKeyUp = () => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        if (html !== value) {
          onChange(html);
        }
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener("keyup", updateFormattingState);
      editor.addEventListener("mouseup", updateFormattingState);
      editor.addEventListener("input", updateFormattingState);

      // Add keyup handler for value updates
      editor.addEventListener("keyup", updateValueOnKeyUp);

      return () => {
        editor.removeEventListener("keyup", updateFormattingState);
        editor.removeEventListener("mouseup", updateFormattingState);
        editor.removeEventListener("input", updateFormattingState);
        editor.removeEventListener("keyup", updateValueOnKeyUp);
      };
    }
  }, [value, onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleClick = useCallback(() => {
    focusEditor();
  }, [focusEditor]);

  const getToolbarButtonClass = (active: boolean) => {
    return cn(
      "h-8 w-8 p-1 rounded transition-colors",
      active
        ? "bg-gray-200 text-gray-900"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center space-x-1 border border-gray-200 rounded-t-md p-1 bg-gray-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleBold}
          className={getToolbarButtonClass(isBold)}
          disabled={disabled}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleItalic}
          className={getToolbarButtonClass(isItalic)}
          title="Italic (Ctrl+I)"
          disabled={disabled}
        >
          <Italic className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        className={cn(
          "min-h-[80px] p-3 border border-gray-200 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text",
          disabled && "bg-gray-50 cursor-not-allowed",
          isFocused && "ring-2 ring-blue-500 border-transparent"
        )}
        style={{ minHeight: `${rows * 20}px` }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        tabIndex={0}
      />

      {/* Placeholder styling */}
      <style jsx>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          position: absolute;
          top: 12px;
          left: 12px;
        }
        [data-placeholder]:not(:empty):before {
          display: none;
        }
      `}</style>
    </div>
  );
}
