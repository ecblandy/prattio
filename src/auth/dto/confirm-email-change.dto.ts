import { Matches } from 'class-validator';

export class ConfirmEmailChangeDto {
  @Matches(/^\d{8}$/)
  code!: string;
}
