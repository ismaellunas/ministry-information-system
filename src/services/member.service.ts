import { randomUUID } from "crypto";
import { churchRepChurchIds } from "@/domain/activity-access";
import { toProperCase } from "@/domain/directory";
import { AppError } from "@/domain/errors";
import type { Member, MemberBirthday, Profile } from "@/domain/types";
import type { AuditRepository } from "@/repositories/audit.repository";
import type { MemberRepository } from "@/repositories/member.repository";
import type { MinistryRepository } from "@/repositories/ministry.repository";

export interface CreateMemberInput {
  id?: string;
  churchId: string;
  ministryId: number;
  fullName: string;
  birthMonth?: number | null;
  birthDay?: number | null;
  birthYear?: number | null;
}

export interface UpdateMemberInput {
  id: string;
  ministryId: number;
  fullName: string;
  birthMonth?: number | null;
  birthDay?: number | null;
  birthYear?: number | null;
}

export class MemberService {
  constructor(
    private readonly actor: Profile,
    private readonly members: MemberRepository,
    private readonly ministries: MinistryRepository,
    private readonly audit: AuditRepository
  ) {}

  listBirthdaysInMonth(churchId: string, month: number): Promise<MemberBirthday[]> {
    return this.members.listBirthdaysInMonth(churchId, month);
  }

  listForChurch(churchId: string): Promise<Member[]> {
    this.assertChurchRep(churchId);
    return this.members.listForChurch(churchId);
  }

  async create(input: CreateMemberInput): Promise<Member> {
    this.assertChurchRep(input.churchId);
    const { fullName, birthMonth, birthDay } = await this.validateFields(input);

    if (input.id) {
      const existing = await this.members.findById(input.id);
      if (existing) return existing;
    }

    const saved = await this.members.create({
      id: input.id ?? randomUUID(),
      churchId: input.churchId,
      ministryId: input.ministryId,
      fullName,
      birthMonth,
      birthDay,
      birthYear: input.birthYear ?? null,
      createdBy: this.actor.id,
    });
    await this.audit.record(this.actor.id, "member.create", "members", saved.id, {
      churchId: input.churchId,
    });
    return saved;
  }

  async createMany(
    inputs: CreateMemberInput[]
  ): Promise<Array<{ id: string; status: "created" | "failed"; error: string | null }>> {
    if (inputs.length === 0) return [];
    const rows = inputs.map((input) => ({ ...input, id: input.id ?? randomUUID() }));
    for (const churchId of Array.from(new Set(rows.map((input) => input.churchId)))) {
      this.assertChurchRep(churchId);
    }
    const ministries = await this.ministries.listAll();
    const ready: Array<(typeof rows)[number] & { fullName: string; birthMonth: number | null; birthDay: number | null }> = [];
    const results = new Map<string, { status: "created" | "failed"; error: string | null }>();
    for (const input of rows) {
      try {
        const fields = this.checkedFields(ministries, input);
        ready.push({ ...input, ...fields });
      } catch (error) {
        results.set(input.id, {
          status: "failed",
          error: error instanceof AppError ? error.message : "Could not add this member.",
        });
      }
    }
    const existing = new Set((await this.members.findManyByIds(ready.map((row) => row.id))).map((row) => row.id));
    const fresh = ready.filter((row) => !existing.has(row.id));
    if (fresh.length > 0) {
      await this.members.createMany(
        fresh.map((row) => ({
          id: row.id,
          churchId: row.churchId,
          ministryId: row.ministryId,
          fullName: row.fullName,
          birthMonth: row.birthMonth,
          birthDay: row.birthDay,
          birthYear: row.birthYear ?? null,
          createdBy: this.actor.id,
        }))
      );
      await this.audit.record(this.actor.id, "member.create", "members", fresh[0].churchId, {
        count: fresh.length,
      });
    }
    for (const row of ready) results.set(row.id, { status: "created", error: null });
    return rows.map((input) => {
      const result = results.get(input.id) ?? { status: "failed" as const, error: "Could not add this member." };
      return { id: input.id, ...result };
    });
  }

  async get(id: string): Promise<Member> {
    const existing = await this.members.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", "Member not found.");
    this.assertChurchRep(existing.churchId);
    return existing;
  }

  async update(input: UpdateMemberInput): Promise<Member> {
    const existing = await this.members.findById(input.id);
    if (!existing) throw new AppError("NOT_FOUND", "Member not found.");
    this.assertChurchRep(existing.churchId);
    const { fullName, birthMonth, birthDay } = await this.validateFields(input);

    const saved = await this.members.update(input.id, {
      fullName,
      ministryId: input.ministryId,
      birthMonth,
      birthDay,
      birthYear: input.birthYear ?? null,
    });
    await this.audit.record(this.actor.id, "member.update", "members", saved.id, {
      churchId: existing.churchId,
    });
    return saved;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.members.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", "Member not found.");
    this.assertChurchRep(existing.churchId);
    await this.members.softDelete(id);
    await this.audit.record(this.actor.id, "member.remove", "members", id, {
      churchId: existing.churchId,
    });
  }

  private async validateFields(input: {
    ministryId: number;
    fullName: string;
    birthMonth?: number | null;
    birthDay?: number | null;
  }): Promise<{ fullName: string; birthMonth: number | null; birthDay: number | null }> {
    return this.checkedFields(await this.ministries.listAll(), input);
  }

  private checkedFields(
    ministries: Awaited<ReturnType<MinistryRepository["listAll"]>>,
    input: {
      ministryId: number;
      fullName: string;
      birthMonth?: number | null;
      birthDay?: number | null;
    }
  ): { fullName: string; birthMonth: number | null; birthDay: number | null } {
    const fullName = toProperCase(input.fullName);
    if (!fullName) throw new AppError("VALIDATION", "Enter the member's full name.");

    const ministry = ministries.find((item) => item.id === input.ministryId);
    if (!ministry?.tracksMembership) {
      throw new AppError("VALIDATION", "Choose a valid department.");
    }

    const birthMonth = input.birthMonth ?? null;
    const birthDay = input.birthDay ?? null;
    if ((birthMonth == null) !== (birthDay == null)) {
      throw new AppError("VALIDATION", "Enter both birth month and day, or leave both blank.");
    }

    return { fullName, birthMonth, birthDay };
  }

  private assertChurchRep(churchId: string) {
    if (!churchRepChurchIds(this.actor).includes(churchId)) {
      throw new AppError("FORBIDDEN", "Only this church's representatives can manage members.");
    }
  }
}
