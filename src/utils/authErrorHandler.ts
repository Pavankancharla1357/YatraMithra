export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'The email address is not valid. Please check and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Would you like to create one?';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or reset your password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled.';
    case 'auth/popup-closed-by-user':
      return 'The sign-in popup was closed before completion. Please try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/internal-error':
      return 'An internal error occurred. Please try again later.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email and password.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for authentication. Please check your Firebase settings.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};
