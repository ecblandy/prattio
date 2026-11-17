import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'cnpj', async: false })
export class CnpjValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !/^[A-Z0-9]{12}[0-9]{2}$/.test(value)) {
      return false;
    }
    if (/^(\d)\1{13}$/.test(value)) {
      return false;
    }

    const digit = (length: number, weights: number[]) => {
      const sum = weights.reduce(
        (total, weight, index) => total + (value.charCodeAt(index) - 48) * weight,
        0,
      );
      const remainder = sum % 11;
      return value[length] === String(remainder < 2 ? 0 : 11 - remainder);
    };

    return (
      digit(12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
      digit(13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    );
  }

  defaultMessage(): string {
    return 'Informe um CNPJ válido.';
  }
}
