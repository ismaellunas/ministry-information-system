import { AppError } from "@/domain/errors";
import type { ChurchDepartmentCount, ChurchSummaryRow, Ministry, Profile } from "@/domain/types";
import type { AuditRepository } from "@/repositories/audit.repository";
import type { CountRepository } from "@/repositories/count.repository";
import type { MinistryRepository } from "@/repositories/ministry.repository";

export class CountService {
  constructor(
    private readonly actor: Profile,
    private readonly counts: CountRepository,
    private readonly ministries: MinistryRepository,
    private readonly audit: AuditRepository
  ) {}

  async listForOwnChurch(churchId: string): Promise<{
    ministries: Ministry[];
    counts: ChurchDepartmentCount[];
  }> {
    this.assertChurchRep(churchId);
    const ministries = (await this.ministries.listAll()).filter((item) => item.tracksMembership);
    const counts = await this.counts.listForChurch(churchId);
    return { ministries, counts };
  }

  async set(input: {
    churchId: string;
    ministryId: number;
    memberCount: number;
    rosterComplete: boolean;
  }): Promise<ChurchDepartmentCount> {
    this.assertChurchRep(input.churchId);
    if (!Number.isInteger(input.memberCount) || input.memberCount < 0) {
      throw new AppError("VALIDATION", "Membership count must be zero or a positive whole number.");
    }
    const ministries = await this.ministries.listAll();
    const ministry = ministries.find((item) => item.id === input.ministryId);
    if (!ministry?.tracksMembership) {
      throw new AppError("VALIDATION", "That ministry does not track membership.");
    }
    const saved = await this.counts.upsert({
      churchId: input.churchId,
      ministryId: input.ministryId,
      memberCount: input.memberCount,
      rosterComplete: input.rosterComplete,
      updatedBy: this.actor.id,
    });
    await this.audit.record(this.actor.id, "count.set", "church_department_counts", input.churchId, {
      ministryId: input.ministryId,
      memberCount: input.memberCount,
      rosterComplete: input.rosterComplete,
    });
    return saved;
  }

  async summary(): Promise<{ ministries: Ministry[]; rows: ChurchSummaryRow[] }> {
    if (!this.canReadSummary()) {
      throw new AppError("FORBIDDEN", "You cannot view the section membership summary.");
    }
    const ministries = (await this.ministries.listAll()).filter((item) => item.tracksMembership);
    const rows = await this.counts.summary();
    return { ministries, rows };
  }

  homeChurchId(): string | null {
    return this.actor.roles.find((role) => role.role === "CHURCH_REP")?.churchId ?? null;
  }

  private assertChurchRep(churchId: string) {
    const allowed = this.actor.roles.some(
      (role) => role.role === "CHURCH_REP" && role.churchId === churchId
    );
    if (!allowed) {
      throw new AppError("FORBIDDEN", "Only this church's representatives can edit these counts.");
    }
  }

  private canReadSummary() {
    return this.actor.roles.some(
      (role) =>
        role.role === "ADMIN" ||
        role.role === "SECTION_PRESBYTERY" ||
        role.role === "SECTION_MINISTRY_REP"
    );
  }
}
