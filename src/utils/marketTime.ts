import type { MarketSession, MarketStatus, IDXMarketSession, IDXMarketStatus } from "../types";


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
      nextTransition = getWibTransition(timings.pre.h, timings.pre.m, 1);
    } else {
      session = 'Market Closed';
      color = 'bg-earth';
      // Next transition is always Pre-market. 
      // On weekdays, if we are in this 'else' block, it means we are between 07:00 and 15:00 WIB,
      // so the next pre-market is TODAY (offset 0).
      nextTransition = getWibTransition(timings.pre.h, timings.pre.m, 0);
    }
  }

  // Calculate time remaining
  const diffMs = nextTransition.getTime() - now.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  
  let timeRemaining: string;
  if (h >= 24) {
    const days = Math.floor(h / 24);
    const remH = h % 24;
    timeRemaining = `${days}d ${remH}h ${m}m`;
  } else {
    timeRemaining = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return {
    session,
    label: session,
    color,
    nextTransition,
    timeRemaining
  };
}

/**
 * IDX/IHSG Market Status
 *
 * Sesi I:
 *   Mon-Thu: 09:00:00 – 12:00:00 WIB
 *   Fri:     09:00:00 – 11:30:00 WIB
 *
 * Sesi II:
 *   Mon-Thu: 13:30:00 – 15:49:59 WIB
 *   Fri:     14:00:00 – 15:49:59 WIB
 */
export function getIDXMarketStatus(): IDXMarketStatus {
  const now = new Date();

  // Convert to WIB (UTC+7)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibDate = new Date(utc + 3600000 * 7);

  const day = wibDate.getDay(); // 0 = Sunday, 6 = Saturday
  const h = wibDate.getHours();
  const m = wibDate.getMinutes();
  const sec = wibDate.getSeconds();
  // Total seconds since midnight for precise comparison
  const currentSec = h * 3600 + m * 60 + sec;

  const isFriday = day === 5;

  // Session boundaries in seconds since midnight (WIB)
  const sesi1Start = 9 * 3600;                   // 09:00:00
  const sesi1End = isFriday ? 11 * 3600 + 30 * 60 : 12 * 3600; // Fri: 11:30:00, else 12:00:00
  const sesi2Start = isFriday ? 14 * 3600 : 13 * 3600 + 30 * 60; // Fri: 14:00:00, else 13:30:00
  const sesi2End = 15 * 3600 + 50 * 60;           // 15:50:00 (15:49:59 rounded up)

  // Helper to create a WIB time as a local Date for countdown
  const getWibTransition = (targetH: number, targetM: number, targetS: number, dayOffset = 0): Date => {
    const d = new Date(wibDate);
    d.setHours(targetH, targetM, targetS, 0);
    if (dayOffset !== 0) d.setDate(d.getDate() + dayOffset);
    // Convert WIB back to local time
    const wibOffset = 7 * 60;
    const localOffset = -new Date().getTimezoneOffset();
    const diff = wibOffset - localOffset;
    return new Date(d.getTime() - diff * 60000);
  };

  let session: IDXMarketSession = 'Market Closed';
  let nextTransition: Date;
  let color = 'bg-earth';

  // Weekend check
  if (day === 0 || day === 6) {
    session = 'Market Closed';
    color = 'bg-earth';
    // Next transition: Monday 09:00
    const daysUntilMonday = day === 0 ? 1 : 2; // Sat -> +2, Sun -> +1
    nextTransition = getWibTransition(9, 0, 0, daysUntilMonday);
  } else {
    // Weekday logic
    if (currentSec < sesi1Start) {
      // Before market opens
      session = 'Market Closed';
      color = 'bg-earth';
      nextTransition = getWibTransition(9, 0, 0);
    } else if (currentSec < sesi1End) {
      // Sesi I active
      session = 'Sesi I';
      color = 'bg-fin-green';
      const endH = Math.floor(sesi1End / 3600);
      const endM = Math.floor((sesi1End % 3600) / 60);
      nextTransition = getWibTransition(endH, endM, 0);
    } else if (currentSec < sesi2Start) {
      // Lunch break between sessions
      session = 'Istirahat';
      color = 'bg-fin-amber';
      const startH = Math.floor(sesi2Start / 3600);
      const startM = Math.floor((sesi2Start % 3600) / 60);
      nextTransition = getWibTransition(startH, startM, 0);
    } else if (currentSec < sesi2End) {
      // Sesi II active
      session = 'Sesi II';
      color = 'bg-fin-green';
      // End at 15:49:59, so countdown to 15:50:00
      nextTransition = getWibTransition(15, 50, 0);
    } else {
      // After market close
      session = 'Market Closed';
      color = 'bg-earth';
      // Next transition: next trading day 09:00
      const daysUntilNext = day === 5 ? 3 : 1; // Fri -> Mon (+3), else next day
      nextTransition = getWibTransition(9, 0, 0, daysUntilNext);
    }
  }

  // Calculate time remaining
  const diffMs = nextTransition.getTime() - now.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const rh = Math.floor(diffSec / 3600);
  const rm = Math.floor((diffSec % 3600) / 60);
  const rs = diffSec % 60;

  let timeRemaining: string;
  if (rh >= 24) {
    const days = Math.floor(rh / 24);
    const remH = rh % 24;
    timeRemaining = `${days}d ${remH}h ${rm}m`;
  } else {
    timeRemaining = `${rh.toString().padStart(2, '0')}:${rm.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
  }

  return {
    session,
    label: session,
    color,
    nextTransition,
    timeRemaining,
  };
}
