/**
 * Time Helper Utilities
 * Provides consistent time formatting across all tools
 */

export interface RightNowTimeInfo {
  utc_iso: string;
  local_timezone: string;
  timestamp_seconds: number;
  timestamp_milliseconds: number;
}

export interface RightNowExtended {
  utc_iso: string;
  local_timezone: string;
  timestamp_seconds: number;
  timestamp_milliseconds: number;
  additional_formats: {
    utc_string: string;
    local_date_string: string;
    iso_local: string;
    timezone_offset: string;
    timezone_offset_minutes: number;
  };
}

/**
 * Get current time in the standard 4 formats required by the user
 * @returns Time information in 4 core formats
 */
export function getRightNowTime(): RightNowTimeInfo {
  const now = new Date();
  
  return {
    utc_iso: now.toISOString(),
    local_timezone: now.toString(),
    timestamp_seconds: Math.floor(now.getTime() / 1000),
    timestamp_milliseconds: now.getTime()
  };
}

/**
 * Get extended time information including additional formats
 * @returns Comprehensive time information
 */
export function getRightNowExtended(): RightNowExtended {
  const now = new Date();
  const utcIso = now.toISOString();
  const localTimezone = now.toString();
  const timestampS = Math.floor(now.getTime() / 1000);
  const timestampMS = now.getTime();
  
  // Additional useful formats
  const utcString = now.toUTCString();
  const localDateString = now.toLocaleString();
  const isoLocal = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, -1);
  const timezoneOffset = now.getTimezoneOffset();
  const timezoneOffsetString = `UTC${timezoneOffset <= 0 ? '+' : '-'}${Math.abs(Math.floor(timezoneOffset / 60)).toString().padStart(2, '0')}:${Math.abs(timezoneOffset % 60).toString().padStart(2, '0')}`;
  
  return {
    utc_iso: utcIso,
    local_timezone: localTimezone,
    timestamp_seconds: timestampS,
    timestamp_milliseconds: timestampMS,
    additional_formats: {
      utc_string: utcString,
      local_date_string: localDateString,
      iso_local: isoLocal,
      timezone_offset: timezoneOffsetString,
      timezone_offset_minutes: timezoneOffset
    }
  };
}