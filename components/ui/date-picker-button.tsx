"use client";

import * as React from "react";
import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DatePickerButtonProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export function DatePickerButton({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  fromDate,
  toDate,
}: DatePickerButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(date || new Date());
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateSelect = (selectedDate: Date) => {
    onDateChange?.(selectedDate);
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => subDays(startOfMonth(prev), 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => addDays(endOfMonth(prev), 1));
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getCalendarDays = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = daysInMonth[0];
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Add empty cells at the beginning to align with correct day of week
    const calendarDays = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add all days of the month
    calendarDays.push(...daysInMonth);

    return calendarDays;
  };

  const isDateDisabled = (day: Date) => {
    if (fromDate && day < fromDate) return true;
    if (toDate && day > toDate) return true;
    return false;
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full justify-start text-left font-normal",
          !date && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, "PPP") : placeholder}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold text-gray-900">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {calendarDays.map((day, index) => {
              if (!day) {
                // Empty cell for proper alignment
                return <div key={`empty-${index}`} className="h-8 w-8" />;
              }

              const isSelected = date && isSameDay(day, date);
              const isDisabled = isDateDisabled(day);

              return (
                <Button
                  key={day.toISOString()}
                  variant="ghost"
                  size="sm"
                  onClick={() => !isDisabled && handleDateSelect(day)}
                  disabled={isDisabled}
                  className={cn(
                    "h-8 w-8 p-0 text-sm",
                    isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                    isDisabled && "text-gray-300 cursor-not-allowed",
                    !isSelected && !isDisabled && "hover:bg-gray-100"
                  )}
                >
                  {format(day, "d")}
                </Button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="p-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateSelect(new Date())}
              className="w-full"
            >
              Today
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
