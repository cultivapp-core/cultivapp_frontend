export const getWeeksOfMonthCalendar = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 👉 lunes de la semana del día 1
  const start = new Date(firstDay);
  const dayOfWeek = start.getDay(); // 0 dom ... 6 sab
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  start.setDate(start.getDate() + diffToMonday);

  // 👉 domingo de la semana del último día del mes
  const end = new Date(lastDay);
  const endDay = end.getDay();
  const diffToSunday = (endDay === 0 ? 0 : 7 - endDay);
  end.setDate(end.getDate() + diffToSunday);

  const weeks = [];
  let current = new Date(start);
  let weekIndex = 1;

  while (current <= end) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekStart.getDate() + 6);

    weeks.push({
      id: weekIndex,
      start: weekStart,
      end: weekEnd,
      key: `${year}-${month + 1}-W${weekIndex}`, // 🔥 CLAVE ESTABLE
    });

    current.setDate(current.getDate() + 7);
    weekIndex++;
  }

  return weeks;
};