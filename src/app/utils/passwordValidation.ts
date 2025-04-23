/**
 * Validates a password against security requirements
 * @param password The password to validate
 * @returns An object with validation result and error message if any
 */
export function validatePassword(password: string): { isValid: boolean; error?: string; requirements?: { hasMinLength: boolean; hasUpperCase: boolean; hasLowerCase: boolean; hasNumberOrSpecial: boolean } } {
  // Check all requirements
  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasNumberOrSpecial = hasNumbers || hasSpecialChars;

  // Determine if password is valid
  const isValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumberOrSpecial;

  // Return validation result
  if (!isValid) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters and include uppercase, lowercase, and a number or special character',
      requirements: {
        hasMinLength,
        hasUpperCase,
        hasLowerCase,
        hasNumberOrSpecial
      }
    };
  }

  return {
    isValid: true,
    requirements: {
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumberOrSpecial
    }
  };
}
