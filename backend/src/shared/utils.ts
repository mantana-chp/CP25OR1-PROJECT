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
