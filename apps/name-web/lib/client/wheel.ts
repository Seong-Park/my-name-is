import KoreanLunarCalendar from "korean-lunar-calendar";

export function dateWheelDays(year: number, month: number, calendar: "solar" | "lunar", leap: boolean) {
  if (calendar === "solar") return new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lunar = new KoreanLunarCalendar();
  for (const day of [30, 29]) {
    if (lunar.setLunarDate(year, month, day, leap)) {
      const actual = lunar.getLunarCalendar();
      if (actual.year === year && actual.month === month && actual.day === day && actual.intercalation === leap) return day;
    }
  }
  return 0;
}

export function wheelIndex(key: string, index: number, length: number) {
  const next = key === "Home" ? 0 : key === "End" ? length - 1
    : key === "ArrowDown" ? index + 1 : key === "ArrowUp" ? index - 1
    : key === "PageDown" ? index + 5 : key === "PageUp" ? index - 5 : null;
  return next === null ? null : Math.max(0, Math.min(length - 1, next));
}
