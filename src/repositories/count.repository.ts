import type { ChurchSummaryRow } from "@/domain/types";

export interface CountRepository {
  summary(): Promise<ChurchSummaryRow[]>;
}
