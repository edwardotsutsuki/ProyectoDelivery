declare const __DELIVERY_CONFIG__: Partial<FrontendConfig> | undefined;
export interface FrontendConfig {
  apiBaseUrl: string; trackingUrl: string; trackingDirectUrl: string; osrmUrl: string;
  refreshEnabled: boolean; demosEnabled: boolean;
}
// Public build-time settings. Never put credentials here.
export const config: FrontendConfig = {
  apiBaseUrl: 'http://localhost:8080/api/v1', trackingUrl: 'ws://localhost:8080/ws/',
  trackingDirectUrl: 'ws://localhost:4001', osrmUrl: 'http://localhost:5001',
  refreshEnabled: true, demosEnabled: false,
  ...(typeof __DELIVERY_CONFIG__ === 'undefined' ? {} : __DELIVERY_CONFIG__),
};
