import { describe, expect, it } from 'vitest';

import { planCourierStops, type CourierRouteJob } from './courier-route-planner';

function createJob(
  orderId: string,
  store: [number, number],
  customer: [number, number],
): CourierRouteJob {
  return {
    orderId,
    customer: `Cliente ${orderId}`,
    address: `Endereço do cliente ${orderId}`,
    status: 'A caminho da loja',
    storeName: `Loja ${orderId}`,
    storeAddress: `Endereço da loja ${orderId}`,
    storeLatitude: store[0],
    storeLongitude: store[1],
    destinationLatitude: customer[0],
    destinationLongitude: customer[1],
  };
}

describe('planCourierStops', () => {
  it('orders two pickups before delivery when that minimizes distance', () => {
    const jobs = [createJob('A', [0, 1], [0, 3]), createJob('B', [0, 2], [0, 4])];

    const stops = planCourierStops(jobs, { latitude: 0, longitude: 0 });

    expect(stops.map((stop) => `${stop.kind}:${stop.orderId}`)).toEqual([
      'pickup:A',
      'pickup:B',
      'delivery:A',
      'delivery:B',
    ]);
  });

  it('delivers the first order before traveling to a distant second store', () => {
    const jobs = [createJob('A', [0, 1], [0, 1.1]), createJob('B', [0, 10], [0, 11])];

    const stops = planCourierStops(jobs, { latitude: 0, longitude: 0 });

    expect(stops.map((stop) => `${stop.kind}:${stop.orderId}`)).toEqual([
      'pickup:A',
      'delivery:A',
      'pickup:B',
      'delivery:B',
    ]);
  });

  it('does not request another pickup for collected orders', () => {
    const job = { ...createJob('A', [0, 1], [0, 2]), status: 'Coletado' as const };

    const stops = planCourierStops([job], { latitude: 0, longitude: 0 });

    expect(stops.map((stop) => stop.kind)).toEqual(['delivery']);
  });

  it('keeps pickup pending after arriving at the store', () => {
    const job = { ...createJob('A', [0, 1], [0, 2]), status: 'Chegou à loja' as const };

    const stops = planCourierStops([job], { latitude: 0, longitude: 0 });

    expect(stops.map((stop) => stop.kind)).toEqual(['pickup', 'delivery']);
  });
});
