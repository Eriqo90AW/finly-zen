import { MarketSession, MarketStatus } from "../types";


function isDST(date: Date): boolean {
  const year = date.getFullYear();
  // DST starts second Sunday in March
  const start = new Date(year, 2, 8);
  while (start.getDay() !== 0) start.setDate(start.getDate() + 1);
  start.setHours(2, 0, 0, 0); // 2 AM

  // DST ends first Sunday in November
  const end = new Date(year, 10, 1);
  while (end.getDay() !== 0) end.setDate(end.getDate() + 1);
  end.setHours(2, 0, 0, 0); // 2 AM

  return date >= start && date < end;
}

export function getMarketStatus(): MarketStatus {
  const now = new Date();
  
  // Get WIB time (UTC+7)
  // Since we are likely running in a browser/env where local time might be different, 
  // but the user specified WIB as default. 
  // Let's calculate the UTC time first.
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibDate = new Date(utc + (3600000 * 7));
  
  const dst = isDST(now); // DST check should ideally be for the US market, but using the date is fine.
  
  // Session Start Times (in hours and minutes)
  const timings = dst ? {
    pre: { h: 15, m: 0 },
    open: { h: 20, m: 30 },
    after: { h: 3, m: 0 }, // next day
    closed: { h: 7, m: 0 }  // next day
  } : {
    pre: { h: 16, m: 0 },
    open: { h: 21, m: 30 },
    after: { h: 4, m: 0 }, // next day
    closed: { h: 8, m: 0 }  // next day
  };

  // Convert current WIB time to minutes since start of day for easier comparison
  const currentMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();
  const day = wibDate.getDay(); // 0 = Sunday, 6 = Saturday

  // Helper to create a Date object for a specific WIB time today or tomorrow
  const getWibTransition = (h: number, m: number, dayOffset = 0): Date => {
    const d = new Date(wibDate);
    d.setHours(h, m, 0, 0);
    if (dayOffset !== 0) d.setDate(d.getDate() + dayOffset);
    // Convert back from WIB to local time
    const wibOffset = 7 * 60;
    const localOffset = -new Date().getTimezoneOffset();
    const diff = wibOffset - localOffset;
    return new Date(d.getTime() - diff * 60000);
  };

  let session: MarketSession = 'Market Closed';
  let nextTransition: Date;
  let color = 'text-earth';

  const preStart = timings.pre.h * 60 + timings.pre.m;
  const openStart = timings.open.h * 60 + timings.open.m;
  const afterStart = timings.after.h * 60 + timings.after.m;
  const closedStart = timings.closed.h * 60 + timings.closed.m;

  // Weekend check
  const isWeekend = day === 0 || (day === 6 && currentMinutes >= closedStart) || (day === 1 && currentMinutes < preStart);

  if (isWeekend) {
    session = 'Market Closed';
    color = 'bg-earth';
    // Next transition is Monday Pre-market
    let daysUntilMonday = (1 - day + 7) % 7;
    if (daysUntilMonday === 0 && currentMinutes >= preStart) daysUntilMonday = 7;
    nextTransition = getWibTransition(timings.pre.h, timings.pre.m, daysUntilMonday);
  } else {
    // Weekday logic
    if (currentMinutes >= preStart && currentMinutes < openStart) {
      session = 'Pre-market';
      color = 'bg-fin-amber';
      nextTransition = getWibTransition(timings.open.h, timings.open.m);
    } else if (currentMinutes >= openStart || currentMinutes < afterStart) {
      // Market Open spans across midnight
      // If currentMinutes < afterStart, it's after midnight (00:00 - 03:00/04:00)
      session = 'Market Open';
      color = 'bg-fin-green';
      nextTransition = getWibTransition(timings.after.h, timings.after.m, currentMinutes >= openStart ? 1 : 0);
    } else if (currentMinutes >= afterStart && currentMinutes < closedStart) {
      session = 'After-hours';
      color = 'bg-fin-amber';
      nextTransition = getWibTransition(timings.closed.h, timings.closed.m);
    } else {
      session = 'Market Closed';
      color = 'bg-earth';
      nextTransition = getWibTransition(timings.pre.h, timings.pre.m, currentMinutes >= closedStart ? 1 : 0);
    }
  }

  // Calculate time remaining
  const diffMs = nextTransition.getTime() - now.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  
  const timeRemaining = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return {
    session,
    label: session,
    color,
    nextTransition,
    timeRemaining
  };
}
