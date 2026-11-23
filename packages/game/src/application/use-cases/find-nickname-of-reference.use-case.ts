import { InvalidRoomCodeError } from '../../domain/errors/invalid-room-code.error.ts';
import { RoomCodeVO } from '../../domain/vos/room-code.vo.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

/** A nickname of a player, and who goes by it. */
export interface NicknameOfReference {
  readonly nickname: string;
  /** The identity of the player. */
  readonly owner: string;
}

/** How another context finds the nickname that a text about a room points to. */
export interface FindNicknameOfReference {
  execute(reference: string): Promise<NicknameOfReference | null>;
}

/** Each run of letters and digits, apart from the rest: a room code is one of them. */
const WORD = /[\p{L}\p{N}]+/gu;

/** The valid room codes the text has, once each, as the room keeps them. */
function codesIn(text: string): string[] {
  const codes = new Set<string>();
  for (const [word] of text.matchAll(WORD)) {
    try {
      codes.add(new RoomCodeVO(word).value);
    } catch (error) {
      if (!(error instanceof InvalidRoomCodeError)) throw error;
    }
  }
  return [...codes];
}

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whether the text names it whole, whatever the case: not as part of a longer word. */
function names(text: string, nickname: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped(nickname)}(?![\\p{L}\\p{N}])`, 'iu').test(text);
}

/**
 * Someone writes, in a notice of the web form, the code of a room and the nickname of a player in
 * it: the player it is, while the room is kept, closed or not. Nobody if the text names no such
 * room, no player of it, or several, which only the team can tell apart.
 */
export class FindNicknameOfReferenceUseCase implements FindNicknameOfReference {
  readonly #roomRepository: RoomRepository;

  constructor(roomRepository: RoomRepository) {
    this.#roomRepository = roomRepository;
  }

  async execute(reference: string): Promise<NicknameOfReference | null> {
    const named = new Map<string, NicknameOfReference>();
    for (const code of codesIn(reference)) {
      const room = await this.#roomRepository.findByCode(code);
      for (const { nickname, identity } of room?.players ?? []) {
        if (names(reference, nickname)) {
          named.set(`${identity}\n${nickname}`, { nickname, owner: identity });
        }
      }
    }
    const [only, ...more] = named.values();
    return only && more.length === 0 ? only : null;
  }
}
