import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'cpf', async: false })
export class CpfValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) {
      return false;
    }

    for (const length of [9, 10]) {
      let sum = 0;
      for (let index = 0; index < length; index++) {
        sum += Number(value[index]) * (length + 1 - index);
      }
      const remainder = (sum * 10) % 11;
      if (Number(value[length]) !== (remainder === 10 ? 0 : remainder)) return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'Informe um CPF válido.';
  }
}
