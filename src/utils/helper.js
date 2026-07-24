/**
 * Genera las semanas operativas del mes:
 *
 * S1: días 1 al 7
 * S2: días 8 al 14
 * S3: días 15 al 21
 * S4: días 22 al 28
 * S5: días 29 al último día
 *
 * Devuelve siempre cuatro o cinco semanas.
 */
export const getWeeksOfMonthCalendar = (date) => {
  const sourceDate =
    date instanceof Date &&
    !Number.isNaN(date.getTime())
      ? date
      : new Date();

  const year = sourceDate.getFullYear();
  const monthIndex = sourceDate.getMonth();

  const daysInMonth = new Date(
    year,
    monthIndex + 1,
    0,
  ).getDate();

  const weekCount = Math.ceil(
    daysInMonth / 7,
  );

  return Array.from(
    { length: weekCount },
    (_, index) => {
      const id = index + 1;
      const startDay = index * 7 + 1;
      const endDay = Math.min(
        startDay + 6,
        daysInMonth,
      );

      return {
        id,
        start: new Date(
          year,
          monthIndex,
          startDay,
          12,
          0,
          0,
          0,
        ),
        end: new Date(
          year,
          monthIndex,
          endDay,
          12,
          0,
          0,
          0,
        ),
        key:
          `${year}-${String(
            monthIndex + 1,
          ).padStart(2, "0")}-W${id}`,
      };
    },
  );
};
