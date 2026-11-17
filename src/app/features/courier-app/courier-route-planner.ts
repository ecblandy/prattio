export interface CourierRouteJob {
  orderId: string;
  customer: string;
  address: string;
  status: 'A caminho da loja' | 'Chegou à loja' | 'Coletado' | 'Em entrega' | 'Entregue';
  storeName?: string;
  storeAddress?: string;
  storeLatitude?: number;
  storeLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
}

export interface CourierRoutePoint {
  latitude: number;
  longitude: number;
}

export interface CourierRouteStop extends CourierRoutePoint {
  orderId: string;
  kind: 'pickup' | 'delivery';
  label: string;
  address: string;
}

function hasCoordinates(latitude?: number, longitude?: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function distanceMeters(from: CourierRoutePoint, to: CourierRoutePoint): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function planCourierStops(
  jobs: CourierRouteJob[],
  origin: CourierRoutePoint,
): CourierRouteStop[] {
  const routableJobs = jobs.filter((job) =>
    hasCoordinates(job.destinationLatitude, job.destinationLongitude),
  );
  if (!routableJobs.length) return [];

  const stops: Array<CourierRouteStop | undefined> = [];
  let initiallyPicked = 0;
  const fullMask = (1 << routableJobs.length) - 1;

  routableJobs.forEach((job, index) => {
    const pickupIndex = index * 2;
    const deliveryIndex = pickupIndex + 1;
    const hasPickup =
      (job.status === 'A caminho da loja' || job.status === 'Chegou à loja') &&
      hasCoordinates(job.storeLatitude, job.storeLongitude);

    if (hasPickup) {
      stops[pickupIndex] = {
        orderId: job.orderId,
        kind: 'pickup',
        label: `Coleta · ${job.storeName || 'Estabelecimento'}`,
        address: job.storeAddress || 'Endereço da loja não informado',
        latitude: job.storeLatitude!,
        longitude: job.storeLongitude!,
      };
    } else {
      initiallyPicked |= 1 << index;
    }

    stops[deliveryIndex] = {
      orderId: job.orderId,
      kind: 'delivery',
      label: `Entrega · ${job.customer}`,
      address: job.address,
      latitude: job.destinationLatitude!,
      longitude: job.destinationLongitude!,
    };
  });

  const memo = new Map<string, { distance: number; sequence: CourierRouteStop[] }>();
  const solve = (
    picked: number,
    delivered: number,
    lastStop: number,
  ): {
    distance: number;
    sequence: CourierRouteStop[];
  } => {
    if (delivered === fullMask) return { distance: 0, sequence: [] };
    const key = `${picked}:${delivered}:${lastStop}`;
    const cached = memo.get(key);
    if (cached) return cached;

    const lastPoint = lastStop < 0 ? origin : stops[lastStop]!;
    let best = { distance: Number.POSITIVE_INFINITY, sequence: [] as CourierRouteStop[] };

    routableJobs.forEach((_job, index) => {
      const bit = 1 << index;
      if (delivered & bit) return;

      const isPicked = Boolean(picked & bit);
      const nextStopIndex = index * 2 + (isPicked ? 1 : 0);
      const nextStop = stops[nextStopIndex];
      if (!nextStop) return;

      const next = solve(
        isPicked ? picked : picked | bit,
        isPicked ? delivered | bit : delivered,
        nextStopIndex,
      );
      const distance = distanceMeters(lastPoint, nextStop) + next.distance;
      if (distance < best.distance) {
        best = { distance, sequence: [nextStop, ...next.sequence] };
      }
    });

    memo.set(key, best);
    return best;
  };

  return solve(initiallyPicked, 0, -1).sequence;
}
