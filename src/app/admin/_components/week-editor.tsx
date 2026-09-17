import { minToHhmm } from "@/lib/time";

import { WEEK_ORDER, WEEKDAYS } from "../_lib/format";

/** Seven rows of on/off + start/end time inputs, Monday first. */
export function WeekEditor({
  prefix,
  days,
  onLabel,
  fallback = { startMin: 600, endMin: 1320 },
}: {
  prefix: string;
  days: { weekday: number; startMin: number; endMin: number }[];
  onLabel: string;
  fallback?: { startMin: number; endMin: number };
}) {
  return (
    <div className="hours">
      {WEEK_ORDER.map((weekday) => {
        const day = days.find((d) => d.weekday === weekday);
        return (
          <div key={weekday} className="hours-row">
            <span className="hours-day">{WEEKDAYS[weekday]}</span>
            <label className="toggle">
              <input type="checkbox" name={`${prefix}_${weekday}_on`} defaultChecked={!!day} />
              <span className="small muted">{onLabel}</span>
            </label>
            <input type="time" name={`${prefix}_${weekday}_start`} defaultValue={minToHhmm(day?.startMin ?? fallback.startMin)} step={900} aria-label={`${WEEKDAYS[weekday]} start`} />
            <input type="time" name={`${prefix}_${weekday}_end`} defaultValue={minToHhmm(day?.endMin ?? fallback.endMin)} step={900} aria-label={`${WEEKDAYS[weekday]} end`} />
          </div>
        );
      })}
    </div>
  );
}
