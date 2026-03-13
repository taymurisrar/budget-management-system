export type UserDateFormatPreference = "dmy" | "mdy" | "iso";
export type UserTimeFormatPreference = "twelve_hour" | "twenty_four_hour";
export type UserWeekStartPreference = "sunday" | "monday" | "saturday";

export type UserDisplayPreferences = {
  dateFormat: UserDateFormatPreference;
  timeFormat: UserTimeFormatPreference;
  weekStartsOn: UserWeekStartPreference;
  timezone: string;
};

export const defaultUserDisplayPreferences: UserDisplayPreferences = {
  dateFormat: "dmy",
  timeFormat: "twelve_hour",
  weekStartsOn: "monday",
  timezone: "UTC",
};

export function getWeekStartDayIndex(weekStartsOn: UserWeekStartPreference) {
  if (weekStartsOn === "sunday") return 0;
  if (weekStartsOn === "saturday") return 6;
  return 1;
}

export function normalizeDisplayPreferences(
  value?: Partial<UserDisplayPreferences> | null
): UserDisplayPreferences {
  return {
    dateFormat: value?.dateFormat ?? defaultUserDisplayPreferences.dateFormat,
    timeFormat: value?.timeFormat ?? defaultUserDisplayPreferences.timeFormat,
    weekStartsOn: value?.weekStartsOn ?? defaultUserDisplayPreferences.weekStartsOn,
    timezone: value?.timezone ?? defaultUserDisplayPreferences.timezone,
  };
}
