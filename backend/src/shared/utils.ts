export const formatAgeFromBirthDate = (birthDate: Date | null): number | null => {
  if (!birthDate) {
    return null;
  }

  const today = new Date();
  const birth = new Date(birthDate);

  // Calculate the difference in milliseconds
  const diffTime = Math.abs(today.getTime() - birth.getTime());

  // Convert to days
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays; // retrun age in days
};

/**
 * Takes a birth date and returns a formatted string like "2Y 3M".
 * @param birthDate The birth date of the pet.
 * @returns A formatted string representing the age in years and months.
 */
export const formatBirthDateToYearsMonths = (birthDate: Date | null): string => {
  const totalDays = formatAgeFromBirthDate(birthDate);

  if (totalDays === null || totalDays < 0) {
    return 'unknown age';
  }

  const years = Math.floor(totalDays / 365);
  const remainingDaysAfterYears = totalDays % 365;
  const months = Math.floor(remainingDaysAfterYears / 30); // Approximate months

  let formattedAge = '';

  if (years > 0) {
    formattedAge += `${years}Y`;
  }
  if (months > 0) {
    if (years > 0) formattedAge += ' '; // Add space if years are also present
    formattedAge += `${months}M`;
  }

  // If the pet is less than a month old
  if (formattedAge.trim() === '') {
    return '< 1M';
  }

  return formattedAge.trim();
};
