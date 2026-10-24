import AsyncStorage from "@react-native-async-storage/async-storage";

import { createPendingAuthAttemptStore } from "../../../shared/persistence/auth-storage";

export const pendingAuthAttemptStore =
  createPendingAuthAttemptStore(AsyncStorage);
