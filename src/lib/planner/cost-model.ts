import type { BudgetLevel } from "@/types/domain";

import type { PlannerPhase5CFinalItinerary } from "@/lib/planner/final-itinerary";

export const tripCostConfig = {
  fuelPriceOmrPerLiter: 0.24,
  vehicleKmPerLiter: 12,
  foodCostOmrPerDay: 6,
  hotelNightlyRateOmr: {
    low: 20,
    medium: 45,
    luxury: 90
  },
  budgetThresholdOmrPerDay: {
    low: 45,
    medium: 80,
    luxury: 140
  }
} as const;

export interface TripCostBreakdown {
  fuelCostOmr: number;
  ticketsCostOmr: number;
  foodCostOmr: number;
  hotelCostOmr: number;
  totalCostOmr: number;
  averageCostPerDayOmr: number;
  paidStopCount: number;
  freeStopCount: number;
  totalStopCount: number;
  budgetTier: BudgetLevel;
  budgetThresholdOmr: number;
  withinBudget: boolean;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateTripCostBreakdown(input: {
  itinerary: PlannerPhase5CFinalItinerary;
  budgetTier: BudgetLevel;
}): TripCostBreakdown {
  const { itinerary, budgetTier } = input;
  const totalKm = itinerary.totals.estimatedTravelKm;
  const tripDays = itinerary.tripDays;

  let ticketsCostOmr = 0;
  let paidStopCount = 0;
  let freeStopCount = 0;

  itinerary.days.forEach((day) => {
    day.stops.forEach((stop) => {
      ticketsCostOmr += stop.ticketCostOmr;
      if (stop.ticketCostOmr > 0) {
        paidStopCount += 1;
      } else {
        freeStopCount += 1;
      }
    });
  });

  const fuelCostOmr = roundCurrency(
    (totalKm / tripCostConfig.vehicleKmPerLiter) * tripCostConfig.fuelPriceOmrPerLiter
  );
  const foodCostOmr = roundCurrency(tripCostConfig.foodCostOmrPerDay * tripDays);
  const hotelCostOmr = roundCurrency(
    tripCostConfig.hotelNightlyRateOmr[budgetTier] * Math.max(tripDays - 1, 0)
  );
  const roundedTicketsCostOmr = roundCurrency(ticketsCostOmr);
  const totalCostOmr = roundCurrency(
    fuelCostOmr + roundedTicketsCostOmr + foodCostOmr + hotelCostOmr
  );
  const budgetThresholdOmr = roundCurrency(
    tripCostConfig.budgetThresholdOmrPerDay[budgetTier] * tripDays
  );

  return {
    fuelCostOmr,
    ticketsCostOmr: roundedTicketsCostOmr,
    foodCostOmr,
    hotelCostOmr,
    totalCostOmr,
    averageCostPerDayOmr: tripDays > 0 ? roundCurrency(totalCostOmr / tripDays) : 0,
    paidStopCount,
    freeStopCount,
    totalStopCount: itinerary.totals.stopCount,
    budgetTier,
    budgetThresholdOmr,
    withinBudget: totalCostOmr <= budgetThresholdOmr
  };
}
