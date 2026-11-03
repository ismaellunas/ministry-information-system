import type { Member, MemberBirthday } from "@/domain/types";

export interface MemberRepository {
  listBirthdaysInMonth(churchId: string, month: number): Promise<MemberBirthday[]>;
  listForChurch(churchId: string): Promise<Member[]>;
  findById(id: string): Promise<Member | null>;
  create(input: {
    id: string;
    churchId: string;
    ministryId: number;
    fullName: string;
    birthMonth: number | null;
    birthDay: number | null;
    birthYear: number | null;
    createdBy: string;
  }): Promise<Member>;
  update(
    id: string,
    patch: {
      fullName: string;
      ministryId: number;
      birthMonth: number | null;
      birthDay: number | null;
      birthYear: number | null;
    }
  ): Promise<Member>;
  softDelete(id: string): Promise<void>;
}
