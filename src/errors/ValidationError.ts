/**
 * Custom validation error class
 */

export class ValidationError extends Error {
  public field?: string;
  public value?: unknown;

  constructor(
    message: string,
    field?: string,
    value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class ParseError extends Error {
  public fileName?: string;
  public lineNumber?: number;

  constructor(
    message: string,
    fileName?: string,
    lineNumber?: number
  ) {
    super(message);
    this.name = 'ParseError';
    this.fileName = fileName;
    this.lineNumber = lineNumber;
  }
}

export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

export class InvalidFileTypeError extends Error {
  public expectedType: string;
  public actualType?: string;

  constructor(
    message: string,
    expectedType: string,
    actualType?: string
  ) {
    super(message);
    this.name = 'InvalidFileTypeError';
    this.expectedType = expectedType;
    this.actualType = actualType;
  }
}