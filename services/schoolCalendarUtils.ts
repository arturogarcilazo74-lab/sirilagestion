// No imports needed for this utility

/**
 * Determines if a given date is a valid school day according to the 2025-2026 calendar
 * @param dateString Date in YYYY-MM-DD format
 * @returns boolean indicating if it's a valid school day
 */
export function isSchoolDay(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  
  // Check if it's a weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false; // Weekend
  }
  
  // Check if within school year: Jan 12, 2026 to July 15, 2026
  const startDate = new Date('2026-01-12');
  const endDate = new Date('2026-07-15');
  
  if (date < startDate || date > endDate) {
    return false;
  }
  
  // Check if it's a suspension day
  if (isSuspensionDay(date)) {
    return false;
  }
  
  return true;
}

/**
 * Determines if a given date is a suspension day according to the school calendar
 * @param date Date object
 * @returns boolean indicating if it's a suspension day
 */
function isSuspensionDay(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11 (Jan=0, Feb=1, ..., Dec=11)
  const day = date.getDate();
  
  // Fixed suspension dates within school year
  if (
    (month === 1 && day === 2) ||   // Feb 2: Constitution Day (Lunes, puente del 5 de febrero)
    (month === 2 && day === 16) ||  // Mar 16: Natalicio de Benito Juárez (Lunes, primer megapuente de 2026)
    (month === 3 && day >= 6 && day <= 17) || // Apr 6-17: Vacaciones de Semana Santa
    (month === 4 && day === 1) ||   // May 1: Día del Trabajo
    (month === 4 && day === 5) ||   // May 5: Batalla de Puebla
    (month === 4 && day === 15)     // May 15: Día del Maestro
  ) {
    return true;
  }
  
  // Check if it's the last Friday of the month (Jan to June) for Consejo Técnico Escolar
  if (month >= 0 && month <= 5) { // Jan to June (0-5)
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const dayOfWeek = lastDay.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate days to subtract to get to last Friday
    // Formula: (dayOfWeek + 2) % 7
    // Examples:
    //   Sunday (0): (0+2)%7 = 2 -> go back 2 days to Friday
    //   Monday (1): (1+2)%7 = 3 -> go back 3 days to Friday
    //   Tuesday (2): (2+2)%7 = 4 -> go back 4 days to Friday
    //   Wednesday (3): (3+2)%7 = 5 -> go back 5 days to Friday
    //   Thursday (4): (4+2)%7 = 6 -> go back 6 days to Friday
    //   Friday (5): (5+2)%7 = 0 -> go back 0 days (already Friday)
    //   Saturday (6): (6+2)%7 = 1 -> go back 1 day to Friday
    const daysToSubtract = (dayOfWeek + 2) % 7;
    
    const lastFriday = new Date(lastDay.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
    
    // Check if today is the last Friday
    if (
      date.getDate() === lastFriday.getDate() &&
      date.getMonth() === lastFriday.getMonth() &&
      date.getFullYear() === lastFriday.getFullYear()
    ) {
      return true;
    }
  }
  
  return false;
}