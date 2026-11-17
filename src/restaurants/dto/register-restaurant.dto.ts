import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import { CnpjValidator } from '../cnpj.validator.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/[()\s.-]/g, '') : value;

export class RegisterRestaurantDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  restaurantName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase().replace(/[./\s-]/g, '') : value,
  )
  @Validate(CnpjValidator)
  cnpj!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  responsibleName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(digits)
  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Informe um telefone com DDD válido.' })
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @Transform(digits)
  @IsString()
  @Matches(/^\d{8}$/, { message: 'Informe um CEP válido com 8 dígitos.' })
  postalCode!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  street!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number!: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  neighborhood!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn([
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ], { message: 'Selecione uma UF válida.' })
  state!: string;
}
