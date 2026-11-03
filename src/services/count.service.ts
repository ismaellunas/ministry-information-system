import { AppError } from "@/domain/errors";
import type { ChurchSummaryRow, Ministry, Profile } from "@/domain/types";
import type { CountRepository } from "@/repositories/count.repository";
import type { MinistryRepository } from "@/repositories/ministry.repository";

export class CountService {
  constructor(
    private readonly actor: Profile,
    private readonly counts: CountRepository,
    private readonly ministries: MinistryRepository
  ) {}

  async summary(): Promise<{ ministries: Ministry[]; rows: ChurchSummaryRow[] }> {
    if (!this.canReadSummary()) {
      throw new AppError("FORBIDDEN", "You cannot view the section membership summary.");
    }
    const ministries = this.visibleSummaryMinistries(await this.ministries.listAll());
    const rows = await this.counts.summary();
    return { ministries, rows };
  }

  homeChurchId(): string | null {
    return this.actor.roles.find((role) => role.role === "CHURCH_REP")?.churchId ?? null;
  }

  private canReadSummary() {
    return this.actor.roles.some(
      (role) =>
        role.role === "ADMIN" ||
        role.role === "SECTION_PRESBYTERY" ||
        role.role === "SECTION_MINISTRY_REP"
    );
  }

  private visibleSummaryMinistries(all: Ministry[]): Ministry[] {
    const tracking = all.filter((item) => item.tracksMembership);
    const seesAll = this.actor.roles.some(
      (role) => role.role === "ADMIN" || role.role === "SECTION_PRESBYTERY"
    );
    if (seesAll) return tracking;
    const own = new Set(
      this.actor.roles
        .filter((role) => role.role === "SECTION_MINISTRY_REP")
        .map((role) => role.ministryId)
    );
    return tracking.filter((item) => own.has(item.id));
  }
}
