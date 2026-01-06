"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  fromDate,
  toDate,
}: DatePickerProps) {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const newDate = new Date(value);
      onDateChange?.(newDate);
    } else {
      onDateChange?.(undefined);
    }
  };

  // Convert Date to YYYY-MM-DD format for input
  const dateValue = date ? format(date, "yyyy-MM-dd") : "";

  return (
    <div className="relative">
      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
      <input
        type="date"
        value={dateValue}
        onChange={handleDateChange}
        disabled={disabled}
        min={fromDate ? format(fromDate, "yyyy-MM-dd") : undefined}
        max={toDate ? format(toDate, "yyyy-MM-dd") : undefined}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !date && "text-muted-foreground",
          className
        )}
        placeholder={placeholder}
      />
    </div>
  );
}
