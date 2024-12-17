import { ErrorMessages, Errors } from './constants';
import { AuthPasskeyMode } from './types';
import { abort, isSafari } from './utils';

/**
 * Iframe for cross domain passkey checks.
 * Only `credentials.get` supported.
 * `credentials.create` is subject to strict limitations when in iframe, so it should be done via popup or a gateway page.
 */
export class XdomainPasskey {
  src = import.meta.env.VITE_XDOMAIN_PASSKEY_SRC ?? 'https://passkey.apillon.io';
  promises: { id: number; resolve: (v: any) => void; reject: (e: any) => void }[] = [];
  lastEventId = 0; // use this to match iframe response with promise resolvers

  iframe: HTMLIFrameElement | undefined;
  popup: Window | null = null;
  popupLoadPromise: { resolve: () => void; reject: (e: any) => void } | undefined;
  isPopupLoaded = false;
  popupCheckInterval: null | ReturnType<typeof setInterval> = null; // monitor if popup was closed

  constructor(
    public clientId: string,
    public mode: AuthPasskeyMode = 'redirect'
  ) {
    if (mode !== 'standalone') {
      window.addEventListener('message', this.onResponse.bind(this));
      this.initIframe();
    }
  }

  onResponse(ev: MessageEvent) {
    if (ev?.data?.type === 'apillon_pk_response' || ev?.data?.type === 'apillon_pk_error') {
      const promiseIndex = this.promises.findIndex(x => x.id === ev.data.id);

      if (promiseIndex > -1) {
        if (ev.data.type === 'apillon_pk_response') {
          this.promises[promiseIndex].resolve(ev.data.content);
        } else {
          this.promises[promiseIndex].reject(ev.data.content);
        }

        this.promises.splice(promiseIndex, 1);
      }

      if (this.popupCheckInterval) {
        clearInterval(this.popupCheckInterval);
        this.popupCheckInterval = null;
      }

      if (this.popup) {
        this.popup.close();
        this.popup = null;
      }

      this.isPopupLoaded = false;
      this.popupLoadPromise = undefined;
    } else if (ev?.data?.type === 'apillon_pk_load') {
      this.isPopupLoaded = true;

      if (this.popupLoadPromise) {
        this.popupLoadPromise.resolve();
        this.popupLoadPromise = undefined;
      }
    }
  }

  async initIframe() {
    if (!window) {
      abort('XDOMAIN_NOT_INIT');
      return;
    }

    const i = document.createElement('iframe');

    const iframeLoading = new Promise<void>(resolve => {
      i.addEventListener('load', () => resolve(), { once: true });
    });

    i.setAttribute('src', `${this.src}?clientId=${this.clientId}`);

    i.setAttribute('allow', `publickey-credentials-get ${this.src}`);
    i.style.pointerEvents = 'none';
    i.style.width = '1px';
    i.style.height = '1px';
    i.style.overflow = 'hidden';
    i.style.opacity = '0';

    this.iframe = i;

    document.body.appendChild(i);

    await iframeLoading;
  }

  async openPopup() {
    if (this.popup) {
      this.popup.close();
      this.popup = null;
    }

    if (this.popupCheckInterval) {
      clearInterval(this.popupCheckInterval);
      this.popupCheckInterval = null;
    }

    // Safari workaround
    // `window.open` has to be called in non-async context.
    setTimeout(() => {
      const width = 400;
      const height = 400;

      this.popup = window.open(
        this.src + '?popup=1',
        '_blank',
        [
          `width=${width}`,
          `height=${height}`,
          `left=${Math.round(window.innerWidth / 2 + window.screenX - width / 2)}`,
          `top=${Math.round(window.innerHeight / 2 + window.screenY - height / 2)}`,
          `location=no`,
          `resizable=no`,
        ].join(',')
      );
    }, 1);

    await new Promise(resolve => setTimeout(resolve, 20));

    // #region Popup blocked checks
    if (
      !this.popup ||
      (this.popup as Window).closed ||
      typeof (this.popup as Window).closed === 'undefined'
    ) {
      return abort('XDOMAIN_BLOCKED');
    }

    try {
      (this.popup as Window).focus();
    } catch (e) {
      return abort('XDOMAIN_BLOCKED');
    }
    // #endregion

    // #region On popup closed handler
    // Keep checking if popup window was closed
    this.popupCheckInterval = setInterval(() => {
      if (this.popup?.closed) {
        // reject all promises
        for (const p of this.promises) {
          p.reject(ErrorMessages[Errors.XDOMAIN_STOPPED]);
        }

        this.promises = [];

        if (this.popupLoadPromise) {
          this.popupLoadPromise.reject(ErrorMessages[Errors.XDOMAIN_STOPPED]);
        }

        if (this.popupCheckInterval) {
          clearInterval(this.popupCheckInterval);
          this.popupCheckInterval = null;
        }

        this.popup = null;
        this.popupLoadPromise = undefined;
        this.isPopupLoaded = false;
      } else if (this.popup?.closed === undefined && this.popupCheckInterval) {
        clearInterval(this.popupCheckInterval);
        this.popupCheckInterval = null;
        this.popupLoadPromise = undefined;
        this.isPopupLoaded = false;
      }
    }, 500);
    // #endregion

    // Wait for popup window content to load (resolves on `apillon_pk_load` postMessage event)
    await new Promise<void>((resolve, reject) => {
      if (this.isPopupLoaded) {
        return resolve();
      }

      this.popupLoadPromise = { resolve, reject };
    });
  }

  /**
   * Create credentials through popup window. Not available in iframe!
   */
  async create(hashedUsername: Buffer, username: string) {
    await this.openPopup();

    if (!this.popup) {
      return abort('XDOMAIN_NOT_INIT');
    }

    const id = this.getEventId();

    this.popup.postMessage(
      {
        type: 'create_pk_credentials',
        id,
        content: {
          hashedUsername,
          username,
        },
      },
      this.src
    );

    return new Promise<{
      credentialId: Uint8Array;
      pubkey: any;
    }>((resolve, reject) => {
      this.promises.push({
        id,
        resolve,
        reject,
      });
    });
  }

  /**
   * Get credentials -- always through iframe.
   */
  async get(credentials: Uint8Array[], challenge: Uint8Array) {
    if (!this.iframe) {
      await this.initIframe();

      await new Promise(resolve => setTimeout(resolve, 150));

      if (!this.iframe) {
        return abort('XDOMAIN_NOT_INIT');
      }
    }

    this.iframe.focus();

    if (isSafari()) {
      setTimeout(() => {
        this.iframe?.contentWindow?.focus();
      }, 10);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const id = this.getEventId();

    this.iframe.contentWindow?.postMessage(
      {
        type: 'get_pk_credentials',
        id,
        content: {
          credentials,
          challenge,
        },
      },
      this.src
    );

    return new Promise<{
      credentials: {
        credentialIdHashed: string;
        challenge: Uint8Array;
        resp: {
          authenticatorData: Uint8Array;
          clientDataTokens: {
            t: number;
            k: string;
            v: string;
          }[];
          sigR: bigint;
          sigS: bigint;
        };
      };
    }>((resolve, reject) => {
      this.promises.push({
        id,
        resolve,
        reject,
      });
    });
  }

  getEventId() {
    this.lastEventId += 1;
    return this.lastEventId;
  }
}
