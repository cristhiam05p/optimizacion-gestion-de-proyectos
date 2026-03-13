import { BadRequestException } from '@nestjs/common';

export class DomainError extends BadRequestException {
  constructor(code: string, details: unknown) {
    super({ code, details });
  }
}
