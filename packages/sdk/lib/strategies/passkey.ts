import { ethers } from 'ethers';
import { AuthData, AuthStrategy, WebauthnContract } from '../types';
import { abort, getHashedUsername } from '../utils';
import { credentialCreate, credentialGet } from '../browser-webauthn';

class PasskeyStrategy implements AuthStrategy {
  async getRegisterData(authData: AuthData, hashedUsername?: Buffer) {
    if (!authData.username) {
      abort('NO_USERNAME');
      return;
    }

    if (!hashedUsername) {
      hashedUsername = await getHashedUsername(authData.username);
    }

    if (!hashedUsername) {
      abort('CANT_HASH_USERNAME');
      return;
    }

    const cred = await credentialCreate(
      {
        name: 'Embedded Wallet Account',
        id: 'app-dev.apillon.io',
      },
      {
        id: hashedUsername,
        name: authData.username,
        displayName: authData.username,
      },
      crypto.getRandomValues(new Uint8Array(32))
    );

    return {
      hashedUsername,
      credentialId: cred.id,
      pubkey: cred.ad.attestedCredentialData!.credentialPublicKey!,
      optionalPassword: ethers.ZeroHash,
    };
  }

  async getProxyResponse(WAC: WebauthnContract, data: string, authData: AuthData) {
    if (!authData.username) {
      abort('NO_USERNAME');
      return;
    }

    const hashedUsername = authData.hashedUsername || (await getHashedUsername(authData.username));

    if (!hashedUsername) {
      abort('CANT_HASH_USERNAME');
      return;
    }

    const personalization = await WAC.personalization();
    const credentialIds = await WAC.credentialIdsByUsername(hashedUsername as any);

    /**
     * Request passkey from user
     */
    // const res = await getPasskeyIframe()?.get(
    //   credentialIds.map((c: any) => ethers.toBeArray(c)),
    //   ethers.toBeArray(ethers.sha256(personalization + ethers.sha256(data).slice(2)))
    // );

    // if (!res) {
    //   abort('IFRAME_NOT_INIT');
    //   return;
    // }

    const cred = await credentialGet(
      // binary credential ids
      credentialIds.map((c: any) => ethers.toBeArray(c)),
      // challenge
      ethers.toBeArray(ethers.sha256(personalization + ethers.sha256(data).slice(2)))
    );

    // @ts-expect-error Types from abi are not correct
    return await WAC.proxyView(cred.credentialIdHashed, cred.resp, data);
  }
}

export default PasskeyStrategy;
