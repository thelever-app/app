import type {
  GetConsentUseCase,
  LiftAnalyticsObjectionUseCase,
  ObjectsToAnalyticsUseCase,
  ObjectToAnalyticsUseCase,
  WithdrawGameConsentUseCase,
} from '@thelever-app/consent';
import type { GetRequestCodeUseCase, RequestDataDeletionUseCase } from '@thelever-app/identity';
import type { FirstAccessGate } from '@thelever-app/integrations/first-access';
import {
  AnalyticsObjectionRequestDto,
  FirstAccessResponseDto,
  MyDataResponseDto,
} from '@thelever-app/protocol';
import type { Request, Response } from 'express';
import { identityOf } from '../http/authentication.ts';
import type { HttpEndpoint } from '../http/http-endpoint.ts';
import { parseBody } from '../http/parse-body.ts';
import type { RunCommand } from '../rooms/run-command.ts';

/**
 * GET /my-data: what Settings › Privacy and data shows the caller: their code for requests by
 * email, the state of their game consent and whether they object to product analytics.
 */
export class MyDataEndpoint implements HttpEndpoint {
  readonly method = 'get';
  readonly path = '/my-data';
  readonly authenticated = true;
  readonly #getRequestCode: GetRequestCodeUseCase;
  readonly #getConsent: GetConsentUseCase;
  readonly #objectsToAnalytics: ObjectsToAnalyticsUseCase;

  constructor(
    getRequestCode: GetRequestCodeUseCase,
    getConsent: GetConsentUseCase,
    objectsToAnalytics: ObjectsToAnalyticsUseCase,
  ) {
    this.#getRequestCode = getRequestCode;
    this.#getConsent = getConsent;
    this.#objectsToAnalytics = objectsToAnalytics;
  }

  async handle(_req: Request, res: Response): Promise<void> {
    const identity = identityOf(res);
    const [requestCode, consent, objectsToAnalytics] = await Promise.all([
      this.#getRequestCode.execute(identity),
      this.#getConsent.execute(identity),
      this.#objectsToAnalytics.execute(identity),
    ]);
    if (requestCode === undefined) {
      res.status(404).json({ error: 'first-access-not-begun' });
      return;
    }
    res.json(
      MyDataResponseDto.parse({
        requestCode,
        gameConsent: consent.gameConsentWithdrawn
          ? 'withdrawn'
          : consent.pending.includes('game-consent')
            ? 'pending'
            : 'given',
        objectsToAnalytics,
      }),
    );
  }
}

/**
 * POST /my-data/game-consent-withdrawal: the caller withdraws the game consent. Their game data
 * still within their 24 hours are deleted at once; it answers where their first access is, which
 * asks for the game consent again.
 */
export class WithdrawGameConsentEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/my-data/game-consent-withdrawal';
  readonly authenticated = true;
  readonly #withdraw: WithdrawGameConsentUseCase;
  readonly #gate: FirstAccessGate;
  readonly #runCommand: RunCommand;

  constructor(withdraw: WithdrawGameConsentUseCase, gate: FirstAccessGate, runCommand: RunCommand) {
    this.#withdraw = withdraw;
    this.#gate = gate;
    this.#runCommand = runCommand;
  }

  async handle(_req: Request, res: Response): Promise<void> {
    const identity = identityOf(res);
    await this.#runCommand(() => this.#withdraw.execute(identity));
    res.json(FirstAccessResponseDto.parse(await this.#gate.statusOf(identity)));
  }
}

/** POST /my-data/analytics-objection: the caller objects to product analytics, or lifts it. */
export class AnalyticsObjectionEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/my-data/analytics-objection';
  readonly authenticated = true;
  readonly #object: ObjectToAnalyticsUseCase;
  readonly #lift: LiftAnalyticsObjectionUseCase;
  readonly #runCommand: RunCommand;

  constructor(
    object: ObjectToAnalyticsUseCase,
    lift: LiftAnalyticsObjectionUseCase,
    runCommand: RunCommand,
  ) {
    this.#object = object;
    this.#lift = lift;
    this.#runCommand = runCommand;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const identity = identityOf(res);
    const { objects } = parseBody(AnalyticsObjectionRequestDto, req.body);
    await this.#runCommand(() =>
      objects ? this.#object.execute(identity) : this.#lift.execute(identity),
    );
    res.status(204).end();
  }
}

/**
 * POST /my-data/deletion: the caller asks for their data to be deleted. The device starts from
 * scratch on its own; the deletion job deletes the rest within a day.
 */
export class RequestDataDeletionEndpoint implements HttpEndpoint {
  readonly method = 'post';
  readonly path = '/my-data/deletion';
  readonly authenticated = true;
  readonly #requestDeletion: RequestDataDeletionUseCase;
  readonly #runCommand: RunCommand;

  constructor(requestDeletion: RequestDataDeletionUseCase, runCommand: RunCommand) {
    this.#requestDeletion = requestDeletion;
    this.#runCommand = runCommand;
  }

  async handle(_req: Request, res: Response): Promise<void> {
    const identity = identityOf(res);
    await this.#runCommand(() => this.#requestDeletion.execute(identity));
    res.status(202).end();
  }
}
