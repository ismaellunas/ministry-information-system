import type { ChurchDepartmentCount, ChurchSummaryRow } from "@/domain/types";

export interface CountRepository {
  listForChurch(churchId: string): Promise<ChurchDepartmentCount[]>;
  upsert(input: {
    churchId: string;
    ministryId: number;
    memberCount: number;
    rosterComplete: boolean;
    updatedBy: string;
  }): Promise<ChurchDepartmentCount>;
  summary(): Promise<ChurchSummaryRow[]>;
}
