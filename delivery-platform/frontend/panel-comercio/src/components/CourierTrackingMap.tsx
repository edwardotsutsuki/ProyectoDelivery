import SharedTrackingMap, { type CourierTrackingMapProps } from '@delivery/tracking-web';
import { config } from '../config';
export type { CourierTrackingMapProps } from '@delivery/tracking-web';
export default function CourierTrackingMap(props: CourierTrackingMapProps) {
  return <SharedTrackingMap trackingUrl={config.trackingUrl} osrmUrl={config.osrmUrl} {...props} />;
}
