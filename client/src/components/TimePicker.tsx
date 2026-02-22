import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const [hour, minute] = value.split(":").map(Number);

  const handleHourChange = (delta: number) => {
    let newHour = hour + delta;
    if (newHour < 0) newHour = 23;
    if (newHour > 23) newHour = 0;
    onChange(`${String(newHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };

  const handleMinuteChange = (delta: number) => {
    let newMinute = minute + delta;
    if (newMinute < 0) newMinute = 55;
    if (newMinute > 59) newMinute = 0;
    onChange(`${String(hour).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`);
  };

  return (
    <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-4">
      <div className="flex items-center justify-center gap-4">
        {/* Hour */}
        <div className="flex flex-col items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleHourChange(1)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ChevronUp size={16} />
          </Button>
          <div className="text-2xl font-bold text-white w-12 text-center">{String(hour).padStart(2, "0")}</div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleHourChange(-1)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ChevronDown size={16} />
          </Button>
        </div>

        {/* Separator */}
        <div className="text-2xl font-bold text-white">:</div>

        {/* Minute */}
        <div className="flex flex-col items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMinuteChange(5)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ChevronUp size={16} />
          </Button>
          <div className="text-2xl font-bold text-white w-12 text-center">{String(minute).padStart(2, "0")}</div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMinuteChange(-5)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ChevronDown size={16} />
          </Button>
        </div>
      </div>

      <div className="text-center text-sm text-slate-400">
        {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
      </div>
    </div>
  );
};

export default TimePicker;
