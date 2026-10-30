import type { Church } from "@/domain/types";

export type ChurchRepUpdateFields = Partial<
  Pick<
    Church,
    | "pastorFirstName"
    | "pastorLastName"
    | "pastorName"
    | "pastorPhone"
    | "address"
    | "facebookPageUrl"
    | "hotlineNumber"
    | "mapPinUrl"
    | "logoUrl"
  >
>;

export interface ChurchRepository {
  findById(id: string): Promise<Church | null>;
  listAll(includeInactive?: boolean): Promise<Church[]>;
  create(data: Omit<Church, "id">): Promise<Church>;
  /** Admin-only — can update name and is_active. */
  adminUpdate(id: string, data: Partial<Omit<Church, "id">>): Promise<Church>;
  /** Church rep — restricted columns only. */
  repUpdate(id: string, data: ChurchRepUpdateFields): Promise<Church>;
  updateLogoUrl(id: string, url: string): Promise<void>;
}
