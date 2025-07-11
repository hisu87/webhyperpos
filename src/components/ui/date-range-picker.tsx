
"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
    initialDateRange?: DateRange;
    onUpdate?: (range: DateRange | undefined) => void; // Added onUpdate prop
}

export function DatePickerWithRange({
  className,
  initialDateRange,
  onUpdate
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(initialDateRange || {
    from: new Date(),
    to: addDays(new Date(), 7),
  });
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (selectedRange: DateRange | undefined) => {
    setDate(selectedRange);
    if (onUpdate) {
      onUpdate(selectedRange);
    }
    // Optional: close popover on select, or require a button click
    // setIsOpen(false); 
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            onClick={() => setIsOpen(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
           {/* Optional: Add Apply/Cancel buttons here if you don't close on select */}
        </PopoverContent>
      </Popover>
    </div>
  )
}
