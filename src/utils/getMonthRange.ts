export function getMonthRange(
  monthName: string,
  year?: number,
): { start: string; end: string } {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const monthIndex = months.indexOf(monthName.toLowerCase());
  if (monthIndex === -1) {
    throw new Error(`Invalid month name: ${monthName}`);
  }

  const currentYear = new Date().getFullYear();
  const y = year ?? currentYear;

  const start = new Date(y, monthIndex, 1);

  const end = new Date(y, monthIndex + 1, 0, 23, 59, 59, 999);

  return { start: start.toDateString(), end: end.toDateString() };
}
