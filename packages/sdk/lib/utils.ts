import { ethers } from 'ethers';
import { OasisAppWallet } from '.';
import { SapphireMainnet, SapphireTestnet, WindowId, Errors } from './constants';
import { pbkdf2Sync } from 'pbkdf2';
import { AppParams } from './types';

/**
 * Global wallet object.
 */
export function initializeOnWindow(params?: AppParams) {
  if (typeof window !== 'undefined') {
    window[WindowId] = new OasisAppWallet(params);
    return window[WindowId];
  }
}

export function getOasisAppWallet() {
  if (typeof window !== 'undefined') {
    if (!window[WindowId]) {
      window[WindowId] = new OasisAppWallet();
    }

    return window[WindowId] as OasisAppWallet;
  }
}

export async function getHashedUsername(name = '') {
  const oaw = getOasisAppWallet();

  const salt = await oaw?.accountManagerContract?.salt();

  if (salt) {
    return pbkdf2Sync(name, ethers.toBeArray(salt), 100_000, 32, 'sha256');
  }
}

export function networkIdIsSapphire(id: number) {
  return [SapphireTestnet, SapphireMainnet].includes(id);
}

export function abort(e: keyof typeof Errors, message = 'Error') {
  const err = new Error(message);
  err.name = Errors[e];
  throw err;
}