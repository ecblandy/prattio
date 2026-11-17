import { Matches } from 'class-validator';

export class ConfirmEmailDto {
  @Matches(/^[0-9a-f]{64}$/)
  token!: string;
}
