import { abort, AuthData, credentialGet, getHashedUsername } from '@apillon/wallet-sdk';
import { ContractPromise } from '@polkadot/api-contract';
import { ethers } from 'ethers';

async function getProxyResponse(WAC: ContractPromise, data: string, authData: AuthData) {
  if (!authData.username) {
    abort('NO_USERNAME');
  }

  const hashedUsername = authData.hashedUsername || (await getHashedUsername(authData.username));

  if (!hashedUsername) {
    abort('CANT_HASH_USERNAME');
  }

  const { result: personalizationResult, output: personalization } =
    await WAC.query.personalization('USER_POLKA_ADDRESS?', { gasLimit: -1 });

  const { result: credentialResult, output: credentialIds } =
    await WAC.query.credentialIdsByUsername(
      'USER_POLKA_ADDRESS?',
      { gasLimit: -1 },
      hashedUsername as any
    );

  /**
   * Request passKey from user
   */
  const credentials = await credentialGet(
    // binary credential ids
    (credentialIds as any).map((c: any) => ethers.toBeArray(c)),
    // challenge
    ethers.toBeArray(ethers.sha256(personalization + ethers.sha256(data).slice(2)))
  );

  const res = await WAC.tx
    .proxyView(
      { gasLimit: 3000n * 1000000n, storageDepositLimit: null },
      credentials.credentialIdHashed,
      credentials.resp,
      data
    )
    .send();

  return res;
}

export { getProxyResponse };

export default getProxyResponse;
