import type { AcceptDocumentUseCase, GetConsentUseCase } from '@thelever-app/consent';
import type { DeclareAgeUseCase, OpenAppUseCase } from '@thelever-app/identity';
import {
  AcceptDocumentRequestDto,
  DeclareAgeRequestDto,
  FirstAccessResponseDto,
} from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../http/authentication.ts';
import type { HttpEndpoint } from '../http/http-endpoint.ts';
import { parseBody } from '../http/parse-body.ts';
import type { RunCommand } from '../rooms/run-command.ts';
import { clientAddressOf, type CountryLookup } from './country-lookup.ts';
import { type FirstAccessGate, statusOf } from '@thelever-app/integrations/first-access';

/**
 * GET /first-access: whoever opens the app. The first time, it begins their first access in the
 * region of the country of the address of the call, which is not kept; every time, it keeps when
 * they opened it. It answers where their first access is.
 */
export class OpenAppEndpoint implements HttpEndpoint {
  readonly method = 'get';
  readonly path = '/first-access';
  readonly authenticated = true;
  readonly #openApp: OpenAppUseCase;
  readonly #getConsent: GetConsentUseCase;
  readonly #countries: CountryLookup;
  readonly #runCommand: RunCommand;

  constructor(
    openApp: OpenAppUseCase,
    getConsent: GetConsentUseCase,
    countries: CountryLookup,
    runCommand: RunCommand,
  ) {
    this.#openApp = openApp;
    this.#getConsent = getConsent;
    this.#countries = countries;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const identity = identityOf(res);
    const country = this.#countries.countryOf(clientAddressOf(req));
    const status = await this.#runCommand(async () =>
      statusOf(
        await this.#openApp.execute({ identity, country }),
        await this.#getConsent.execute(identity),
      ),
    );
    res.json(FirstAccessResponseDto.parse(status));
  }
}

/** POST /first-access/age: whoever opened the app declares their age, once and for good. */
export class DeclareAgeEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/first-access/age';
  readonly authenticated = true;
  readonly #declareAge: DeclareAgeUseCase;
  readonly #gate: FirstAccessGate;
  readonly #runCommand: RunCommand;

  constructor(declareAge: DeclareAgeUseCase, gate: FirstAccessGate, runCommand: RunCommand) {
    this.#declareAge = declareAge;
    this.#gate = gate;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const identity = identityOf(res);
    const { birthYear, birthMonth } = parseBody(DeclareAgeRequestDto, req.body);
    await this.#runCommand(() =>
      this.#declareAge.execute({
        identity,
        birthYear,
        ...(birthMonth !== undefined && { birthMonth }),
      }),
    );
    res.json(FirstAccessResponseDto.parse(await this.#gate.statusOf(identity)));
  }
}

/**
 * POST /first-access/documents: whoever declared their age accepts the terms of use, or gives the
 * game consent, in the version the app showed.
 */
export class AcceptDocumentEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/first-access/documents';
  readonly authenticated = true;
  readonly #acceptDocument: AcceptDocumentUseCase;
  readonly #gate: FirstAccessGate;
  readonly #runCommand: RunCommand;

  constructor(
    acceptDocument: AcceptDocumentUseCase,
    gate: FirstAccessGate,
    runCommand: RunCommand,
  ) {
    this.#acceptDocument = acceptDocument;
    this.#gate = gate;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const identity = identityOf(res);
    const { document, version } = parseBody(AcceptDocumentRequestDto, req.body);
    // Only past the age: the documents never let anyone skip it, nor a blocked country.
    const before = await this.#gate.statusOf(identity);
    if (before?.step !== 'documents' && before?.step !== 'done') {
      await this.#gate.ensureDone(identity);
    }
    await this.#runCommand(() => this.#acceptDocument.execute({ identity, document, version }));
    res.json(FirstAccessResponseDto.parse(await this.#gate.statusOf(identity)));
  }
}

/**
 * The same endpoint, for whoever finished the first access only: in a blocked country, under the
 * minimum age, without the age or without the current documents, FirstAccessRequiredError.
 */
export function requiringFirstAccess(endpoint: HttpEndpoint, gate: FirstAccessGate): HttpEndpoint {
  return {
    method: endpoint.method,
    path: endpoint.path,
    authenticated: true,
    async handle(req, res) {
      await gate.ensureDone(identityOf(res));
      await endpoint.handle(req, res);
    },
  };
}
