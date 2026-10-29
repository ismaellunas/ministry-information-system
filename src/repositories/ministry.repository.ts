import type { Ministry } from "@/domain/types";

export interface MinistryRepository {
  listAll(): Promise<Ministry[]>;
}
