import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsIn, IsString, Matches, MaxLength, MinLength, Validate } from 'class-validator';
import { CpfValidator } from '../cpf.validator.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/[()\s.-]/g, '') : value;

export class RegisterPersonalDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(digits)
  @Validate(CpfValidator)
  cpf!: string;

  @Transform(digits)
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Informe um celular com DDD válido.' })
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsIn(['client', 'motoboy'])
  role!: 'client' | 'motoboy';

  @Equals(true, { message: 'Você precisa aceitar os termos para continuar.' })
  acceptedTerms!: boolean;
}
