import type { Api } from '../contracts';
import { authApi, catalogApi, notificationApi, settingsApi } from './accountApi';
import { portalApi } from './portalApi';
import { rfqApi } from './rfqApi';
import { savedSupplierApi, supplierApi } from './supplierApi';

export { resetMockDb } from './db';

export const mockApi: Api = {
  auth: authApi,
  settings: settingsApi,
  notifications: notificationApi,
  catalog: catalogApi,
  suppliers: supplierApi,
  saved: savedSupplierApi,
  rfqs: rfqApi,
  portal: portalApi,
};
