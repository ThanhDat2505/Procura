import { CATEGORIES } from '@/domain/catalog';
import type { AuthApi, CatalogApi, NotificationApi, SettingsApi, UserSettings } from '../contracts';
import { ApiError } from '../contracts';
import { db, persist, respond } from './db';
import { currentUser } from './helpers';
import { processSimulations } from './simulation';
import { DEMO_ACCOUNT_IDS, DEMO_PASSWORD } from './seed/organizations';

/** Runs a read in the mock backend (after applying due simulations). */
export async function read<T>(fn: () => T): Promise<T> {
  try {
    processSimulations();
    return await respond(fn());
  } catch (e) {
    await respond(null);
    throw e;
  }
}

/** Runs a mutation in the mock backend and persists the store. */
export async function write<T>(fn: () => T): Promise<T> {
  try {
    processSimulations();
    const result = fn();
    persist();
    return await respond(result);
  } catch (e) {
    await respond(null);
    throw e;
  }
}

export const authApi: AuthApi = {
  login: (input) =>
    write(() => {
      const user = db.users.find((u) => u.email.toLowerCase() === input.email.trim().toLowerCase() && DEMO_ACCOUNT_IDS.includes(u.id));
      if (!user || input.password !== DEMO_PASSWORD) throw new ApiError('errors.invalidCredentials', 'Invalid credentials', 401);
      if (user.role !== input.role) throw new ApiError('errors.wrongRole', 'Account belongs to the other portal', 403);
      db.session = { user, token: `mock-${user.id}-${Date.now()}` };
      return db.session;
    }),
  logout: () =>
    write(() => {
      db.session = null;
    }),
  getSession: () => read(() => db.session),
  demoAccounts: () =>
    read(() =>
      db.users
        .filter((u) => DEMO_ACCOUNT_IDS.includes(u.id))
        .map((u) => ({ role: u.role, email: u.email, password: DEMO_PASSWORD })),
    ),
};

const DEFAULT_SETTINGS: UserSettings = {
  language: 'vi',
  dateFormat: 'dd/mm/yyyy',
  numberFormat: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  notifications: { newQuoteEmail: true, deadlineReminder: true, weeklyDigest: false },
};

export const settingsApi: SettingsApi = {
  get: () => read(() => db.settings[currentUser().id] ?? DEFAULT_SETTINGS),
  update: (patch) =>
    write(() => {
      const id = currentUser().id;
      const prev = db.settings[id] ?? DEFAULT_SETTINGS;
      db.settings[id] = { ...prev, ...patch, notifications: { ...prev.notifications, ...patch.notifications } };
      return db.settings[id];
    }),
};

export const notificationApi: NotificationApi = {
  list: () =>
    read(() =>
      db.notifications.filter((n) => n.userId === currentUser().id).sort((a, b) => b.at.localeCompare(a.at)),
    ),
  markRead: (id) =>
    write(() => {
      const n = db.notifications.find((x) => x.id === id && x.userId === currentUser().id);
      if (n) n.read = true;
    }),
  markAllRead: () =>
    write(() => {
      const uid = currentUser().id;
      db.notifications.forEach((n) => {
        if (n.userId === uid) n.read = true;
      });
    }),
};

export const catalogApi: CatalogApi = {
  categories: () => read(() => CATEGORIES),
};
