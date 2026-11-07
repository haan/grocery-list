import { applicationId } from 'expo-application';

// Read the installed binary, not Metro's manifest or a downloaded JS environment.
// Older Dev installations keep their identity and existing sharing links.
export const SHARE_SCHEME = applicationId === 'io.github.haan.grocerylist'
  ? 'haan-grocerylist' : 'haan-grocerylist-dev';
