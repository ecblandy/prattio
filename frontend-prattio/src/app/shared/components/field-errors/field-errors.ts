import { Component, input } from '@angular/core';

interface FieldError {
  kind: string;
  message?: string;
}

@Component({
  selector: 'app-field-errors',
  templateUrl: './field-errors.html',
})
export class FieldErrors {
  readonly touched = input.required<boolean>();
  readonly errors = input.required<readonly FieldError[]>();
}
